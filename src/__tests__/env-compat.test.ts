import { afterEach, describe, expect, it, vi } from "vitest"
import { __resetEnvCompatWarnings, envWithFallback } from "@/lib/env-compat"

afterEach(() => {
  delete process.env.FLAMEFORGE_TEST_DEMO
  delete process.env.FLAMEFORGE_TEST_DEMO
  __resetEnvCompatWarnings()
  vi.restoreAllMocks()
})

describe("envWithFallback", () => {
  it("returns undefined when neither var is set", () => {
    expect(envWithFallback("TEST_DEMO")).toBeUndefined()
  })

  it("prefers FLAMEFORGE_* over FLAMEFORGE_*", () => {
    process.env.FLAMEFORGE_TEST_DEMO = "new"
    process.env.FLAMEFORGE_TEST_DEMO = "old"
    expect(envWithFallback("TEST_DEMO")).toBe("new")
  })

  it("falls back to FLAMEFORGE_* with a deprecation warning (once)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    process.env.FLAMEFORGE_TEST_DEMO = "old"
    expect(envWithFallback("TEST_DEMO")).toBe("old")
    expect(envWithFallback("TEST_DEMO")).toBe("old")
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain("FLAMEFORGE_TEST_DEMO is deprecated")
  })

  it("does not warn when the canonical var is used", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    process.env.FLAMEFORGE_TEST_DEMO = "new"
    expect(envWithFallback("TEST_DEMO")).toBe("new")
    expect(warn).not.toHaveBeenCalled()
  })
})


