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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isSuccessResponse<T>(json: unknown): json is KomariApiResponse<T> {
  return isRecord(json) && json.status === "success" && "data" in json
}

function errorMessage(json: unknown, fallback: string) {
  return isRecord(json) && typeof json.message === "string" ? json.message : fallback
}

async function readApiData<T>(
  response: Response,
  fallbackMessage: string,
  validate?: (data: unknown) => boolean,
): Promise<T> {
  if (!response.ok) {
    throw new Error(`${fallbackMessage} (HTTP ${response.status})`)
  }

  const json: unknown = await response.json()
  if (!isSuccessResponse<T>(json)) {
    throw new Error(errorMessage(json, fallbackMessage))
  }

  if (validate && !validate(json.data)) {
    throw new Error(`${fallbackMessage}: invalid data format`)
  }

  return json.data
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

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
      cpu: asNumber(recent?.cpu?.usage),
      memUsed: asNumber(recent?.ram?.used),
      swapUsed: asNumber(recent?.swap?.used),
      diskUsed: asNumber(recent?.disk?.used),
      netInSpeed: asNumber(recent?.network?.down),
      netOutSpeed: asNumber(recent?.network?.up),
      netInTransfer: asNumber(recent?.network?.totalDown),
      netOutTransfer: asNumber(recent?.network?.totalUp),
      uptime: asNumber(recent?.uptime),
      load1: asNumber(recent?.load?.load1),
      load5: asNumber(recent?.load?.load5),
      load15: asNumber(recent?.load?.load15),
      tcpConn: asNumber(recent?.connections?.tcp),
      udpConn: asNumber(recent?.connections?.udp),
      process: asNumber(recent?.process),
      gpu: asNumber(recent?.gpu?.average_usage),
    },
    updatedAt: recent?.updated_at ?? "",
    version: node.version || "",
  }
}

export async function fetchNodes(): Promise<KomariNode[]> {
  const res = await fetch(`${BASE}/api/nodes`)
  return readApiData<KomariNode[]>(res, "Failed to fetch nodes", Array.isArray)
}

export async function fetchRecent(uuid: string): Promise<KomariRecentData[]> {
  const res = await fetch(`${BASE}/api/recent/${uuid}`)
  return readApiData<KomariRecentData[]>(res, "Failed to fetch recent data", Array.isArray)
}

export async function fetchPublicInfo(): Promise<KomariPublicInfo> {
  const res = await fetch(`${BASE}/api/public`)
  return readApiData<KomariPublicInfo>(res, "Failed to fetch public info", isRecord)
}

export async function fetchVersion(): Promise<string> {
  try {
    const res = await fetch(`${BASE}/api/version`)
    const data = await readApiData<{ version?: string; hash?: string }>(
      res,
      "Failed to fetch version",
      isRecord,
    )
    return typeof data.version === "string" ? data.version : ""
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
    const data = await readApiData<KomariPingData>(res, "Failed to fetch ping records", isRecord)
    return {
      count: asNumber(data.count),
      records: Array.isArray(data.records) ? data.records : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
    }
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
    const json: unknown = await res.json()
    if (!isRecord(json) || json.error || !isRecord(json.result)) return {}
    // result is { [uuid]: Client } — extract version per uuid
    const versions: Record<string, string> = {}
    for (const [uuid, node] of Object.entries(json.result)) {
      const v = isRecord(node) ? node.version : undefined
      if (typeof v === "string") versions[uuid] = v
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
