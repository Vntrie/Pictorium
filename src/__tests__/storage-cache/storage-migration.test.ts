import { beforeEach, describe, expect, it } from "vitest"
import { migrateLegacyStorage } from "@/lib/storage-migration"

beforeEach(() => {
  localStorage.clear()
})

describe("migrateLegacyStorage", () => {
  it("copies legacy posterium_* keys to FLAMEFORGE_* and removes the old ones", () => {
    localStorage.setItem("posterium_theme", "light")
    localStorage.setItem("posterium_onboarding_done", "true")

    migrateLegacyStorage()

    expect(localStorage.getItem("FLAMEFORGE_theme")).toBe("light")
    expect(localStorage.getItem("FLAMEFORGE_onboarding_done")).toBe("true")
    expect(localStorage.getItem("posterium_theme")).toBeNull()
    expect(localStorage.getItem("posterium_onboarding_done")).toBeNull()
  })

  it("does not overwrite existing FLAMEFORGE_* values", () => {
    localStorage.setItem("posterium_theme", "light")
    localStorage.setItem("FLAMEFORGE_theme", "dark")

    migrateLegacyStorage()

    expect(localStorage.getItem("FLAMEFORGE_theme")).toBe("dark")
    expect(localStorage.getItem("posterium_theme")).toBeNull()
  })

  it("normalizes legacy posterium-* catalog IDs inside saved lists", () => {
    localStorage.setItem("posterium_disabled_catalogs", JSON.stringify(["posterium-jw-movies", "FlameForge-anime"]))
    localStorage.setItem("posterium_catalog_renames", JSON.stringify({ "posterium-anime": "Anime" }))

    migrateLegacyStorage()

    expect(JSON.parse(localStorage.getItem("FLAMEFORGE_disabled_catalogs")!)).toEqual([
      "FlameForge-jw-movies",
      "FlameForge-anime",
    ])
    expect(JSON.parse(localStorage.getItem("FLAMEFORGE_catalog_renames")!)).toEqual({
      "FlameForge-anime": "Anime",
    })
  })

  it("is idempotent and leaves neutral keys untouched", () => {
    localStorage.setItem("posterium_theme", "light")
    localStorage.setItem("tmdb_key", "k")
    localStorage.setItem("preferred_lang", "it")

    migrateLegacyStorage()
    migrateLegacyStorage()

    expect(localStorage.getItem("FLAMEFORGE_theme")).toBe("light")
    expect(localStorage.getItem("tmdb_key")).toBe("k")
    expect(localStorage.getItem("preferred_lang")).toBe("it")
  })
})


