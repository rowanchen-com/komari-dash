import { describe, expect, it } from "vitest"
import { buildPingChartData, normalizeLatestStatuses, normalizeNodes, normalizeServer } from "@/lib/komari-rpc"
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
    version: "1.4.3",
  },
}

describe("Komari 1.4.3 RPC2 adapters", () => {
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
    expect(server.status.tcpConn).toBe(15)
    expect(server.status.udpConn).toBe(3)
    expect(server.status).not.toHaveProperty("gpu")
  })

  it("rejects legacy array-shaped node responses", () => {
    expect(() => normalizeNodes([])).toThrow("common:getNodes")
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
            ],
          },
          {
            metric_key: "ping.latency_ms",
            entity_id: "node-1",
            tags: { task_id: "2" },
            points: [{ time: "2026-08-20T10:00:00Z", value: 42 }],
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
    expect(data.points).toHaveLength(3)
    expect(data.points[1].value).toBe(42)
    expect(data.points[2].value).toBeNull()
  })
})

describe("RPC2 envelope validation", () => {
  it("returns a successful result", () => {
    expect(parseRpcResponse({ jsonrpc: "2.0", id: 1, result: { version: "1.4.3" } }))
      .toEqual({ version: "1.4.3" })
  })

  it("surfaces JSON-RPC errors", () => {
    expect(() => parseRpcResponse({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32601, message: "Method not found" },
    })).toThrow("Method not found (-32601)")
  })
})
