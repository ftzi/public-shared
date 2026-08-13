/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import nodePath from "node:path";

// ---------------------------------------------------------------------------
// Generic locale test helper — shared across mobile, API, landing page.
//
// Usage in a project's tests/locales.test.ts:
//
//   import { runLocaleTests } from "@ftzi/shared/locale-tests";
//
//   runLocaleTests({
//     localesDir: new URL("../locales", import.meta.url).pathname,
//     sourceDir: new URL("..", import.meta.url).pathname,
//   });
//
// Dead-key detection (unused keys in en.po) was previously a "sourceDir" scan
// but has been removed. Use `lingui extract --clean` (run in the i18n:extract
// script before tests) to strip unused keys from .po files automatically — it's
// the source of truth for "what keys exist".
// ---------------------------------------------------------------------------

type LocaleTree = { [key: string]: string | LocaleTree | unknown[] };

function isContainer(value: unknown): value is LocaleTree | unknown[] {
  return value !== null && typeof value === "object";
}

function collectKeys(obj: unknown, prefix = ""): Set<string> {
  const keys = new Set<string>();
  if (!isContainer(obj)) return keys;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const fullKey = prefix ? `${prefix}.${i}` : String(i);
      keys.add(fullKey);
      for (const k of collectKeys(obj[i], fullKey)) keys.add(k);
    }
    return keys;
  }
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.add(fullKey);
    for (const k of collectKeys(value, fullKey)) keys.add(k);
  }
  return keys;
}

function collectLeafs(obj: unknown, prefix = ""): Map<string, string> {
  const leafs = new Map<string, string>();
  if (!isContainer(obj)) return leafs;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const fullKey = prefix ? `${prefix}.${i}` : String(i);
      for (const [k, v] of collectLeafs(obj[i], fullKey)) leafs.set(k, v);
    }
    return leafs;
  }
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isContainer(value)) {
      for (const [k, v] of collectLeafs(value, fullKey)) leafs.set(k, v);
    } else if (typeof value === "string") {
      leafs.set(fullKey, value);
    }
  }
  return leafs;
}

function collectEmpties(obj: unknown, prefix = ""): string[] {
  const empties: string[] = [];
  if (!isContainer(obj)) return empties;
  if (Array.isArray(obj)) {
    if (obj.length === 0) empties.push(prefix);
    else {
      for (let i = 0; i < obj.length; i++) {
        empties.push(
          ...collectEmpties(obj[i], prefix ? `${prefix}.${i}` : String(i))
        );
      }
    }
    return empties;
  }
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isContainer(value)) {
      if (
        (Array.isArray(value) ? value.length : Object.keys(value).length) === 0
      ) {
        empties.push(fullKey);
      } else {
        empties.push(...collectEmpties(value, fullKey));
      }
    } else if (typeof value === "string" && value === "") {
      empties.push(fullKey);
    }
  }
  return empties;
}

// ICU interpolation params: {param}. Doubled braces {{x}} are NOT params —
// they render as literal braces around the placeholder, so they must fail
// the param-parity gate instead of passing as if they were {x}.
const INTERPOLATION = /(?<!\{)\{(\w+)\}/g;

function extractParams(value: string): Set<string> {
  const params = new Set<string>();
  for (const match of value.matchAll(INTERPOLATION)) {
    params.add(match[1] ?? match[2] ?? "");
  }
  return params;
}

// ---------------------------------------------------------------------------
// Source code scanning removed. Dead-key detection (unused keys in en.po)
// is now handled by `lingui extract --clean` which the `i18n:extract` script
// runs before the test suite. Regex-based source scanning was unreliable:
// false positives from matching JSX subtree bodies as fake keys, and false
// negatives from missing keys with nested tags. An AST-based scanner would
// be correct but is a much larger project. The .po file tests below still
// validate parity, empty msgstr, and ICU param matching.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PO file parser
// ---------------------------------------------------------------------------
// PO file parser
// ---------------------------------------------------------------------------

function parsePo(content: string): Map<string, string> {
  const entries = new Map<string, string>();
  let id = "";
  let str = "";
  let inStr = false;

  function flush() {
    if (id !== "") entries.set(id, str);
    id = "";
    str = "";
    inStr = false;
  }

  for (const raw of content.split("\n")) {
    const line = raw.replace(/^\uFEFF/, "").trim();
    if (line === "" || line.startsWith("#")) continue;

    if (line.startsWith('"')) {
      const m = /^"((?:[^"\\]|\\.)*)"/.exec(line);
      const val = m?.[1] ?? "";
      if (inStr) str += val;
      else id += val;
    } else if (line.startsWith("msgid ")) {
      flush();
      const m = /^msgid\s+"((?:[^"\\]|\\.)*)"/.exec(line);
      id = m?.[1] ?? "";
    } else if (line.startsWith("msgstr ")) {
      inStr = true;
      const m = /^msgstr\s+"((?:[^"\\]|\\.)*)"/.exec(line);
      str = m?.[1] ?? "";
    }
  }

  flush();
  return entries;
}

function loadJsonLocale(localesDir: string, file: string): unknown {
  return JSON.parse(readFileSync(nodePath.join(localesDir, file), "utf-8"));
}

// ---------------------------------------------------------------------------

export type LocaleTestConfig = {
  localesDir: string;
  format?: "json" | "po";
};

export function runLocaleTests(config: LocaleTestConfig): void {
  const { localesDir, format = "json" } = config;

  let enKeys: Set<string>;
  let enLeafs: Map<string, string>;

  if (format === "po") {
    const enPo = parsePo(
      readFileSync(nodePath.join(localesDir, "en", "messages.po"), "utf-8")
    );
    enKeys = new Set(enPo.keys());
    enLeafs = enPo;

    const localeIds = readdirSync(localesDir)
      .filter(
        (name) =>
          name !== "en" &&
          statSync(nodePath.join(localesDir, name)).isDirectory() &&
          readdirSync(nodePath.join(localesDir, name)).includes("messages.po")
      )
      .toSorted();

    describe("locale key parity (PO format)", () => {
      test("en/messages.po has no empty msgstr values", () => {
        const empties = [...enLeafs.entries()]
          .filter(([, v]) => v === "")
          .map(([k]) => k);
        expect(empties).toStrictEqual([]);
      });

      test("no em dashes (U+2014) in any msgstr value", () => {
        const offenders: string[] = [];
        for (const locale of ["en", ...localeIds]) {
          const po = parsePo(
            readFileSync(
              nodePath.join(localesDir, locale, "messages.po"),
              "utf-8"
            )
          );
          for (const [key, value] of po) {
            if (value.includes("—")) {
              offenders.push(`${locale}/${key}: ${value}`);
            }
          }
        }
        expect(offenders).toStrictEqual([]);
      });

      test.each(localeIds)(
        "%s/messages.po has same msgids as en",
        (locale: string) => {
          const po = parsePo(
            readFileSync(
              nodePath.join(localesDir, locale, "messages.po"),
              "utf-8"
            )
          );
          const lKeys = new Set(po.keys());
          const missing = [...enKeys].filter((k) => !lKeys.has(k)).toSorted();
          const extra = [...lKeys].filter((k) => !enKeys.has(k)).toSorted();
          expect(
            missing,
            `missing msgids in ${locale}/messages.po`
          ).toStrictEqual([]);
          expect(extra, `extra msgids in ${locale}/messages.po`).toStrictEqual(
            []
          );
        }
      );

      test.each(localeIds)(
        "%s/messages.po has no empty msgstr values",
        (locale: string) => {
          const po = parsePo(
            readFileSync(
              nodePath.join(localesDir, locale, "messages.po"),
              "utf-8"
            )
          );
          const empties = [...po.entries()]
            .filter(([, v]) => v === "")
            .map(([k]) => k);
          expect(empties).toStrictEqual([]);
        }
      );

      test.each(localeIds)(
        "%s/messages.po interpolation params match en",
        (locale: string) => {
          const po = parsePo(
            readFileSync(
              nodePath.join(localesDir, locale, "messages.po"),
              "utf-8"
            )
          );
          const mismatches: string[] = [];
          for (const [key, enVal] of enLeafs) {
            const lVal = po.get(key);
            if (lVal === undefined) continue;
            const enP = extractParams(enVal);
            const lP = extractParams(lVal);
            if (enP.size !== lP.size || [...enP].some((p) => !lP.has(p))) {
              mismatches.push(
                `"${key}": expected params [${[...enP].join(", ")}], got [${[...lP].join(", ")}]`
              );
            }
          }
          expect(mismatches).toStrictEqual([]);
        }
      );
    });
  } else {
    const en = JSON.parse(
      readFileSync(nodePath.join(localesDir, "en.json"), "utf-8")
    ) as unknown;
    enKeys = collectKeys(en);
    enLeafs = collectLeafs(en);

    const enParams = new Map<string, Set<string>>();
    for (const [key, value] of enLeafs) {
      enParams.set(key, extractParams(value));
    }

    const localeFiles = readdirSync(localesDir)
      .filter((f: string) => nodePath.extname(f) === ".json" && f !== "en.json")
      .toSorted();

    describe("locale key parity (JSON format)", () => {
      test("en.json has no empty values or objects", () => {
        expect(collectEmpties(en)).toStrictEqual([]);
      });

      test.each([...localeFiles])(
        "%s has same keys as en.json",
        (file: string) => {
          const locale = loadJsonLocale(localesDir, file);
          const localeKeys = collectKeys(locale);
          const missing = [...enKeys]
            .filter((k) => !localeKeys.has(k))
            .toSorted();
          const extra = [...localeKeys]
            .filter((k) => !enKeys.has(k))
            .toSorted();
          expect(missing, `missing keys in ${file}`).toStrictEqual([]);
          expect(extra, `extra keys in ${file}`).toStrictEqual([]);
        }
      );

      test.each([...localeFiles])(
        "%s has no empty values or objects",
        (file: string) => {
          const locale = loadJsonLocale(localesDir, file);
          expect(collectEmpties(locale)).toStrictEqual([]);
        }
      );

      test.each([...localeFiles])(
        "%s interpolation params match en.json",
        (file: string) => {
          const locale = loadJsonLocale(localesDir, file);
          const localeLeafs = collectLeafs(locale);
          const mismatches: string[] = [];
          for (const [key] of enLeafs) {
            const lVal = localeLeafs.get(key);
            if (lVal === undefined) continue;
            const enP = enParams.get(key) ?? new Set();
            const lP = extractParams(lVal);
            if (enP.size !== lP.size || [...enP].some((p) => !lP.has(p))) {
              mismatches.push(
                `"${key}": expected params [${[...enP].join(", ")}], got [${[...lP].join(", ")}]`
              );
            }
          }
          expect(mismatches).toStrictEqual([]);
        }
      );
    });
  }

  // ---------- End of locale tests ----------
  // Dead-key detection (unused keys in en.po) was previously here as
  // `describe("dead i18n keys", ...)`. It was removed because:
  //   1. `lingui extract --clean` (in i18n:extract) strips unused keys from
  //      .po files automatically — it's the source of truth.
  //   2. The regex-based source scanner was unreliable (false positives from
  //      JSX subtree bodies, false negatives from nested tags).
  //   3. An AST-based scanner would be correct but is a much larger project.
}
