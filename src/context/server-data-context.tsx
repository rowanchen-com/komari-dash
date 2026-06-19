import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type { ServerOverview, ServerInfo, KomariWsMessage, KomariRecentData, KomariNode } from "@/types/komari"
import { fetchNodes, fetchRecent, fetchVersion, fetchNodeVersionsRpc2, normalizeServer, createWsUrl } from "@/lib/api"

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isRecentDataMap(value: unknown): value is Record<string, KomariRecentData> {
  return isRecord(value)
}

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

export function ServerDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ServerOverview | undefined>()
  const [error, setError] = useState<Error | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [history, setHistory] = useState<ServerDataWithTimestamp[]>([])
  const [serverVersion, setServerVersion] = useState("")
  const nodesRef = useRef<KomariNode[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const prevServersRef = useRef<Map<string, ServerInfo>>(new Map())

  // Build overview from nodes + ws data, reusing server objects when unchanged
  const buildOverview = (
    nodes: KomariNode[],
    onlineUuids: string[],
    wsData: Record<string, KomariRecentData>,
  ): ServerOverview => {
    const visibleNodes = nodes.filter((node) => !node.hidden)
    const onlineSet = new Set(onlineUuids)
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

    const newMap = new Map<string, ServerInfo>()

    for (const node of visibleNodes) {
      const isOnline = onlineSet.has(node.uuid)
      const recent = wsData[node.uuid]
      const server = normalizeServer(node, recent, isOnline)

      // Reuse previous object if data is identical (prevents unnecessary re-renders)
      const prev = prevServersRef.current.get(node.uuid)
      if (prev && hasSameServerSnapshot(prev, server)) {
        overview.servers.push(prev)
        newMap.set(node.uuid, prev)
      } else {
        overview.servers.push(server)
        newMap.set(node.uuid, server)
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
    }

    prevServersRef.current = newMap
    return overview
  }

  // Initial fetch + WebSocket setup
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        // Fetch nodes list and version concurrently
        const [nodes, version, nodeVersions] = await Promise.all([fetchNodes(), fetchVersion(), fetchNodeVersionsRpc2()])
        if (cancelled) return
        // Merge RPC2 versions into nodes
        for (const node of nodes) {
          if (nodeVersions[node.uuid]) {
            node.version = nodeVersions[node.uuid]
          }
        }
        nodesRef.current = nodes
        setServerVersion(version)

        // Fetch initial recent data for all nodes
        const recentResults = await Promise.allSettled(
          nodes.map((n) => fetchRecent(n.uuid)),
        )
        if (cancelled) return

        const onlineUuids: string[] = []
        const wsData: Record<string, KomariRecentData> = {}

        nodes.forEach((node, i) => {
          const result = recentResults[i]
          if (result.status === "fulfilled" && result.value?.length > 0) {
            onlineUuids.push(node.uuid)
            wsData[node.uuid] = result.value[0]
          }
        })

        const overview = buildOverview(nodes, onlineUuids, wsData)
        setData(overview)
        setHistory([{ timestamp: Date.now(), data: overview }])
        setIsLoading(false)

        // Connect WebSocket for real-time updates
        connectWs(nodes)
      } catch (err) {
        if (!cancelled) {
          setError(err as Error)
          setIsLoading(false)
        }
      }
    }

    const connectWs = (nodes: KomariNode[]) => {
      try {
        const ws = new WebSocket(createWsUrl())
        wsRef.current = ws

        ws.onopen = () => {
          ws.send("get")
          // Poll every 2 seconds
          intervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send("get")
            }
          }, 2000)
        }

        ws.onmessage = (event) => {
          try {
            const msg: Partial<KomariWsMessage> = JSON.parse(event.data)
            if (msg.status !== "success" || !isRecord(msg.data)) return

            const online = Array.isArray(msg.data.online) ? msg.data.online : []
            const wsData = isRecentDataMap(msg.data.data) ? msg.data.data : {}
            const overview = buildOverview(nodes, online, wsData)
            setData(overview)
            setHistory((prev) => {
              const newHistory = [
                { timestamp: Date.now(), data: overview },
                ...prev,
              ].slice(0, MAX_HISTORY_LENGTH)
              return newHistory
            })
          } catch {
            // ignore parse errors
          }
        }

        ws.onclose = () => {
          if (intervalRef.current) clearInterval(intervalRef.current)
          // Reconnect after 3 seconds
          if (!cancelled) {
            setTimeout(() => connectWs(nodes), 3000)
          }
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch {
        // WebSocket not available, fall back to polling
        if (!cancelled) {
          intervalRef.current = setInterval(async () => {
            try {
              const nodes = nodesRef.current
              const recentResults = await Promise.allSettled(
                nodes.map((n) => fetchRecent(n.uuid)),
              )
              const onlineUuids: string[] = []
              const wsData: Record<string, KomariRecentData> = {}
              nodes.forEach((node, i) => {
                const result = recentResults[i]
                if (result.status === "fulfilled" && result.value?.length > 0) {
                  onlineUuids.push(node.uuid)
                  wsData[node.uuid] = result.value[0]
                }
              })
              const overview = buildOverview(nodes, onlineUuids, wsData)
              setData(overview)
              setHistory((prev) =>
                [{ timestamp: Date.now(), data: overview }, ...prev].slice(0, MAX_HISTORY_LENGTH),
              )
            } catch { /* ignore */ }
          }, 5000)
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (wsRef.current) wsRef.current.close()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <ServerDataContext.Provider value={{ data, error, isLoading, history, serverVersion }}>
      {children}
    </ServerDataContext.Provider>
  )
}

export function useServerData() {
  const ctx = useContext(ServerDataContext)
  if (!ctx) throw new Error("useServerData must be used within ServerDataProvider")
  return ctx
}
