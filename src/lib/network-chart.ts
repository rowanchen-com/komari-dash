import type { NetworkSpeedSample } from "@/lib/komari-rpc"

const NETWORK_HISTORY_WINDOW_MS = 15 * 60 * 1000

export function mergeNetworkHistories(
  previous: Record<string, NetworkSpeedSample[]>,
  incoming: Record<string, NetworkSpeedSample[]>,
  now: number,
): Record<string, NetworkSpeedSample[]> {
  const cutoff = now - NETWORK_HISTORY_WINDOW_MS
  const result: Record<string, NetworkSpeedSample[]> = {}
  for (const uuid of new Set([...Object.keys(previous), ...Object.keys(incoming)])) {
    const samples = new Map<number, NetworkSpeedSample>()
    for (const sample of previous[uuid] ?? []) {
      if (sample.timestamp >= cutoff) samples.set(sample.timestamp, sample)
    }
    for (const sample of incoming[uuid] ?? []) {
      if (sample.timestamp >= cutoff) samples.set(sample.timestamp, sample)
    }
    if (samples.size > 0) {
      result[uuid] = [...samples.values()].sort((a, b) => a.timestamp - b.timestamp)
    }
  }
  return result
}

export function combineNetworkHistory(
  metricHistory: readonly NetworkSpeedSample[],
  liveHistory: readonly NetworkSpeedSample[],
  now: number,
): NetworkSpeedSample[] {
  const firstLiveTimestamp = liveHistory[0]?.timestamp ?? Infinity
  return mergeNetworkHistories(
    { server: metricHistory.filter((sample) => sample.timestamp < firstLiveTimestamp) },
    { server: [...liveHistory] },
    now,
  ).server ?? []
}

interface NetworkSnapshot {
  timestamp: number
  data: {
    servers: readonly {
      uuid: string
      status: { netOutSpeed: number; netInSpeed: number }
    }[]
  }
}

export interface NetworkChartPoint {
  ts: string
  upload: number
  download: number
}

export function getNetworkAxisMax(points: readonly NetworkChartPoint[]): number {
  const peak = Math.max(0, ...points.flatMap((point) => [point.upload, point.download]))
  return Math.max(1, Math.ceil(peak))
}

type CurrentNetworkServer = NetworkSnapshot["data"]["servers"][number]

export function buildNetworkChartData(history: readonly NetworkSnapshot[], current: CurrentNetworkServer, recent: readonly NetworkSpeedSample[] = []): NetworkChartPoint[] {
  if (recent.length > 0) {
    return recent.map((sample) => ({
      ts: sample.timestamp.toString(),
      upload: sample.up / 1024 / 1024,
      download: sample.down / 1024 / 1024,
    }))
  }

  return history.flatMap((snapshot) => {
    const server = snapshot.data.servers.find((item) => item.uuid === current.uuid)
    return server ? [{
      ts: snapshot.timestamp.toString(),
      upload: server.status.netOutSpeed / 1024 / 1024,
      download: server.status.netInSpeed / 1024 / 1024,
    }] : []
  }).reverse().slice(-30)
}
