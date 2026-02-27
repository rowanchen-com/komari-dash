import { Link } from "react-router-dom"
import { memo } from "react"
import ServerFlag from "@/components/ServerFlag"
import ServerUsageBar from "@/components/ServerUsageBar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { ServerInfo } from "@/types/komari"
import { cn, formatBytes, formatSpeed, getMemPercent, getDiskPercent, getThemeSetting } from "@/lib/utils"
import { GetFontLogoClass, GetOsName, IsWindows, MageMicrosoftWindows } from "@/lib/logo-class"
import { useLocale } from "@/context/locale-context"
import { usePublicInfo } from "@/hooks/usePublicInfo"

export default memo(function ServerCard({ server }: { server: ServerInfo }) {
  const { info } = usePublicInfo()
  const { t } = useLocale()
  const settings = info?.theme_settings
  const showFlag = getThemeSetting(settings, "showFlag", true)
  const showNetTransfer = getThemeSetting(settings, "showNetTransfer", false)
  const fixedTopServerName = getThemeSetting(settings, "fixedTopServerName", false)

  const cpu = server.status.cpu
  const mem = getMemPercent(server)
  const stg = getDiskPercent(server)

  const saveSession = () => {
    sessionStorage.setItem("fromMainPage", "true")
  }

  if (!server.online) {
    return (
      <Link to={`/server/${server.uuid}`} onClick={saveSession}>
        <Card
          className={cn(
            "flex cursor-pointer flex-col items-center justify-start gap-3 p-3 transition-all hover:shadow-sm hover:ring-stone-300 md:px-5 dark:hover:ring-stone-700",
            showNetTransfer ? "min-h-[123px] lg:min-h-[91px]" : "min-h-[93px] lg:min-h-[61px]",
            {
              "flex-col": fixedTopServerName,
              "lg:flex-row": !fixedTopServerName,
            },
          )}
        >
          <section
            className={cn("grid items-center gap-2", {
              "lg:w-40": !fixedTopServerName,
            })}
            style={{ gridTemplateColumns: "auto auto 1fr" }}
          >
            <span className="h-2 w-2 shrink-0 self-center rounded-full bg-red-500" />
            <div className={cn("flex items-center justify-center", showFlag ? "min-w-[17px]" : "min-w-0")}>
              {showFlag && <ServerFlag region={server.region} />}
            </div>
            <div className="relative">
              <p className={cn("break-normal font-bold tracking-tight", showFlag ? "text-xs" : "text-sm")}>
                {server.name}
              </p>
            </div>
          </section>
        </Card>
      </Link>
    )
  }

  return (
    <Link to={`/server/${server.uuid}`} onClick={saveSession}>
      <Card
        className={cn(
          "flex cursor-pointer flex-col items-center justify-start gap-3 p-3 transition-all hover:shadow-sm hover:ring-stone-300 md:px-5 dark:hover:ring-stone-700",
          {
            "flex-col": fixedTopServerName,
            "lg:flex-row": !fixedTopServerName,
          },
        )}
      >
        <section
          className={cn("grid items-center gap-2", {
            "lg:w-40": !fixedTopServerName,
          })}
          style={{ gridTemplateColumns: "auto auto 1fr" }}
        >
          <span className="h-2 w-2 shrink-0 self-center rounded-full bg-green-500" />
          <div className={cn("flex items-center justify-center", showFlag ? "min-w-[17px]" : "min-w-0")}>
            {showFlag && <ServerFlag region={server.region} />}
          </div>
          <div className="relative">
            <p className={cn("break-normal font-bold tracking-tight", showFlag ? "text-xs" : "text-sm")}>
              {server.name}
            </p>
          </div>
        </section>
        <div className="flex flex-col gap-2">
          <section
            className={cn("grid grid-cols-5 items-center gap-3", {
              "lg:grid-cols-6 lg:gap-4": fixedTopServerName,
            })}
          >
            {fixedTopServerName && (
              <div className="col-span-1 hidden items-center gap-2 lg:flex lg:flex-row">
                <div className="font-semibold text-xs">
                  {IsWindows(server.host.os) ? (
                    <MageMicrosoftWindows className="size-[10px]" />
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
            )}
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
            <div className="flex w-14 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "Upload")}</p>
              <div className="flex items-center font-semibold text-xs">{formatSpeed(server.status.netOutSpeed)}</div>
            </div>
            <div className="flex w-14 flex-col">
              <p className="text-muted-foreground text-xs">{t("ServerCard", "Download")}</p>
              <div className="flex items-center font-semibold text-xs">{formatSpeed(server.status.netInSpeed)}</div>
            </div>
          </section>
          {showNetTransfer && (
            <section className="flex items-center justify-between gap-1">
              <Badge variant="secondary" className="flex-1 items-center justify-center text-nowrap rounded-[8px] border-muted-50 text-[11px] shadow-md shadow-neutral-200/30 dark:shadow-none">
                {t("ServerCard", "Upload")}:{formatBytes(server.status.netOutTransfer)}
              </Badge>
              <Badge variant="outline" className="flex-1 items-center justify-center text-nowrap rounded-[8px] text-[11px] shadow-md shadow-neutral-200/30 dark:shadow-none">
                {t("ServerCard", "Download")}:{formatBytes(server.status.netInTransfer)}
              </Badge>
            </section>
          )}
        </div>
      </Card>
    </Link>
  )
})
