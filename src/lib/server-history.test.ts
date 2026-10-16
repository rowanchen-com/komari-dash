import { describe, expect, it } from "vitest"
import { getServerHistory } from "@/lib/server-history"
import { normalizeLatestStatuses, normalizeNodes, normalizeServer } from "@/lib/komari-rpc"
import { formatRelativeTime } from "@/lib/utils"

function snapshot(uuid: string, time: string, cpu: number) {
  const [node] = normalizeNodes({ [uuid]: { uuid } })
  const latest = normalizeLatestStatuses({ [uuid]: { time, cpu, online: true } })
  return { data: { servers: [normalizeServer(node, latest[uuid])] } }
}

describe("server chart history", () => {
  it("keeps the original zero-second endpoint without altering server timestamps", () => {
    const samples = getServerHistory([
      snapshot("a", "2026-10-16T00:00:00Z", 1), snapshot("a", "2026-10-16T00:01:00Z", 2),
    ], "a")
    const end = Number(samples[samples.length - 1].ts)
    expect(samples.map(({ ts }) => formatRelativeTime(Number(ts), end))).toEqual(["1m", "0s"])
  })
  it("uses backend timestamps in chronological order without duplicate polling samples", () => {
    const earlier = snapshot("a", "2026-10-16T00:00:00Z", 0.001)
    const later = snapshot("a", "2026-10-16T00:00:02Z", 60)
    const samples = getServerHistory([later, later, earlier], "a")
    expect(samples.map(({ ts, server }) => [Number(ts), server.status.cpu])).toEqual([
      [Date.parse("2026-10-16T00:00:00Z"), 0.001], [Date.parse("2026-10-16T00:00:02Z"), 60],
    ])
  })

  it("does not mix nodes or invent a timestamp for an invalid report", () => {
    const history = [snapshot("a", "invalid", 99), snapshot("b", "2026-10-16T00:00:00Z", 50)]
    expect(getServerHistory(history, "a")).toEqual([])
    expect(getServerHistory(history, "b")).toHaveLength(1)
  })
})
