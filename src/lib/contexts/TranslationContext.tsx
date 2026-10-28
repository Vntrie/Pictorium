"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { FlameForgeCtx } from "@/lib/context"
import { createT } from "@/lib/i18n"

/**
 * TranslationCtx â€” fornisce t() e lang in modo reattivo.
 * t() Ã¨ legato alla lingua attiva (`createT(lang)`), cosÃ¬ quando lang
 * cambia tutti i componenti e i valori memoizzati che dipendono da t
 * o lang si aggiornano immediatamente senza richiedere un refresh.
 */
export interface TranslationCtx {
  t: (key: string, params?: Record<string, string | number>) => string
  lang: string
  pickLang: (l: string) => void
}

const Ctx = createContext<TranslationCtx | null>(null)

export function useT() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useT must be inside FlameForgeProvider")
  return v
}

export function TranslationProvider({
  value,
  children,
}: {
  value: FlameForgeCtx
  children: ReactNode
}) {
  const t = useMemo(() => value.t ?? createT(value.lang), [value.t, value.lang])
  const ctx = useMemo<TranslationCtx>(
    () => ({
      t,
      lang: value.lang,
      pickLang: value.pickLang,
    }),
    [t, value.lang, value.pickLang],
  )

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}
