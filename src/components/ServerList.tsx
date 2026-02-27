import { useEffect, useRef, useState, useSyncExternalStore, lazy, Suspense } from "react"
import { MapIcon, ViewColumnsIcon } from "@heroicons/react/20/solid"
import { useServerData } from "@/context/server-data-context"
import { Loader } from "@/components/Loader"
import ShinyText from "@/components/ui/shiny-text"
import ServerCard from "@/components/ServerCard"
import ServerCardInline from "@/components/ServerCardInline"
import Switch from "@/components/Switch"
import { getStatusFilter, getNetworkFilter, subscribeFilter } from "@/components/ServerOverview"
import { usePublicInfo } from "@/hooks/usePublicInfo"
import { cn, getThemeSetting } from "@/lib/utils"
import { useLocale } from "@/context/locale-context"
import type { ServerInfo } from "@/types/komari"

const ServerGlobal = lazy(() => import("@/components/ServerGlobal"))

function useFilters() {
  const status = useSyncExternalStore(subscribeFilter, getStatusFilter)
  const network = useSyncExternalStore(subscribeFilter, getNetworkFilter)
  return { status, network }
}

const sortByWeight = (servers: ServerInfo[]) =>
  [...servers].sort((a, b) => (a.weight || 0) - (b.weight || 0))

const filterByStatus = (servers: ServerInfo[], status: string) =>
  status === "all" ? servers : servers.filter((s) => (s.online ? "online" : "offline") === status)

const filterByTag = (servers: ServerInfo[], tag: string) =>
  tag === "defaultTag" ? servers : servers.filter((s) => s.group === tag)

const sortByNetwork = (servers: ServerInfo[]) =>
  [...servers].sort((a, b) => {
    if (!a.online && b.online) return 1
    if (a.online && !b.online) return -1
    return (b.status.netInSpeed + b.status.netOutSpeed) - (a.status.netInSpeed + a.status.netOutSpeed)
  })

export default function ServerListClient() {
  const { status, network } = useFilters()
  const { info } = usePublicInfo()
  const { t } = useLocale()
  const showTag = getThemeSetting(info?.theme_settings, "showTag", true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tag, setTag] = useState("defaultTag")
  const [showMap, setShowMap] = useState(false)
  const [inline, setInline] = useState("0")

  useEffect(() => {
    const saved = sessionStorage.getItem("selectedTag") || "defaultTag"
    setTag(saved)

    const inlineState = localStorage.getItem("inline")
    if (inlineState !== null) setInline(inlineState)

    const showMapState = localStorage.getItem("showMap")
    if (showMapState !== null) setShowMap(showMapState === "true")
  }, [])

  const handleTagChange = (newTag: string) => {
    setTag(newTag)
    sessionStorage.setItem("selectedTag", newTag)
  }

  const { data, error } = useServerData()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="font-medium text-sm opacity-40">{error.message}</p>
        <p className="font-medium text-sm opacity-40">{t("ServerList", "error")}</p>
      </div>
    )
  }

  if (!data?.servers) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <ShinyText
            icon={<Loader visible />}
            text={`${t("ServerList", "connecting")}...`}
            speed={3}
            delay={0}
            className={cn("font-medium text-[14px]")}
          />
        </div>
      </div>
    )
  }

  const sorted = sortByWeight(data.servers)
  const filteredByStatus = filterByStatus(sorted, status)

  const allTags = filteredByStatus.map((s) => s.group).filter(Boolean)
  const uniqueTags = ["defaultTag", ...new Set(allTags)]

  let filtered = filterByTag(filteredByStatus, tag)
  if (network) filtered = sortByNetwork(filtered)

  const tagCountMap = filteredByStatus.reduce((acc: Record<string, number>, s) => {
    if (s.group) acc[s.group] = (acc[s.group] || 0) + 1
    return acc
  }, {})

  return (
    <>
      <section className="flex w-full items-center gap-2 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            const newShowMap = !showMap
            setShowMap(newShowMap)
            localStorage.setItem("showMap", String(newShowMap))
          }}
          className={cn(
            "inset-shadow-2xs inset-shadow-white/20 flex cursor-pointer flex-col items-center gap-0 rounded-[50px] bg-blue-100 p-2.5 text-blue-600 transition-all dark:bg-blue-900 dark:text-blue-100",
            {
              "inset-shadow-black/20 bg-blue-600 text-white dark:bg-blue-100 dark:text-blue-600": showMap,
            },
          )}
        >
          <MapIcon className="size-[13px]" />
        </button>
        <button
          type="button"
          onClick={() => {
            const newInline = inline === "0" ? "1" : "0"
            setInline(newInline)
            localStorage.setItem("inline", newInline)
          }}
          className={cn(
            "inset-shadow-2xs inset-shadow-white/20 flex cursor-pointer flex-col items-center gap-0 rounded-[50px] bg-blue-100 p-2.5 text-blue-600 transition-all dark:bg-blue-900 dark:text-blue-100",
            {
              "inset-shadow-black/20 bg-blue-600 text-white dark:bg-blue-100 dark:text-blue-600": inline === "1",
            },
          )}
        >
          <ViewColumnsIcon className="size-[13px]" />
        </button>
        {showTag && (
          <Switch allTag={uniqueTags} nowTag={tag} tagCountMap={tagCountMap} onTagChange={handleTagChange} />
        )}
      </section>
      {showMap && (
        <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Loader visible /></div>}>
          <ServerGlobal />
        </Suspense>
      )}
      {inline === "1" ? (
        <section ref={containerRef} className="scrollbar-hidden flex flex-col gap-2 overflow-x-scroll p-px">
          {filtered.map((server) => (
            <ServerCardInline key={server.uuid} server={server} />
          ))}
        </section>
      ) : (
        <section ref={containerRef} className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {filtered.map((server) => (
            <ServerCard key={server.uuid} server={server} />
          ))}
        </section>
      )}
    </>
  )
}
