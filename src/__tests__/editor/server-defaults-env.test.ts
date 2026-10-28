import { afterEach, describe, expect, it, vi } from "vitest"

// Store KV in-memory: valida il cablaggio server-defaults -> kv.ts ->
// @vercel/kv senza rete. Attivo solo con KV_REST_API_URL/TOKEN.
const kvStore = vi.hoisted(() => new Map<string, unknown>())
vi.mock("@vercel/kv", () => ({
  kv: {
    get: async (key: string) => kvStore.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      kvStore.set(key, value)
    },
  },
}))

// ENV_DEFAULTS è letto a module-load (vedi best-fit-config.test.ts): reset + reimport.
// FLAMEFORGE_DATA_DIR punta a una dir vuota così getServerDefaults non legge il
// defaults.json reale del repo (che vincerebbe sull'env per design).
const EMPTY_DIR = "__empty_defaults_dir__"
async function importDefaults() {
  vi.resetModules()
  process.env.FLAMEFORGE_DATA_DIR = EMPTY_DIR
  return import("@/lib/server-defaults")
}

describe("server-defaults — ENV_DEFAULTS (default di stile d'istanza)", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    for (const name of [
      "FLAMEFORGE_GLOBAL_BADGES", "FLAMEFORGE_RANKING_BADGES", "FLAMEFORGE_BADGE_GENRE",
      "FLAMEFORGE_BADGE_YEAR", "FLAMEFORGE_BADGE_RATING", "FLAMEFORGE_BLUR_ENABLED",
      "FLAMEFORGE_NETWORK_LOGO", "FLAMEFORGE_AUTO_ROTATE_CLEAN", "FLAMEFORGE_LOGO_FIT_ENABLED",
      "FLAMEFORGE_BADGE_STYLE", "FLAMEFORGE_RANKING_BADGE_STYLE", "FLAMEFORGE_RIBBON_SIDE",
      "FLAMEFORGE_BLUR_INTENSITY", "FLAMEFORGE_BLUR_FADE", "FLAMEFORGE_BLUR_DARKNESS",
      "FLAMEFORGE_GRADIENT_HEIGHT", "FLAMEFORGE_DATA_DIR",
      "FLAMEFORGE_DISABLE_CLEAN_POSTERS", "FLAMEFORGE_DISABLE_CLEAN_POSTERS",
      "KV_REST_API_URL", "KV_REST_API_TOKEN",
    ]) {
      delete process.env[name]
    }
    kvStore.clear()
    vi.resetModules()
  })

  it("getServerDefaults ritorna i valori da env quando non ci sono salvati", async () => {
    process.env.FLAMEFORGE_GLOBAL_BADGES = "0"
    process.env.FLAMEFORGE_RANKING_BADGES = "0"
    process.env.FLAMEFORGE_BADGE_GENRE = "0"
    process.env.FLAMEFORGE_BADGE_YEAR = "0"
    process.env.FLAMEFORGE_NETWORK_LOGO = "0"
    process.env.FLAMEFORGE_BLUR_INTENSITY = "8"

    const { getServerDefaults } = await importDefaults()
    const sd = getServerDefaults()

    expect(sd.globalBadges).toBe(false)
    expect(sd.rankingBadges).toBe(false)
    expect(sd.badgeGenre).toBe(false)
    expect(sd.badgeYear).toBe(false)
    expect(sd.networkLogo).toBe(false)
    expect(sd.blurIntensity).toBe(8)
  })

  it("valori on/true/1 sono riconosciuti", async () => {
    process.env.FLAMEFORGE_GLOBAL_BADGES = "true"
    process.env.FLAMEFORGE_BADGE_YEAR = "1"
    const { getServerDefaults } = await importDefaults()
    const sd = getServerDefaults()
    expect(sd.globalBadges).toBe(true)
    expect(sd.badgeYear).toBe(true)
  })

  it("valori non validi vengono ignorati (nessun campo forzato)", async () => {
    process.env.FLAMEFORGE_BADGE_STYLE = "not-a-real-style"
    process.env.FLAMEFORGE_RIBBON_SIDE = "up"
    process.env.FLAMEFORGE_BLUR_INTENSITY = "abc"
    const { getServerDefaults } = await importDefaults()
    const sd = getServerDefaults()
    expect(sd.badgeStyle).toBeUndefined()
    expect(sd.ribbonSide).toBeUndefined()
    expect(sd.blurIntensity).toBeUndefined()
  })

  it("senza env il risultato è vuoto (comportamento di default)", async () => {
    const { getServerDefaults } = await importDefaults()
    expect(getServerDefaults()).toEqual({})
  })

  it("FLAMEFORGE_DISABLE_CLEAN_POSTERS abilita l'esclusione dei clean", async () => {
    process.env.FLAMEFORGE_DISABLE_CLEAN_POSTERS = "1"
    const { getServerDefaults } = await importDefaults()
    expect(getServerDefaults().disableCleanPosters).toBe(true)
  })

  it("user defaults: set/get round-trip sulla KV condivisa tra istanze", async () => {
    process.env.KV_REST_API_URL = "https://example.upstash.io"
    process.env.KV_REST_API_TOKEN = "test-token"
    const userId = "33333333-3333-4333-8333-333333333333"
    const mod = await importDefaults()
    await mod.setServerDefaultsForUser(userId, { badgeGenre: false })
    expect(await mod.getStoredUserDefaults(userId)).toEqual({ badgeGenre: false })

    // Altra istanza (modulo ricaricato, cache vuota): legge dalla KV condivisa.
    const reloaded = await importDefaults()
    expect(await reloaded.getStoredUserDefaults(userId)).toEqual({ badgeGenre: false })
  })

  it("a delayed cold-start warm cannot overwrite checked defaults", async () => {
    process.env.KV_REST_API_URL = "https://example.upstash.io"
    process.env.KV_REST_API_TOKEN = "test-token"
    const mod = await importDefaults()
    const { getKv } = await import("@/lib/kv")
    let finishWarm!: (value: { blurIntensity: number }) => void
    const oldRead = new Promise<{ blurIntensity: number }>((resolve) => { finishWarm = resolve })
    vi.spyOn(getKv(), "get").mockImplementationOnce(async () => await oldRead as never)
    mod.getServerDefaults()

    kvStore.set("defaults", { blurIntensity: 77 })
    kvStore.set("catalog_epoch", "new")
    expect((await mod.getServerDefaultsChecked()).blurIntensity).toBe(77)
    finishWarm({ blurIntensity: 20 })
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect((await mod.getServerDefaultsChecked()).blurIntensity).toBe(77)
  })
})


