import { afterEach, describe, expect, it, vi } from "vitest"
import { buildNetworkMetricHistory, buildPingChartData, buildRecentNetworkHistory, clearHistoryCaches, fetchNetworkMetricHistory, fetchPingChartData, fetchRecentPingChartPoints, fetchPublicInfo, fetchRecentNetworkData, mergePingPoints, normalizeLatestStatuses, normalizeNodes, normalizeServer } from "@/lib/komari-rpc"
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
    version: "agent-1.6.0",
  },
}

afterEach(() => { clearHistoryCaches(); vi.unstubAllGlobals() })

describe("Komari 1.6.0 / 1.6.1 RPC2 adapters", () => {
  it("caches full ping history per node and range without rounding, and can force a refresh", async () => {
    const mock = vi.fn(async (_url: string, options: RequestInit) => {
      const { method, params } = JSON.parse(String(options.body))
      const result = method === "public:getPublicPingTasks" ? [{ id: 1, name: "Probe" }] :
        method === "public:getPingMetricStats" ? { stats: [] } : { series: [{
          metric_key: "ping.latency_ms", entity_id: params.entity_id, tags: { task_id: "1" },
          points: [{ time: "2026-10-26T00:00:00Z", value: 0.00125 }],
        }] }
      return new Response(JSON.stringify({ jsonrpc: "2.0", result }))
    })
    vi.stubGlobal("fetch", mock)
    const first = await fetchPingChartData("a", 24)
    expect(await fetchPingChartData("a", 24)).toBe(first)
    expect(first.points[0].value).toBe(0.00125)
    expect(mock).toHaveBeenCalledTimes(4)
    await fetchPingChartData("b", 24)
    await fetchPingChartData("a", 12)
    expect(mock).toHaveBeenCalledTimes(12)
    await fetchPingChartData("a", 24, undefined, true)
    expect(mock).toHaveBeenCalledTimes(16)
  })
  it("overlays precise ten-minute network samples onto the fifteen-minute rollup", async () => {
    const mock = vi.fn(async (_url: string, options: RequestInit) => {
      const { params } = JSON.parse(String(options.body))
      const points = params.hours === 10 / 60
        ? [{ time: "2026-10-16T00:05:00Z", value: 195.125 }]
        : [{ time: "2026-10-16T00:00:00Z", value: 100 }, { time: "2026-10-16T00:05:00Z", value: 999 }]
      return new Response(JSON.stringify({ jsonrpc: "2.0", result: { series: [
        { metric_key: "net.out.rate", entity_id: "node-1", points },
      ] } }))
    })
    vi.stubGlobal("fetch", mock)
    expect((await fetchNetworkMetricHistory("node-1")).map((sample) => sample.up)).toEqual([100, 195.125])
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it("uses server ping statistics for extrema instead of deriving them from averaged chart buckets", () => {
    const data = buildPingChartData("node-1", [{ id: 1, name: "Test", interval: 60 }], { series: [{
      metric_key: "ping.latency_ms", entity_id: "node-1", tags: { task_id: "1" },
      points: [{ time: "2026-10-16T00:00:00Z", value: 20 }],
    }] }, { stats: [{ entity_id: "node-1", task_id: "1", loss: 1.5, min: 0, max: 327.125, latest: 18.75 }] })
    expect(data.tasks[0]).toMatchObject({ min: 0, max: 327.125, latest: 18.75, loss: 1.5 })
  })
  it("filters malformed and foreign recent samples, deduplicates by server time and preserves bytes", () => {
    const record = { client: "node-1", time: "2026-10-16T00:00:00Z", net_out: 0.125, net_in: 195 }
    expect(buildRecentNetworkHistory({ records: [
      record, { ...record, client: "node-2" }, { ...record, time: "invalid" },
      { ...record, net_out: -1 }, { ...record, net_in: null },
      { ...record, net_in: 196 },
    ] }, "node-1")).toEqual([{ timestamp: Date.parse(record.time), up: 0.125, down: 196 }])
    expect(() => buildRecentNetworkHistory({ status: "success", data: [] }, "node-1")).toThrow("common:getNodeRecentStatus")
  })

  it("propagates cancellation of recent status requests instead of treating it as empty data", async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")))
    await expect(fetchRecentNetworkData(normalizeNodes(nodeResponse), normalizeLatestStatuses({
      "node-1": { client: "node-1", online: true },
    }), controller.signal)).rejects.toThrow("Aborted")
  })

  it("fetches raw recent ping samples without REST or rounding", async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ jsonrpc: "2.0", result: { series: [{
      metric_key: "ping.latency_ms", entity_id: "node-1", tags: { task_id: "1" },
      points: [{ time: "2026-10-16T00:00:00Z", value: 0.00125 }],
    }] } })))
    vi.stubGlobal("fetch", mock)
    expect((await fetchRecentPingChartPoints("node-1", 1))[0].value).toBe(0.00125)
    expect(mock).toHaveBeenCalledTimes(1)
    const [url, options] = mock.mock.calls[0]
    expect(url).toBe("/api/rpc2")
    expect(JSON.parse(options.body).params).toMatchObject({ hours: 10 / 60, fill_empty: false, aggregation: "avg" })
  })

  it("does not hide a failed metric query behind an empty chart", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      jsonrpc: "2.0", error: { code: -32603, message: "Metric query failed" },
    }))))
    await expect(fetchPingChartData("node-1")).rejects.toThrow("Metric query failed")
  })

  it("does not duplicate the raw-window request for short ping histories", async () => {
    const mock = vi.fn(async (_url: string, options: RequestInit) => {
      const { method } = JSON.parse(String(options.body))
      const result = method === "public:getPublicPingTasks" ? [] : method === "public:getPingMetricStats" ? { stats: [] } : { series: [] }
      return new Response(JSON.stringify({ jsonrpc: "2.0", result }))
    })
    vi.stubGlobal("fetch", mock)
    expect(await fetchPingChartData("node-1", 0.1)).toEqual({ tasks: [], points: [] })
    expect(mock).toHaveBeenCalledTimes(3)
  })

  it("bounds ping refresh history to its requested time window", () => {
    const point = (time: string) => ({ taskId: "1", time, value: 10, loss: 0 })
    const old = point("2026-10-14T00:00:00Z")
    const current = point("2026-10-16T00:00:00Z")
    expect(mergePingPoints([old], [current], false, Date.parse("2026-10-15T00:00:00Z"))).toEqual([current])
  })
  it("reads the built-in site description without theme-specific overrides", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jsonrpc: "2.0",
      result: { sitename: "Monitor", description: "System status", theme_settings: {} },
    }))))
    try {
      expect(await fetchPublicInfo()).toEqual({
        sitename: "Monitor",
        description: "System status",
        theme_settings: {},
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })

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
      jsonrpc: "2.0", result: { count: 2, records: [
        { client: "node-1", time: "2026-09-24T20:00:00Z", net_out: 31457.28, net_in: 10485.76 },
        { client: "node-1", time: "2026-09-24T20:00:04Z", net_out: 100, net_in: 200 },
      ] },
    })))
    vi.stubGlobal("fetch", fetchMock)
    try {
      const result = await fetchRecentNetworkData(nodes, statuses)
      expect(fetchMock).toHaveBeenCalledWith("/api/rpc2", expect.objectContaining({
        body: expect.stringContaining('"method":"common:getNodeRecentStatus"'),
        credentials: "same-origin",
      }))
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).params).toEqual({ uuid: "node-1" })
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

  it("does not let an older or same-time recent sample replace the RPC rate", async () => {
    const nodes = normalizeNodes(nodeResponse)
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      jsonrpc: "2.0", result: { count: 1, records: [{ client: "node-1", time: "2026-09-24T20:00:04Z", net_out: 100, net_in: 200 }] },
    })))
    vi.stubGlobal("fetch", fetchMock)
    try {
      for (const time of ["2026-09-24T20:00:04Z", "2026-09-24T20:00:08Z"]) {
        const statuses = normalizeLatestStatuses({
          "node-1": { client: "node-1", time, online: true, net_in: 11, net_out: 12 },
        })
        const result = await fetchRecentNetworkData(nodes, statuses)
        expect(result.statuses["node-1"].net_out).toBe(12)
        expect(result.statuses["node-1"].net_in).toBe(11)
        expect(result.history["node-1"]).toHaveLength(1)
      }
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
    expect(server.version).toBe("agent-1.6.0")
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

  it("keeps loss-only ping samples and matches equivalent timestamps across metric series", () => {
    const { points } = buildPingChartData("node-1", [], { series: [
      { metric_key: "ping.latency_ms", entity_id: "node-1", tags: { task_id: "2" }, points: [
        { time: "2026-08-20T10:02:00Z", value: 327.125 },
      ] },
      { metric_key: "ping.loss", entity_id: "node-1", tags: { task_id: "2" }, points: [
        { time: "2026-08-20T10:01:00Z", value: 1 },
        { time: "2026-08-20T10:02:00.000Z", value: 0 },
      ] },
      { metric_key: "ping.latency_ms", entity_id: "node-2", tags: { task_id: "2" }, points: [
        { time: "2026-08-20T10:01:00Z", value: 999 },
      ] },
    ] }, null)
    expect(points.map(({ value, loss }) => [value, loss])).toEqual([[null, 100], [327.125, 0]])
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

  it("retains task labels for loss-only monitors", () => {
    const data = buildPingChartData("node-1", [
      { id: 3, weight: 2, name: "Edge", clients: ["node-1"], interval: 60 },
    ], { series: [{ metric_key: "ping.loss", entity_id: "node-1", tags: { task_id: "3" }, points: [
      { time: "2026-08-20T10:00:00Z", value: 1 },
    ] }] }, { stats: [] })
    expect(data.tasks).toEqual([{ id: "3", weight: 2, name: "Edge", interval: 60, loss: 0 }])
  })

  it("combines 24-hour rollups with precise ten-minute metrics using RPC only", async () => {
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      expect(url).toBe("/api/rpc2")
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
        metric_key: "ping.latency_ms", entity_id: "node-1", tags: { task_id: "1" },
        points: body.params?.hours === 10 / 60 ? [{ time: "2026-08-20T11:01:00Z", value: 87.125 }] : [
          { time: "2026-08-20T10:00:00Z", value: 12 }, { time: "2026-08-20T11:00:00Z", value: 16 },
        ],
      }] } }))
    })
    vi.stubGlobal("fetch", fetchMock)
    try {
      const data = await fetchPingChartData("node-1", 24)
      expect(data.tasks[0].name).toBe("Test")
      expect(data.points.map((point) => point.value)).toEqual([12, 16, 87.125])
      expect(fetchMock).toHaveBeenCalledTimes(4)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe("RPC2 envelope validation", () => {
  it("returns a successful result", () => {
    expect(parseRpcResponse({ jsonrpc: "2.0", id: 1, result: { version: "1.6.0" } }))
      .toEqual({ version: "1.6.0" })
  })

  it("surfaces JSON-RPC errors", () => {
    expect(() => parseRpcResponse({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32601, message: "Method not found" },
    })).toThrow("Method not found (-32601)")
  })
})
