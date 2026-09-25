import { describe, expect, it } from "vitest"
import { getPingChartTicks, smoothPingChartData } from "@/lib/ping-chart"

describe("ping chart parity", () => {
  it("omits the Komari rollup's first edge tick but keeps the right 10:00 tick", () => {
    const start = new Date(2026, 8, 24, 10).getTime()
    const data = Array.from({ length: 97 }, (_, index) => ({
      created_at: start + index * 15 * 60_000,
      ping_1: 20,
    }))
    const ticks = getPingChartTicks(data)
    expect(ticks).not.toContain(start)
    expect(ticks).toContain(start + 24 * 60 * 60_000)
  })

  it("uses the original 11-point MAD and double-EWMA peak cut in both views", () => {
    const data = Array.from({ length: 11 }, (_, index) => ({
      created_at: index,
      ping_1: index === 10 ? 100 : 10,
      avg_delay: index === 10 ? 100 : 10,
      packet_loss: index === 10 ? 25 : 0,
    }))
    const all = smoothPingChartData(data, "All", ["1"])
    const single = smoothPingChartData(data, "1", ["1"])
    expect(all.slice(0, 10)).toEqual(data.slice(0, 10))
    expect(all[10]).toMatchObject({ ping_1: 10, packet_loss: 25 })
    expect(single[10]).toMatchObject({ avg_delay: 10, packet_loss: 25 })
    expect(data[10].ping_1).toBe(100)
  })

  it("matches the original double-EWMA values for a steady rise", () => {
    const data = Array.from({ length: 12 }, (_, index) => ({
      created_at: index,
      ping_1: index + 1,
    }))
    const smoothed = smoothPingChartData(data, "All", ["1"])
    expect(smoothed[10].ping_1).toBeCloseTo(8.7325775581, 9)
    expect(smoothed[11].ping_1).toBeCloseTo(9.0325775581, 9)
  })
})
