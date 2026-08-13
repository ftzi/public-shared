// ---------------------------------------------------------------------------
// KNOWN_LANGUAGES — the registry of every language the shared module knows
// about, keyed by `code` for O(1) lookup. Consumers map over KNOWN_LANGUAGES
// via SUPPORTED_LANGUAGES_ORDER to build their own SUPPORTED_LANGUAGES:
//
//   import { KNOWN_LANGUAGES, Language, SUPPORTED_LANGUAGES_ORDER, getCurrentValidLanguage } from "@ftzi/shared/languages";
//
//   export const SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES_ORDER.map(
//     (code) => KNOWN_LANGUAGES[code]
//   );
//   export type SupportedLocale = (typeof SUPPORTED_LANGUAGES_ORDER)[number];
//
//   // At runtime, look up the current language:
//   const entry = getCurrentValidLanguage("tr", SUPPORTED_LANGUAGES);
//   document.documentElement.dir = entry.direction;  // "ltr" — derived from entry.rtl
//
// `Language` provides named constants (Language.English = "en", etc.).
// `SUPPORTED_LANGUAGES_ORDER` is the ordered list of all known codes (27 entries).
// `LanguageEntry` is the per-entry shape. `getCurrentValidLanguage` is the
// runtime lookup helper (returns the matching entry, falls back to "en").
//
// The values of `Language` MUST match the keys of `KNOWN_LANGUAGES` — the
// test in `languages.test.ts` enforces this at the test level.
// ---------------------------------------------------------------------------

// Named mapping of language codes for human-readable code references.
// Consumers use `Language.English` instead of bare `"en"`,
// `Language.Turkish` instead of `"tr"`, etc.
export const Language = {
  English: "en",
  SimplifiedChinese: "zh-Hans",
  TraditionalChinese: "zh-Hant",
  Spanish: "es",
  Hindi: "hi",
  Portuguese: "pt",
  Arabic: "ar",
  Bengali: "bn",
  Russian: "ru",
  Japanese: "ja",
  French: "fr",
  German: "de",
  Korean: "ko",
  Italian: "it",
  Turkish: "tr",
  Dutch: "nl",
  Polish: "pl",
  Vietnamese: "vi",
  Thai: "th",
  Indonesian: "id",
  Swedish: "sv",
  Norwegian: "no",
  Danish: "da",
  Finnish: "fi",
  Persian: "fa",
  Hebrew: "he",
  Urdu: "ur",
} as const;

export const KNOWN_LANGUAGES = {
  en: { code: "en", label: "English", ogLocale: "en_US" },
  "zh-Hans": { code: "zh-Hans", label: "简体中文", ogLocale: "zh_CN" },
  "zh-Hant": { code: "zh-Hant", label: "繁體中文", ogLocale: "zh_TW" },
  es: { code: "es", label: "Español", ogLocale: "es_ES" },
  hi: { code: "hi", label: "हिन्दी", ogLocale: "hi_IN" },
  pt: { code: "pt", label: "Português", ogLocale: "pt_BR" },
  ar: { code: "ar", label: "العربية", ogLocale: "ar_AR", rtl: true },
  bn: { code: "bn", label: "বাংলা", ogLocale: "bn_IN" },
  ru: { code: "ru", label: "Русский", ogLocale: "ru_RU" },
  ja: { code: "ja", label: "日本語", ogLocale: "ja_JP" },
  fr: { code: "fr", label: "Français", ogLocale: "fr_FR" },
  de: { code: "de", label: "Deutsch", ogLocale: "de_DE" },
  ko: { code: "ko", label: "한국어", ogLocale: "ko_KR" },
  it: { code: "it", label: "Italiano", ogLocale: "it_IT" },
  tr: { code: "tr", label: "Türkçe", ogLocale: "tr_TR" },
  nl: { code: "nl", label: "Nederlands", ogLocale: "nl_NL" },
  pl: { code: "pl", label: "Polski", ogLocale: "pl_PL" },
  vi: { code: "vi", label: "Tiếng Việt", ogLocale: "vi_VN" },
  th: { code: "th", label: "ไทย", ogLocale: "th_TH" },
  id: { code: "id", label: "Bahasa Indonesia", ogLocale: "id_ID" },
  sv: { code: "sv", label: "Svenska", ogLocale: "sv_SE" },
  no: { code: "no", label: "Norsk", ogLocale: "no_NO" },
  da: { code: "da", label: "Dansk", ogLocale: "da_DK" },
  fi: { code: "fi", label: "Suomi", ogLocale: "fi_FI" },
  fa: { code: "fa", label: "فارسی", ogLocale: "fa_IR", rtl: true },
  he: { code: "he", label: "עברית", ogLocale: "he_IL", rtl: true },
  ur: { code: "ur", label: "اردو", ogLocale: "ur_PK", rtl: true },
} as const;

export type KnownLanguageCode = (typeof Language)[keyof typeof Language];

/**
 * All known language codes in display order. Use this for the Lingui
 * `locales` config, locale parity tests, and as the source of truth
 * for an app's supported codes. Apps that support every known locale
 * spread this directly: `locales: [...SUPPORTED_LANGUAGES_ORDER]`.
 * Apps that support a subset (e.g., no fa/he/ur) filter:
 * `SUPPORTED_LANGUAGES_ORDER.filter(c => c !== "fa" && c !== "he" && c !== "ur")`.
 */
export const SUPPORTED_LANGUAGES_ORDER = [
  Language.English,
  Language.SimplifiedChinese,
  Language.TraditionalChinese,
  Language.Spanish,
  Language.Hindi,
  Language.Portuguese,
  Language.Arabic,
  Language.Persian,
  Language.Hebrew,
  Language.Urdu,
  Language.Bengali,
  Language.Russian,
  Language.Japanese,
  Language.French,
  Language.German,
  Language.Korean,
  Language.Italian,
  Language.Turkish,
  Language.Dutch,
  Language.Polish,
  Language.Vietnamese,
  Language.Thai,
  Language.Indonesian,
  Language.Swedish,
  Language.Norwegian,
  Language.Danish,
  Language.Finnish,
] as const;

export type LanguageEntry = {
  code: string;
  label: string;
  ogLocale: string;
  rtl?: true;
};

/**
 * Look up a language entry by its code in the caller's supported list.
 * If the code is not in the list, falls back to the entry where
 * `code === "en"`. Returns the matched entry with a derived `direction`
 * field ("ltr" or "rtl") computed from the entry's `rtl` flag.
 *
 * Throws if the code is unknown AND "en" is not in the supported
 * list — that combination is a misconfiguration, not a runtime
 * condition to handle.
 */
export function getCurrentValidLanguage<L extends LanguageEntry>(
  code: string,
  supportedLanguages: readonly L[]
): L & { direction: "ltr" | "rtl" } {
  const found = supportedLanguages.find((l) => l.code === code);
  if (found !== undefined) {
    return { ...found, direction: found.rtl === true ? "rtl" : "ltr" };
  }
  const english = supportedLanguages.find((l) => l.code === "en");
  if (english === undefined) {
    throw new Error(
      `getCurrentValidLanguage: code "${code}" is not in supportedLanguages, and the "en" fallback is also missing`
    );
  }
  return { ...english, direction: english.rtl === true ? "rtl" : "ltr" };
}

/**
 * Parse an HTTP `Accept-Language` header and return the best match
 * against the caller's supported language codes. Used to route a
 * user's first visit to their preferred language when they hit `/`
 * (the edge redirect) or any other context where the user's
 * language preference is unknown.
 *
 * The Accept-Language header format (per RFC 7231):
 *   Accept-Language: en-US,en;q=0.9,fr;q=0.8
 * Each comma-separated entry may carry a `;q=` quality factor
 * (0.0 to 1.0). Browsers list languages in preference order
 * (highest first, or insertion order if q-values are absent).
 *
 * The matching algorithm for each entry (in order):
 *   1. Strip the `;q=...` quality factor
 *   2. Try exact match (case-insensitive) against the supported set
 *   3. If the base language is `zh`, split into Simplified vs
 *      Traditional based on whether the tag contains "hant"
 *   4. Otherwise, fall back to the base language (e.g. `fr-CA` -> `fr`)
 *
 * The first match wins. Returns `null` if no tag in the header
 * matches any supported code — the caller decides the fallback
 * (typically `"en"`).
 *
 * @param header - The raw `Accept-Language` header value, or `null`
 * @param supported - The set of supported language codes
 * @returns The best-matching supported code, or `null` if no match
 */
export function resolveAcceptLanguage(
  header: string | null,
  supported: ReadonlySet<string>
): string | null {
  if (header === null || header === "") return null;
  for (const part of header.split(",")) {
    // Strip quality factor: "en;q=0.9" -> "en"
    const tag = part.split(";")[0].trim();
    if (tag === "") continue;
    // Exact match (case-sensitive first, then case-insensitive)
    if (supported.has(tag)) return tag;
    const lower = tag.toLowerCase();
    if (supported.has(lower)) return lower;
    // Chinese needs special handling: "zh-CN" and "zh-TW" map to
    // different language codes (Simplified vs Traditional).
    const base = lower.split("-")[0];
    if (base === "zh") {
      return lower.includes("hant") ? "zh-Hant" : "zh-Hans";
    }
    // Base-language fallback: "fr-CA" -> "fr", "pt-BR" -> "pt"
    for (const code of supported) {
      if (code.startsWith(`${base}-`) || code === base) return code;
    }
  }
  return null;
}
