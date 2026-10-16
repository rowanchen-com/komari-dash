import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type { KomariLatestStatus, KomariNode, ServerInfo, ServerOverview } from "@/types/komari"
import { fetchLatestStatuses, fetchNodes, fetchRecentNetworkData, normalizeServer, type NetworkSpeedSample } from "@/lib/komari-rpc"
import { mergeNetworkHistories } from "@/lib/network-chart"

export interface ServerDataWithTimestamp {
  timestamp: number
  data: ServerOverview
}

interface ServerDataContextType {
  data: ServerOverview | undefined
  error: Error | undefined
  isLoading: boolean
  history: ServerDataWithTimestamp[]
  networkHistory: Record<string, NetworkSpeedSample[]>
}

const ServerDataContext = createContext<ServerDataContextType | undefined>(undefined)

export const MAX_HISTORY_LENGTH = 30
const POLL_INTERVAL = 2000
const NODE_REFRESH_INTERVAL = 60_000

function hasSameServerSnapshot(prev: ServerInfo, next: ServerInfo): boolean {
  return prev.name === next.name &&
    prev.online === next.online &&
    prev.group === next.group &&
    prev.tags === next.tags &&
    prev.weight === next.weight &&
    prev.hidden === next.hidden &&
    prev.region === next.region &&
    prev.public_remark === next.public_remark &&
    prev.version === next.version &&
    prev.host.os === next.host.os &&
    prev.host.kernel === next.host.kernel &&
    prev.host.cpu === next.host.cpu &&
    prev.host.cpuCores === next.host.cpuCores &&
    prev.host.gpu === next.host.gpu &&
    prev.host.arch === next.host.arch &&
    prev.host.virtualization === next.host.virtualization &&
    prev.host.memTotal === next.host.memTotal &&
    prev.host.swapTotal === next.host.swapTotal &&
    prev.host.diskTotal === next.host.diskTotal &&
    prev.status.cpu === next.status.cpu &&
    prev.status.memUsed === next.status.memUsed &&
    prev.status.swapUsed === next.status.swapUsed &&
    prev.status.diskUsed === next.status.diskUsed &&
    prev.status.netInSpeed === next.status.netInSpeed &&
    prev.status.netOutSpeed === next.status.netOutSpeed &&
    prev.status.netInTransfer === next.status.netInTransfer &&
    prev.status.netOutTransfer === next.status.netOutTransfer &&
    prev.status.uptime === next.status.uptime &&
    prev.status.load1 === next.status.load1 &&
    prev.status.load5 === next.status.load5 &&
    prev.status.load15 === next.status.load15 &&
    prev.status.tcpConn === next.status.tcpConn &&
    prev.status.udpConn === next.status.udpConn &&
    prev.status.process === next.status.process &&
    prev.updatedAt === next.updatedAt
}

export function buildOverview(
  nodes: KomariNode[],
  statuses: Record<string, KomariLatestStatus>,
  previous: Map<string, ServerInfo>,
): { overview: ServerOverview; serverMap: Map<string, ServerInfo> } {
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
  const serverMap = new Map<string, ServerInfo>()

  for (const node of nodes) {
    const normalized = normalizeServer(node, statuses[node.uuid])
    const oldServer = previous.get(node.uuid)
    const server = oldServer && hasSameServerSnapshot(oldServer, normalized) ? oldServer : normalized
    overview.servers.push(server)
    serverMap.set(node.uuid, server)

    if (server.online) {
      overview.online++
      overview.totalInBandwidth += server.status.netInTransfer
      overview.totalOutBandwidth += server.status.netOutTransfer
      overview.totalInSpeed += server.status.netInSpeed
      overview.totalOutSpeed += server.status.netOutSpeed
    } else {
      overview.offline++
    }
  }

  return { overview, serverMap }
}

export function ServerDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ServerOverview | undefined>()
  const [error, setError] = useState<Error | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [history, setHistory] = useState<ServerDataWithTimestamp[]>([])
  const [networkHistory, setNetworkHistory] = useState<Record<string, NetworkSpeedSample[]>>({})
  const previousServersRef = useRef<Map<string, ServerInfo>>(new Map())

  useEffect(() => {
    let cancelled = false
    let polling = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let nodes: KomariNode[] = []
    let nodesLoadedAt = 0
    let initialized = false
    const controller = new AbortController()

    const applyStatuses = (statuses: Record<string, KomariLatestStatus>, recentHistory: Record<string, NetworkSpeedSample[]>, initial = false) => {
      const { overview, serverMap } = buildOverview(nodes, statuses, previousServersRef.current)
      previousServersRef.current = serverMap
      setData(overview)
      const liveHistory: Record<string, NetworkSpeedSample[]> = {}
      for (const [uuid, status] of Object.entries(statuses)) {
        if (!status.online) continue
        const timestamp = Date.parse(status.time)
        const samples = recentHistory[uuid]
        const latestRecent = samples?.[samples.length - 1]
        if (!Number.isFinite(timestamp) || (latestRecent && latestRecent.timestamp > timestamp)) continue
        liveHistory[uuid] = [{ timestamp, up: status.net_out, down: status.net_in }]
      }
      setNetworkHistory((current) => mergeNetworkHistories(
        mergeNetworkHistories(current, recentHistory, Date.now()),
        liveHistory,
        Date.now(),
      ))
      setHistory((current) => {
        const next = { timestamp: Date.now(), data: overview }
        return initial ? [next] : [next, ...current].slice(0, MAX_HISTORY_LENGTH)
      })
    }

    const schedulePoll = () => {
      if (!cancelled && document.visibilityState !== "hidden") {
        timer = setTimeout(poll, POLL_INTERVAL)
      }
    }

    const poll = async () => {
      if (cancelled || polling || document.visibilityState === "hidden") return
      polling = true
      if (timer) clearTimeout(timer)
      timer = undefined
      try {
        const refreshNodes = !initialized || Date.now() - nodesLoadedAt >= NODE_REFRESH_INTERVAL
        const [nodeList, latest] = await Promise.all([
          refreshNodes ? fetchNodes(controller.signal) : Promise.resolve(nodes),
          fetchLatestStatuses(controller.signal),
        ])
        if (cancelled) return
        nodes = nodeList
        if (refreshNodes) nodesLoadedAt = Date.now()
        const { statuses, history: recentHistory } = await fetchRecentNetworkData(nodes, latest, controller.signal)
        if (cancelled) return
        applyStatuses(statuses, recentHistory, !initialized)
        initialized = true
        setError(undefined)
      } catch (pollError) {
        // Preserve a successful snapshot, but keep retrying an initial failure.
        if (!cancelled && !initialized) setError(pollError instanceof Error ? pollError : new Error(String(pollError)))
      } finally {
        polling = false
        if (!cancelled) setIsLoading(false)
        schedulePoll()
      }
    }

    const handleVisibilityChange = () => {
      if (timer) clearTimeout(timer)
      timer = undefined
      if (document.visibilityState !== "hidden") void poll()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    void poll()

    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return (
    <ServerDataContext.Provider value={{ data, error, isLoading, history, networkHistory }}>
      {children}
    </ServerDataContext.Provider>
  )
}

export function useServerData() {
  const context = useContext(ServerDataContext)
  if (!context) throw new Error("useServerData must be used within ServerDataProvider")
  return context
}
