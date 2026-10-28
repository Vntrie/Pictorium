import { afterEach, describe, expect, it, vi } from "vitest"

const originalDataDir = process.env.FLAMEFORGE_DATA_DIR

afterEach(() => {
  if (originalDataDir === undefined) {
    delete process.env.FLAMEFORGE_DATA_DIR
  } else {
    process.env.FLAMEFORGE_DATA_DIR = originalDataDir
  }
  vi.resetModules()
})

describe("DATA_DIR", () => {
  it("uses FLAMEFORGE_DATA_DIR when a persistent volume is configured", async () => {
    process.env.FLAMEFORGE_DATA_DIR = "/data"
    vi.resetModules()

    const { DATA_DIR } = await import("@/lib/data-dir")

    expect(DATA_DIR).toBe("/data")
  })
})

