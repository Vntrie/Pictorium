import path from "node:path"
import { createLogger } from "@/lib/logger"
import { envWithFallback } from "@/lib/env-compat"
import { getStorageMode } from "@/lib/kv"

const log = createLogger("data-dir")

export const DATA_DIR = envWithFallback("DATA_DIR") || path.join(process.cwd(), "data")

// Su Vercel (serverless) il filesystem Ã¨ read-only e non persistente: lo store
// file (mapping/defaults) fallirebbe. KV Ã¨ l'unica persistenza valida lÃ¬
// (Redis nativo via FLAMEFORGE_REDIS_URL o Vercel KV/Upstash via
// KV_REST_API_URL/TOKEN).
// Senza backend KV i mapping non si salvano e resta solo il path stateless
// (config token `?config=` nei link). Avvertiamo subito invece
// di fallire a runtime in modo poco chiaro.
if (process.env.VERCEL && getStorageMode() === "file") {
  log.warn("âš ï¸  Vercel rilevato senza backend KV (FLAMEFORGE_REDIS_URL o KV_REST_API_URL/KV_REST_API_TOKEN): mapping NON persistono; i profili degradano a stateless (config token). Imposta FLAMEFORGE_REDIS_URL o lo store KV di Vercel/Upstash per la persistenza server-side.")
}

