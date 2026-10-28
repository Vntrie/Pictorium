import { test, expect, type APIRequestContext, type Page, type TestInfo } from "@playwright/test"
import { writeFile } from "node:fs/promises"
import { withDefaultsRetry } from "./defaults-retry"

// I test poster girano SENZA TMDB_API_KEY: le chiamate esterne (TMDB, immagini,
// JustWatch, Wikidata, IMDb) vengono servite dal mock server locale
// `e2e/mock-server.mjs`, avviato da playwright.config.ts. Per aggiungere nuovi
// mock, aggiungi un handler in quel file (vedi header del mock server).

const MOVIE_TMDB = 19995 // Avatar (id usato dai dati fittizi del mock server)
const MEDIA_TYPE = "movie"
// Poster path servito dal mock server sotto /t/p/...
const POSTER_PATH = "/mocked/avatar.jpg"

function posterUrl(params: Record<string, string>, mediaType = MEDIA_TYPE, id: number | string = MOVIE_TMDB): string {
  const qs = new URLSearchParams({ ...params, poster: POSTER_PATH, preview: "1" })
  return `/api/poster/${mediaType}/${id}?${qs.toString()}`
}

/**
 * Shared-live-defaults access for the request-only poster tests below, via
 * the existing 429-tolerant retry helper (same rule as every spec's inline
 * PUT/GET: only 429 is retried with the server's Retry-After, anything else
 * throws with status details â€” a failed arrange/restore never silently
 * becomes a pass).
 */
async function readDefaultsJson(request: APIRequestContext, label: string): Promise<Record<string, unknown>> {
  let out: Record<string, unknown> | undefined
  await withDefaultsRetry(
    async () => {
      const res = await request.get("/api/defaults")
      const text = await res.text()
      if (res.ok()) {
        try {
          out = JSON.parse(text) as Record<string, unknown>
        } catch {
          return { ok: false, status: res.status(), body: text.slice(0, 200), retryAfter: res.headers()["retry-after"] ?? null }
        }
      }
      return { ok: res.ok(), status: res.status(), body: text.slice(0, 200), retryAfter: res.headers()["retry-after"] ?? null }
    },
    { label },
  )
  if (!out) throw new Error(`${label}: empty defaults payload`)
  return out
}

async function writeDefaultsJson(request: APIRequestContext, label: string, payload: Record<string, unknown>): Promise<void> {
  await withDefaultsRetry(
    async () => {
      const res = await request.put("/api/defaults", { data: payload })
      return { ok: res.ok(), status: res.status(), body: (await res.text()).slice(0, 200), retryAfter: res.headers()["retry-after"] ?? null }
    },
    { label },
  )
}

// Helper: render a poster URL in the page and return a locator for the <img>
async function renderPoster(page: Page, posterUrl: string) {
  await page.setViewportSize({ width: 1280, height: 1600 })
  // Navigate first so the relative src resolves against the app origin:
  // `setContent` alone leaves baseURI on about:blank and the /api/poster URL
  // would never load.
  // Use a same-origin document without a React root: hydration of the home
  // page can otherwise replace the isolated poster after setContent.
  await page.goto("/api/health")
  await page.setContent(`
    <html>
      <body style="margin:0;background:#000;display:flex;align-items:flex-start;justify-content:center;">
        <img id="poster" src="${posterUrl}" style="display:block;max-width:100%;height:auto;" />
      </body>
    </html>
  `)
  // Wait for the image to fully load
  await page.waitForFunction(() => {
    const img = document.getElementById("poster") as HTMLImageElement
    return img && img.complete && img.naturalWidth > 0
  }, { timeout: 30_000 })
  return page.locator("#poster")
}

//
// â”€â”€â”€ HOME PAGE (no API key needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//

test("home â€” full page", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
      localStorage.setItem("FLAMEFORGE_profile_id", "e2e")
      localStorage.setItem("FLAMEFORGE_profile_stateless", "1")
      localStorage.setItem("FLAMEFORGE_onboarding_done", "true")
      localStorage.setItem("preferred_lang", "it")
      localStorage.setItem("tmdb_key", "")
    } catch {}
  })
  await page.goto("/")
  const logo = page.getByAltText(/FlameForge/)
  const logoFallback = page.getByText(/FlameForge/)
  await expect(logo.or(logoFallback).first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByPlaceholder(/cerca/i)).toBeVisible({ timeout: 30_000 })
  await page.waitForFunction(() => document.body.scrollHeight > window.innerHeight, { timeout: 30_000 })
  await expect(page).toHaveScreenshot("home-fullpage.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.03,
  })
})

test("home â€” hero viewport", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
      localStorage.setItem("FLAMEFORGE_profile_id", "e2e")
      localStorage.setItem("FLAMEFORGE_profile_stateless", "1")
      localStorage.setItem("FLAMEFORGE_onboarding_done", "true")
      localStorage.setItem("preferred_lang", "it")
      localStorage.setItem("tmdb_key", "")
    } catch {}
  })
  await page.goto("/")
  const logo = page.getByAltText(/FlameForge/)
  const logoFallback = page.getByText(/FlameForge/)
  await expect(logo.or(logoFallback).first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByPlaceholder(/cerca/i)).toBeVisible({ timeout: 30_000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page).toHaveScreenshot("home-viewport.png", {
    maxDiffPixelRatio: 0.03,
  })
})

test("home â€” mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    try {
      localStorage.clear()
      localStorage.setItem("FLAMEFORGE_profile_id", "e2e")
      localStorage.setItem("FLAMEFORGE_profile_stateless", "1")
      localStorage.setItem("FLAMEFORGE_onboarding_done", "true")
      localStorage.setItem("preferred_lang", "it")
      localStorage.setItem("tmdb_key", "")
    } catch {}
  })
  await page.goto("/")
  const logo = page.getByAltText(/FlameForge/)
  const logoFallback = page.getByText(/FlameForge/)
  await expect(logo.or(logoFallback).first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByPlaceholder(/cerca/i)).toBeVisible({ timeout: 30_000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page).toHaveScreenshot("home-mobile.png", {
    maxDiffPixelRatio: 0.03,
  })
})

test("home with key â€” hero podium and status strip", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      // Podio: la scelta dei 2 film + 1 serie Ã¨ random a ogni refresh (Fisherâ€“
      // Yates su Math.random) â†’ stub costante per screenshot deterministici.
      Math.random = () => 0
      localStorage.setItem("FLAMEFORGE_profile_id", "e2e")
      localStorage.setItem("FLAMEFORGE_profile_stateless", "1")
      localStorage.setItem("FLAMEFORGE_onboarding_done", "true")
      localStorage.setItem("preferred_lang", "it")
      localStorage.setItem("tmdb_key", "e2e-key")
    } catch {}
  })
  // Congela marquee/bob/pulse: screenshot deterministici
  await page.emulateMedia({ reducedMotion: "reduce" })
  // M21: i poster del podio vengono scaricati via fetch con la chiave in
  // header x-api-key (object URL) â€” la URL non compare piÃ¹ nell'attributo src.
  // Registriamo le richieste effettive a /api/poster per verificare i titoli.
  const posterRequests: string[] = []
  page.on("request", (req) => {
    if (req.url().includes("/api/poster/")) posterRequests.push(req.url())
  })
  await page.goto("/")
  await page.evaluate(() => window.scrollTo(0, 0))
  // I titoli giusti devono essere STATI RICHIESTI (niente api_key negli URL:
  // la chiave viaggia nell'header x-api-key). Il podio di fallback statico
  // verrebbe sostituito appena il trending arriva; i tre fetch confermano che
  // il podio reale Ã¨ in corso.
  await expect.poll(() => posterRequests.map((u) => new URL(u).pathname)).toContain("/api/poster/movie/19995")
  await expect.poll(() => posterRequests.map((u) => new URL(u).pathname)).toContain("/api/poster/movie/157336")
  await expect.poll(() => posterRequests.map((u) => new URL(u).pathname)).toContain("/api/poster/tv/19995")
  posterRequests.forEach((u) => expect(u).not.toContain("api_key"))
  // Attende il decode completo delle img del podio reale (src = object URL).
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll(".p-frame img")) as HTMLImageElement[]
    return imgs.length >= 3 && imgs.every((i) => i.complete && i.naturalWidth > 0)
  }, { timeout: 30_000, polling: 500 })
  await expect(page).toHaveScreenshot("home-key-hero.png", {
    maxDiffPixelRatio: 0.03,
  })
  // Strip di stato sotto il carosello
  await page.locator('[data-testid="home-status"]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  await expect(page).toHaveScreenshot("home-key-status.png", {
    maxDiffPixelRatio: 0.03,
  })
})

//
// â”€â”€â”€ STATUS PAGE (no API key needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//

test("status â€” page renders", async ({ page }) => {
  // Determinismo: la status page renderizza valori live (time in ms, timestamp,
  // stato cache) che variano a ogni run e con lo stato del server E2E riusato
  // (reuseExistingServer locale) â€” l'altezza full-page cambiava tra i run.
  // Intercettiamo /api/health e /api/cache/status con payload fissi: lo
  // screenshot non dipende piÃ¹ da timing, cache o piattaforma (node/win32).
  await page.route("**/api/health", (route) => route.fulfill({
    json: {
      status: "healthy",
      timestamp: "2026-08-02T12:00:00.000Z",
      tmdb: {
        apiKey: true,
        trending: { ok: true, status: 200, time: 42 },
        search: { ok: true, status: 200, time: 42 },
        popular: { ok: true, status: 200, time: 41 },
        externalIds: { ok: true, status: 200, time: 41 },
      },
      streaming: {
        justwatch: { ok: true, status: 200, time: 142 },
        flixpatrol: { ok: true, status: 200, time: 36 },
      },
      system: { node: "v26.4.0", platform: "win32", env: "development" },
      storage: {
        mode: "file",
        dataDirExists: true, dataDirWritable: true,
        mappingsFileExists: true, dataFileExists: true,
        mappingsReadable: true, mappingsWritable: true,
        defaultsFileExists: true, defaultsReadable: true, defaultsWritable: true,
        mappingCount: 41, mappingsCount: 41,
        lastMappingUpdatedAt: "2026-08-02T12:00:00.000Z",
      },
    },
  }))
  await page.route("**/api/cache/status", (route) => route.fulfill({
    json: { totalEntries: 0, taggedEntries: [], untaggedEntries: 0, totalBytes: 0, maxBytes: 157286400, maxEntries: 2000 },
  }))
  await page.goto("/status")
  // Give the health check time to load (it's async with multiple fetches)
  await page.waitForTimeout(3000)
  await expect(page).toHaveScreenshot("status-page.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.05,
  })
})

//
// â”€â”€â”€ POSTER API â€” functional â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Questi test verificano che l'API restituisca immagini valide per varie
// configurazioni di badge/gradiente/blur. Non richiedono chiave TMDB.

test.describe("poster API â€” functional", () => {

  test("default badge (shadow style) â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "shadow", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
    expect(res.headers()["content-type"]).toMatch(/image\/(?:png|webp|jpeg)/)
  })

  test("explicit fmt=jpeg â€” jpeg response in any default mode", async ({ request }) => {
    // Sotto default webp Ã¨ la variante convertita dal canonico webp, sotto
    // FLAMEFORGE_IMAGE_FORMAT=jpeg Ã¨ il canonico: il contratto Ã¨ identico.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", fmt: "jpeg" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    expect(res.headers()["content-type"]).toBe("image/jpeg")
    expect((await res.body()).length).toBeGreaterThan(1000)
  })

  test("explicit fmt=webp â€” webp response in any default mode", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", fmt: "webp" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    expect(res.headers()["content-type"]).toBe("image/webp")
    expect((await res.body()).length).toBeGreaterThan(1000)
  })

  test("badge style: pill â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "pill", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge style: bar â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "bar", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge style: colored â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "colored", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge style: bordo â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "bordo", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge style: vetro â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "vetro", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge style: minimal â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "minimal", badges: "1", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("ranking style: pill â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "2", label: "Top 2", rs: "pill" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("ranking style: colored â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "2", label: "Top 2", rs: "colored" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("ranking style: corner â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "4", label: "Top 4", rs: "corner" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("ranking style: number â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "number" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("ranking number differs from corner and default (same rank)", async ({ request }) => {
    // Avatar is #1 in the mock JW chart: the badge uses the trendRank (wins
    // over the query rank, same for all three) â€” bytes isolate the style.
    const base = { genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3" }
    const numRes = await request.get(posterUrl({ ...base, rs: "number" }))
    expect(numRes.ok()).toBeTruthy()
    const numBuffer = await numRes.body()
    for (const rs of ["corner", "default"]) {
      const res = await request.get(posterUrl({ ...base, rs }))
      expect(res.ok()).toBeTruthy()
      expect(Buffer.compare(numBuffer, await res.body())).not.toBe(0)
    }
  })

  test("ranking number pre-release with unknown availability â€” fail-open renders numeral", async ({ request }) => {
    // Matrix (id 603) is absent from the mock JW responses â†’ jwAvailable null
    // â†’ documented fail-open: pre=1 renders the normal poster with the numeral
    // (no veil/ribbon). Coming Soon stacking is covered by unit tests with real
    // ribbonLayout values (numberSharesComingSoonCorner), unreachable in e2e.
    // rd is relative to today (never rendered): stable detection.
    const rd = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    const base = { genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "number", title: "Matrix", rd }
    const preRes = await request.get(posterUrl({ ...base, pre: "1" }, "movie", 603))
    expect(preRes.ok()).toBeTruthy()
    const preBuffer = await preRes.body()
    expect(preBuffer.length).toBeGreaterThan(1000)
    const plainRes = await request.get(posterUrl(base, "movie", 603))
    expect(plainRes.ok()).toBeTruthy()
    expect(Buffer.compare(preBuffer, await plainRes.body())).toBe(0)
    // side=right specchia comunque il numerale (stesso switch del nastro).
    const rightRes = await request.get(posterUrl({ ...base, pre: "1", side: "right" }, "movie", 603))
    expect(rightRes.ok()).toBeTruthy()
    expect(Buffer.compare(preBuffer, await rightRes.body())).not.toBe(0)
  })

  test("quality style: knockout with verified Dolby â€” stacked group differs from formats=none", async ({ request }) => {
    // tt0068646 (The Godfather) is in the local AV specs DB with 4K +
    // dv/atmos: quality tier AND formats are verified data, no override.
    const withDolby = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0068646", qbs: "knockout" })
    const resDolby = await request.get(withDolby)
    expect(resDolby.ok()).toBeTruthy()
    const bufDolby = await resDolby.body()
    expect(bufDolby.length).toBeGreaterThan(1000)
    // formats=none filters every verified format out: lone knockout tag.
    const noFormats = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0068646", qbs: "knockout", formats: "none" })
    const resNone = await request.get(noFormats)
    expect(resNone.ok()).toBeTruthy()
    const bufNone = await resNone.body()
    expect(bufNone.length).toBeGreaterThan(1000)
    // Vertical stack (tier tag on top, Dolby below) vs lone tag: different bytes.
    expect(Buffer.compare(bufDolby, bufNone)).not.toBe(0)
  })

  test("quality style: knockout without Dolby â€” lone tag differs from standard", async ({ request }) => {
    // Avatar has no AV specs entry: no Dolby possible, tier via override.
    const ko = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", quality: "4K", qbs: "knockout" })
    const resKo = await request.get(ko)
    expect(resKo.ok()).toBeTruthy()
    const bufKo = await resKo.body()
    expect(bufKo.length).toBeGreaterThan(1000)
    const std = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", quality: "4K", qbs: "standard" })
    const resStd = await request.get(std)
    expect(resStd.ok()).toBeTruthy()
    const bufStd = await resStd.body()
    // Knockout tag is never the standard pill.
    expect(Buffer.compare(bufKo, bufStd)).not.toBe(0)
  })

  test("ranking corner + quality knockout together â€” valid image", async ({ request }) => {
    // Opposite corners, no overlap: top-left rank pill, top-right quality.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "4", label: "Top 4", rs: "corner", quality: "4K", qbs: "knockout" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("ranking badge (removed bar style degrades to default) â€” valid image", async ({ request }) => {
    // Stile "bar" rimosso: ?rs=bar degrada a default senza 400.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "bar" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("extra badge (custom text) â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Oscar 2024" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("extra corner: new season â€” valid image", async ({ request }) => {
    // No rank number: the extra label takes the corner anchor (top-left).
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Nuova stagione S2", rs: "corner" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("extra corner: returning series â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Serie in corso", rs: "corner" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("extra corner differs from extra default (same label)", async ({ request }) => {
    const corner = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Nuova stagione S2", rs: "corner" })
    const def = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Nuova stagione S2", rs: "default" })
    const resCorner = await request.get(corner)
    const resDef = await request.get(def)
    expect(resCorner.ok()).toBeTruthy()
    expect(resDef.ok()).toBeTruthy()
    expect(Buffer.compare(await resCorner.body(), await resDef.body())).not.toBe(0)
  })

  test("gradient height â€” valid image", async ({ request }) => {
    // gradColor/gradOpacity/gradDir non sono piÃ¹ letti dal server (parametri
    // morti rimossi dai test): l'unico parametro gradiente attivo Ã¨ gradHeight.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", gradHeight: "30" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("blur enabled â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", blur: "8", bf: "60", bd: "40" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("top shade (ts) â€” default 50, off needs explicit ts=0", async ({ request }, testInfo) => {
    // Default 50: omitted and explicit ts=50 render byte-identical; ts=0 (off) differs.
    // A stored ts=80 stays a valid stronger shade, byte-different from both 50 and 0 (stored value preserved, not automigrated).
    // Isolation (serial-run proven 235/236): an omitted ts resolves the shared
    // live /api/defaults topShade (poster-config chain query > mapping >
    // config > esd > 50), so inheriting a foreign topShade from the
    // badge-format-defaults FACTORY_RESTORE would render "omitted" as that
    // value and fail the 50 identity below. Arrange the 50 precondition
    // explicitly and restore the previously stored value afterwards â€” no
    // production-code change, no factory flips, no assertion weakening.
    const original = await readDefaultsJson(request, "ts-shade: read original defaults")
    const hadTopShade = "topShade" in original
    const originalTopShade = original.topShade
    try {
      await writeDefaultsJson(request, "ts-shade: arrange topShade 50", { topShade: 50 })
      const base = { genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0" }
    const defRes = await request.get(posterUrl(base))
    expect(defRes.ok()).toBeTruthy()
    const defBuffer = await defRes.body()
    expect(defBuffer.length).toBeGreaterThan(1000)
    const fiftyRes = await request.get(posterUrl({ ...base, ts: "50" }))
    expect(fiftyRes.ok()).toBeTruthy()
    const fiftyBuffer = await fiftyRes.body()
    expect(fiftyBuffer.length).toBeGreaterThan(1000)
    expect(Buffer.compare(defBuffer, fiftyBuffer)).toBe(0)
    const offRes = await request.get(posterUrl({ ...base, ts: "0" }))
    expect(offRes.ok()).toBeTruthy()
    const offBuffer = await offRes.body()
    expect(offBuffer.length).toBeGreaterThan(1000)
    expect(Buffer.compare(defBuffer, offBuffer)).not.toBe(0)
    const eightyRes = await request.get(posterUrl({ ...base, ts: "80" }))
    expect(eightyRes.ok()).toBeTruthy()
    const eightyBuffer = await eightyRes.body()
    expect(eightyBuffer.length).toBeGreaterThan(1000)
    expect(Buffer.compare(eightyBuffer, fiftyBuffer)).not.toBe(0)
    expect(Buffer.compare(eightyBuffer, offBuffer)).not.toBe(0)
    const eightyRepeatRes = await request.get(posterUrl({ ...base, ts: "80" }))
    expect(eightyRepeatRes.ok()).toBeTruthy()
    expect(Buffer.compare(eightyBuffer, await eightyRepeatRes.body())).toBe(0)
    // Live-default semantics (isolation proof, same byte comparison, no
    // tolerance): with 80 stored, omitted tracks the stored value â€” this is
    // the serial-run state the arrange above neutralizes.
    await writeDefaultsJson(request, "ts-shade: arrange topShade 80 (isolation proof)", { topShade: 80 })
    const storedRes = await request.get(posterUrl(base))
    expect(storedRes.ok()).toBeTruthy()
    const storedBuffer = await storedRes.body()
    expect(storedBuffer.length).toBeGreaterThan(1000)
    expect(Buffer.compare(storedBuffer, eightyBuffer)).toBe(0)
    expect(Buffer.compare(storedBuffer, fiftyBuffer)).not.toBe(0)
    const attachPng = async (info: TestInfo, name: string, body: Buffer, contentType: string) => {
      const file = info.outputPath(name)
      await writeFile(file, body)
      await info.attach(name, { path: file, contentType })
    }
    await attachPng(testInfo, "ts-omitted-default50.png", defBuffer, defRes.headers()["content-type"] ?? "image/png")
    await attachPng(testInfo, "ts-explicit50.png", fiftyBuffer, fiftyRes.headers()["content-type"] ?? "image/png")
    await attachPng(testInfo, "ts-explicit80-stored.png", eightyBuffer, eightyRes.headers()["content-type"] ?? "image/png")
    await attachPng(testInfo, "ts-off-explicit0.png", offBuffer, offRes.headers()["content-type"] ?? "image/png")
    } finally {
      // Restore the pre-test stored value so later specs inherit exactly what
      // this test found. The PUT merge cannot delete keys: when topShade was
      // absent, the 50 arrange is semantically identical to the hardcoded
      // fallback, so it is safely left (re-asserted) in place.
      await writeDefaultsJson(request, "ts-shade: restore original defaults", { topShade: (hadTopShade ? originalTopShade : 50) as number })
    }
    const restored = await readDefaultsJson(request, "ts-shade: verify restore")
    expect(restored.topShade).toBe(hadTopShade ? originalTopShade : 50)
  })

  test("top shade height (tsh) â€” default 25, 0 disables like ts=0", async ({ request }, testInfo) => {
    // Default 25: omitted and explicit tsh=25 render byte-identical; a custom
    // height (e.g. 60) differs from both; tsh=0 paints nothing so it renders
    // byte-identical to ts=0 (both skip the composite) â€” the documented
    // "0 disables the upper shadow" contract for the height axis.
    // Same isolation discipline as the ts test above: arrange the 50Ã—25
    // precondition explicitly (omitted inherits live /api/defaults) and
    // restore afterwards.
    const original = await readDefaultsJson(request, "tsh-height: read original defaults")
    const hadTopShade = "topShade" in original
    const originalTopShade = original.topShade
    const hadTopShadeHeight = "topShadeHeight" in original
    const originalTopShadeHeight = original.topShadeHeight
    try {
      await writeDefaultsJson(request, "tsh-height: arrange topShade 50 + height 25", { topShade: 50, topShadeHeight: 25 })
      const base = { genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0" }
      const defRes = await request.get(posterUrl(base))
      expect(defRes.ok()).toBeTruthy()
      const defBuffer = await defRes.body()
      expect(defBuffer.length).toBeGreaterThan(1000)
      const explicitRes = await request.get(posterUrl({ ...base, ts: "50", tsh: "25" }))
      expect(explicitRes.ok()).toBeTruthy()
      expect(Buffer.compare(defBuffer, await explicitRes.body())).toBe(0)
      const tallRes = await request.get(posterUrl({ ...base, tsh: "60" }))
      expect(tallRes.ok()).toBeTruthy()
      const tallBuffer = await tallRes.body()
      expect(tallBuffer.length).toBeGreaterThan(1000)
      expect(Buffer.compare(defBuffer, tallBuffer)).not.toBe(0)
      const offStrengthRes = await request.get(posterUrl({ ...base, ts: "0" }))
      expect(offStrengthRes.ok()).toBeTruthy()
      const offStrengthBuffer = await offStrengthRes.body()
      const offHeightRes = await request.get(posterUrl({ ...base, tsh: "0" }))
      expect(offHeightRes.ok()).toBeTruthy()
      expect(Buffer.compare(offStrengthBuffer, await offHeightRes.body())).toBe(0)
      expect(Buffer.compare(defBuffer, offStrengthBuffer)).not.toBe(0)
      // Live-default semantics: with 60 stored, omitted tracks the stored value.
      await writeDefaultsJson(request, "tsh-height: arrange height 60 (isolation proof)", { topShadeHeight: 60 })
      const storedRes = await request.get(posterUrl(base))
      expect(storedRes.ok()).toBeTruthy()
      expect(Buffer.compare(tallBuffer, await storedRes.body())).toBe(0)
      const attachPng = async (info: TestInfo, name: string, body: Buffer, contentType: string) => {
        const file = info.outputPath(name)
        await writeFile(file, body)
        await info.attach(name, { path: file, contentType })
      }
      await attachPng(testInfo, "tsh-omitted-default25.png", defBuffer, defRes.headers()["content-type"] ?? "image/png")
      await attachPng(testInfo, "tsh-explicit60.png", tallBuffer, tallRes.headers()["content-type"] ?? "image/png")
    } finally {
      // Restore the pre-test stored values. The PUT merge cannot delete keys:
      // when a key was absent, re-asserting the hardcoded fallback is
      // semantically identical (same render as the fallback chain).
      await writeDefaultsJson(request, "tsh-height: restore original defaults", {
        topShade: (hadTopShade ? originalTopShade : 50) as number,
        topShadeHeight: (hadTopShadeHeight ? originalTopShadeHeight : 25) as number,
      })
    }
    const restored = await readDefaultsJson(request, "tsh-height: verify restore")
    expect(restored.topShade).toBe(hadTopShade ? originalTopShade : 50)
    expect(restored.topShadeHeight).toBe(hadTopShadeHeight ? originalTopShadeHeight : 25)
  })

  test("all badges off (clean poster) â€” valid image", async ({ request }) => {
    const url = posterUrl({ badges: "0", ranking: "0" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("badge font (bfont) â€” invalid falls back to inter byte-identical", async ({ request }) => {
    // Parametro assente o non valido â†’ Inter: gli URL esistenti non cambiano.
    const base = { genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0" }
    const defRes = await request.get(posterUrl(base))
    expect(defRes.ok()).toBeTruthy()
    const defBuffer = await defRes.body()
    expect(defBuffer.length).toBeGreaterThan(1000)
    const badRes = await request.get(posterUrl({ ...base, bfont: "bebas" }))
    expect(badRes.ok()).toBeTruthy()
    expect(Buffer.compare(defBuffer, await badRes.body())).toBe(0)
  })

  test("badge font barlow-condensed / oswald â€” valid images, different bytes", async ({ request }) => {
    // Font diversi non condividono bitmap: i byte devono differire da Inter.
    const base = { genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0" }
    const defBuffer = await (await request.get(posterUrl(base))).body()
    for (const bfont of ["barlow-condensed", "oswald"]) {
      const res = await request.get(posterUrl({ ...base, bfont }))
      expect(res.ok()).toBeTruthy()
      const buffer = await res.body()
      expect(buffer.length).toBeGreaterThan(1000)
      expect(Buffer.compare(defBuffer, buffer)).not.toBe(0)
    }
  })

  test("full config â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "8.0", badges: "1", ranking: "1", rank: "5", label: "Top 5", bs: "pill", rs: "pill", gradHeight: "25", blur: "5", bf: "50", bd: "30" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("stremio mode (right ribbon) â€” quality badge left â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", rs: "netflix", side: "right", quality: "4K" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("separate ratings (sep=1) â€” column replaces average â€” valid image", async ({ request }) => {
    // Colonna separati: imdbId in query â†’ aggregated dal mock MDBList, media â˜…
    // sostituita dalla colonna a destra (mai sommate). I byte devono differire
    // dalla media: altrimenti lo stack non Ã¨ stato renderizzato (fallback).
    const sepUrl = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes" })
    const avgUrl = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", rsrc: "imdb,tmdb,tomatoes" })
    const sepRes = await request.get(sepUrl)
    expect(sepRes.ok()).toBeTruthy()
    const sepBuffer = await sepRes.body()
    expect(sepBuffer.length).toBeGreaterThan(1000)
    const avgRes = await request.get(avgUrl)
    expect(avgRes.ok()).toBeTruthy()
    const avgBuffer = await avgRes.body()
    expect(Buffer.compare(sepBuffer, avgBuffer)).not.toBe(0)
  })

  test("separate ratings off by default â€” average kept â€” valid image", async ({ request }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", rsrc: "imdb,tmdb,tomatoes" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("separate ratings (sep=1) â€” five providers column â€” valid image", async ({ request }) => {
    // Smoke check only: the five-source and three-source requests both render
    // valid posters with different bytes. Different bytes alone do not prove
    // all five pills are drawn â€” the five-pill layout is covered by unit
    // geometry in separate-ratings-cap5.test.ts. This guards the end-to-end
    // path (route â†’ aggregation â†’ column) for the five-source request.
    const fiveUrl = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes,popcorntime,metacritic" })
    const threeUrl = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes" })
    const fiveRes = await request.get(fiveUrl)
    expect(fiveRes.ok()).toBeTruthy()
    const fiveBuffer = await fiveRes.body()
    expect(fiveBuffer.length).toBeGreaterThan(1000)
    const threeRes = await request.get(threeUrl)
    expect(threeRes.ok()).toBeTruthy()
    const threeBuffer = await threeRes.body()
    expect(Buffer.compare(fiveBuffer, threeBuffer)).not.toBe(0)
  })

  test("anime ratings (anilist+kitsu) â€” aggregated + separate column â€” valid image", async ({ request }) => {
    // imdbId anime in query â†’ snapshot locale mappa tt0388629 (unico:
    // anilist 21/kitsu 12, zero /mappings), voti AniList/Kitsu dal mock,
    // colonna separati renderizzata (byte diversi dalla media â˜… sola).
    const sepUrl = posterUrl({ genreName: "Animation", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0388629", sep: "1", rsrc: "anilist,kitsu" })
    const avgUrl = posterUrl({ genreName: "Animation", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0388629", rsrc: "anilist,kitsu" })
    const sepRes = await request.get(sepUrl)
    expect(sepRes.ok()).toBeTruthy()
    const sepBuffer = await sepRes.body()
    expect(sepBuffer.length).toBeGreaterThan(1000)
    const avgRes = await request.get(avgUrl)
    expect(avgRes.ok()).toBeTruthy()
    const avgBuffer = await avgRes.body()
    expect(Buffer.compare(sepBuffer, avgBuffer)).not.toBe(0)
  })

  test("anime ratings on non-anime â€” graceful miss â€” valid image", async ({ request }) => {
    // tt0133093 non Ã¨ mappato dal mock AniZip (404) â†’ fallback media, mai 500.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", sep: "1", rsrc: "anilist,kitsu" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const buffer = await res.body()
    expect(buffer.length).toBeGreaterThan(1000)
  })

  test("cinemeta imdb fallback (no mdblist imdb) â€” separate column â€” valid image", async ({ request }) => {
    // tt0000001: il mock MDBList non ha imdb â†’ Cinemeta riempie 8.4, la colonna
    // separati rende (byte diversi dalla media â˜… sola). Senza fallback la
    // colonna sarebbe vuota e i byte identici.
    const sepUrl = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0000001", sep: "1", rsrc: "imdb" })
    const avgUrl = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0000001", rsrc: "imdb" })
    const sepRes = await request.get(sepUrl)
    expect(sepRes.ok()).toBeTruthy()
    const sepBuffer = await sepRes.body()
    expect(sepBuffer.length).toBeGreaterThan(1000)
    const avgRes = await request.get(avgUrl)
    expect(avgRes.ok()).toBeTruthy()
    const avgBuffer = await avgRes.body()
    expect(Buffer.compare(sepBuffer, avgBuffer)).not.toBe(0)
  })

  test("landscape shape â€” 16:9 image rendered from backdrop", async ({ page }) => {
    // ?shape=landscape usa lo sfondo TMDB come base invece del poster
    // verticale: l'immagine risultante Ã¨ 768Ã—432.
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    const size = await poster.evaluate((img: HTMLImageElement) => ({ w: img.naturalWidth, h: img.naturalHeight }))
    expect(size).toEqual({ w: 768, h: 432 })
  })

  test("landscape shape without backdrop â€” pillarbox fallback, valid image", async ({ page }) => {
    // Senza sfondo TMDB la base diventa pillarbox dal poster: mai 404,
    // nessun riquadro rotto su Stremio. Dimensioni sempre 768Ã—432.
    const url = posterUrl({ shape: "landscape", badges: "0", ranking: "0" })
    const poster = await renderPoster(page, url)
    const size = await poster.evaluate((img: HTMLImageElement) => ({ w: img.naturalWidth, h: img.naturalHeight }))
    expect(size).toEqual({ w: 768, h: 432 })
  })
})

//
// â”€â”€â”€ POSTER API â€” visual regression â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Questi test rendono il poster in pagina e confrontano gli screenshot per
// intercettare regressioni visive nel rendering di badge, gradiente, blur e
// composizione. Deterministici grazie al mock server.

test.describe("poster API â€” visual regression", () => {

  test("default badge (shadow style) â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "shadow", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-default-shadow.png", { maxDiffPixelRatio: 0.10 })
  })

  test("pill badge â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "pill", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-pill.png", { maxDiffPixelRatio: 0.10 })
  })

  test("bar badge â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "bar", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-bar.png", { maxDiffPixelRatio: 0.10 })
  })

  test("colored badge â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "colored", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-colored.png", { maxDiffPixelRatio: 0.10 })
  })

  test("bordo badge â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "bordo", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-bordo.png", { maxDiffPixelRatio: 0.10 })
  })

  test("vetro badge â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "vetro", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-vetro.png", { maxDiffPixelRatio: 0.10 })
  })

  test("minimal badge â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", bs: "minimal", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-minimal.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking pill â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "pill" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking-pill.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking colored â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "colored" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking-colored.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking default â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "default" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking-default.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking corner â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "4", label: "Today", rs: "corner" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking-corner.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking number â€” screenshot", async ({ page }) => {
    // Avatar is #1 in the mock JW chart: the numeral shows the trendRank
    // (not the query rank). The 20th Century network mark from the mocks stays
    // in the corner: it used to sit above the pill and now sits below the
    // numeral (corner-shared collision stacking).
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "1", label: "Today", rs: "number" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking-number.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking number two digits + quality â€” screenshot", async ({ page }) => {
    // Matrix is off-chart: the explicit two-digit rank applies (details stay
    // the Avatar fixture â€” the mock ignores the id â€” like the netflix test).
    // 4K quality badge via override in the opposite corner (no overlap).
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "12", label: "Today", rs: "number", quality: "4K" }, "movie", 603)
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking-number-quality.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking number right side + quality â€” screenshot", async ({ page }) => {
    // side=right mirrors the numeral into the top-right corner (same switch
    // as the ribbon, without ribbon). The 4K quality badge translociates left
    // below the network mark instead of overlapping the bare digits.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Today", rs: "number", side: "right", quality: "4K" }, "movie", 603)
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking-number-right.png", { maxDiffPixelRatio: 0.10 })
  })

  test("ranking corner + quality knockout â€” screenshot", async ({ page }) => {
    // Verified Dolby fixture (tt0068646: 4K + dv/atmos in the AV specs DB),
    // so the baseline shows the real vertical stack (baseline lands at the final visual gate).
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "4", label: "Today", rs: "corner", imdbId: "tt0068646", qbs: "knockout" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking-corner-quality-knockout.png", { maxDiffPixelRatio: 0.10 })
  })

  test("quality knockout without Dolby (formats=none) â€” screenshot", async ({ page }) => {
    // Same verified title with every format filtered out: lone knockout tag,
    // proving the cutout without the Dolby stack.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0068646", qbs: "knockout", formats: "none" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-quality-knockout-none.png", { maxDiffPixelRatio: 0.10 })
  })

  test("anime ranking (netflix ribbon) â€” screenshot", async ({ page }) => {
    // media_type=tv + id 19995 (Avatar) nella MDBList anime mockata â†’ animeRankResult=1.
    // Il mock MDBList anime (mock-server.mjs) mette Avatar in posizione #1.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rs: "netflix" }, "tv", 19995)
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-anime.png", { maxDiffPixelRatio: 0.10 })
  })

  test("movie ranking (netflix ribbon) with period subtitle â€” screenshot", async ({ page }) => {
    // id 603 (Matrix, non anime) + rank=3 esplicito â†’ trendRank: il nastro
    // mostra TOP, numero e periodo ("Oggi"), non la label per media type.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", rs: "netflix" }, "movie", 603)
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-ranking-netflix.png", { maxDiffPixelRatio: 0.10 })
  })

  test("extra badge â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Oscar 2024" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-extra.png", { maxDiffPixelRatio: 0.10 })
  })

  test("extra corner new season â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Nuova stagione S2", rs: "corner" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-extra-corner-new-season.png", { maxDiffPixelRatio: 0.10 })
  })

  test("extra corner returning series â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Serie in corso", rs: "corner" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-extra-corner-returning.png", { maxDiffPixelRatio: 0.10 })
  })

  test("gradient height â€” screenshot", async ({ page }) => {
    // Renamed: gradDir Ã¨ un parametro morto (il server legge solo gradHeight),
    // quindi il test verifica l'altezza del gradiente, non la direzione.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", gradHeight: "30" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-gradient-height.png", { maxDiffPixelRatio: 0.10 })
  })

  test("blur enabled â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", blur: "8", bf: "60", bd: "40" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-blur.png", { maxDiffPixelRatio: 0.10 })
  })

  test("clean poster (no badges) â€” screenshot", async ({ page }) => {
    const url = posterUrl({ badges: "0", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-clean.png", { maxDiffPixelRatio: 0.10 })
  })

  test("full feature poster â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Action", voteAverage: "8.0", badges: "1", ranking: "1", rank: "5", label: "Top 5", bs: "pill", rs: "pill", gradHeight: "25", blur: "5", bf: "50", bd: "30" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-full-feature.png", { maxDiffPixelRatio: 0.10 })
  })

  test("stremio mode (right ribbon) â€” quality badge left â€” screenshot", async ({ page }) => {
    // Nastro Netflix a destra (side=right, Stremio): il badge qualitÃ  va a
    // sinistra invece che accanto al nastro.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", rs: "netflix", side: "right", quality: "4K" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-quality-stremio-left.png", { maxDiffPixelRatio: 0.10 })
  })

  test("landscape shape â€” screenshot", async ({ page }) => {
    // Formato orizzontale 16:9 da sfondo TMDB (stile Nuvio): base backdrop +
    // logo/badge adattati al canvas landscape.
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-landscape.png", { maxDiffPixelRatio: 0.10 })
  })

  test("landscape shape with rank badge â€” screenshot", async ({ page }) => {
    // Il badge superiore centrale in landscape Ã¨ reso al 120% (topBadgePw).
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "pill" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-landscape-rank.png", { maxDiffPixelRatio: 0.10 })
  })

  test("landscape corner rank with title logo â€” screenshot", async ({ page }) => {
    // Stile corner in 16:9 col logo titolo (default di formato): la pill
    // corner resta all'angolo e il mark network (20th Century Studios dai
    // mock, asset built-in) sta sopra la zona titolo invece che in alto a
    // sinistra. Il centraggio esatto sul box titolo Ã¨ coperto dai pixel-test
    // `landscape-corner-network` (col mock il logo Ã¨ invisibile: stessa art
    // del backdrop). NOTA: `align=center` in query non sposta nulla in e2e
    // (da indagare nel plumbing preview/queryPoster) â€” non forzato qui.
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", logo: "/mocked/logo.png", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "corner" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-landscape-corner-title.png", { maxDiffPixelRatio: 0.10 })
  })

  test("landscape corner extra with title, Cinematic Left â€” screenshot", async ({ page }) => {
    // Extra corner + titolo a sinistra: il mark network segue il centro del
    // titolo, non l'angolo nÃ© il centro canvas.
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", logo: "/mocked/logo.png", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Nuova stagione S2", rs: "corner", align: "left" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-landscape-corner-title-left.png", { maxDiffPixelRatio: 0.10 })
  })

  test("colored + corner on explicit teal accent â€” white text priority â€” screenshot", async ({ page }) => {
    // Tinta Tuner ~#4a9daa via override pubblico `ac` (deterministico, nessun
    // hardcode di produzione): su questo teal il bianco resta leggibile
    // (3.1:1, testi large/bold) e vince sul nero â€” pill corner e badge
    // colored mostrano testo bianco.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "4", label: "Oggi", bs: "colored", rs: "corner", ac: "#4a9daa" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-corner-teal-white-text.png", { maxDiffPixelRatio: 0.10 })
  })

  test("landscape bakes the logo, genre badge bottom-right - screenshot", async ({ page }) => {
    // Layout landscape con logo baked-in (coi vincoli 16:9) e badge genere
    // a destra: il logo passato via query finisce nel composite.
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", logo: "/mocked/logo.png", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-landscape-logo.png", { maxDiffPixelRatio: 0.10 })
  })

  test("separate ratings column (3 providers) â€” screenshot", async ({ page }) => {
    // Colonna a destra con logo sopra / punteggio sotto (IMDb 8.7, TMDB 7.9,
    // 88%), badge genere senza segmento â˜…. Soglia 0.02 (non 0.10): il mock Ã¨
    // deterministico e un flip di scala/polaritÃ  muove il 7-12% dei pixel â€”
    // con 0.10 passerebbe inosservato (mai allentare). gradHeight/bf espliciti
    // ai code default portrait (30/50): come nel test landscape, i default
    // salvati non devono poter spostare il render. Formati attesi dai local
    // specs di tt0133093 (4K/dv/atmos/hdr): la riga HDR spinge lo stack in
    // basso; tier tag 1.0fs + riga genere a segmenti (geometrie intenzionali).
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes", quality: "4K", gradHeight: "30", bf: "50" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-ratings.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings without quality badge (stack rises) â€” screenshot", async ({ page }) => {
    // Senza badge qualitÃ  lo stack parte dall'alto invece che sotto il 4K.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", bq: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-ratings-noquality.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings column in landscape (average replaced) â€” screenshot", async ({ page }) => {
    // La colonna segue il badge qualitÃ  anche in 16:9 (il badge genere
    // nasconde il segmento â˜… come in portrait). gradHeight/bf espliciti ai
    // code default landscape (20/70): i default salvati (echo di fabbrica
    // 30/50 via autosave) li adombrerebbero altrimenti in modo
    // stato-dipendente (stesso motivo dei baseline aggiornati in P4). Come il
    // portrait: formati locali tt0133093 (4K/dv/atmos/hdr) + tier 1.0fs +
    // riga genere a segmenti.
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes", gradHeight: "20", bf: "70" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-ratings-landscape.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings scale 150 portrait, quality on â€” screenshot", async ({ page }) => {
    // Scala dedicata: stessi 3 provider del baseline a100, colonna ingrandita
    // nativa (font + loghi), ancore invariate.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes", quality: "4K", sepscale: "150" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-ratings-scale150.png", { maxDiffPixelRatio: 0.10 })
  })

  test("separate ratings scale 200 max, no quality, ribbon right â€” screenshot", async ({ page }) => {
    // Caso limite: scala max con 3 pill, senza badge qualitÃ  (stack in alto
    // a sinistra del nastro a destra) â€” verifica visiva di non-sovrapposizione.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", rank: "3", label: "Top 3", rs: "netflix", side: "right", bq: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes", sepscale: "200" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-ratings-scale200.png", { maxDiffPixelRatio: 0.10 })
  })

  test("separate ratings scale 150 landscape â€” screenshot", async ({ page }) => {
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes", sepscale: "150" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-ratings-scale150-landscape.png", { maxDiffPixelRatio: 0.10 })
  })

  test("separate ratings scale 200 landscape, quality on â€” screenshot", async ({ page }) => {
    // Caso limite 16:9: stack max sotto il badge qualitÃ , badge genere in
    // basso a destra â€” verifica visiva di non-sovrapposizione.
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes", quality: "4K", sepscale: "200" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-ratings-scale200-landscape.png", { maxDiffPixelRatio: 0.10 })
  })

  test("separate ratings scale 200 landscape, no quality â€” screenshot", async ({ page }) => {
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", bq: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes", sepscale: "200" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-ratings-scale200-landscape-noquality.png", { maxDiffPixelRatio: 0.10 })
  })

  test("separate ratings bottom-bar portrait (3 providers, genre/year on) â€” screenshot", async ({ page }) => {
    // Fascia adattiva full-width in basso con 3 celle equidistanti (IMDb 8.7,
    // TMDB 7.9, 88%), genere+anno soppressi pur con bg/by=1 â€” materiale
    // chiaro/scuro secondo bottomLight (sul mock scuro: fascia chiara).
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", year: "2024", badges: "1", ranking: "0", bg: "1", by: "1", imdbId: "tt0133093", sep: "1", sepstyle: "bottom-bar", rsrc: "imdb,tmdb,tomatoes", quality: "4K" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-bottom-bar.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings bottom-pills portrait (3 providers, no quality) â€” screenshot", async ({ page }) => {
    // Riga centrata di 3 pill adattive (logo + valore inline), margine dal bordo.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", year: "2024", badges: "1", ranking: "0", bg: "1", by: "1", bq: "0", imdbId: "tt0133093", sep: "1", sepstyle: "bottom-pills", rsrc: "imdb,tmdb,tomatoes" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-bottom-pills.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings bottom-bar landscape normalizes to pills (byte-identical)", async ({ request }) => {
    // Barra disattivata in 16:9: lo stesso URL con sepstyle=bottom-bar rende
    // byte-identico a bottom-pills (normalizzazione DOPO cascata, stessa
    // chiave bottom normalizzata) â€” niente screenshot duplicato della barra.
    const base = { backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", bg: "1", by: "1", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes" }
    const barRes = await request.get(posterUrl({ ...base, sepstyle: "bottom-bar" }))
    const pillsRes = await request.get(posterUrl({ ...base, sepstyle: "bottom-pills" }))
    expect(barRes.ok()).toBeTruthy()
    expect(pillsRes.ok()).toBeTruthy()
    expect(Buffer.from(await barRes.body()).equals(Buffer.from(await pillsRes.body()))).toBe(true)
  })

  test("separate ratings bottom-pills landscape (right-anchored) â€” screenshot", async ({ page }) => {
    // In 16:9 le pills sono ancorate a DESTRA con la geometria base del badge
    // genere (non centrate sul canvas).
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", bg: "1", by: "1", bq: "0", imdbId: "tt0133093", sep: "1", sepstyle: "bottom-pills", rsrc: "imdb,tmdb,tomatoes" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-bottom-pills-landscape.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings bottom-bar scale 200 portrait (fit, no clipping) â€” screenshot", async ({ page }) => {
    // Scala max: il font si riduce finchÃ© le 3 celle entrano â€” fascia sempre
    // full-width a filo, mai tagliata.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", bg: "1", by: "1", imdbId: "tt0133093", sep: "1", sepstyle: "bottom-bar", rsrc: "imdb,tmdb,tomatoes", quality: "4K", sepscale: "200" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-bottom-bar-scale200.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings column offsets (-X, +Y move the group) â€” screenshot", async ({ page }) => {
    // Offset espliciti sul gruppo colonna (default 0 = baseline invariata):
    // la colonna si sposta in blocco a sinistra e in basso, ancore invariate.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", bq: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb", sepox: "-60", sepoy: "60" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-offsets-column.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings bottom-pills offsets portrait (+X, -Y move the group) â€” screenshot", async ({ page }) => {
    // Riga pills spostata in blocco a destra e in alto (stessi 3 provider del
    // baseline pills, dentro il canvas per il clamp).
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", year: "2024", badges: "1", ranking: "0", bg: "1", by: "1", bq: "0", imdbId: "tt0133093", sep: "1", sepstyle: "bottom-pills", rsrc: "imdb,tmdb,tomatoes", sepox: "60", sepoy: "-60" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-offsets-pills.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings bottom-pills offsets landscape (-X, -Y move the group) â€” screenshot", async ({ page }) => {
    // In 16:9 la riga resta ancorata a destra: gli offset la muovono in blocco
    // senza mai uscire dal canvas (clamp).
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", bg: "1", by: "1", bq: "0", imdbId: "tt0133093", sep: "1", sepstyle: "bottom-pills", rsrc: "imdb,tmdb,tomatoes", sepox: "-60", sepoy: "-40" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-separate-offsets-pills-landscape.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings bottom-bar portrait â€” X ignored (byte-identical), Y moves the band up â€” screenshot", async ({ page, request }) => {
    // X sulla barra full-width Ã¨ ignorata esplicitamente (stessi byte senza
    // offset); Y solleva la fascia dal filo bordo.
    const base = { genreName: "Action", voteAverage: "7.8", year: "2024", badges: "1", ranking: "0", bg: "1", by: "1", imdbId: "tt0133093", sep: "1", sepstyle: "bottom-bar", rsrc: "imdb,tmdb,tomatoes", quality: "4K" }
    const refRes = await request.get(posterUrl(base))
    const xRes = await request.get(posterUrl({ ...base, sepox: "60" }))
    expect(refRes.ok()).toBeTruthy()
    expect(xRes.ok()).toBeTruthy()
    expect(Buffer.from(await xRes.body()).equals(Buffer.from(await refRes.body()))).toBe(true)
    const poster = await renderPoster(page, posterUrl({ ...base, sepoy: "-40" }))
    await expect(poster).toHaveScreenshot("poster-separate-offsets-bar.png", { maxDiffPixelRatio: 0.02 })
  })

  test("separate ratings bottom-bar portrait â€” band flush at bottom edge (adaptive both polarities)", async ({ request }) => {
    // Prova pixel-reale, polaritÃ  forzata via `bl` (nessuna assunzione sul
    // fondo mock). La fascia Ã¨ a filo in basso per costruzione: le ultime
    // righe sono materiale puro della barra (il testo Ã¨ centrato
    // verticalmente, non sul bordo) â€” scure con bl=1, chiare con bl=0.
    // Il contenuto si misura quindi nel corpo barra (rilevato in modo
    // adattivo come regione dove i due render differiscono), mai allentando
    // le soglie per far passare.
    const { default: sharp } = await import("sharp")
    async function render(bl: "0" | "1") {
      const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", bg: "1", by: "1", imdbId: "tt0133093", sep: "1", sepstyle: "bottom-bar", rsrc: "imdb,tmdb,tomatoes", bl })
      const res = await request.get(url)
      expect(res.ok()).toBeTruthy()
      const body = await res.body()
      const { data, info } = await sharp(body).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      expect(info.width).toBe(500)
      expect(info.height).toBe(750)
      return { body, data, info }
    }
    function brightFrac(data: Buffer, width: number, y0: number, y1: number) {
      let bright = 0
      const total = (width - 20) * (y1 - y0)
      for (let y = y0; y < y1; y++) {
        for (let x = 10; x < width - 10; x++) {
          const i = (y * width + x) * 4
          if ((data[i] + data[i + 1] + data[i + 2]) / 3 >= 100) bright++
        }
      }
      return bright / total
    }
    const dark = await render("1")
    const light = await render("0")
    // La polaritÃ  guida davvero la fascia (render distinti, niente collasso).
    expect(light.body.equals(dark.body)).toBe(false)
    // Flush: ultime 12 righe = materiale barra (scuro vs chiaro per polaritÃ ).
    const darkEdge = brightFrac(dark.data, dark.info.width, dark.info.height - 12, dark.info.height)
    const lightEdge = brightFrac(light.data, light.info.width, light.info.height - 12, light.info.height)
    console.log(`bottom-bar edge bright fraction bl=1: ${darkEdge}, bl=0: ${lightEdge}`)
    expect(darkEdge).toBeLessThan(0.4)
    expect(lightEdge).toBeGreaterThan(0.6)
    // Corpo barra: prima riga (dall'alto) dove i due render differiscono â€”
    // sopra Ã¨ poster identico, dentro Ã¨ la barra. Deve arrivare a filo bordo.
    const H = dark.info.height
    const W = dark.info.width
    let barTop = -1
    let lastDiff = -1
    for (let y = 0; y < H; y++) {
      let diff = 0
      for (let x = 10; x < W - 10; x += 2) {
        const i = (y * W + x) * 4
        if (Math.abs(dark.data[i] - light.data[i]) > 12 || Math.abs(dark.data[i + 1] - light.data[i + 1]) > 12 || Math.abs(dark.data[i + 2] - light.data[i + 2]) > 12) diff++
      }
      if (diff / ((W - 20) / 2) > 0.02) {
        if (barTop < 0) barTop = y
        lastDiff = y
      }
    }
    expect(barTop).toBeGreaterThan(H / 2)
    expect(lastDiff).toBe(H - 1)
    // Contenuto nel corpo: testo/loghi chiari su fondo scuro (bl=1) e testo
    // scuro su fondo chiaro (bl=0) â€” presente ma non dominante.
    const darkBody = brightFrac(dark.data, W, barTop, H)
    let darkPixels = 0
    const bodyTotal = (W - 20) * (H - barTop)
    for (let y = barTop; y < H; y++) {
      for (let x = 10; x < W - 10; x++) {
        const i = (y * W + x) * 4
        if ((light.data[i] + light.data[i + 1] + light.data[i + 2]) / 3 < 100) darkPixels++
      }
    }
    console.log(`bottom-bar body bright frac bl=1: ${darkBody}, dark frac bl=0: ${darkPixels / bodyTotal}`)
    expect(darkBody).toBeGreaterThan(0.03)
    expect(darkBody).toBeLessThan(0.5)
    expect(darkPixels / bodyTotal).toBeGreaterThan(0.02)
    expect(darkPixels / bodyTotal).toBeLessThan(0.5)
  })

  test("separate ratings scale 200 â€” last pill fully visible (no clipping)", async ({ request }) => {
    // Prova pixel-reale (non solo HTTP 200): a scala max con 3 provider e
    // senza badge qualitÃ , la striscia destra in alto contiene SOLO le 3 pill
    // dello stack â€” devono essere 3 bande luminose complete, con l'ultima
    // chiusa da bordo arrotondato + gap scuro (mai tagliata dal canvas).
    const { default: sharp } = await import("sharp")
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "0", bq: "0", imdbId: "tt0133093", sep: "1", rsrc: "imdb,tmdb,tomatoes", sepscale: "200" })
    const res = await request.get(url)
    expect(res.ok()).toBeTruthy()
    const { data, info } = await sharp(await res.body()).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(info.width).toBe(500)
    expect(info.height).toBe(750)
    // Striscia destra alta: solo stack (niente qualitÃ /bordi genere qui).
    const x0 = Math.round(info.width * 0.70)
    const x1 = Math.round(info.width * 0.98)
    const yMax = Math.round(info.height * 0.60)
    const rows: number[] = []
    for (let y = 0; y < yMax; y++) {
      let bright = 0
      for (let x = x0; x < x1; x++) {
        const i = (y * info.width + x) * 4
        if ((data[i] + data[i + 1] + data[i + 2]) / 3 >= 150) bright++
      }
      rows.push(bright / (x1 - x0))
    }
    // Bande: righe luminose (>10%) con tolleranza gap interni di 3 righe.
    const bands: { top: number; bottom: number }[] = []
    let start = -1
    let darkRun = 0
    for (let y = 0; y < rows.length; y++) {
      if (rows[y] > 0.10) {
        if (start < 0) start = y
        darkRun = 0
      } else if (start >= 0) {
        darkRun++
        if (darkRun > 3) {
          bands.push({ top: start, bottom: y - darkRun })
          start = -1
          darkRun = 0
        }
      }
    }
    if (start >= 0) bands.push({ top: start, bottom: rows.length - 1 })
    console.log(`sep200 bands: ${JSON.stringify(bands)}`)
    expect(bands.length).toBe(3)
    for (const b of bands) expect(b.bottom - b.top).toBeGreaterThanOrEqual(20)
    const last = bands[bands.length - 1]
    // Ultima pill interamente dentro la regione + bordo inferiore scuro dopo:
    // se fosse tagliata, le righe luminose arriverebbero a yMax.
    expect(last.bottom).toBeLessThan(yMax - 10)
    for (let y = last.bottom + 1; y <= Math.min(last.bottom + 8, yMax - 1); y++) {
      expect(rows[y]).toBeLessThan(0.10)
    }
  })

  test("badge font barlow-condensed pill â€” screenshot", async ({ page }) => {
    const url = posterUrl({ genreName: "Fantascienza", voteAverage: "8.7", bs: "pill", bfont: "barlow-condensed", badges: "1", ranking: "0" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-font-barlow-pill.png", { maxDiffPixelRatio: 0.10 })
  })

  test("badge font oswald ranking TOP 10 with decimals â€” screenshot", async ({ page }) => {
    // TOP 10 a due cifre + voto decimale nel badge genere.
    const url = posterUrl({ genreName: "Action", voteAverage: "8.7", badges: "1", ranking: "1", rank: "10", label: "Top 10", rs: "pill", bfont: "oswald" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-font-oswald-rank.png", { maxDiffPixelRatio: 0.10 })
  })

  test("badge font oswald long accented extra label â€” screenshot", async ({ page }) => {
    // Dicitura lunga con accenti latini (copertura latin-ext del font).
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "Premio speciale CittÃ  Proibita Ã¨Ã©Ã¼", bfont: "oswald" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-font-oswald-extra.png", { maxDiffPixelRatio: 0.10 })
  })

  test("badge font oswald hebrew fallback (Rubik) â€” screenshot", async ({ page }) => {
    // Oswald non ha glifi ebraici: il testo cade su Rubik allo stesso peso.
    const url = posterUrl({ genreName: "Action", voteAverage: "7.8", badges: "1", ranking: "1", extra: "×¢×•× ×” ×—×“×©×”", bfont: "oswald" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-font-oswald-hebrew.png", { maxDiffPixelRatio: 0.10 })
  })

  test("badge font barlow-condensed landscape â€” screenshot", async ({ page }) => {
    const url = posterUrl({ backdrop: "/mocked/backdrop.jpg", shape: "landscape", genreName: "Action", voteAverage: "8.7", badges: "1", ranking: "0", bfont: "barlow-condensed" })
    const poster = await renderPoster(page, url)
    await expect(poster).toHaveScreenshot("poster-font-barlow-landscape.png", { maxDiffPixelRatio: 0.10 })
  })
})

