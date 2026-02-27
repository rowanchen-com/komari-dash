import { Link } from "react-router-dom"
import { memo } from "react"
import ServerFlag from "@/components/ServerFlag"
import ServerUsageBar from "@/components/ServerUsageBar"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { ServerInfo } from "@/types/komari"
import { cn, formatBytes, formatSpeed, getMemPercent, getDiskPercent, getThemeSetting } from "@/lib/utils"
import { GetFontLogoClass, GetOsName, IsWindows, MageMicrosoftWindows } from "@/lib/logo-class"
import { useLocale } from "@/context/locale-context"
import { usePublicInfo } from "@/hooks/usePublicInfo"

export default memo(function ServerCardInline({ server }: { server: ServerInfo }) {
  const { info } = usePublicInfo()
  const { t } = useLocale()
  const settings = info?.theme_settings
  const showFlag = getThemeSetting(settings, "showFlag", true)

  const cpu = server.status.cpu
  const mem = getMemPercent(server)
  const stg = getDiskPercent(server)

  const saveSession = () => {
    sessionStorage.setItem("fromMainPage", "true")
  }

  if (!server.online) {
    return (
      <Link to={`/server/${server.uuid}`} onClick={saveSession}>
        <Card className="flex min-h-[61px] min-w-[900px] flex-row items-center justify-start gap-3 p-3 transition-all hover:shadow-sm hover:ring-stone-300 md:px-5 lg:flex-row dark:hover:ring-stone-700">
          <section className={cn("grid items-center gap-2 lg:w-40")} style={{ gridTemplateColumns: "auto auto 1fr" }}>
            <span className="h-2 w-2 shrink-0 self-center rounded-full bg-red-500" />
            <div className={cn("flex items-center justify-center", showFlag ? "min-w-[17px]" : "min-w-0")}>
              {showFlag && <ServerFlag region={server.region} />}
            </div>
            <div className="relative w-28">
              <p className={cn("break-normal font-bold tracking-tight", showFlag ? "text-xs" : "text-sm")}>{server.name}</p>
            </div>
          </section>
        </Card>
      </Link>
    )
  }

  return (
    <Link to={`/server/${server.uuid}`} onClick={saveSession}>
      <Card className="flex w-full min-w-[900px] cursor-pointer items-center justify-start gap-3 p-3 transition-all hover:shadow-sm hover:ring-stone-300 md:px-5 lg:flex-row dark:hover:ring-stone-700">
        <section className={cn("grid items-center gap-2 lg:w-36")} style={{ gridTemplateColumns: "auto auto 1fr" }}>
          <span className="h-2 w-2 shrink-0 self-center rounded-full bg-green-500" />
          <div className={cn("flex items-center justify-center", showFlag ? "min-w-[17px]" : "min-w-0")}>
            {showFlag && <ServerFlag region={server.region} />}
          </div>
          <div className="relative w-28">
            <p className={cn("break-normal font-bold tracking-tight", showFlag ? "text-xs" : "text-sm")}>{server.name}</p>
          </div>
        </section>
        <Separator orientation="vertical" className="mx-0 ml-2 h-8" />
        <div className="flex flex-col gap-2">
          <section className="grid flex-1 grid-cols-9 items-center gap-3">
            <div className="flex flex-row items-center gap-2 whitespace-nowrap">
              <div className="font-semibold text-xs">
                {IsWindows(server.host.os) ? (
                  <MageMicrosoftWindows className="size-2.5" />
                ) : (
                  <p className={`fl-${GetFontLogoClass(server.host.os)}`} />
                )}
              </div>
              <div className="flex w-14 flex-col">
                <p className="text-muted-foreground text-xs">{t("ServerCard", "System")}</p>
                <div className="flex items-center font-semibold text-[10.5px]">
                  {IsWindows(server.host.os) ? "Windows" : GetOsName(server.host.os)}
                </div>
              </div>
            </div>
            <div className="flex w-20 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "Uptime")}</p>
              <div className="flex items-center font-semibold text-xs">
                {(server.status.uptime / 86400).toFixed(0)} Days
              </div>
            </div>
            <div className="flex w-14 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "CPU")}</p>
              <div className="flex items-center font-semibold text-xs">{cpu.toFixed(2)}%</div>
              <ServerUsageBar value={cpu} />
            </div>
            <div className="flex w-14 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "Mem")}</p>
              <div className="flex items-center font-semibold text-xs">{mem.toFixed(2)}%</div>
              <ServerUsageBar value={mem} />
            </div>
            <div className="flex w-14 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "STG")}</p>
              <div className="flex items-center font-semibold text-xs">{stg.toFixed(2)}%</div>
              <ServerUsageBar value={stg} />
            </div>
            <div className="flex w-16 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "Upload")}</p>
              <div className="flex items-center font-semibold text-xs">{formatSpeed(server.status.netOutSpeed)}</div>
            </div>
            <div className="flex w-16 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "Download")}</p>
              <div className="flex items-center font-semibold text-xs">{formatSpeed(server.status.netInSpeed)}</div>
            </div>
            <div className="flex w-20 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "TotalUpload")}</p>
              <div className="flex items-center font-semibold text-xs">{formatBytes(server.status.netOutTransfer)}</div>
            </div>
            <div className="flex w-20 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "TotalDownload")}</p>
              <div className="flex items-center font-semibold text-xs">{formatBytes(server.status.netInTransfer)}</div>
            </div>
          </section>
        </div>
      </Card>
    </Link>
  )
})
