import { describe, expect, it } from "vitest"
import { formatPreciseSpeed } from "@/lib/utils"

describe("formatPreciseSpeed", () => {
  it("keeps sub-0.01 MiB traffic visible", () => {
    expect(formatPreciseSpeed(0)).toBe("0.00 M/s")
    expect(formatPreciseSpeed(487)).toBe("0.0005 M/s")
    expect(formatPreciseSpeed(1536)).toBe("0.0015 M/s")
  })

  it("keeps the original two-decimal display for normal traffic", () => {
    expect(formatPreciseSpeed(0.03 * 1024 * 1024)).toBe("0.03 M/s")
    expect(formatPreciseSpeed(1.61 * 1024 * 1024)).toBe("1.61 M/s")
  })
})
