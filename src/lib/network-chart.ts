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
  let maxDownload = Math.max(...points.map((point) => point.download))
  maxDownload = Math.ceil(maxDownload)
  if (maxDownload < 1) maxDownload = 1
  return maxDownload
}

type CurrentNetworkServer = NetworkSnapshot["data"]["servers"][number]

export function buildNetworkChartData(history: readonly NetworkSnapshot[], current: CurrentNetworkServer, recent: readonly NetworkSpeedSample[] = []): NetworkChartPoint[] {
  if (recent.length > 0) {
    const lastTimestamp = recent[recent.length - 1].timestamp
    const now = Date.now()
    return recent.map((sample) => ({
      ts: (now - (lastTimestamp - sample.timestamp)).toString(),
      upload: sample.up / 1024 / 1024,
      download: sample.down / 1024 / 1024,
    }))
  }

  const points = history.flatMap((snapshot) => {
    const server = snapshot.data.servers.find((item) => item.uuid === current.uuid)
    return server ? [{
      ts: snapshot.timestamp.toString(),
      upload: server.status.netOutSpeed / 1024 / 1024,
      download: server.status.netInSpeed / 1024 / 1024,
    }] : []
  }).reverse()

  const currentPoint = {
    ts: Date.now().toString(),
    upload: current.status.netOutSpeed / 1024 / 1024,
    download: current.status.netInSpeed / 1024 / 1024,
  }
  if (points.length === 0) return [currentPoint, currentPoint]

  const latest = points[points.length - 1]
  if (latest.upload === currentPoint.upload && latest.download === currentPoint.download) {
    return points.slice(-30)
  }
  return [...points, currentPoint].slice(-30)
}
