"use client"

import { FlameForgeRoot } from "@/lib/context"
import { AppShell } from "@/components/AppShell"

export default function Home() {
  return (
    <FlameForgeRoot>
      <AppShell />
    </FlameForgeRoot>
  )
}
