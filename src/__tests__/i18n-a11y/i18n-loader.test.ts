import { describe, expect, it } from "vitest"
import { getDictionary, isDictionaryLoaded } from "@/lib/i18n"
import { loadLanguage } from "@/lib/i18n-loader"
import enDict from "@/lib/translations/en.json"

describe("i18n-loader", () => {
  it("always returns the English dictionary regardless of requested language", async () => {
    // English-only design: everything is already loaded and defaults to English
    expect(isDictionaryLoaded("en")).toBe(true)
    expect(isDictionaryLoaded("fr")).toBe(true)

    const dictEn = await loadLanguage("en")
    const dictFr = await loadLanguage("fr")

    expect(dictEn).toBe(getDictionary("en"))
    expect(dictFr).toBe(getDictionary("en"))
    expect(dictEn).toEqual(enDict)
    expect(dictFr).toEqual(enDict)
  })
})
