import { describe, expect, it } from "vitest"
import { getRegionDef, REGIONS } from "@/lib/regions"
import { getWarmupCatalogs, normalizeCatalogId, normalizeCatalogIdKeys, normalizeCatalogIdList, FLAMEFORGE_CATALOGS, regionJwName, WARMUP_CATALOG_IDS } from "@/lib/catalog-definitions"

describe("catalog definitions", () => {
  it("keeps warmup catalog IDs backed by manifest catalogs", () => {
    const manifestIds: Set<string> = new Set(FLAMEFORGE_CATALOGS.map((catalog) => catalog.id))

    const warmupCatalogs = getWarmupCatalogs()

    expect(warmupCatalogs.map((catalog) => catalog.id)).toEqual([
      "FlameForge-jw-movies",
      "FlameForge-jw-series",
      "FlameForge-netflix-movies",
      "FlameForge-netflix-series",
      "FlameForge-prime-movies",
      "FlameForge-prime-series",
      "FlameForge-anime-movies",
      "FlameForge-anime",
    ])
    expect(warmupCatalogs.every((catalog) => manifestIds.has(catalog.id))).toBe(true)
    expect(warmupCatalogs.map((catalog) => catalog.type)).toEqual(["movie", "series", "movie", "series", "movie", "series", "movie", "series"])
    expect(WARMUP_CATALOG_IDS).toHaveLength(8)
  })

  it("emits only FlameForge-* catalog IDs", () => {
    expect(FLAMEFORGE_CATALOGS.every((catalog) => catalog.id.startsWith("FlameForge-"))).toBe(true)
  })

  it("normalizes legacy posterium-* IDs to FlameForge-*", () => {
    expect(normalizeCatalogId("posterium-jw-movies")).toBe("FlameForge-jw-movies")
    expect(normalizeCatalogId("posterium-custom-movie-x")).toBe("FlameForge-custom-movie-x")
    expect(normalizeCatalogId("FlameForge-jw-movies")).toBe("FlameForge-jw-movies")
    expect(normalizeCatalogIdList(["posterium-jw-movies", "FlameForge-anime"])).toEqual([
      "FlameForge-jw-movies",
      "FlameForge-anime",
    ])
    expect(normalizeCatalogIdList(undefined)).toBeUndefined()
    expect(normalizeCatalogIdKeys({ "posterium-anime": "Anime", other: "x" })).toEqual({
      "FlameForge-anime": "Anime",
      other: "x",
    })
  })

  describe("regionJwName (bandiera dinamica)", () => {
    it("segue flag e label della regione per i Top 20 JW", () => {
      expect(regionJwName("FlameForge-jw-movies", "movie", getRegionDef("IT"))).toBe("🇮🇹 Top 20 Italia — Film")
      expect(regionJwName("FlameForge-jw-series", "series", getRegionDef("IT"))).toBe("🇮🇹 Top 20 Italia — Serie TV")
      expect(regionJwName("FlameForge-jw-movies", "movie", getRegionDef("DE"))).toBe("🇩🇪 Top 20 Germania — Film")
      expect(regionJwName("FlameForge-jw-series", "series", getRegionDef("JP"))).toBe("🇯🇵 Top 20 Giappone — Serie TV")
      expect(regionJwName("FlameForge-jw-movies", "movie", getRegionDef("PL"))).toBe("🇵🇱 Top 20 Polonia — Film")
      expect(regionJwName("FlameForge-jw-series", "series", getRegionDef("PL"))).toBe("🇵🇱 Top 20 Polonia — Serie TV")
    })

    it("copre tutte le regioni senza resti della precedente", () => {
      for (const region of REGIONS) {
        const movie = regionJwName("FlameForge-jw-movies", "movie", region)
        const series = regionJwName("FlameForge-jw-series", "series", region)
        expect(movie).toContain(region.flag)
        expect(movie).toContain(region.label)
        expect(series).toContain(region.flag)
        expect(series).toContain(region.label)
        // Mai la bandiera di un'altra regione
        for (const other of REGIONS) {
          if (other.code === region.code) continue
          expect(movie).not.toContain(other.flag)
        }
      }
    })

    it("gestisce Ultime Uscite e ignora i non-JW", () => {
      expect(regionJwName("FlameForge-jw-new-movies", "movie", getRegionDef("FR"))).toBe("🇫🇷 Ultime Uscite Francia — Film")
      expect(regionJwName("FlameForge-netflix-movies", "movie", getRegionDef("DE"))).toBeNull()
      expect(regionJwName("FlameForge-anime", "series", getRegionDef("DE"))).toBeNull()
    })
  })
})


