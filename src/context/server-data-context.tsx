import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type { KomariLatestStatus, KomariNode, ServerInfo, ServerOverview } from "@/types/komari"
import { fetchLatestStatuses, fetchNodes, fetchVersion, normalizeServer } from "@/lib/komari-rpc"

export interface ServerDataWithTimestamp {
  timestamp: number
  data: ServerOverview
}

interface ServerDataContextType {
  data: ServerOverview | undefined
  error: Error | undefined
  isLoading: boolean
  history: ServerDataWithTimestamp[]
  serverVersion: string
}

const ServerDataContext = createContext<ServerDataContextType | undefined>(undefined)

export const MAX_HISTORY_LENGTH = 30
const POLL_INTERVAL = 2000

function hasSameServerSnapshot(prev: ServerInfo, next: ServerInfo): boolean {
  return prev.name === next.name &&
    prev.online === next.online &&
    prev.group === next.group &&
    prev.tags === next.tags &&
    prev.weight === next.weight &&
    prev.region === next.region &&
    prev.public_remark === next.public_remark &&
    prev.version === next.version &&
    prev.host.os === next.host.os &&
    prev.host.kernel === next.host.kernel &&
    prev.host.cpu === next.host.cpu &&
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

function buildOverview(
  nodes: KomariNode[],
  statuses: Record<string, KomariLatestStatus>,
  previous: Map<string, ServerInfo>,
): { overview: ServerOverview; serverMap: Map<string, ServerInfo> } {
  const visibleNodes = nodes.filter((node) => !node.hidden)
  const overview: ServerOverview = {
    total: visibleNodes.length,
    online: 0,
    offline: 0,
    totalInBandwidth: 0,
    totalOutBandwidth: 0,
    totalInSpeed: 0,
    totalOutSpeed: 0,
    servers: [],
  }
  const serverMap = new Map<string, ServerInfo>()

  for (const node of visibleNodes) {
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
  const [serverVersion, setServerVersion] = useState("")
  const previousServersRef = useRef<Map<string, ServerInfo>>(new Map())

  useEffect(() => {
    let cancelled = false
    let polling = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let nodes: KomariNode[] = []
    const controller = new AbortController()

    const applyStatuses = (statuses: Record<string, KomariLatestStatus>, initial = false) => {
      const { overview, serverMap } = buildOverview(nodes, statuses, previousServersRef.current)
      previousServersRef.current = serverMap
      setData(overview)
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
      if (cancelled || polling) return
      polling = true
      try {
        const statuses = await fetchLatestStatuses(controller.signal)
        if (!cancelled) applyStatuses(statuses)
      } catch {
        // Keep the last successful snapshot during transient network failures.
      } finally {
        polling = false
        schedulePoll()
      }
    }

    const handleVisibilityChange = () => {
      if (timer) clearTimeout(timer)
      timer = undefined
      if (document.visibilityState !== "hidden") void poll()
    }

    const init = async () => {
      try {
        const [nodeList, statuses, version] = await Promise.all([
          fetchNodes(controller.signal),
          fetchLatestStatuses(controller.signal),
          fetchVersion(controller.signal),
        ])
        if (cancelled) return

        nodes = nodeList
        setServerVersion(version)
        applyStatuses(statuses, true)
        setIsLoading(false)
        schedulePoll()
      } catch (initError) {
        if (!cancelled) {
          setError(initError instanceof Error ? initError : new Error(String(initError)))
          setIsLoading(false)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    void init()

    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return (
    <ServerDataContext.Provider value={{ data, error, isLoading, history, serverVersion }}>
      {children}
    </ServerDataContext.Provider>
  )
}

export function useServerData() {
  const context = useContext(ServerDataContext)
  if (!context) throw new Error("useServerData must be used within ServerDataProvider")
  return context
}
