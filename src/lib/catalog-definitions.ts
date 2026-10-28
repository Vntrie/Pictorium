import type { RegionDef } from "./regions"

export const CATALOG_ID_PREFIX = "FlameForge-"

/** Prefisso legacy pre-rename: accettato in ingresso (alias), mai più emesso. */
export const LEGACY_CATALOG_ID_PREFIX = "posterium-"

export type FlameForgeCatalogType = "movie" | "series"

export type FlameForgeCatalogDefinition = {
  readonly id: string
  readonly name: string
  readonly type: FlameForgeCatalogType
}

export const FLAMEFORGE_CATALOGS = [
  { id: "FlameForge-jw-movies", name: "🇮🇹 Top 20 Italia — Film", type: "movie" },
  { id: "FlameForge-jw-series", name: "🇮🇹 Top 20 Italia — Serie TV", type: "series" },
  { id: "FlameForge-netflix-movies", name: "🔴 Netflix — Film", type: "movie" },
  { id: "FlameForge-netflix-series", name: "🔴 Netflix — Serie TV", type: "series" },
  { id: "FlameForge-prime-movies", name: "📦 Prime Video — Film", type: "movie" },
  { id: "FlameForge-prime-series", name: "📦 Prime Video — Serie TV", type: "series" },
  { id: "FlameForge-disney-movies", name: "🏰 Disney+ — Film", type: "movie" },
  { id: "FlameForge-disney-series", name: "🏰 Disney+ — Serie TV", type: "series" },
  { id: "FlameForge-now-movies", name: "☁️ Sky Go / NOW — Film", type: "movie" },
  { id: "FlameForge-now-series", name: "☁️ Sky Go / NOW — Serie TV", type: "series" },
  { id: "FlameForge-apple-movies", name: "🍎 Apple TV+ — Film", type: "movie" },
  { id: "FlameForge-apple-series", name: "🍎 Apple TV+ — Serie TV", type: "series" },
  { id: "FlameForge-hbo-movies", name: "🟣 HBO Max — Film", type: "movie" },
  { id: "FlameForge-hbo-series", name: "🟣 HBO Max — Serie TV", type: "series" },
  { id: "FlameForge-paramount-movies", name: "🏔️ Paramount+ — Film", type: "movie" },
  { id: "FlameForge-paramount-series", name: "🏔️ Paramount+ — Serie TV", type: "series" },
  { id: "FlameForge-crunchyroll-series", name: "🍥 Crunchyroll — Anime & Serie", type: "series" },
  { id: "FlameForge-crunchyroll-movies", name: "🍥 Crunchyroll — Film Anime", type: "movie" },
  { id: "FlameForge-anime-movies", name: "⛩️ Top 20 Film Anime", type: "movie" },
  { id: "FlameForge-anime", name: "⛩️ Top 20 Serie Anime", type: "series" },
] as const satisfies readonly FlameForgeCatalogDefinition[]

export type StremioCatalogExtra = {
  readonly name: string
  readonly isRequired?: boolean
  readonly options?: readonly string[]
}

export type FlameForgeManifestCatalog = {
  id: string
  name: string
  type: FlameForgeCatalogType
  extra?: readonly StremioCatalogExtra[]
}

export const FLAMEFORGE_SEARCH_CATALOGS = [
  { id: "FlameForge-search-movies", name: "🔍 FlameForge — Cerca Film", type: "movie" },
  { id: "FlameForge-search-series", name: "🔍 FlameForge — Cerca Serie TV", type: "series" },
] as const satisfies readonly FlameForgeCatalogDefinition[]

export const FLAMEFORGE_PEOPLE_SEARCH_CATALOGS = [
  { id: "FlameForge-search-people-movies", name: "🔍 FlameForge — Cerca per Persona (Film)", type: "movie" },
  { id: "FlameForge-search-people-series", name: "🔍 FlameForge — Cerca per Persona (Serie TV)", type: "series" },
] as const satisfies readonly FlameForgeCatalogDefinition[]

export const WARMUP_CATALOG_IDS = [
  "FlameForge-jw-movies",
  "FlameForge-jw-series",
  "FlameForge-netflix-movies",
  "FlameForge-netflix-series",
  "FlameForge-prime-movies",
  "FlameForge-prime-series",
  "FlameForge-anime-movies",
  "FlameForge-anime",
] as const

const WARMUP_CATALOG_ID_SET: ReadonlySet<string> = new Set(WARMUP_CATALOG_IDS)

export function getWarmupCatalogs(): readonly FlameForgeCatalogDefinition[] {
  return FLAMEFORGE_CATALOGS.filter((catalog) => WARMUP_CATALOG_ID_SET.has(catalog.id))
}

/**
 * Normalizza un ID catalogo: gli ID legacy `posterium-*` (addon già installati,
 * config salvate, localStorage) vengono mappati al canonico `FlameForge-*`.
 * Gli ID già canonici o custom senza prefisso passano invariati.
 */
export function normalizeCatalogId(id: string): string {
  if (id.startsWith(LEGACY_CATALOG_ID_PREFIX)) {
    return `${CATALOG_ID_PREFIX}${id.slice(LEGACY_CATALOG_ID_PREFIX.length)}`
  }
  return id
}

/** Canonical built-in anime Top 10 ids (service-agnostic, both modes). */
const ANIME_BUILTIN_CATALOG_IDS: ReadonlySet<string> = new Set<string>([
  "FlameForge-anime-movies",
  "FlameForge-anime",
]);

/**
 * True for the built-in anime classification catalogs (canonical ids plus
 * legacy `posterium-*` aliases via the existing normalizer). ONLY these
 * ids: never infer anime-ness from provider/service/user names (a custom
 * list called "Anime" or a Crunchyroll streaming row is not one).
 */
export function isAnimeBuiltinCatalogId(id: string): boolean {
  return ANIME_BUILTIN_CATALOG_IDS.has(normalizeCatalogId(id));
}

/**
 * Stable anime-last partition ("gli anime mettiamoli sempre alla fine"):
 * built-in anime catalogs move after every other chart, relative user
 * order preserved within both groups. Pure reorder — never filters,
 * duplicates, or resurrects (apply AFTER the disabled/hidden filters).
 * Explicitly supersedes catalogOrder for the anime group only.
 */
export function partitionAnimeCatalogsLast<T extends { readonly id: string }>(list: readonly T[]): T[] {
  const head: T[] = [];
  const tail: T[] = [];
  for (const item of list) {
    if (isAnimeBuiltinCatalogId(item.id)) tail.push(item);
    else head.push(item);
  }
  return [...head, ...tail];
}

/** Normalizza una lista di ID catalogo (disabled/order); `undefined` passa invariato. */
export function normalizeCatalogIdList(ids: readonly string[] | undefined): string[] | undefined {
  if (!ids) return undefined
  return ids.map(normalizeCatalogId)
}

/**
 * Normalizza le chiavi di un record indicizzato per ID catalogo (renames);
 * `undefined`/`null` passano invariati.
 */
export function normalizeCatalogIdKeys(record: Record<string, string> | undefined | null): Record<string, string> | undefined {
  if (!record) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(record)) out[normalizeCatalogId(k)] = v
  return out
}

/**
 * Nome dei cataloghi Top 20 / Ultime Uscite JustWatch nella lingua/regione
 * attiva (bandiera dinamica). Ritorna null per i cataloghi non-JW (nome statico).
 * Single source of truth condivisa da manifest Stremio (server) e modal/UI
 * (client): la classifica segue la regione, il nome deve seguirla.
 */
export function regionJwName(id: string, type: "movie" | "series", region: RegionDef): string | null {
  if (id.startsWith("FlameForge-jw-new-")) {
    return `${region.flag} Ultime Uscite ${region.label} — ${type === "movie" ? "Film" : "Serie TV"}`
  }
  if (!id.startsWith("FlameForge-jw-")) return null
  return `${region.flag} Top 20 ${region.label} — ${type === "movie" ? "Film" : "Serie TV"}`
}
