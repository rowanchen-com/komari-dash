import { describe, expect, it, vi } from "vitest"
import { buildNetworkChartData, combineNetworkHistory, getNetworkAxisMax, mergeNetworkHistories } from "@/lib/network-chart"

describe("buildNetworkChartData", () => {
  const MiB = 1024 ** 2
  const history = [
    { timestamp: 3000, data: { servers: [
      { uuid: "a", status: { netOutSpeed: 300, netInSpeed: 30 } },
      { uuid: "b", status: { netOutSpeed: 900, netInSpeed: 90 } },
    ] } },
    { timestamp: 2000, data: { servers: [
      { uuid: "a", status: { netOutSpeed: 200, netInSpeed: 20 } },
    ] } },
  ]

  it("keeps chronological MiB rates and upload/download direction", () => {
    expect(buildNetworkChartData(history, history[0].data.servers[0])).toEqual([
      { ts: "2000", upload: 200 / MiB, download: 20 / MiB },
      { ts: "3000", upload: 300 / MiB, download: 30 / MiB },
    ])
  })

  it("does not carry samples across servers", () => {
    expect(buildNetworkChartData(history, history[0].data.servers[1])).toEqual([
      { ts: "3000", upload: 900 / MiB, download: 90 / MiB },
    ])
  })

  it("adds the current reading only when it differs from the last snapshot", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(4000)
    try {
      const current = { uuid: "a", status: { netOutSpeed: 400, netInSpeed: 40 } }
      expect(buildNetworkChartData(history, current)).toEqual([
        { ts: "2000", upload: 200 / MiB, download: 20 / MiB },
        { ts: "3000", upload: 300 / MiB, download: 30 / MiB },
        { ts: "4000", upload: 400 / MiB, download: 40 / MiB },
      ])
    } finally {
      now.mockRestore()
    }
  })

  it("preserves byte-per-second to M/s conversion before the original two-decimal label", () => {
    const current = { uuid: "a", status: { netOutSpeed: 31457.28, netInSpeed: 10485.76 } }
    const [point] = buildNetworkChartData([], current)
    expect(point.upload.toFixed(2)).toBe("0.03")
    expect(point.download.toFixed(2)).toBe("0.01")
  })

  it("plots the recent one-minute samples instead of duplicating a delayed reading", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(100000)
    try {
      const current = { uuid: "a", status: { netOutSpeed: 10, netInSpeed: 20 } }
      expect(buildNetworkChartData([], current, [
        { timestamp: 40000, up: 0, down: 0 },
        { timestamp: 70000, up: MiB, down: 2 * MiB },
        { timestamp: 100000, up: 0, down: 0 },
      ])).toEqual([
        { ts: "40000", upload: 0, download: 0 },
        { ts: "70000", upload: 1, download: 2 },
        { ts: "100000", upload: 0, download: 0 },
      ])
    } finally {
      now.mockRestore()
    }
  })

  it("accumulates distinct samples across polls for fifteen minutes", () => {
    const now = 1_000_000
    const old = { timestamp: now - 16 * 60_000, up: 1, down: 2 }
    const prior = { timestamp: now - 10 * 60_000, up: 3, down: 4 }
    const latest = { timestamp: now - 1_000, up: 5, down: 6 }
    expect(mergeNetworkHistories(
      { a: [old, prior] },
      { a: [latest, prior] },
      now,
    )).toEqual({ a: [prior, latest] })
  })

  it("uses coarse metrics only before the fine-grained live samples", () => {
    const metricHistory = [
      { timestamp: 40_000, up: 5, down: 5 },
      { timestamp: 70_000, up: 999, down: 999 },
    ]
    const liveHistory = [
      { timestamp: 65_000, up: 1, down: 2 },
      { timestamp: 75_000, up: 3, down: 4 },
    ]
    expect(combineNetworkHistory(metricHistory, liveHistory, 80_000)).toEqual([
      metricHistory[0], ...liveHistory,
    ])
  })

  it("matches the original download-based dynamic axis", () => {
    expect(getNetworkAxisMax([{ ts: "0", upload: 3, download: 0.05 }])).toBe(1)
    expect(getNetworkAxisMax([{ ts: "0", upload: 0, download: 2.85 }])).toBe(3)
    expect(getNetworkAxisMax([])).toBe(1)
  })
})
