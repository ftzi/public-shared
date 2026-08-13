/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import {
  KNOWN_LANGUAGES,
  Language,
  SUPPORTED_LANGUAGES_ORDER,
  getCurrentValidLanguage,
  resolveAcceptLanguage,
  type LanguageEntry,
} from "../src/languages";

describe("KNOWN_LANGUAGES", () => {
  const entries: readonly LanguageEntry[] = Object.values(KNOWN_LANGUAGES);

  test("has 27 entries", () => {
    expect(entries).toHaveLength(27);
  });

  test("every ogLocale matches language_TERRITORY format", () => {
    for (const entry of entries) {
      expect(entry.ogLocale).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
  });

  test("every entry has code, label, and ogLocale", () => {
    for (const entry of entries) {
      expect(entry.code).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.ogLocale).toBeTruthy();
    }
  });

  test("rtl languages: ar, fa, he, ur", () => {
    const rtlCodes = entries
      .filter((e) => e.rtl === true)
      .map((e) => e.code)
      .toSorted();
    expect(rtlCodes).toStrictEqual(["ar", "fa", "he", "ur"]);
  });

  test("at least one entry has rtl: true (needed to test direction derivation)", () => {
    const rtlEntries = entries.filter((e) => e.rtl === true);
    expect(rtlEntries.length).toBeGreaterThan(0);
  });

  test("the 'en' entry exists (getCurrentValidLanguage fallback depends on it)", () => {
    expect(KNOWN_LANGUAGES.en).toBeDefined();
    expect(KNOWN_LANGUAGES.en.code).toBe("en");
  });

  test("object keys are unique (inherent in object syntax, but explicit check)", () => {
    const keys = Object.keys(KNOWN_LANGUAGES);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("getCurrentValidLanguage", () => {
  const supportedLanguages: readonly LanguageEntry[] = [
    { code: "en", label: "English", ogLocale: "en_US" },
    { code: "pt", label: "Português", ogLocale: "pt_BR" },
    { code: "ar", label: "العربية", ogLocale: "ar_AR", rtl: true },
    { code: "de", label: "Deutsch", ogLocale: "de_DE" },
  ];

  test("known code returns the matching entry", () => {
    const entry = getCurrentValidLanguage("en", supportedLanguages);
    expect(entry.code).toBe("en");
    expect(entry.label).toBe("English");
    expect(entry.ogLocale).toBe("en_US");
  });

  test("ar code returns the ar entry with direction: 'rtl'", () => {
    const entry = getCurrentValidLanguage("ar", supportedLanguages);
    expect(entry.code).toBe("ar");
    expect(entry.label).toBe("العربية");
    expect(entry.ogLocale).toBe("ar_AR");
    expect(entry.direction).toBe("rtl");
  });

  test("non-RTL code returns entry with direction: 'ltr'", () => {
    const entry = getCurrentValidLanguage("pt", supportedLanguages);
    expect(entry.code).toBe("pt");
    expect(entry.direction).toBe("ltr");
  });

  test("unknown code falls back to English", () => {
    const entry = getCurrentValidLanguage("xx", supportedLanguages);
    expect(entry.code).toBe("en");
  });

  test("empty string code falls back to English", () => {
    const entry = getCurrentValidLanguage("", supportedLanguages);
    expect(entry.code).toBe("en");
  });

  test("subset list with known code returns the right entry", () => {
    const subset = supportedLanguages.filter(
      (l) => l.code === "en" || l.code === "pt"
    );
    expect(getCurrentValidLanguage("en", subset).code).toBe("en");
    expect(getCurrentValidLanguage("pt", subset).code).toBe("pt");
  });

  test("subset list with unknown code falls back to English (if en in subset)", () => {
    const subset = supportedLanguages.filter(
      (l) => l.code === "en" || l.code === "pt"
    );
    const entry = getCurrentValidLanguage("fr", subset);
    expect(entry.code).toBe("en");
  });

  test("throws when 'en' is not in the list and the code is unknown", () => {
    const subset = supportedLanguages.filter((l) => l.code !== "en");
    expect(() => getCurrentValidLanguage("xx", subset)).toThrow();
  });
});

describe("Language named object", () => {
  test("Language values match KNOWN_LANGUAGES keys", () => {
    const languageValues: string[] = Object.values(Language);
    const knownKeys: string[] = Object.keys(KNOWN_LANGUAGES);
    expect(languageValues.toSorted()).toStrictEqual(knownKeys.toSorted());
  });

  test("Language has 27 named entries (same as KNOWN_LANGUAGES)", () => {
    expect(Object.keys(Language)).toHaveLength(27);
  });
});

describe("SUPPORTED_LANGUAGES_ORDER", () => {
  test("has 27 entries matching the number of KNOWN_LANGUAGES", () => {
    expect(SUPPORTED_LANGUAGES_ORDER).toHaveLength(
      Object.keys(KNOWN_LANGUAGES).length
    );
  });

  test("every code is a valid KnownLanguageCode", () => {
    const knownKeys = new Set(Object.keys(KNOWN_LANGUAGES));
    for (const code of SUPPORTED_LANGUAGES_ORDER) {
      expect(knownKeys.has(code)).toBe(true);
    }
  });
});

describe("resolveAcceptLanguage", () => {
  const supported = new Set([
    "en",
    "pt",
    "ar",
    "de",
    "zh-Hans",
    "zh-Hant",
    "fr",
    "es",
  ]);

  test("null header returns null", () => {
    expect(resolveAcceptLanguage(null, supported)).toBeNull();
  });

  test("empty string header returns null", () => {
    expect(resolveAcceptLanguage("", supported)).toBeNull();
  });

  test("single exact match", () => {
    expect(resolveAcceptLanguage("en", supported)).toBe("en");
  });

  test("case-insensitive match", () => {
    expect(resolveAcceptLanguage("EN", supported)).toBe("en");
    expect(resolveAcceptLanguage("PT", supported)).toBe("pt");
  });

  test("quality factor stripped", () => {
    expect(resolveAcceptLanguage("en;q=0.9", supported)).toBe("en");
  });

  test("multiple values, first wins", () => {
    expect(resolveAcceptLanguage("fr,de", supported)).toBe("fr");
    expect(resolveAcceptLanguage("de,fr", supported)).toBe("de");
  });

  test("base-language fallback", () => {
    expect(resolveAcceptLanguage("fr-CA", supported)).toBe("fr");
    expect(resolveAcceptLanguage("pt-BR", supported)).toBe("pt");
  });

  test("Chinese special case: zh-Hant in input returns zh-Hant", () => {
    expect(resolveAcceptLanguage("zh-Hant", supported)).toBe("zh-Hant");
  });

  test("Chinese special case: zh-Hans in input returns zh-Hans", () => {
    expect(resolveAcceptLanguage("zh-Hans", supported)).toBe("zh-Hans");
  });

  test("whitespace-trimmed values", () => {
    expect(resolveAcceptLanguage(" en , fr ", supported)).toBe("en");
  });

  test("skips empty parts", () => {
    expect(resolveAcceptLanguage("en,,fr", supported)).toBe("en");
  });

  test("no match returns null", () => {
    expect(resolveAcceptLanguage("ja-JP", supported)).toBeNull();
  });

  test("malformed quality factor still extracts the code", () => {
    expect(resolveAcceptLanguage("en;q=", supported)).toBe("en");
  });
});
