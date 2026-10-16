import type { ServerInfo } from "@/types/komari"

interface ServerSnapshot {
  data: { servers: readonly ServerInfo[] }
}

export function getServerHistory(history: readonly ServerSnapshot[], uuid: string) {
  const samples = new Map<number, { ts: string; server: ServerInfo }>()
  for (const snapshot of history) {
    const server = snapshot.data.servers.find((item) => item.uuid === uuid)
    if (!server) continue
    const timestamp = Date.parse(server.updatedAt)
    if (!Number.isFinite(timestamp) || samples.has(timestamp)) continue
    samples.set(timestamp, { ts: String(timestamp), server })
  }
  return [...samples.values()].sort((a, b) => Number(a.ts) - Number(b.ts))
}
