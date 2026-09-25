import { describe, expect, it } from "vitest"
import { formatBytes } from "@/lib/utils"

describe("formatBytes", () => {
  it("uses the original binary byte units for traffic and memory", () => {
    expect(formatBytes(0)).toBe("0 Bytes")
    expect(formatBytes(487)).toBe("487 Bytes")
    expect(formatBytes(1024)).toBe("1 KiB")
    expect(formatBytes(1024 ** 2)).toBe("1 MiB")
    expect(formatBytes(1024 ** 4)).toBe("1 TiB")
    expect(formatBytes(1024 ** 8)).toBe("1 YiB")
    expect(`${formatBytes(712.74 * 1024)}/s`).toBe("712.74 KiB/s")
    expect(`${formatBytes(2.45 * 1024 ** 2)}/s`).toBe("2.45 MiB/s")
  })
})
