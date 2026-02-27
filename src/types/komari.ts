// Komari API types

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
  price: number
  billing_cycle: number
  auto_renewal: boolean
  currency: string
  expired_at: string | null
  group: string
  tags: string
  hidden: boolean
  traffic_limit: number
  traffic_limit_type: string
  created_at: string
  updated_at: string
}

export interface KomariRecentData {
  cpu: { usage: number }
  ram: { total: number; used: number }
  swap: { total: number; used: number }
  load: { load1: number; load5: number; load15: number }
  disk: { total: number; used: number }
  network: { up: number; down: number; totalUp: number; totalDown: number }
  connections: { tcp: number; udp: number }
  uptime: number
  process: number
  message: string
  updated_at: string
}

export interface KomariPingRecord {
  task_id: number
  time: string
  value: number
}

export interface KomariPingTask {
  id: number
  interval: number
  name: string
  loss: number
}

export interface KomariPingData {
  count: number
  records: KomariPingRecord[]
  tasks: KomariPingTask[]
}

export interface KomariApiResponse<T> {
  status: string
  message: string
  data: T
}

export interface KomariWsMessage {
  status: string
  data: {
    online: string[]
    data: Record<string, KomariRecentData>
  }
}

export interface KomariPublicInfo {
  allow_cors: boolean
  custom_body: string
  custom_head: string
  description: string
  disable_password_login: boolean
  oauth_enable: boolean
  oauth_provider: string
  ping_record_preserve_time: number
  private_site: boolean
  record_enabled: boolean
  record_preserve_time: number
  sitename: string
  theme: string
  theme_settings: Record<string, unknown> | null
}

// Normalized server data used by UI components
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
