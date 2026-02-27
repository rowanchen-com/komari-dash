import { ArrowDownCircleIcon, ArrowUpCircleIcon } from "@heroicons/react/20/solid"
import { useServerData } from "@/context/server-data-context"
import { Card, CardContent } from "@/components/ui/card"
import { Loader } from "@/components/Loader"
import { cn, formatBytes, getThemeSetting } from "@/lib/utils"
import { useLocale } from "@/context/locale-context"
import { useState } from "react"
import { usePublicInfo } from "@/hooks/usePublicInfo"
import { AnimateCountClient } from "@/components/AnimateCount"
import blogMan from "@/assets/blog-man.webp"

type StatusFilter = "all" | "online" | "offline"

// Export filter state for ServerList to consume
let _statusFilter: StatusFilter = "all"
let _networkFilter = false
const _listeners: (() => void)[] = []

export function getStatusFilter() { return _statusFilter }
export function getNetworkFilter() { return _networkFilter }
export function subscribeFilter(fn: () => void) {
  _listeners.push(fn)
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1) }
}

function notify() { _listeners.forEach((fn) => fn()) }

export default function ServerOverviewClient() {
  const { data, error } = useServerData()
  const [status, setStatus] = useState<StatusFilter>("all")
  const [filter, setFilter] = useState(false)
  const { info } = usePublicInfo()
  const { t } = useLocale()
  const disableCartoon = getThemeSetting(info?.theme_settings, "disableCartoon", false)

  const updateStatus = (s: StatusFilter) => {
    setStatus(s)
    setFilter(false)
    _statusFilter = s
    _networkFilter = false
    notify()
  }

  const updateNetworkFilter = () => {
    setStatus("all")
    setFilter(true)
    _statusFilter = "all"
    _networkFilter = true
    notify()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="font-medium text-sm opacity-40">{error.message}</p>
        <p className="font-medium text-sm opacity-40">{t("ServerOverview", "error")}</p>
      </div>
    )
  }

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card onClick={() => updateStatus("all")} className="group cursor-pointer transition-all hover:ring-blue-500 dark:hover:ring-blue-600">
        <CardContent className="flex h-full items-center px-6 py-3">
          <section className="flex flex-col gap-1">
            <p className="font-medium text-sm md:text-base">{t("ServerOverview", "total")}</p>
            <div className="flex min-h-7 items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              {data ? (
                <div className="font-semibold text-lg"><AnimateCountClient count={data.total} /></div>
              ) : (
                <Loader visible />
              )}
            </div>
          </section>
        </CardContent>
      </Card>

      <Card
        onClick={() => updateStatus("online")}
        className={cn("cursor-pointer ring-1 transition-all hover:ring-green-500 dark:hover:ring-green-600", {
          "border-transparent ring-2 ring-green-500 dark:ring-green-600": status === "online",
        })}
      >
        <CardContent className="flex h-full items-center px-6 py-3">
          <section className="flex flex-col gap-1">
            <p className="font-medium text-sm md:text-base">{t("ServerOverview", "online")}</p>
            <div className="flex min-h-7 items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {data ? <div className="font-semibold text-lg"><AnimateCountClient count={data.online} /></div> : <Loader visible />}
            </div>
          </section>
        </CardContent>
      </Card>

      <Card
        onClick={() => updateStatus("offline")}
        className={cn("cursor-pointer ring-1 transition-all hover:ring-red-500 dark:hover:ring-red-600", {
          "border-transparent ring-2 ring-red-500 dark:ring-red-600": status === "offline",
        })}
      >
        <CardContent className="flex h-full items-center px-6 py-3">
          <section className="flex flex-col gap-1">
            <p className="font-medium text-sm md:text-base">{t("ServerOverview", "offline")}</p>
            <div className="flex min-h-7 items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              {data ? <div className="font-semibold text-lg"><AnimateCountClient count={data.offline} /></div> : <Loader visible />}
            </div>
          </section>
        </CardContent>
      </Card>

      <Card
        onClick={updateNetworkFilter}
        className={cn("group cursor-pointer ring-1 hover:ring-purple-500 dark:hover:ring-purple-600", {
          "border-transparent ring-2 ring-purple-500 dark:ring-purple-600": filter,
        })}
      >
        <CardContent className="relative flex h-full items-center px-6 py-3">
          <section className="flex w-full flex-col gap-1">
            <p className="font-medium text-sm md:text-base">{t("ServerOverview", "network")}</p>
            {data ? (
              <>
                <section className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:gap-1 sm:pr-0">
                  <p className="text-nowrap font-medium text-[12px] text-blue-800 dark:text-blue-400">
                    ↑{formatBytes(data.totalOutBandwidth)}
                  </p>
                  <p className="text-nowrap font-medium text-[12px] text-purple-800 dark:text-purple-400">
                    ↓{formatBytes(data.totalInBandwidth)}
                  </p>
                </section>
                <section className="-mr-1 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
                  <p className="flex items-center text-nowrap font-semibold text-[11px]">
                    <ArrowUpCircleIcon className="mr-0.5 size-3 sm:mb-px" />
                    {formatBytes(data.totalOutSpeed)}/s
                  </p>
                  <p className="flex items-center text-nowrap font-semibold text-[11px]">
                    <ArrowDownCircleIcon className="mr-0.5 size-3" />
                    {formatBytes(data.totalInSpeed)}/s
                  </p>
                </section>
              </>
            ) : (
              <div className="flex h-[38px] items-center">
                <Loader visible />
              </div>
            )}
          </section>
          {!disableCartoon && (
            <img
              className="absolute top-[-85px] right-3 z-50 w-20 scale-90 transition-all group-hover:opacity-50 md:scale-100"
              alt="cartoon"
              src={blogMan}
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
