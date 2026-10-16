import { describe, expect, it } from "vitest"
import { buildOverview } from "@/context/server-data-context"
import { normalizeLatestStatuses, normalizeNodes } from "@/lib/komari-rpc"

describe("buildOverview", () => {
  it("updates changed CPU core metadata instead of reusing a stale server object", () => {
    const nodes = normalizeNodes({ a: { uuid: "a", cpu_cores: 2 } })
    const latest = normalizeLatestStatuses({ a: { online: true, time: "2026-10-16T00:00:00Z" } })
    const first = buildOverview(nodes, latest, new Map())
    const next = buildOverview([{ ...nodes[0], cpu_cores: 4 }], latest, first.serverMap)
    expect(next.overview.servers[0].host.cpuCores).toBe(4)
    expect(next.overview.servers[0]).not.toBe(first.overview.servers[0])
  })
  it("shows every node authorized by Komari, including admin-visible hidden nodes", () => {
    const nodes = normalizeNodes({
      visible: { uuid: "visible", name: "Visible", hidden: false },
      hidden: { uuid: "hidden", name: "Hidden", hidden: true },
    })
    const { overview } = buildOverview(nodes, {}, new Map())

    expect(overview.total).toBe(2)
    expect(overview.offline).toBe(2)
    expect(overview.servers.map((server) => server.uuid)).toEqual(["visible", "hidden"])
  })
})
