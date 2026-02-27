import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type { ServerOverview, ServerInfo, KomariWsMessage, KomariRecentData, KomariNode } from "@/types/komari"
import { fetchNodes, fetchRecent, fetchVersion, normalizeServer, createWsUrl } from "@/lib/api"

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
    const onlineSet = new Set(onlineUuids)
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

    const newMap = new Map<string, ServerInfo>()

    for (const node of nodes) {
      if (node.hidden) continue
      const isOnline = onlineSet.has(node.uuid)
      const recent = wsData[node.uuid]
      const server = normalizeServer(node, recent, isOnline)

      // Reuse previous object if data is identical (prevents unnecessary re-renders)
      const prev = prevServersRef.current.get(node.uuid)
      if (prev && prev.online === server.online &&
          prev.status.cpu === server.status.cpu &&
          prev.status.memUsed === server.status.memUsed &&
          prev.status.diskUsed === server.status.diskUsed &&
          prev.status.netInSpeed === server.status.netInSpeed &&
          prev.status.netOutSpeed === server.status.netOutSpeed &&
          prev.status.netInTransfer === server.status.netInTransfer &&
          prev.status.netOutTransfer === server.status.netOutTransfer &&
          prev.status.uptime === server.status.uptime &&
          prev.status.tcpConn === server.status.tcpConn &&
          prev.status.udpConn === server.status.udpConn &&
          prev.status.process === server.status.process) {
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
        const [nodes, version] = await Promise.all([fetchNodes(), fetchVersion()])
        if (cancelled) return
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
          if (result.status === "fulfilled" && result.value.length > 0) {
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
            const msg: KomariWsMessage = JSON.parse(event.data)
            if (msg.status !== "success") return

            const overview = buildOverview(nodes, msg.data.online, msg.data.data)
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
                if (result.status === "fulfilled" && result.value.length > 0) {
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
