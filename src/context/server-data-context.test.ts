import { describe, expect, it } from "vitest"
import { buildOverview } from "@/context/server-data-context"
import { normalizeNodes } from "@/lib/komari-rpc"

describe("buildOverview", () => {
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
