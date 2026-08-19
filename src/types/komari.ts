// Komari 1.4.3 RPC2 contracts used by this theme.

export interface KomariNode {
  uuid: string
  name: string
  cpu_name: string
  virtualization: string
  arch: string
  cpu_cores: number
  os: string
  kernel_version: string
  gpu_name: string
  region: string
  public_remark?: string
  mem_total: number
  swap_total: number
  disk_total: number
  weight: number
  group: string
  tags: string
  hidden: boolean
  version: string
}

export interface KomariLatestStatus {
  client: string
  time: string
  cpu: number
  ram: number
  ram_total: number
  swap: number
  swap_total: number
  load: number
  load5: number
  load15: number
  disk: number
  disk_total: number
  net_in: number
  net_out: number
  net_total_up: number
  net_total_down: number
  process: number
  connections: number
  connections_udp: number
  online: boolean
  uptime: number
}

export interface KomariPublicInfo {
  sitename: string
  theme_settings: Record<string, unknown> | null
}

export type MetricTags = Record<string, string>

export interface MetricPoint {
  time: string
  value: number | null
  tags?: MetricTags
}

export interface MetricSeries {
  metric_key: string
  entity_id: string
  tags?: MetricTags
  points: MetricPoint[]
}

export interface QueryMetricsResponse {
  series: MetricSeries[]
}

export interface PublicPingTask {
  id: number
  weight: number
  name: string
  clients: string[]
  default_on: boolean
  interval: number
}

export interface PingMetricStat {
  entity_id: string
  task_id: string
  name?: string
  interval?: number
  loss: number
}

export interface PingMetricStatsResponse {
  stats: PingMetricStat[]
}

export interface PingChartPoint {
  taskId: string
  time: string
  value: number | null
}

export interface PingChartTask {
  id: string
  weight: number
  name: string
  interval: number
  loss: number
}

export interface PingChartData {
  points: PingChartPoint[]
  tasks: PingChartTask[]
}

// Normalized server data used by UI components.
export interface ServerInfo {
  uuid: string
  name: string
  online: boolean
  group: string
  tags: string
  weight: number
  hidden: boolean
  region: string
  public_remark?: string
  host: {
    os: string
    kernel: string
    cpu: string
    cpuCores: number
    gpu: string
    arch: string
    virtualization: string
    memTotal: number
    swapTotal: number
    diskTotal: number
  }
  status: {
    cpu: number
    memUsed: number
    swapUsed: number
    diskUsed: number
    netInSpeed: number
    netOutSpeed: number
    netInTransfer: number
    netOutTransfer: number
    uptime: number
    load1: number
    load5: number
    load15: number
    tcpConn: number
    udpConn: number
    process: number
  }
  updatedAt: string
  version: string
}

export interface ServerOverview {
  total: number
  online: number
  offline: number
  totalInBandwidth: number
  totalOutBandwidth: number
  totalInSpeed: number
  totalOutSpeed: number
  servers: ServerInfo[]
}
