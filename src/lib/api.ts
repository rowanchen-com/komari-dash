import type {
  KomariNode,
  KomariRecentData,
  KomariApiResponse,
  KomariPublicInfo,
  KomariPingData,
  ServerInfo,
} from "@/types/komari"

// Base URL is relative - Komari serves the theme from the same origin
const BASE = ""

export function normalizeServer(
  node: KomariNode,
  recent?: KomariRecentData,
  isOnline = false,
): ServerInfo {
  return {
    uuid: node.uuid,
    name: node.name,
    online: isOnline,
    group: node.group,
    tags: node.tags,
    weight: node.weight,
    hidden: node.hidden,
    region: node.region,
    public_remark: node.public_remark,
    host: {
      os: node.os,
      kernel: node.kernel_version,
      cpu: node.cpu_name,
      cpuCores: node.cpu_cores,
      gpu: node.gpu_name,
      arch: node.arch,
      virtualization: node.virtualization,
      memTotal: node.mem_total,
      swapTotal: node.swap_total,
      diskTotal: node.disk_total,
    },
    status: {
      cpu: recent?.cpu.usage ?? 0,
      memUsed: recent?.ram.used ?? 0,
      swapUsed: recent?.swap.used ?? 0,
      diskUsed: recent?.disk.used ?? 0,
      netInSpeed: recent?.network.down ?? 0,
      netOutSpeed: recent?.network.up ?? 0,
      netInTransfer: recent?.network.totalDown ?? 0,
      netOutTransfer: recent?.network.totalUp ?? 0,
      uptime: recent?.uptime ?? 0,
      load1: recent?.load.load1 ?? 0,
      load5: recent?.load.load5 ?? 0,
      load15: recent?.load.load15 ?? 0,
      tcpConn: recent?.connections.tcp ?? 0,
      udpConn: recent?.connections.udp ?? 0,
      process: recent?.process ?? 0,
    },
    updatedAt: recent?.updated_at ?? "",
    version: node.version || "",
  }
}

export async function fetchNodes(): Promise<KomariNode[]> {
  const res = await fetch(`${BASE}/api/nodes`)
  const json: KomariApiResponse<KomariNode[]> = await res.json()
  if (json.status !== "success") throw new Error(json.message || "Failed to fetch nodes")
  return json.data
}

export async function fetchRecent(uuid: string): Promise<KomariRecentData[]> {
  const res = await fetch(`${BASE}/api/recent/${uuid}`)
  const json: KomariApiResponse<KomariRecentData[]> = await res.json()
  if (json.status !== "success") throw new Error(json.message || "Failed to fetch recent data")
  return json.data
}

export async function fetchPublicInfo(): Promise<KomariPublicInfo> {
  const res = await fetch(`${BASE}/api/public`)
  const json: KomariApiResponse<KomariPublicInfo> = await res.json()
  if (json.status !== "success") throw new Error(json.message || "Failed to fetch public info")
  return json.data
}

export async function fetchVersion(): Promise<string> {
  try {
    const res = await fetch(`${BASE}/api/version`)
    const json: KomariApiResponse<{ version: string; hash: string }> = await res.json()
    if (json.status !== "success") return ""
    return json.data.version || ""
  } catch {
    return ""
  }
}

export async function fetchPingRecords(uuid: string, hours = 48): Promise<KomariPingData> {
  try {
    const res = await fetch(`${BASE}/api/records/ping?uuid=${uuid}&hours=${hours}`)
    if (!res.ok) {
      return { count: 0, records: [], tasks: [] }
    }
    const json: KomariApiResponse<KomariPingData> = await res.json()
    if (json.status !== "success" || !json.data) {
      return { count: 0, records: [], tasks: [] }
    }
    return json.data
  } catch {
    return { count: 0, records: [], tasks: [] }
  }
}

// RPC2: fetch node versions via common:getNodes (version only visible when authenticated)
export async function fetchNodeVersionsRpc2(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${BASE}/api/rpc2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "common:getNodes",
        id: 1,
      }),
    })
    if (!res.ok) return {}
    const json = await res.json()
    if (json.error || !json.result) return {}
    // result is { [uuid]: Client } — extract version per uuid
    const versions: Record<string, string> = {}
    for (const [uuid, node] of Object.entries(json.result)) {
      const v = (node as any).version
      if (v) versions[uuid] = v
    }
    return versions
  } catch {
    return {}
  }
}

export function createWsUrl(): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:"
  return `${proto}//${location.host}/api/clients`
}
