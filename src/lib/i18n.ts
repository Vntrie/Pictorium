import en from "./translations/en.json"

export type Lang = "en"
export type Dictionary = Record<string, string>

const dicts: Record<string, Dictionary> = { en }

export const BADGE_KEY_PREFIX = "__"

export function isPrefixedKey(val: string): boolean {
  return val.startsWith(BADGE_KEY_PREFIX)
}

export function badgeKey(val: string): string {
  return isPrefixedKey(val) ? val.slice(BADGE_KEY_PREFIX.length) : val
}

export function resolveLabel(val: string): string {
  return isPrefixedKey(val) ? t(badgeKey(val)) : val
}

export function resolveLabelFor(val: string, _lang: string): string {
  return isPrefixedKey(val) ? createT("en")(badgeKey(val)) : val
}

export function isRankKey(val: string | null): string | null {
  if (!val) return null
  if (isPrefixedKey(val)) {
    const key = badgeKey(val)
    if (key === "badge.today" || key === "badge.anime" || key === "badge.movie" || key === "badge.series") return key
    return null
  }
  if (val === "Today") return "badge.today"
  if (val === "Anime") return "badge.anime"
  if (val === "Movie") return "badge.movie"
  if (val === "TV series" || val === "Series") return "badge.series"
  return null
}

export function baseLangCode(_lang: string): string { return "en" }
export function isRtlLang(_lang: string): boolean { return false }
export function documentDirectionFor(_lang: string): "rtl" | "ltr" { return "ltr" }

export const DOCUMENT_LANG_PREPAINT_SCRIPT = `(function(){try{localStorage.setItem("preferred_lang","en");}catch(e){}document.documentElement.setAttribute("lang","en");document.documentElement.setAttribute("dir","ltr");})();`

export function setLang(_lang: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = "en"
    document.documentElement.dir = "ltr"
  }
}

export function getLang(): string { return "en" }
export function canonicalDictLang(_lang: string): string { return "en" }
export function registerDictionary(_lang: string, dict: Dictionary): void { dicts["en"] = dict }
export function isDictionaryLoaded(_lang: string): boolean { return true }
export function getDictionary(_lang: string): Dictionary | undefined { return dicts["en"] }

function lookup(_lang: string, key: string): string | undefined {
  return dicts["en"]?.[key]
}

export function t(key: string, params?: Record<string, string | number>): string {
  let val = lookup("en", key) ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replaceAll(`{${k}}`, String(v))
    }
  }
  return val
}

export function createT(_lang: string) {
  return (key: string, params?: Record<string, string | number>): string => {
    let val = lookup("en", key) ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replaceAll(`{${k}}`, String(v))
      }
    }
    return val
  }
}

