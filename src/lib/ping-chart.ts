export interface PingDisplayPoint {
  created_at: number
  [key: string]: number | null
}

export function getPingChartTicks(data: readonly PingDisplayPoint[]): number[] {
  if (data.length === 0) return []
  const hours = (data[data.length - 1].created_at - data[0].created_at) / 3_600_000
  return data.flatMap((point, index) => {
    if (data.length < 6) return index === 0 || index === data.length - 1 ? [point.created_at] : []
    const date = new Date(point.created_at)
    if (hours <= 12) {
      return index === 0 || index === data.length - 1 || date.getMinutes() === 0 ? [point.created_at] : []
    }
    // Komari's rollup starts on an exact hour; avoid repeating that edge label.
    return index > 0 && date.getMinutes() === 0 && date.getHours() % 2 === 0 ? [point.created_at] : []
  })
}

export function smoothPingChartData<T extends PingDisplayPoint>(
  data: readonly T[],
  activeChart: string,
  taskIds: readonly string[],
): T[] {
  const windowSize = 11
  const alpha = 0.3

  const getMedian = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }

  const processValues = (values: number[]) => {
    if (values.length === 0) return null
    const median = getMedian(values)
    const deviations = values.map((value) => Math.abs(value - median))
    const medianDeviation = getMedian(deviations) * 1.4826
    const validValues = values.filter((value) => Math.abs(value - median) <= 3 * medianDeviation && value <= median * 3)
    if (validValues.length === 0) return median
    let ewma = validValues[0]
    for (let i = 1; i < validValues.length; i++) {
      ewma = alpha * validValues[i] + (1 - alpha) * ewma
    }
    return ewma
  }

  const ewmaHistory: Record<string, number> = {}
  return data.map((point, index) => {
    if (index < windowSize - 1) return point
    const window = data.slice(index - windowSize + 1, index + 1)
    const smoothed: PingDisplayPoint = { ...point }
    const keys = activeChart === "All" ? taskIds.map((taskId) => `ping_${taskId}`) : ["avg_delay"]
    for (const key of keys) {
      const values = window.map((entry) => entry[key]).filter((value): value is number => typeof value === "number")
      const processed = processValues(values)
      if (processed === null) continue
      ewmaHistory[key] = ewmaHistory[key] === undefined
        ? processed
        : alpha * processed + (1 - alpha) * ewmaHistory[key]
      smoothed[key] = ewmaHistory[key]
    }
    return smoothed as T
  })
}
