import { rpcCall } from "@/lib/rpc2"
import type {
  KomariLatestStatus,
  KomariNode,
  KomariPublicInfo,
  MetricSeries,
  PingChartData,
  PingChartTask,
  PingMetricStat,
  PingMetricStatsResponse,
  PublicPingTask,
  QueryMetricsResponse,
  ServerInfo,
} from "@/types/komari"

const PING_LATENCY_METRIC = "ping.latency_ms"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function normalizeNode(value: unknown, fallbackUuid: string): KomariNode | null {
  if (!isRecord(value)) return null
  const uuid = asString(value.uuid) || fallbackUuid
  if (!uuid) return null

  return {
    uuid,
    name: asString(value.name) || uuid,
    cpu_name: asString(value.cpu_name),
    virtualization: asString(value.virtualization),
    arch: asString(value.arch),
    cpu_cores: asNumber(value.cpu_cores),
    os: asString(value.os),
    kernel_version: asString(value.kernel_version),
    gpu_name: asString(value.gpu_name),
    region: asString(value.region),
    public_remark: asString(value.public_remark) || undefined,
    mem_total: asNumber(value.mem_total),
    swap_total: asNumber(value.swap_total),
    disk_total: asNumber(value.disk_total),
    weight: asNumber(value.weight),
    group: asString(value.group),
    tags: asString(value.tags),
    hidden: asBoolean(value.hidden),
    version: asString(value.version),
  }
}

export function normalizeNodes(value: unknown): KomariNode[] {
  if (!isRecord(value)) throw new Error("Invalid common:getNodes result")

  return Object.entries(value)
    .map(([uuid, node]) => normalizeNode(node, uuid))
    .filter((node): node is KomariNode => node !== null)
}

function normalizeLatestStatus(value: unknown, fallbackUuid: string): KomariLatestStatus | null {
  if (!isRecord(value)) return null
  const client = asString(value.client) || fallbackUuid
  if (!client) return null

  return {
    client,
    time: asString(value.time),
    cpu: asNumber(value.cpu),
    ram: asNumber(value.ram),
    ram_total: asNumber(value.ram_total),
    swap: asNumber(value.swap),
    swap_total: asNumber(value.swap_total),
    load: asNumber(value.load),
    load5: asNumber(value.load5),
    load15: asNumber(value.load15),
    disk: asNumber(value.disk),
    disk_total: asNumber(value.disk_total),
    net_in: asNumber(value.net_in),
    net_out: asNumber(value.net_out),
    net_total_up: asNumber(value.net_total_up),
    net_total_down: asNumber(value.net_total_down),
    process: asNumber(value.process),
    connections: asNumber(value.connections),
    connections_udp: asNumber(value.connections_udp),
    online: asBoolean(value.online),
    uptime: asNumber(value.uptime),
  }
}

export function normalizeLatestStatuses(value: unknown): Record<string, KomariLatestStatus> {
  if (!isRecord(value)) throw new Error("Invalid common:getNodesLatestStatus result")

  const statuses: Record<string, KomariLatestStatus> = {}
  for (const [uuid, status] of Object.entries(value)) {
    const normalized = normalizeLatestStatus(status, uuid)
    if (normalized) statuses[uuid] = normalized
  }
  return statuses
}

export function normalizeServer(node: KomariNode, latest?: KomariLatestStatus): ServerInfo {
  const udpConnections = asNumber(latest?.connections_udp)
  const totalConnections = asNumber(latest?.connections)

  return {
    uuid: node.uuid,
    name: node.name,
    online: latest?.online === true,
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
      memTotal: latest?.ram_total || node.mem_total,
      swapTotal: latest?.swap_total || node.swap_total,
      diskTotal: latest?.disk_total || node.disk_total,
    },
    status: {
      cpu: asNumber(latest?.cpu),
      memUsed: asNumber(latest?.ram),
      swapUsed: asNumber(latest?.swap),
      diskUsed: asNumber(latest?.disk),
      netInSpeed: asNumber(latest?.net_in),
      netOutSpeed: asNumber(latest?.net_out),
      netInTransfer: asNumber(latest?.net_total_down),
      netOutTransfer: asNumber(latest?.net_total_up),
      uptime: asNumber(latest?.uptime),
      load1: asNumber(latest?.load),
      load5: asNumber(latest?.load5),
      load15: asNumber(latest?.load15),
      tcpConn: Math.max(0, totalConnections - udpConnections),
      udpConn: udpConnections,
      process: asNumber(latest?.process),
    },
    updatedAt: latest?.time ?? "",
    version: node.version,
  }
}

export async function fetchNodes(signal?: AbortSignal): Promise<KomariNode[]> {
  const result = await rpcCall<undefined, unknown>("common:getNodes", undefined, { signal })
  return normalizeNodes(result)
}

export async function fetchLatestStatuses(signal?: AbortSignal): Promise<Record<string, KomariLatestStatus>> {
  const result = await rpcCall<undefined, unknown>("common:getNodesLatestStatus", undefined, { signal })
  return normalizeLatestStatuses(result)
}

export async function fetchPublicInfo(signal?: AbortSignal): Promise<KomariPublicInfo> {
  const result = await rpcCall<undefined, unknown>("common:getPublicInfo", undefined, { signal })
  if (!isRecord(result)) throw new Error("Invalid common:getPublicInfo result")

  return {
    sitename: asString(result.sitename),
    theme_settings: isRecord(result.theme_settings) ? result.theme_settings : null,
  }
}

export async function fetchVersion(signal?: AbortSignal): Promise<string> {
  try {
    const result = await rpcCall<undefined, unknown>("common:getVersion", undefined, { signal })
    return isRecord(result) ? asString(result.version) : ""
  } catch {
    return ""
  }
}

function pointTaskId(series: MetricSeries, point: MetricSeries["points"][number]): string {
  return point.tags?.task_id?.trim() || series.tags?.task_id?.trim() || ""
}

export function buildPingChartData(
  uuid: string,
  tasksValue: unknown,
  metricsValue: unknown,
  statsValue: unknown,
): PingChartData {
  const tasks = Array.isArray(tasksValue) ? tasksValue : []
  const metrics = isRecord(metricsValue) && Array.isArray(metricsValue.series)
    ? metricsValue.series as MetricSeries[]
    : []
  const stats = isRecord(statsValue) && Array.isArray(statsValue.stats)
    ? statsValue.stats as PingMetricStat[]
    : []

  const taskMap = new Map<string, PublicPingTask>()
  for (const value of tasks) {
    if (!isRecord(value)) continue
    const id = asNumber(value.id)
    if (id <= 0) continue
    taskMap.set(String(id), {
      id,
      weight: asNumber(value.weight),
      name: asString(value.name),
      clients: asStringArray(value.clients),
      default_on: asBoolean(value.default_on),
      interval: asNumber(value.interval),
    })
  }

  const statsMap = new Map<string, PingMetricStat>()
  for (const value of stats) {
    if (!isRecord(value)) continue
    const entityId = asString(value.entity_id)
    const taskId = asString(value.task_id)
    if (entityId !== uuid || !taskId) continue
    statsMap.set(taskId, {
      entity_id: entityId,
      task_id: taskId,
      name: asString(value.name) || undefined,
      interval: asNumber(value.interval),
      loss: asNumber(value.loss),
    })
  }

  const points: PingChartData["points"] = []
  const taskIds = new Set<string>()
  for (const value of metrics) {
    if (
      !isRecord(value) ||
      value.metric_key !== PING_LATENCY_METRIC ||
      value.entity_id !== uuid ||
      !Array.isArray(value.points)
    ) continue
    const series = value as unknown as MetricSeries
    for (const point of series.points) {
      if (!isRecord(point)) continue
      const taskId = pointTaskId(series, point)
      const time = asString(point.time)
      if (!taskId || !Number.isFinite(Date.parse(time))) continue
      taskIds.add(taskId)
      points.push({
        taskId,
        time,
        value: typeof point.value === "number" && Number.isFinite(point.value) && point.value >= 0
          ? point.value
          : null,
      })
    }
  }

  const chartTasks: PingChartTask[] = Array.from(taskIds, (id) => {
    const task = taskMap.get(id)
    const stat = statsMap.get(id)
    return {
      id,
      weight: task?.weight ?? 0,
      name: task?.name || stat?.name || `Ping ${id}`,
      interval: task?.interval || stat?.interval || 0,
      loss: stat?.loss ?? 0,
    }
  }).sort((left, right) => left.weight - right.weight || Number(left.id) - Number(right.id))

  points.sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime())
  return { points, tasks: chartTasks }
}

export async function fetchPingChartData(uuid: string, hours = 48, signal?: AbortSignal): Promise<PingChartData> {
  const [tasks, metrics, stats] = await Promise.all([
    rpcCall<undefined, PublicPingTask[]>("public:getPublicPingTasks", undefined, { signal }).catch(() => []),
    rpcCall<Record<string, unknown>, QueryMetricsResponse>("public:queryMetrics", {
      metric_keys: [PING_LATENCY_METRIC],
      entity_id: uuid,
      hours,
      max_points: 240,
      aggregation: "avg",
      fill_empty: true,
    }, { signal, timeout: 30000 }),
    rpcCall<Record<string, unknown>, PingMetricStatsResponse>("public:getPingMetricStats", {
      entity_id: uuid,
      hours,
      max_points: 240,
    }, { signal, timeout: 30000 }).catch(() => ({ stats: [] })),
  ])

  return buildPingChartData(uuid, tasks, metrics, stats)
}
