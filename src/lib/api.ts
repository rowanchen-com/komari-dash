import type {
  KomariNode,
  KomariRecentData,
  KomariApiResponse,
  KomariPublicInfo,
  KomariPingData,
  ServerInfo,
  ServerOverview,
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
    version: recent?.message ?? "",
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

export async function fetchServerOverview(): Promise<ServerOverview> {
  const nodes = await fetchNodes()

  // Fetch recent data for all nodes concurrently
  const recentResults = await Promise.allSettled(
    nodes.map((n) => fetchRecent(n.uuid)),
  )

  const overview: ServerOverview = {
    total: nodes.length,
    online: 0,
    offline: 0,
    totalInBandwidth: 0,
    totalOutBandwidth: 0,
    totalInSpeed: 0,
    totalOutSpeed: 0,
    servers: [],
  }

  nodes.forEach((node, i) => {
    const result = recentResults[i]
    const recent =
      result.status === "fulfilled" && result.value.length > 0
        ? result.value[0]
        : undefined
    const isOnline = !!recent

    const server = normalizeServer(node, recent, isOnline)

    if (!node.hidden) {
      overview.servers.push(server)
    }

    if (isOnline) {
      overview.online++
      overview.totalInBandwidth += server.status.netInTransfer
      overview.totalOutBandwidth += server.status.netOutTransfer
      overview.totalInSpeed += server.status.netInSpeed
      overview.totalOutSpeed += server.status.netOutSpeed
    } else {
      overview.offline++
    }
  })

  return overview
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

export function createWsUrl(): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:"
  return `${proto}//${location.host}/api/clients`
}
