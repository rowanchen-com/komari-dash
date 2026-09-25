import { describe, expect, it, vi } from "vitest"
import { buildNetworkMetricHistory, buildPingChartData, buildPingRecordPoints, fetchPingChartData, fetchRecentNetworkData, mergePingPoints, normalizeLatestStatuses, normalizeNodes, normalizeServer } from "@/lib/komari-rpc"
import { parseRpcResponse } from "@/lib/rpc2"

const nodeResponse = {
  "node-1": {
    uuid: "node-1",
    name: "Tokyo",
    cpu_name: "Example CPU",
    virtualization: "kvm",
    arch: "x86_64",
    cpu_cores: 4,
    os: "Debian",
    kernel_version: "6.1",
    gpu_name: "Example GPU",
    region: "JP",
    public_remark: "Edge",
    mem_total: 1024,
    swap_total: 512,
    disk_total: 4096,
    weight: 2,
    group: "Asia",
    tags: "edge",
    hidden: false,
    version: "agent-1.5.0",
  },
}

describe("Komari 1.5.0 RPC2 adapters", () => {
  it("joins official upload and download rate metrics for the fifteen-minute prefill", () => {
    const points = buildNetworkMetricHistory({ series: [
      { metric_key: "net.in.rate", entity_id: "node-1", points: [
        { time: "2026-09-24T20:01:00Z", value: 1048576 },
        { time: "2026-09-24T20:00:00Z", value: 0 },
      ] },
      { metric_key: "net.out.rate", entity_id: "node-1", points: [
        { time: "2026-09-24T20:01:00Z", value: 524288 },
      ] },
      { metric_key: "net.in.rate", entity_id: "node-2", points: [
        { time: "2026-09-24T20:01:00Z", value: 999 },
      ] },
    ] }, "node-1")
    expect(points).toEqual([
      { timestamp: Date.parse("2026-09-24T20:00:00Z"), up: 0, down: 0 },
      { timestamp: Date.parse("2026-09-24T20:01:00Z"), up: 524288, down: 1048576 },
    ])
  })

  it("uses the newest recent sample for current speed and keeps chronological chart history", async () => {
    const nodes = normalizeNodes(nodeResponse)
    const statuses = normalizeLatestStatuses({
      "node-1": { client: "node-1", online: true, net_in: 11, net_out: 12 },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "success",
      data: [
        { updated_at: "2026-09-24T20:00:00Z", network: { up: 31457.28, down: 10485.76 } },
        { updated_at: "2026-09-24T20:00:04Z", network: { up: 100, down: 200 } },
      ],
    })))
    vi.stubGlobal("fetch", fetchMock)
    try {
      const result = await fetchRecentNetworkData(nodes, statuses)
      expect(fetchMock).toHaveBeenCalledWith("/api/recent/node-1", { signal: undefined })
      expect(result.statuses["node-1"].net_out).toBe(100)
      expect(result.statuses["node-1"].net_in).toBe(200)
      expect(result.history["node-1"].map((sample) => sample.timestamp)).toEqual([
        Date.parse("2026-09-24T20:00:00Z"),
        Date.parse("2026-09-24T20:00:04Z"),
      ])
      expect(statuses["node-1"].net_out).toBe(12)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("keeps RPC speeds when recent data fails and skips offline nodes", async () => {
    const nodes = normalizeNodes({
      ...nodeResponse,
      "node-2": { ...nodeResponse["node-1"], uuid: "node-2" },
    })
    const statuses = normalizeLatestStatuses({
      "node-1": { client: "node-1", online: true, net_in: 11, net_out: 12 },
      "node-2": { client: "node-2", online: false, net_in: 13, net_out: 14 },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    vi.stubGlobal("fetch", fetchMock)
    try {
      const result = await fetchRecentNetworkData(nodes, statuses)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.statuses["node-1"].net_out).toBe(12)
      expect(result.statuses["node-2"].net_out).toBe(14)
      expect(result.history).toEqual({})
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("normalizes common:getNodes and common:getNodesLatestStatus", () => {
    const [node] = normalizeNodes(nodeResponse)
    const statuses = normalizeLatestStatuses({
      "node-1": {
        client: "node-1",
        time: "2026-08-20T12:00:00Z",
        cpu: 12.5,
        gpu: 0,
        ram: 256,
        ram_total: 2048,
        swap: 64,
        swap_total: 1024,
        load: 0.3,
        load5: 0.2,
        load15: 0.1,
        temp: 0,
        disk: 1024,
        disk_total: 8192,
        net_in: 100,
        net_out: 200,
        net_total_up: 300,
        net_total_down: 400,
        process: 50,
        connections: 18,
        connections_udp: 3,
        online: true,
        uptime: 3600,
        ping: {},
      },
    })
    const server = normalizeServer(node, statuses["node-1"])

    expect(server.online).toBe(true)
    expect(server.host.memTotal).toBe(2048)
    expect(server.host.gpu).toBe("Example GPU")
    expect(server.version).toBe("agent-1.5.0")
    expect(server.status.tcpConn).toBe(15)
    expect(server.status.udpConn).toBe(3)
    expect(server.status).not.toHaveProperty("gpu")
  })

  it("rejects legacy array-shaped node responses", () => {
    expect(() => normalizeNodes([])).toThrow("common:getNodes")
  })

  it("keeps hidden nodes returned to an authenticated administrator", () => {
    const nodes = normalizeNodes({
      ...nodeResponse,
      "node-2": { ...nodeResponse["node-1"], uuid: "node-2", hidden: true },
    })

    expect(nodes.map((node) => [node.uuid, node.hidden])).toEqual([
      ["node-1", false],
      ["node-2", true],
    ])
  })

  it("builds ping charts from tagged metric series and preserves missing points", () => {
    const data = buildPingChartData(
      "node-1",
      [
        { id: 2, weight: 20, name: "Tokyo", clients: [], default_on: true, interval: 60 },
        { id: 1, weight: 10, name: "Hong Kong", clients: ["node-1"], default_on: false, interval: 30 },
      ],
      {
        series: [
          {
            metric_key: "ping.latency_ms",
            entity_id: "node-1",
            points: [
              { time: "2026-08-20T10:00:00Z", value: 18, tags: { task_id: "1" } },
              { time: "2026-08-20T10:01:00Z", value: null, tags: { task_id: "1" } },
              { time: "2026-08-20T10:02:00Z", value: 20, tags: { task_id: "1" } },
            ],
          },
          {
            metric_key: "ping.latency_ms",
            entity_id: "node-1",
            tags: { task_id: "2" },
            points: [{ time: "2026-08-20T10:00:00Z", value: 42 }],
          },
          {
            metric_key: "ping.loss",
            entity_id: "node-1",
            tags: { task_id: "1" },
            points: [
              { time: "2026-08-20T10:00:00Z", value: 0.25 },
              { time: "2026-08-20T10:01:00Z", value: null },
              { time: "2026-08-20T10:02:00Z", value: 0 },
            ],
          },
        ],
      },
      {
        stats: [
          { entity_id: "node-1", task_id: "1", loss: 1.25 },
          { entity_id: "node-1", task_id: "2", loss: 0 },
        ],
      },
    )

    expect(data.tasks.map((task) => task.name)).toEqual(["Hong Kong", "Tokyo"])
    expect(data.tasks[0].loss).toBe(1.25)
    expect(data.points).toHaveLength(4)
    expect(data.points[1].value).toBe(42)
    expect(data.points[2].value).toBeNull()
    expect(data.points.map((point) => point.loss)).toEqual([25, null, null, 0])
  })

  it("removes only empty leading and trailing metric placeholders", () => {
    const data = buildPingChartData("node-1", [], { series: [{
      metric_key: "ping.latency_ms",
      entity_id: "node-1",
      tags: { task_id: "1" },
      points: [
        { time: "2026-08-20T09:00:00Z", value: null },
        { time: "2026-08-20T10:00:00Z", value: 18 },
        { time: "2026-08-20T11:00:00Z", value: null },
        { time: "2026-08-20T12:00:00Z", value: 20 },
        { time: "2026-08-20T13:00:00Z", value: null },
      ],
    }] }, { stats: [] })
    expect(data.points.map((point) => [point.time, point.value])).toEqual([
      ["2026-08-20T10:00:00Z", 18],
      ["2026-08-20T11:00:00Z", null],
      ["2026-08-20T12:00:00Z", 20],
    ])
  })

  it("keeps raw ping peaks and packet loss without accepting another node's records", () => {
    const points = buildPingRecordPoints({ status: "success", data: { records: [
      { client: "node-1", task_id: 2, time: "2026-08-20T10:02:00Z", value: 327 },
      { client: "node-2", task_id: 2, time: "2026-08-20T10:01:00Z", value: 999 },
      { client: "node-1", task_id: 2, time: "2026-08-20T10:01:00Z", value: -1 },
      { client: "node-1", task_id: 2, time: "invalid", value: 18 },
    ] } }, "node-1")

    expect(points.map(({ value, loss }) => [value, loss])).toEqual([[null, 100], [327, 0]])
  })

  it("replaces coarse ping buckets per task and deduplicates live refreshes", () => {
    const point = (taskId: string, minute: number, value: number) => ({
      taskId, time: `2026-08-20T10:${String(minute).padStart(2, "0")}:00Z`, value, loss: 0,
    })
    const history = [point("1", 0, 10), point("1", 5, 15), point("1", 10, 20), point("2", 5, 40)]
    const raw = [point("1", 4, 12), point("1", 5, 150), point("1", 6, 13)]
    const merged = mergePingPoints(history, raw, true)
    expect(merged.filter((entry) => entry.taskId === "1").map((entry) => entry.value)).toEqual([10, 12, 150, 13])
    expect(merged.find((entry) => entry.taskId === "2")?.value).toBe(40)
    expect(mergePingPoints(merged, [point("1", 6, 17)]).filter((entry) => entry.taskId === "1").map((entry) => entry.value))
      .toEqual([10, 12, 150, 17])
  })

  it("retains task labels when records exist but metric history is unavailable", () => {
    const data = buildPingChartData("node-1", [
      { id: 3, weight: 2, name: "Edge", clients: ["node-1"], interval: 60 },
    ], { series: [] }, { stats: [] }, ["3"])
    expect(data.tasks).toEqual([{ id: "3", weight: 2, name: "Edge", interval: 60, loss: 0 }])
  })

  it("falls back to metric history when an older core exposes only short REST records", async () => {
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url.startsWith("/api/records/ping")) {
        const hours = new URL(url, "https://example.test").searchParams.get("hours")
        const records = hours === "24"
          ? [{ client: "node-1", task_id: 1, time: "2026-08-20T11:00:00Z", value: 17 }]
          : [{ client: "node-1", task_id: 1, time: "2026-08-20T11:01:00Z", value: 87 }]
        return new Response(JSON.stringify({ status: "success", data: { records } }))
      }
      const body = JSON.parse(String(options?.body)) as { method: string; params?: Record<string, unknown> }
      if (body.method === "public:getPublicPingTasks") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", result: [
          { id: 1, name: "Test", weight: 0, interval: 60, clients: ["node-1"] },
        ] }))
      }
      if (body.method === "public:getPingMetricStats") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", result: { stats: [] } }))
      }
      expect(body.params?.max_points).toBe(2000)
      return new Response(JSON.stringify({ jsonrpc: "2.0", result: { series: [{
        metric_key: "ping.latency_ms", entity_id: "node-1", tags: { task_id: "1" }, points: [
          { time: "2026-08-20T10:00:00Z", value: 12 },
          { time: "2026-08-20T11:00:00Z", value: 16 },
        ],
      }] } }))
    })
    vi.stubGlobal("fetch", fetchMock)
    try {
      const data = await fetchPingChartData("node-1", 24)
      expect(data.tasks[0].name).toBe("Test")
      expect(data.points.map((point) => point.value)).toEqual([12, 16, 87])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe("RPC2 envelope validation", () => {
  it("returns a successful result", () => {
    expect(parseRpcResponse({ jsonrpc: "2.0", id: 1, result: { version: "1.5.0" } }))
      .toEqual({ version: "1.5.0" })
  })

  it("surfaces JSON-RPC errors", () => {
    expect(() => parseRpcResponse({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32601, message: "Method not found" },
    })).toThrow("Method not found (-32601)")
  })
})
