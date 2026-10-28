/**
 * CompatibilitÃ  rename Posterium â†’ FlameForge per le variabili d'ambiente.
 *
 * Il prefisso canonico Ã¨ `FLAMEFORGE_*`; le vecchie `FLAMEFORGE_*` restano
 * supportate come fallback per non rompere deploy esistenti (Docker/Vercel/HF
 * giÃ  configurati) e al primo uso emettono un warning di deprecazione
 * (una sola volta per suffisso per processo).
 *
 * Precedenza: `FLAMEFORGE_X` vince sempre su `FLAMEFORGE_X` quando entrambe
 * sono impostate.
 */

const warnedLegacy = new Set<string>()

/**
 * Legge `FLAMEFORGE_<suffix>`, con fallback a `FLAMEFORGE_<suffix>` (deprecated).
 * Ritorna `undefined` se nessuna delle due Ã¨ impostata.
 */
export function envWithFallback(suffix: string): string | undefined {
  const canonical = process.env[`FLAMEFORGE_${suffix}`]
  if (canonical !== undefined) return canonical
  const legacyName = `FLAMEFORGE_${suffix}`
  const legacy = process.env[legacyName]
  if (legacy !== undefined && !warnedLegacy.has(suffix)) {
    warnedLegacy.add(suffix)
    console.warn(`[FlameForge] ${legacyName} is deprecated, use FLAMEFORGE_${suffix}`)
  }
  return legacy
}

/** Reset dello stato warn-once (solo test). */
export function __resetEnvCompatWarnings(): void {
  warnedLegacy.clear()
}

