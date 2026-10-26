import { describe, expect, it } from "vitest"
import { buildNetworkChartData, combineNetworkHistory, getNetworkAxisMax, mergeNetworkHistories } from "@/lib/network-chart"

describe("buildNetworkChartData", () => {
  const MiB = 1024 ** 2
  it("keeps chronological, unrounded M/s rates and upload/download direction", () => {
    expect(buildNetworkChartData([
      { timestamp: 2000, up: 200, down: 20 }, { timestamp: 3000, up: 300, down: 30 },
    ])).toEqual([
      { ts: "2000", upload: 200 / MiB, download: 20 / MiB },
      { ts: "3000", upload: 300 / MiB, download: 30 / MiB },
    ])
  })

  it("does not invent samples when the backend has no history", () => {
    expect(buildNetworkChartData([])).toEqual([])
  })

  it("plots sub-0.01 M/s traffic even when the header rounds to 0.00 M/s", () => {
    const [point] = buildNetworkChartData([{ timestamp: 4000, up: 1024, down: 2048 }])
    expect(point.upload.toFixed(2)).toBe("0.00")
    expect(point.upload).toBeGreaterThan(0)
    expect(point.download).toBeGreaterThan(point.upload)
  })

  it("plots the recent one-minute samples instead of duplicating a delayed reading", () => {
    expect(buildNetworkChartData([
        { timestamp: 40000, up: 0, down: 0 },
        { timestamp: 70000, up: MiB, down: 2 * MiB },
        { timestamp: 100000, up: 0, down: 0 },
      ])).toEqual([
        { ts: "40000", upload: 0, download: 0 },
        { ts: "70000", upload: 1, download: 2 },
        { ts: "100000", upload: 0, download: 0 },
      ])
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

  it("keeps each node's history isolated while replacing a sample at the same server time", () => {
    const now = 1_000_000
    const first = { timestamp: now - 1000, up: 1, down: 2 }
    const second = { ...first, up: 10, down: 20 }
    expect(mergeNetworkHistories({ a: [first], b: [second] }, { a: [second] }, now))
      .toEqual({ a: [second], b: [second] })
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

  it("retains exact backend samples between slower overview polls", () => {
    const fine = { timestamp: 65_000, up: 0.125, down: 195, raw: true as const }
    const live = [{ timestamp: 60_000, up: 1, down: 2 }, { timestamp: 70_000, up: 3, down: 4 }]
    expect(combineNetworkHistory([fine], live, 80_000)).toEqual([live[0], fine, live[1]])
  })

  it("keeps the original whole-M axis while containing upload and download peaks", () => {
    expect(getNetworkAxisMax([{ ts: "0", upload: 0.03, download: 0.01 }])).toBe(1)
    expect(getNetworkAxisMax([{ ts: "0", upload: 3.01, download: 0.01 }])).toBe(4)
    expect(getNetworkAxisMax([{ ts: "0", upload: 0, download: 2.85 }])).toBe(3)
    expect(getNetworkAxisMax([])).toBe(1)
  })
})
