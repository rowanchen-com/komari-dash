import { useParams, useNavigate } from "react-router-dom"
import { useServerData, type ServerDataWithTimestamp } from "@/context/server-data-context"
import { useEffect, useRef, useState, useCallback, useMemo, Component, type ReactNode } from "react"
import countries from "i18n-iso-countries"
import enLocale from "i18n-iso-countries/langs/en.json"
import ServerFlag from "@/components/ServerFlag"
import { BackIcon } from "@/components/Icon"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/Loader"
import AnimatedCircularProgressBar from "@/components/ui/animated-circular-progress-bar"
import { Label } from "@/components/ui/label"
import { SwitchUI } from "@/components/ui/switch-ui"
import { Progress } from "@/components/ui/progress"
import { cn, formatBytes, formatUptime, formatRelativeTime, formatDateTime, getMemPercent, getDiskPercent, getSwapPercent, isEmojiFlag, getCountryCode } from "@/lib/utils"
import { useLocale } from "@/context/locale-context"
import type { ServerInfo, KomariPingTask } from "@/types/komari"
import { fetchPingRecords } from "@/lib/api"
import { Area, AreaChart, CartesianGrid, Line, LineChart, ComposedChart, XAxis, YAxis } from "recharts"

countries.registerLocale(enLocale)

// Function to get country name, handling both country codes and emoji flags
function getCountryDisplayName(countryCode: string): string {
  if (isEmojiFlag(countryCode)) {
    // Convert emoji to country code for name lookup
    const convertedCode = getCountryCode(countryCode)
    if (convertedCode) {
      return countries.getName(convertedCode, "en") || ""
    }
    return ""
  }
  return countries.getName(countryCode, "en") || ""
}

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, error, isLoading, history, serverVersion } = useServerData()
  const { t, locale } = useLocale()
  const [currentTab, setCurrentTab] = useState<"Detail" | "Network">("Detail")

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }) }, [])

  const server = data?.servers.find((s) => s.uuid === id)

  const goBack = () => {
    if (sessionStorage.getItem("fromMainPage")) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <p className="font-medium text-sm opacity-40">{t("ServerDetail", "error")}</p>
      </div>
    )
  }

  if (!server && !isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <p className="font-medium text-sm opacity-40">Server not found</p>
      </div>
    )
  }

  if (!server) {
    return (
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center py-20">
        <Loader visible />
      </div>
    )
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-2">
      {/* Header */}
      <div
        onClick={goBack}
        className="flex flex-none cursor-pointer items-center gap-0.5 break-all font-semibold text-xl leading-none tracking-tight transition-opacity duration-300 hover:opacity-50"
      >
        <BackIcon />
        {server.name}
      </div>

      {/* Info row 1: status, uptime, arch, mem, disk, region */}
      <section className="mt-3 flex flex-wrap gap-2">
        <InfoCard label={t("ServerDetail", "status")}>
          <Badge className={cn("-mt-[0.3px] w-fit rounded-[6px] px-1 py-0 text-[9px] dark:text-white", server.online ? "bg-green-800" : "bg-red-600")}>
            {server.online ? t("ServerDetail", "Online") : t("ServerDetail", "Offline")}
          </Badge>
        </InfoCard>
        <InfoCard label={t("ServerDetail", "Uptime")}>
          <div className="text-xs">{formatUptime(server.status.uptime, t)}</div>
        </InfoCard>
        {serverVersion && <InfoCard label={t("ServerDetail", "Version")}><div className="text-xs">{serverVersion}</div></InfoCard>}
        {server.host.arch && <InfoCard label={t("ServerDetail", "Arch")}><div className="text-xs">{server.host.arch}</div></InfoCard>}
        <InfoCard label={t("ServerDetail", "Mem")}><div className="text-xs">{formatBytes(server.host.memTotal)}</div></InfoCard>
        <InfoCard label={t("ServerDetail", "Disk")}><div className="text-xs">{formatBytes(server.host.diskTotal)}</div></InfoCard>
        {server.region && (
          <InfoCard label={t("ServerDetail", "Region")}>
            <section className="flex items-center gap-1">
              {getCountryDisplayName(server.region) && (
                <div className="text-start text-xs">{getCountryDisplayName(server.region)}</div>
              )}
              <ServerFlag region={server.region} className="text-[11px]" />
            </section>
          </InfoCard>
        )}
      </section>

      {/* Info row 2: system, cpu */}
      {server.host.os && (
        <section className="mt-1 flex flex-wrap gap-2">
          <InfoCard label={t("ServerDetail", "System")}><div className="text-xs">{server.host.os}</div></InfoCard>
          {server.host.cpu && <InfoCard label={t("ServerDetail", "CPU")}><div className="text-xs">{server.host.cpu}</div></InfoCard>}
          {server.host.gpu && server.host.gpu !== "None" && <InfoCard label="GPU"><div className="text-xs">{server.host.gpu}</div></InfoCard>}
        </section>
      )}

      {/* Info row 3: load, upload, download */}
      <section className="mt-1 flex flex-wrap gap-2">
        <InfoCard label={t("ServerDetail", "Load")}>
          <div className="text-xs">{server.status.load1.toFixed(2)} / {server.status.load5.toFixed(2)} / {server.status.load15.toFixed(2)}</div>
        </InfoCard>
        <InfoCard label={t("ServerDetail", "Upload")}><div className="text-xs">{formatBytes(server.status.netOutTransfer)}</div></InfoCard>
        <InfoCard label={t("ServerDetail", "Download")}><div className="text-xs">{formatBytes(server.status.netInTransfer)}</div></InfoCard>
      </section>

      {/* Info row 4: boot time, last active */}
      <section className="mt-1 flex flex-wrap gap-2">
        <InfoCard label={t("ServerDetail", "BootTime")}>
          <div className="text-xs">{server.status.uptime ? formatDateTime(new Date(Date.now() - server.status.uptime * 1000)) : "N/A"}</div>
        </InfoCard>
        {server.updatedAt && (
          <InfoCard label={t("ServerDetail", "LastActive")}>
            <div className="text-xs">{formatDateTime(new Date(server.updatedAt))}</div>
          </InfoCard>
        )}
      </section>

      {/* Summary bar */}
      <ServerDetailSummary server={server} />

      {/* Tab switch */}
      <nav className="my-2 flex w-full items-center">
        <div className="h-px flex-1 bg-border" />
        <div className="flex w-full max-w-50 justify-center">
          <DetailTabSwitch currentTab={currentTab} setCurrentTab={setCurrentTab} locale={locale} />
        </div>
        <div className="h-px flex-1 bg-border" />
      </nav>

      {/* Charts (Detail tab) */}
      {currentTab === "Detail" && (
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <CpuChart uuid={id!} history={history} server={server} />
        <MemChart uuid={id!} history={history} server={server} />
        <DiskChart uuid={id!} history={history} server={server} />
        <NetworkRealtimeChart uuid={id!} history={history} />
        <ConnRealtimeChart uuid={id!} history={history} />
        <ProcessChart uuid={id!} history={history} server={server} />
      </section>
      )}

      {/* Network tab */}
      {currentTab === "Network" && (
        <NetworkPingErrorBoundary>
          <NetworkPingCharts uuid={id!} />
        </NetworkPingErrorBoundary>
      )}
    </main>
  )
}

/* ── Info Card ── */
function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="border-none bg-transparent shadow-none ring-0">
      <CardContent className="px-1.5 py-1">
        <section className="flex flex-col items-start gap-0.5">
          <p className="text-muted-foreground text-xs">{label}</p>
          {children}
        </section>
      </CardContent>
    </Card>
  )
}

/* ── CPU Chart ── */
function CpuChart({ uuid, history, server }: { uuid: string; history: ServerDataWithTimestamp[]; server: ServerInfo }) {
  const [chartData, setChartData] = useState<{ ts: string; v: number }[]>([])
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && history.length > 0) {
      const data = history.map((h) => {
        const s = h.data.servers.find((s) => s.uuid === uuid)
        if (!s) return null
        return { ts: h.timestamp.toString(), v: s.status.cpu }
      }).filter(Boolean).reverse() as { ts: string; v: number }[]
      setChartData(data)
      initialized.current = true
    }
  }, [history.length])

  useEffect(() => {
    if (!initialized.current || history.length === 0) return
    const latest = history[0]
    const s = latest.data.servers.find((s) => s.uuid === uuid)
    if (!s) return
    const timestamp = Date.now().toString()
    setChartData((prev) => {
      let newData: { ts: string; v: number }[]
      if (prev.length === 0) {
        newData = [
          { ts: timestamp, v: s.status.cpu },
          { ts: timestamp, v: s.status.cpu },
        ]
      } else {
        newData = [...prev, { ts: timestamp, v: s.status.cpu }]
      }
      if (newData.length > 30) newData.shift()
      return newData
    })
  }, [history[0]?.timestamp])

  const current = server.status.cpu

  const chartConfig = { cpu: { label: "CPU" } } satisfies ChartConfig

  return (
    <Card>
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-md">CPU</p>
            <section className="flex items-center gap-2">
              <p className="w-10 text-end font-medium text-xs">{current.toFixed(0)}%</p>
              <AnimatedCircularProgressBar
                className="size-3 text-[0px]"
                max={100}
                min={0}
                value={current}
                primaryColor="hsl(var(--chart-1))"
              />
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart accessibilityLayer data={chartData} margin={{ top: 12, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="ts" tickLine={false} axisLine={false} tickMargin={8} minTickGap={200} interval="preserveStartEnd" tickFormatter={(v) => formatRelativeTime(Number(v))} />
              <YAxis tickLine={false} axisLine={false} mirror tickMargin={-15} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Area isAnimationActive={false} dataKey="v" type="step" fill="hsl(var(--chart-1))" fillOpacity={0.3} stroke="hsl(var(--chart-1))" />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

/* ── Mem Chart (with swap overlay) ── */
function MemChart({ uuid, history, server }: { uuid: string; history: ServerDataWithTimestamp[]; server: ServerInfo }) {
  const { t } = useLocale()
  const [chartData, setChartData] = useState<{ ts: string; mem: number; swap: number }[]>([])
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && history.length > 0) {
      const data = history.map((h) => {
        const s = h.data.servers.find((s) => s.uuid === uuid)
        if (!s) return null
        return { ts: h.timestamp.toString(), mem: getMemPercent(s), swap: getSwapPercent(s) }
      }).filter(Boolean).reverse() as { ts: string; mem: number; swap: number }[]
      setChartData(data)
      initialized.current = true
    }
  }, [history.length])

  useEffect(() => {
    if (!initialized.current || history.length === 0) return
    const latest = history[0]
    const s = latest.data.servers.find((s) => s.uuid === uuid)
    if (!s) return
    const timestamp = Date.now().toString()
    setChartData((prev) => {
      let newData: { ts: string; mem: number; swap: number }[]
      if (prev.length === 0) {
        newData = [
          { ts: timestamp, mem: getMemPercent(s), swap: getSwapPercent(s) },
          { ts: timestamp, mem: getMemPercent(s), swap: getSwapPercent(s) },
        ]
      } else {
        newData = [...prev, { ts: timestamp, mem: getMemPercent(s), swap: getSwapPercent(s) }]
      }
      if (newData.length > 30) newData.shift()
      return newData
    })
  }, [history[0]?.timestamp])

  const mem = getMemPercent(server)
  const swap = getSwapPercent(server)

  const chartConfig = { mem: { label: "Mem" }, swap: { label: "Swap" } } satisfies ChartConfig

  return (
    <Card>
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <section className="flex items-center gap-4">
              <div className="flex flex-col">
                <p className="text-muted-foreground text-xs">{t("ServerDetail", "Mem")}</p>
                <div className="flex items-center gap-2">
                  <AnimatedCircularProgressBar
                    className="size-3 text-[0px]"
                    max={100}
                    min={0}
                    value={mem}
                    primaryColor="hsl(var(--chart-8))"
                  />
                  <p className="font-medium text-xs">{mem.toFixed(0)}%</p>
                </div>
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground text-xs">{t("ServerDetail", "Swap")}</p>
                <div className="flex items-center gap-2">
                  <AnimatedCircularProgressBar
                    className="size-3 text-[0px]"
                    max={100}
                    min={0}
                    value={swap}
                    primaryColor="hsl(var(--chart-10))"
                  />
                  <p className="font-medium text-xs">{swap.toFixed(0)}%</p>
                </div>
              </div>
            </section>
            <section className="flex flex-col items-end gap-0.5">
              <div className="font-medium text-[11px]">
                {formatBytes(server.status.memUsed)} / {formatBytes(server.host.memTotal)}
              </div>
              <div className="font-medium text-[11px]">
                swap: {formatBytes(server.status.swapUsed)}
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart accessibilityLayer data={chartData} margin={{ top: 12, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="ts" tickLine={false} axisLine={false} tickMargin={8} minTickGap={200} interval="preserveStartEnd" tickFormatter={(v) => formatRelativeTime(Number(v))} />
              <YAxis tickLine={false} axisLine={false} mirror tickMargin={-15} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Area isAnimationActive={false} dataKey="mem" type="step" fill="hsl(var(--chart-8))" fillOpacity={0.3} stroke="hsl(var(--chart-8))" />
              <Area isAnimationActive={false} dataKey="swap" type="step" fill="hsl(var(--chart-10))" fillOpacity={0.3} stroke="hsl(var(--chart-10))" />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

/* ── Disk Chart (with used/total) ── */
function DiskChart({ uuid, history, server }: { uuid: string; history: ServerDataWithTimestamp[]; server: ServerInfo }) {
  const { t } = useLocale()
  const [chartData, setChartData] = useState<{ ts: string; v: number }[]>([])
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && history.length > 0) {
      const data = history.map((h) => {
        const s = h.data.servers.find((s) => s.uuid === uuid)
        if (!s) return null
        return { ts: h.timestamp.toString(), v: getDiskPercent(s) }
      }).filter(Boolean).reverse() as { ts: string; v: number }[]
      setChartData(data)
      initialized.current = true
    }
  }, [history.length])

  useEffect(() => {
    if (!initialized.current || history.length === 0) return
    const latest = history[0]
    const s = latest.data.servers.find((s) => s.uuid === uuid)
    if (!s) return
    const timestamp = Date.now().toString()
    setChartData((prev) => {
      let newData: { ts: string; v: number }[]
      if (prev.length === 0) {
        newData = [
          { ts: timestamp, v: getDiskPercent(s) },
          { ts: timestamp, v: getDiskPercent(s) },
        ]
      } else {
        newData = [...prev, { ts: timestamp, v: getDiskPercent(s) }]
      }
      if (newData.length > 30) newData.shift()
      return newData
    })
  }, [history[0]?.timestamp])

  const disk = getDiskPercent(server)

  const chartConfig = { disk: { label: "Disk" } } satisfies ChartConfig

  return (
    <Card>
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-md">{t("ServerDetail", "Disk")}</p>
            <section className="flex flex-col items-end gap-0.5">
              <section className="flex items-center gap-2">
                <p className="w-10 text-end font-medium text-xs">{disk.toFixed(0)}%</p>
                <AnimatedCircularProgressBar
                  className="size-3 text-[0px]"
                  max={100}
                  min={0}
                  value={disk}
                  primaryColor="hsl(var(--chart-5))"
                />
              </section>
              <div className="font-medium text-[11px]">
                {formatBytes(server.status.diskUsed)} / {formatBytes(server.host.diskTotal)}
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart accessibilityLayer data={chartData} margin={{ top: 12, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="ts" tickLine={false} axisLine={false} tickMargin={8} minTickGap={200} interval="preserveStartEnd" tickFormatter={(v) => formatRelativeTime(Number(v))} />
              <YAxis tickLine={false} axisLine={false} mirror tickMargin={-15} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Area isAnimationActive={false} dataKey="v" type="step" fill="hsl(var(--chart-5))" fillOpacity={0.3} stroke="hsl(var(--chart-5))" />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

/* ── Network Chart ── */
function NetworkRealtimeChart({ uuid, history }: { uuid: string; history: ServerDataWithTimestamp[] }) {
  const { t } = useLocale()
  const [chartData, setChartData] = useState<{ ts: string; upload: number; download: number }[]>([])
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && history.length > 0) {
      const data = history.map((h) => {
        const s = h.data.servers.find((s) => s.uuid === uuid)
        if (!s) return null
        return { ts: h.timestamp.toString(), upload: s.status.netOutSpeed / 1024 / 1024, download: s.status.netInSpeed / 1024 / 1024 }
      }).filter(Boolean).reverse() as { ts: string; upload: number; download: number }[]
      setChartData(data)
      initialized.current = true
    }
  }, [history.length])

  useEffect(() => {
    if (!initialized.current || history.length === 0) return
    const latest = history[0]
    const s = latest.data.servers.find((s) => s.uuid === uuid)
    if (!s) return
    const timestamp = Date.now().toString()
    setChartData((prev) => {
      let newData: { ts: string; upload: number; download: number }[]
      if (prev.length === 0) {
        newData = [
          { ts: timestamp, upload: s.status.netOutSpeed / 1024 / 1024, download: s.status.netInSpeed / 1024 / 1024 },
          { ts: timestamp, upload: s.status.netOutSpeed / 1024 / 1024, download: s.status.netInSpeed / 1024 / 1024 },
        ]
      } else {
        newData = [...prev, { ts: timestamp, upload: s.status.netOutSpeed / 1024 / 1024, download: s.status.netInSpeed / 1024 / 1024 }]
      }
      if (newData.length > 30) newData.shift()
      return newData
    })
  }, [history[0]?.timestamp])

  const current = chartData.length > 0 ? chartData[chartData.length - 1] : { upload: 0, download: 0 }
  let maxDownload = Math.max(...chartData.map((d) => d.download), 1)
  maxDownload = Math.ceil(maxDownload)

  const chartConfig = { upload: { label: "Upload" }, download: { label: "Download" } } satisfies ChartConfig

  return (
    <Card>
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center">
            <section className="flex items-center gap-4">
              <div className="flex w-20 flex-col">
                <p className="text-muted-foreground text-xs">{t("ServerDetail", "Upload")}</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex size-1.5 rounded-full bg-[hsl(var(--chart-1))]" />
                  <p className="font-medium text-xs">{current.upload.toFixed(2)} M/s</p>
                </div>
              </div>
              <div className="flex w-20 flex-col">
                <p className="text-muted-foreground text-xs">{t("ServerDetail", "Download")}</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex size-1.5 rounded-full bg-[hsl(var(--chart-4))]" />
                  <p className="font-medium text-xs">{current.download.toFixed(2)} M/s</p>
                </div>
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <LineChart accessibilityLayer data={chartData} margin={{ top: 12, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="ts" tickLine={false} axisLine={false} tickMargin={8} minTickGap={200} interval="preserveStartEnd" tickFormatter={(v) => formatRelativeTime(Number(v))} />
              <YAxis tickLine={false} axisLine={false} mirror tickMargin={-15} type="number" minTickGap={50} interval="preserveStartEnd" domain={[1, maxDownload]} tickFormatter={(v) => `${v.toFixed(0)}M/s`} />
              <Line isAnimationActive={false} dataKey="upload" type="linear" stroke="hsl(var(--chart-1))" strokeWidth={1} dot={false} />
              <Line isAnimationActive={false} dataKey="download" type="linear" stroke="hsl(var(--chart-4))" strokeWidth={1} dot={false} />
            </LineChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

/* ── Connect Chart (TCP/UDP) ── */
function ConnRealtimeChart({ uuid, history }: { uuid: string; history: ServerDataWithTimestamp[] }) {
  const [chartData, setChartData] = useState<{ ts: string; tcp: number; udp: number }[]>([])
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && history.length > 0) {
      const data = history.map((h) => {
        const s = h.data.servers.find((s) => s.uuid === uuid)
        if (!s) return null
        return { ts: h.timestamp.toString(), tcp: s.status.tcpConn, udp: s.status.udpConn }
      }).filter(Boolean).reverse() as { ts: string; tcp: number; udp: number }[]
      setChartData(data)
      initialized.current = true
    }
  }, [history.length])

  useEffect(() => {
    if (!initialized.current || history.length === 0) return
    const latest = history[0]
    const s = latest.data.servers.find((s) => s.uuid === uuid)
    if (!s) return
    const timestamp = Date.now().toString()
    setChartData((prev) => {
      let newData: { ts: string; tcp: number; udp: number }[]
      if (prev.length === 0) {
        newData = [
          { ts: timestamp, tcp: s.status.tcpConn, udp: s.status.udpConn },
          { ts: timestamp, tcp: s.status.tcpConn, udp: s.status.udpConn },
        ]
      } else {
        newData = [...prev, { ts: timestamp, tcp: s.status.tcpConn, udp: s.status.udpConn }]
      }
      if (newData.length > 30) newData.shift()
      return newData
    })
  }, [history[0]?.timestamp])

  const current = chartData.length > 0 ? chartData[chartData.length - 1] : { tcp: 0, udp: 0 }

  const chartConfig = { tcp: { label: "TCP" }, udp: { label: "UDP" } } satisfies ChartConfig

  return (
    <Card>
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center">
            <section className="flex items-center gap-4">
              <div className="flex w-12 flex-col">
                <p className="text-muted-foreground text-xs">TCP</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex size-1.5 rounded-full bg-[hsl(var(--chart-1))]" />
                  <p className="font-medium text-xs">{current.tcp}</p>
                </div>
              </div>
              <div className="flex w-12 flex-col">
                <p className="text-muted-foreground text-xs">UDP</p>
                <div className="flex items-center gap-1">
                  <span className="relative inline-flex size-1.5 rounded-full bg-[hsl(var(--chart-4))]" />
                  <p className="font-medium text-xs">{current.udp}</p>
                </div>
              </div>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <LineChart accessibilityLayer data={chartData} margin={{ top: 12, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="ts" tickLine={false} axisLine={false} tickMargin={8} minTickGap={200} interval="preserveStartEnd" tickFormatter={(v) => formatRelativeTime(Number(v))} />
              <Line isAnimationActive={false} dataKey="tcp" type="linear" stroke="hsl(var(--chart-1))" strokeWidth={1} dot={false} />
              <Line isAnimationActive={false} dataKey="udp" type="linear" stroke="hsl(var(--chart-4))" strokeWidth={1} dot={false} />
            </LineChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

/* ── Process Chart ── */
function ProcessChart({ uuid, history, server }: { uuid: string; history: ServerDataWithTimestamp[]; server: ServerInfo }) {
  const { t } = useLocale()
  const [chartData, setChartData] = useState<{ ts: string; v: number }[]>([])
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && history.length > 0) {
      const data = history.map((h) => {
        const s = h.data.servers.find((s) => s.uuid === uuid)
        if (!s) return null
        return { ts: h.timestamp.toString(), v: s.status.process }
      }).filter(Boolean).reverse() as { ts: string; v: number }[]
      setChartData(data)
      initialized.current = true
    }
  }, [history.length])

  useEffect(() => {
    if (!initialized.current || history.length === 0) return
    const latest = history[0]
    const s = latest.data.servers.find((s) => s.uuid === uuid)
    if (!s) return
    const timestamp = Date.now().toString()
    setChartData((prev) => {
      let newData: { ts: string; v: number }[]
      if (prev.length === 0) {
        newData = [
          { ts: timestamp, v: s.status.process },
          { ts: timestamp, v: s.status.process },
        ]
      } else {
        newData = [...prev, { ts: timestamp, v: s.status.process }]
      }
      if (newData.length > 30) newData.shift()
      return newData
    })
  }, [history[0]?.timestamp])

  const chartConfig = { process: { label: "Process" } } satisfies ChartConfig

  return (
    <Card>
      <CardContent className="px-6 py-3">
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-md">{t("ServerDetail", "Process")}</p>
            <section className="flex items-center gap-2">
              <p className="w-10 text-end font-medium text-xs">{server.status.process}</p>
            </section>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[130px] w-full">
            <AreaChart accessibilityLayer data={chartData} margin={{ top: 12, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="ts" tickLine={false} axisLine={false} tickMargin={8} minTickGap={200} interval="preserveStartEnd" tickFormatter={(v) => formatRelativeTime(Number(v))} />
              <YAxis tickLine={false} axisLine={false} mirror tickMargin={-15} />
              <Area isAnimationActive={false} dataKey="v" type="step" fill="hsl(var(--chart-2))" fillOpacity={0.3} stroke="hsl(var(--chart-2))" />
            </AreaChart>
          </ChartContainer>
        </section>
      </CardContent>
    </Card>
  )
}

/* ── Detail Tab Switch (matches original TabSwitch) ── */
function DetailTabSwitch({ currentTab, setCurrentTab, locale }: { currentTab: string; setCurrentTab: (tab: "Detail" | "Network") => void; locale: string }) {
  const { t } = useLocale()
  const tabs = ["Detail", "Network"] as const
  const disabledTabs: string[] = []
  const [indicator, setIndicator] = useState<{ x: number; w: number }>({ x: 0, w: 0 })
  const tabRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const idx = tabs.indexOf(currentTab as typeof tabs[number])
    const el = tabRefs.current[idx]
    if (el) {
      setIndicator({
        x: idx !== 0 ? el.offsetLeft - 1 : el.offsetLeft,
        w: el.offsetWidth,
      })
    }
  }, [currentTab, locale])

  return (
    <div className="z-50 flex flex-col items-start rounded-[50px]">
      <div className="relative flex items-center gap-1 rounded-[50px] bg-stone-100 p-[3px] dark:bg-stone-800">
        {indicator.w > 0 && (
          <div
            className="absolute top-[3px] left-0 z-10 h-[35px] bg-white shadow-black/5 shadow-lg dark:bg-stone-700 dark:shadow-white/5"
            style={{
              borderRadius: 24,
              width: `${indicator.w}px`,
              transform: `translateX(${indicator.x}px)`,
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        )}
        {tabs.map((tab, index) => {
          const isDisabled = disabledTabs.includes(tab)
          return (
            <div
              key={tab}
              ref={(el) => { tabRefs.current[index] = el }}
              onClick={() => !isDisabled && setCurrentTab(tab as "Detail" | "Network")}
              className={cn(
                "relative rounded-3xl px-2.5 py-[8px] font-[600] text-[13px]",
                "transition-all duration-500 ease-in-out",
                {
                  "cursor-pointer text-stone-400 hover:text-stone-950 dark:text-stone-500 hover:dark:text-stone-50": !isDisabled,
                  "cursor-not-allowed text-stone-300 dark:text-stone-600": isDisabled,
                  "text-stone-950 dark:text-stone-50": currentTab === tab && !isDisabled,
                },
              )}
            >
              <div className="relative z-20 flex items-center gap-1">
                <p className="whitespace-nowrap">{t("ServerDetail", tab === "Detail" ? "tabDetail" : "tabNetwork")}</p>
                {isDisabled && <span className="ml-1 text-[10px] opacity-50">🚫</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Network Ping Error Boundary ── */
class NetworkPingErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorMsg: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, errorMsg: "" }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || String(error) }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <p className="mb-2 font-medium text-lg">网络延迟图表不可用</p>
          <p className="text-muted-foreground text-sm">加载图表时发生错误。</p>
          <p className="mt-2 text-muted-foreground text-xs">{this.state.errorMsg}</p>
        </div>
      )
    }
    return this.props.children
  }
}

/* ── Network Ping Charts ── */
interface PingChartData {
  created_at: number
  [key: string]: number
}

function NetworkPingCharts({ uuid }: { uuid: string }) {
  const { t } = useLocale()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<KomariPingTask[]>([])
  const [chartData, setChartData] = useState<Record<string, { created_at: number; avg_delay: number; packet_loss: number }[]>>({})
  const [formattedData, setFormattedData] = useState<PingChartData[]>([])
  const [activeChart, setActiveChart] = useState<string>("All")
  const [isPeakEnabled, setIsPeakEnabled] = useState(false)

  const taskNames = useMemo(() => Object.keys(chartData), [chartData])
  const getColor = useCallback((idx: number) => `hsl(var(--chart-${(idx % 10) + 1}))`, [])

  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {
      avg_delay: { label: t("ServerDetail", "avgDelay"), color: "hsl(var(--chart-1))" },
      packet_loss: { label: t("ServerDetail", "packetLoss"), color: "hsl(45, 100%, 60%)" },
    }
    taskNames.forEach((name, idx) => {
      cfg[name] = { label: name, color: `hsl(var(--chart-${(idx % 10) + 1}))` }
    })
    return cfg
  }, [taskNames, t])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchPingRecords(uuid, 48)
        if (cancelled) return

        if (!data.tasks || data.tasks.length === 0) {
          setError("no_data")
          setLoading(false)
          return
        }

        setTasks(data.tasks)

        // Group records by task
        const byTask: Record<string, { created_at: number; avg_delay: number; packet_loss: number }[]> = {}
        const taskMap = new Map(data.tasks.map((tk) => [tk.id, tk]))

        for (const task of data.tasks) {
          byTask[task.name] = []
        }

        for (const rec of data.records) {
          const task = taskMap.get(rec.task_id)
          if (!task) continue
          byTask[task.name].push({
            created_at: new Date(rec.time).getTime(),
            avg_delay: rec.value,
            packet_loss: task.loss,
          })
        }

        // Sort each task's data by time
        for (const key of Object.keys(byTask)) {
          byTask[key].sort((a, b) => a.created_at - b.created_at)
        }

        setChartData(byTask)

        // Build merged data for "All" view
        const allTimes = new Set<number>()
        for (const records of Object.values(byTask)) {
          for (const r of records) allTimes.add(r.created_at)
        }
        const sortedTimes = Array.from(allTimes).sort((a, b) => a - b)
        const merged: PingChartData[] = sortedTimes.map((time) => {
          const point: PingChartData = { created_at: time }
          for (const [name, records] of Object.entries(byTask)) {
            const rec = records.find((r) => r.created_at === time)
            point[name] = rec ? rec.avg_delay : 0
          }
          return point
        })
        setFormattedData(merged)
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError("fetch_error")
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [uuid])

  const rawDisplayData = activeChart === "All" ? formattedData : (chartData[activeChart] || [])

  // Peak Cut (EWMA smoothing) processing
  const displayData = useMemo(() => {
    if (!isPeakEnabled) return rawDisplayData

    const data = rawDisplayData as PingChartData[]
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
      const deviations = values.map((v) => Math.abs(v - median))
      const medianDeviation = getMedian(deviations) * 1.4826
      const validValues = values.filter(
        (v) => Math.abs(v - median) <= 3 * medianDeviation && v <= median * 3,
      )
      if (validValues.length === 0) return median
      let ewma = validValues[0]
      for (let i = 1; i < validValues.length; i++) {
        ewma = alpha * validValues[i] + (1 - alpha) * ewma
      }
      return ewma
    }

    const ewmaHistory: { [key: string]: number } = {}

    return data.map((point, index) => {
      if (index < windowSize - 1) return point
      const window = data.slice(index - windowSize + 1, index + 1)
      const smoothed = { ...point } as PingChartData

      if (activeChart === "All") {
        for (const key of taskNames) {
          const values = window
            .map((w) => w[key])
            .filter((v) => v !== undefined && v !== null) as number[]
          if (values.length > 0) {
            const processed = processValues(values)
            if (processed !== null) {
              if (ewmaHistory[key] === undefined) {
                ewmaHistory[key] = processed
              } else {
                ewmaHistory[key] = alpha * processed + (1 - alpha) * ewmaHistory[key]
              }
              smoothed[key] = ewmaHistory[key]
            }
          }
        }
      } else {
        const values = window
          .map((w) => (w as any).avg_delay)
          .filter((v: any) => v !== undefined && v !== null) as number[]
        if (values.length > 0) {
          const processed = processValues(values)
          if (processed !== null) {
            if (ewmaHistory.current === undefined) {
              ewmaHistory.current = processed
            } else {
              ewmaHistory.current = alpha * processed + (1 - alpha) * ewmaHistory.current
            }
            ;(smoothed as any).avg_delay = ewmaHistory.current
          }
        }
      }
      return smoothed
    })
  }, [isPeakEnabled, activeChart, rawDisplayData, taskNames])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader visible />
      </div>
    )
  }

  if (error === "no_data") {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="mb-2 font-medium text-lg">{t("ServerDetail", "networkUnavailable")}</p>
        <p className="text-muted-foreground text-sm">{t("ServerDetail", "networkUnavailableDesc")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="font-medium text-sm opacity-40">{t("ServerDetail", "error")}</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 overflow-hidden rounded-t-lg p-0 sm:flex-row">
        <div className="flex flex-none flex-col justify-center gap-1 border-b px-6 py-4">
          <CardTitle className="flex flex-none items-center gap-0.5 text-md">
            {t("ServerDetail", "tabNetwork")}
          </CardTitle>
          <div className="flex items-center justify-between">
            <CardDescription className="mr-2 text-xs">
              {taskNames.length} {t("ServerDetail", "monitorCount")}
            </CardDescription>
            <div className="flex items-center space-x-2">
              <SwitchUI checked={isPeakEnabled} onCheckedChange={setIsPeakEnabled} />
              <Label className="text-xs" htmlFor="Peak">
                {t("ServerDetail", "peak_cut")}
              </Label>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-wrap">
          {taskNames.map((name) => {
            const data = chartData[name]
            const lastDelay = data.length > 0 ? data[data.length - 1].avg_delay : 0
            const delays = data.map((d) => d.avg_delay)
            const minDelay = delays.length > 0 ? Math.min(...delays) : 0
            const maxDelay = delays.length > 0 ? Math.max(...delays) : 0
            return (
              <button
                type="button"
                key={name}
                data-active={activeChart === name}
                className="relative z-30 flex grow basis-0 cursor-pointer flex-col justify-center gap-1 border-neutral-200 border-b px-6 py-4 text-left data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-6 dark:border-neutral-800"
                onClick={() => setActiveChart((prev) => prev === name ? "All" : name)}
              >
                <span className="whitespace-nowrap text-muted-foreground text-xs">{name}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-md leading-none sm:text-lg">
                    {lastDelay.toFixed(2)}ms
                  </span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-green-500">↓{minDelay.toFixed(0)}</span>
                    <span className="text-red-500">↑{maxDelay.toFixed(0)}</span>
                    {data.some((item) => item.packet_loss !== undefined) && (
                      <span className="text-muted-foreground">
                        {(
                          data
                            .filter((item) => item.packet_loss !== undefined)
                            .reduce((sum, item) => sum + (item.packet_loss ?? 0), 0) /
                          data.filter((item) => item.packet_loss !== undefined).length
                        ).toFixed(2)}
                        %
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="py-4 pr-2 pl-0 sm:pt-6 sm:pr-6 sm:pb-6 sm:pl-2">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <ComposedChart accessibilityLayer data={displayData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="created_at"
              tickLine={true}
              tickSize={3}
              axisLine={false}
              tickMargin={8}
              minTickGap={80}
              ticks={(displayData as any[])
                .filter((item: any, index: number, array: any[]) => {
                  if (array.length < 6) return index === 0 || index === array.length - 1
                  const timeSpan = array[array.length - 1].created_at - array[0].created_at
                  const hours = timeSpan / (1000 * 60 * 60)
                  if (hours <= 12) {
                    return index === 0 || index === array.length - 1 || new Date(item.created_at).getMinutes() % 60 === 0
                  }
                  const date = new Date(item.created_at)
                  return date.getMinutes() === 0 && date.getHours() % 2 === 0
                })
                .map((item: any) => item.created_at)}
              tickFormatter={(value) => {
                const date = new Date(value)
                const minutes = date.getMinutes()
                return minutes === 0 ? `${date.getHours()}:00` : `${date.getHours()}:${minutes}`
              }}
            />
            <YAxis
              yAxisId="delay"
              tickLine={false}
              axisLine={false}
              tickMargin={15}
              minTickGap={20}
              tickFormatter={(value) => `${value}ms`}
            />
            {activeChart !== "All" && (
              <YAxis
                yAxisId="packet-loss"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={15}
                minTickGap={20}
                tickFormatter={(value) => `${value}%`}
              />
            )}
            <ChartTooltip
              isAnimationActive={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelKey="created_at"
                  labelFormatter={(_, payload) => {
                    if (!payload?.length) return ""
                    return formatDateTime(new Date(payload[0].payload.created_at))
                  }}
                  formatter={(value, name) => {
                    let formattedValue: string
                    let label: string
                    if (name === "packet_loss") {
                      formattedValue = `${Number(value).toFixed(2)}%`
                      label = t("ServerDetail", "packetLoss")
                    } else if (name === "avg_delay") {
                      formattedValue = `${Number(value).toFixed(2)}ms`
                      label = t("ServerDetail", "avgDelay")
                    } else {
                      formattedValue = `${Number(value).toFixed(2)}ms`
                      label = name as string
                    }
                    return (
                      <div className="flex flex-1 items-center justify-between leading-none">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="ml-2 font-medium text-foreground tabular-nums">{formattedValue}</span>
                      </div>
                    )
                  }}
                />
              }
            />
            {activeChart === "All" && (
              <ChartLegend
                content={(props: any) => (
                  <ChartLegendContent payload={props.payload} verticalAlign={props.verticalAlign} />
                )}
              />
            )}
            {activeChart !== "All" && (
              <Area
                isAnimationActive={false}
                dataKey="packet_loss"
                stroke="none"
                fill="hsl(45, 100%, 60%)"
                fillOpacity={0.3}
                yAxisId="packet-loss"
              />
            )}
            {activeChart !== "All" && (
              <Line
                isAnimationActive={false}
                strokeWidth={1}
                type="linear"
                dot={false}
                dataKey="avg_delay"
                stroke={getColor(taskNames.indexOf(activeChart))}
                yAxisId="delay"
              />
            )}
            {activeChart === "All" &&
              taskNames.map((name, idx) => (
                <Line
                  key={name}
                  isAnimationActive={false}
                  strokeWidth={1}
                  type="linear"
                  dot={false}
                  dataKey={name}
                  stroke={getColor(idx)}
                  connectNulls={true}
                  yAxisId="delay"
                />
              ))}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* ── Server Detail Summary (progress bars below header) ── */
function ServerDetailSummary({ server }: { server: ServerInfo }) {
  const cpu = server.status.cpu
  const mem = getMemPercent(server)
  const disk = getDiskPercent(server)
  const up = server.status.netOutSpeed / 1024 / 1024
  const down = server.status.netInSpeed / 1024 / 1024

  return (
    <div className="mb-2 flex flex-wrap items-center gap-4">
      <section className="flex w-24 flex-col justify-center gap-1 px-1.5 py-1">
        <section className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">CPU</span>
          <span className="font-medium text-[10px]">{cpu.toFixed(2)}%</span>
        </section>
        <SummaryUsageBar value={cpu} />
      </section>
      <section className="flex w-24 flex-col justify-center gap-1 px-1.5 py-1">
        <section className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Mem</span>
          <span className="font-medium text-[10px]">{mem.toFixed(2)}%</span>
        </section>
        <SummaryUsageBar value={mem} />
      </section>
      <section className="flex w-24 flex-col justify-center gap-1 px-1.5 py-1">
        <section className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Disk</span>
          <span className="font-medium text-[10px]">{disk.toFixed(2)}%</span>
        </section>
        <SummaryUsageBar value={disk} />
      </section>
      <section className="flex min-w-[85px] flex-col justify-center px-1.5 py-1">
        <section className="flex items-center justify-between gap-4">
          <span className="text-[10px] text-muted-foreground">Process</span>
          <span className="font-medium text-[10px]">{server.status.process}</span>
        </section>
      </section>
      <section className="flex min-w-[70px] flex-col justify-center gap-0.5 px-1.5 py-1">
        <section className="flex items-center justify-between gap-4">
          <span className="text-[10px] text-muted-foreground">TCP</span>
          <span className="font-medium text-[10px]">{server.status.tcpConn}</span>
        </section>
        <section className="flex items-center justify-between gap-4">
          <span className="text-[10px] text-muted-foreground">UDP</span>
          <span className="font-medium text-[10px]">{server.status.udpConn}</span>
        </section>
      </section>
      <section className="flex min-w-[120px] flex-col justify-center gap-0.5 px-1.5 py-1">
        <section className="flex items-center justify-between gap-4">
          <span className="text-[10px] text-muted-foreground">Upload</span>
          <span className="font-medium text-[10px]">{up.toFixed(2)}M/s</span>
        </section>
        <section className="flex items-center justify-between gap-4">
          <span className="text-[10px] text-muted-foreground">Download</span>
          <span className="font-medium text-[10px]">{down.toFixed(2)}M/s</span>
        </section>
      </section>
    </div>
  )
}

function SummaryUsageBar({ value }: { value: number }) {
  return (
    <Progress
      aria-label="Server Usage Bar"
      aria-labelledby="Server Usage Bar"
      value={value}
      indicatorClassName={value > 90 ? "bg-red-500" : value > 70 ? "bg-orange-400" : "bg-green-500"}
      className="h-[3px] rounded-sm bg-stone-200 dark:bg-stone-800"
    />
  )
}
