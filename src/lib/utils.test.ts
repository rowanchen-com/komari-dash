import { describe, expect, it } from "vitest"
import { formatSpeed } from "@/lib/utils"

describe("formatSpeed", () => {
  it("uses a readable unit for low traffic", () => {
    expect(formatSpeed(0)).toBe("0 B/s")
    expect(formatSpeed(487)).toBe("0.48 K/s")
    expect(formatSpeed(1536)).toBe("1.5 K/s")
  })

  it("uses at most two decimals for normal traffic", () => {
    expect(formatSpeed(0.03 * 1024 * 1024)).toBe("0.03 M/s")
    expect(formatSpeed(0.42 * 1024 * 1024)).toBe("0.42 M/s")
    expect(formatSpeed(1.61 * 1024 * 1024)).toBe("1.61 M/s")
  })
})
