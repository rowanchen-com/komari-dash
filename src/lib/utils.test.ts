import { describe, expect, it } from "vitest"
import { formatBytes, formatSpeed } from "@/lib/utils"

describe("formatBytes", () => {
  it("uses binary byte units for cumulative traffic and memory", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(487)).toBe("487 B")
    expect(formatBytes(1024)).toBe("1 KiB")
    expect(formatBytes(1024 ** 2)).toBe("1 MiB")
  })
})

describe("formatSpeed", () => {
  it("uses a readable unit for low traffic", () => {
    expect(formatSpeed(0)).toBe("0 B/s")
    expect(formatSpeed(133)).toBe("0.13 KiB/s")
    expect(formatSpeed(487)).toBe("0.48 KiB/s")
    expect(formatSpeed(1536)).toBe("1.5 KiB/s")
  })

  it("uses at most two decimals for normal traffic", () => {
    expect(formatSpeed(0.03 * 1024 * 1024)).toBe("0.03 MiB/s")
    expect(formatSpeed(0.42 * 1024 * 1024)).toBe("0.42 MiB/s")
    expect(formatSpeed(1.61 * 1024 * 1024)).toBe("1.61 MiB/s")
    expect(formatSpeed(1024 ** 3)).toBe("1 GiB/s")
  })
})
