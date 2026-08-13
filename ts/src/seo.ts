// ---------------------------------------------------------------------------
// Generic buildSeoMeta helper — shared across any project's landing page or
// marketing site with multilingual SSG/SSR. Accepts page-specific meta
// (title, description, ogTitle, ogDescription) as required options and
// returns the fully-merged { meta, links } — the route's head() becomes a
// single expression.
//
// Usage:
//
//   import { buildSeoMeta } from "@ftzi/shared/seo";
//
//   const seo = buildSeoMeta({
//     lang: "pt",
//     pathSuffix: "/premium",
//     siteUrl: "https://example.com",
//     supportedLanguages,           // ReadonlyArray<LanguageEntry>
//     twitterHandle: "@yourproduct",
//     ogImageUrl: "https://example.com/og.png",
//
//     // Page-specific meta — required, no defaults
//     title: "YourProduct • Premium",
//     description: "Unlock the full power of YourProduct.",
//     ogTitle: "YourProduct • Premium",
//     ogDescription: "More power, more storage, unlimited everything.",
//
//     // Optional: add custom meta (e.g., twitter:title, article:published_time)
//     extra: [{ name: "twitter:title", content: "YourProduct • Premium" }],
//   });
//
//   // seo is { meta: [...], links: [...] } — fully merged, ready for head().
//   // To add structured data scripts, spread and add:
//   //   head: () => ({ ...seo, scripts: [ ... ] })
//
// NOTE: `x-default` always points to `/en<pathSuffix>` (the source-locale URL
// is the universal fallback per the 1-seo skill).
// ---------------------------------------------------------------------------

import type { LanguageEntry } from "./languages";

export type MetaEntry = {
  name?: string;
  property?: string;
  title?: string;
  content?: string;
};

export type LinkEntry = {
  rel: string;
  href: string;
  hrefLang?: string;
};

export type SeoMeta = {
  meta: MetaEntry[];
  links: LinkEntry[];
};

export type TwitterCard = "summary_large_image" | "summary";

export type BuildSeoMetaOptions<
  Langs extends readonly LanguageEntry[] = readonly LanguageEntry[],
> = {
  lang: Langs[number]["code"];
  pathSuffix: string;
  siteUrl: string;
  supportedLanguages: Langs;
  twitterHandle: string;
  ogImageUrl: string;
  twitterCard?: TwitterCard;

  // Page-specific meta — required, no defaults. These make each page
  // unique and are merged into the returned meta array before the
  // common meta, so the consumer doesn't need manual composition.
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;

  // Optional additional page-specific meta entries (e.g., twitter:title,
  // article:published_time). Inserted between the named page-specific
  // fields and the common meta.
  extra?: readonly MetaEntry[];
};

export function buildSeoMeta<
  Langs extends readonly LanguageEntry[] = readonly LanguageEntry[],
>(opts: BuildSeoMetaOptions<Langs>): SeoMeta {
  const {
    lang,
    pathSuffix,
    siteUrl,
    supportedLanguages,
    twitterHandle,
    ogImageUrl,
    twitterCard = "summary_large_image",
  } = opts;
  const ogLocales: Record<string, string> = Object.fromEntries(
    supportedLanguages.map((l) => [l.code, l.ogLocale])
  );
  const path = `/${lang}${pathSuffix}`;
  const url = `${siteUrl}${path}`;

  const commonMeta: MetaEntry[] = [
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:image", content: ogImageUrl },
    { property: "og:locale", content: ogLocales[lang] ?? "en_US" },
    ...supportedLanguages
      .filter((l) => l.code !== lang)
      .map((l) => ({
        property: "og:locale:alternate",
        content: ogLocales[l.code] ?? "en_US",
      })),
    { name: "twitter:card", content: twitterCard },
    { name: "twitter:site", content: twitterHandle },
    { name: "twitter:image", content: ogImageUrl },
    { name: "robots", content: "index, follow" },
  ];

  const commonLinks: LinkEntry[] = [
    { rel: "canonical", href: url },
    ...supportedLanguages.map((l) => ({
      rel: "alternate",
      hrefLang: l.code,
      href: `${siteUrl}/${l.code}${pathSuffix}`,
    })),
    {
      rel: "alternate",
      hrefLang: "x-default",
      href: `${siteUrl}/en${pathSuffix}`,
    },
  ];

  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:title", content: opts.ogTitle },
      { property: "og:description", content: opts.ogDescription },
      ...(opts.extra ?? []),
      ...commonMeta,
    ],
    links: commonLinks,
  };
}
