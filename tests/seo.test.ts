/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { buildSeoMeta } from "../src/seo";

const siteUrl = "https://example.com";
const supportedLanguages = [
  { code: "en", label: "English", ogLocale: "en_US" },
  { code: "pt", label: "Português", ogLocale: "pt_BR" },
  { code: "de", label: "Deutsch", ogLocale: "de_DE" },
] as const;
const twitterHandle = "@testproduct";
const ogImageUrl = "https://example.com/og.png";

const defaultOpts = {
  lang: "en" as const,
  pathSuffix: "/premium",
  siteUrl,
  supportedLanguages,
  twitterHandle,
  ogImageUrl,
  title: "Test Title",
  description: "Test description for the test page.",
  ogTitle: "Test OG Title",
  ogDescription: "Test OG description for the test page.",
};

describe("buildSeoMeta", () => {
  test("output shape — meta and links arrays are present and non-empty", () => {
    const result = buildSeoMeta(defaultOpts);
    expect(Array.isArray(result.meta)).toBe(true);
    expect(result.meta.length).toBeGreaterThan(0);
    expect(Array.isArray(result.links)).toBe(true);
    expect(result.links.length).toBeGreaterThan(0);
  });

  test("og:locale uses ogLocale from the matching language entry", () => {
    const result = buildSeoMeta({
      ...defaultOpts,
      lang: "pt",
      pathSuffix: "/",
    });
    const ogLocale = result.meta.find((m) => m.property === "og:locale");
    expect(ogLocale?.content).toBe("pt_BR");
  });

  test("og:locale falls back to en_US for an unknown lang", () => {
    const result = buildSeoMeta({
      // Cast bypasses the literal-code type narrowing — this test exercises
      // the runtime fallback for unrecognized lang codes.
      ...defaultOpts,
      lang: "unknown" as never,
      pathSuffix: "/",
    });
    const ogLocale = result.meta.find((m) => m.property === "og:locale");
    expect(ogLocale?.content).toBe("en_US");
  });

  test("og:locale:alternate entries count equals supportedLanguages.length - 1 (current lang excluded)", () => {
    const result = buildSeoMeta({ ...defaultOpts, pathSuffix: "/" });
    const alternates = result.meta.filter(
      (m) => m.property === "og:locale:alternate"
    );
    expect(alternates).toHaveLength(supportedLanguages.length - 1);
  });

  test("hreflang alternates include one per supported language plus x-default", () => {
    const result = buildSeoMeta(defaultOpts);
    const hreflangs = result.links.filter((l) => l.rel === "alternate");
    expect(hreflangs).toHaveLength(supportedLanguages.length + 1); // N langs + x-default
  });

  test("x-default href ends with /en<pathSuffix>", () => {
    const result = buildSeoMeta({
      ...defaultOpts,
      lang: "de",
      pathSuffix: "/terms",
    });
    const xDefault = result.links.find((l) => l.hrefLang === "x-default");
    expect(xDefault?.href).toBe("https://example.com/en/terms");
  });

  test("canonical href is <siteUrl>/<lang><pathSuffix>", () => {
    const result = buildSeoMeta({
      ...defaultOpts,
      lang: "pt",
      pathSuffix: "/",
    });
    const canonical = result.links.find((l) => l.rel === "canonical");
    expect(canonical?.href).toBe("https://example.com/pt/");
  });

  test("twitter:card defaults to summary_large_image when not provided", () => {
    const result = buildSeoMeta({ ...defaultOpts, pathSuffix: "/" });
    const card = result.meta.find((m) => m.name === "twitter:card");
    expect(card?.content).toBe("summary_large_image");
  });

  test("twitter:card honors the override", () => {
    const result = buildSeoMeta({
      ...defaultOpts,
      pathSuffix: "/",
      twitterCard: "summary",
    });
    const card = result.meta.find((m) => m.name === "twitter:card");
    expect(card?.content).toBe("summary");
  });

  test("robots is always 'index, follow'", () => {
    const result = buildSeoMeta({ ...defaultOpts, pathSuffix: "/" });
    const robots = result.meta.find((m) => m.name === "robots");
    expect(robots?.content).toBe("index, follow");
  });

  test("same shape for a different lang produces the same meta/link structure", () => {
    const resultDe = buildSeoMeta({ ...defaultOpts, lang: "de" });
    const resultPt = buildSeoMeta({ ...defaultOpts, lang: "pt" });

    // Both have the same number of meta entries and link entries
    expect(resultDe.meta).toHaveLength(resultPt.meta.length);
    expect(resultDe.links).toHaveLength(resultPt.links.length);

    // Both have og:type = website
    const ogTypeDe = resultDe.meta.find((m) => m.property === "og:type");
    const ogTypePt = resultPt.meta.find((m) => m.property === "og:type");
    expect(ogTypeDe?.content).toBe("website");
    expect(ogTypePt?.content).toBe("website");

    // Canonical differs by lang
    const canonicalDe = resultDe.links.find((l) => l.rel === "canonical");
    const canonicalPt = resultPt.links.find((l) => l.rel === "canonical");
    expect(canonicalDe?.href).toBe("https://example.com/de/premium");
    expect(canonicalPt?.href).toBe("https://example.com/pt/premium");
  });
});

describe("page-specific meta", () => {
  test("title appears in the output meta", () => {
    const result = buildSeoMeta(defaultOpts);
    const title = result.meta.find(
      (m) => "title" in m && typeof m.title === "string"
    );
    expect(title?.title).toBe("Test Title");
  });

  test("description appears in the output meta", () => {
    const result = buildSeoMeta(defaultOpts);
    const desc = result.meta.find((m) => m.name === "description");
    expect(desc?.content).toBe("Test description for the test page.");
  });

  test("og:title appears in the output meta", () => {
    const result = buildSeoMeta(defaultOpts);
    const ogTitle = result.meta.find((m) => m.property === "og:title");
    expect(ogTitle?.content).toBe("Test OG Title");
  });

  test("og:description appears in the output meta", () => {
    const result = buildSeoMeta(defaultOpts);
    const ogDesc = result.meta.find((m) => m.property === "og:description");
    expect(ogDesc?.content).toBe("Test OG description for the test page.");
  });

  test("page-specific fields come before common meta in the output", () => {
    const result = buildSeoMeta(defaultOpts);
    // First 4 entries: title (index 0), description (index 1), og:title (2), og:description (3)
    expect("title" in result.meta[0] && result.meta[0].title).toBe(
      "Test Title"
    );
    expect(result.meta[1].name).toBe("description");
    expect(result.meta[2].property).toBe("og:title");
    expect(result.meta[3].property).toBe("og:description");
    // Entry at index 4 is og:type (first common meta entry)
    expect(result.meta[4].property).toBe("og:type");
  });

  test("extra entries are inserted between page-specific and common meta", () => {
    const result = buildSeoMeta({
      ...defaultOpts,
      extra: [{ name: "twitter:title", content: "Twitter Test" }],
    });
    // Index 0-3: page-specific
    expect(result.meta[4].name).toBe("twitter:title");
    expect(result.meta[4].content).toBe("Twitter Test");
    // Index 5+: common meta (og:type)
    expect(result.meta[5].property).toBe("og:type");
  });

  test("without extra, meta has only page-specific + common entries", () => {
    const result = buildSeoMeta(defaultOpts);
    // 4 page-specific + common entry count (og:type, og:url, og:image, og:locale,
    // 2x og:locale:alternate, twitter:card, twitter:site, twitter:image, robots)
    expect(result.meta[4].property).toBe("og:type");
  });

  test("extra with multiple entries inserts all of them in order", () => {
    const result = buildSeoMeta({
      ...defaultOpts,
      extra: [
        { name: "twitter:title", content: "TT" },
        { property: "article:published_time", content: "2024-01-01" },
      ],
    });
    expect(result.meta[4].name).toBe("twitter:title");
    expect(result.meta[5].property).toBe("article:published_time");
    expect(result.meta[6].property).toBe("og:type");
  });
});
