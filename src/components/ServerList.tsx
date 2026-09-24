import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, lazy, Suspense } from "react"
import { flushSync } from "react-dom"
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
  const containerRef = useRef<HTMLElement>(null)
  const [tag, setTag] = useState("defaultTag")
  const [showMap, setShowMap] = useState(false)
  const [mapMounted, setMapMounted] = useState(false)
  const [inline, setInline] = useState("0")
  const [listHeight, setListHeight] = useState<number>()
  const mapCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem("selectedTag") || "defaultTag"
    setTag(saved)

    const inlineState = localStorage.getItem("inline")
    if (inlineState !== null) setInline(inlineState)

    const showMapState = localStorage.getItem("showMap")
    if (showMapState === "true") {
      setMapMounted(true)
      setShowMap(true)
    }
  }, [])

  useEffect(() => () => {
    if (mapCloseTimer.current) clearTimeout(mapCloseTimer.current)
  }, [])

  const handleMapToggle = () => {
    const next = !showMap
    if (mapCloseTimer.current) clearTimeout(mapCloseTimer.current)
    if (next) setMapMounted(true)
    setShowMap(next)
    if (!next) mapCloseTimer.current = setTimeout(() => setMapMounted(false), 280)
    localStorage.setItem("showMap", String(next))
  }

  const handleLayoutToggle = () => {
    const next = inline === "0" ? "1" : "0"
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(() => flushSync(() => setInline(next)))
    } else {
      setInline(next)
    }
    localStorage.setItem("inline", next)
  }

  const handleTagChange = (newTag: string) => {
    setTag(newTag)
    sessionStorage.setItem("selectedTag", newTag)
  }

  const { data, error } = useServerData()

  // Let the list change size without snapping the footer to its new position.
  useLayoutEffect(() => {
    const list = containerRef.current
    if (!list) return

    const syncHeight = () => setListHeight(list.getBoundingClientRect().height)
    syncHeight()
    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(syncHeight)
    observer.observe(list)
    return () => observer.disconnect()
  }, [inline, !!data?.servers, !!error])

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
          onClick={handleMapToggle}
          aria-label="Toggle map"
          aria-pressed={showMap}
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
          onClick={handleLayoutToggle}
          aria-label="Toggle full-width list"
          aria-pressed={inline === "1"}
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
      {mapMounted && (
        <div className="map-reveal min-w-0" data-open={showMap} aria-hidden={!showMap} inert={!showMap}>
          <div className="min-h-0 overflow-hidden">
            <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Loader visible /></div>}>
              <ServerGlobal />
            </Suspense>
          </div>
        </div>
      )}
      <div
        className="min-w-0 transition-[height] duration-200 ease-out motion-reduce:transition-none [clip-path:inset(-12px)]"
        style={listHeight === undefined ? undefined : { height: listHeight }}
      >
        {inline === "1" ? (
          <section ref={containerRef} className="scrollbar-hidden flex min-w-0 flex-col gap-2 overflow-x-auto p-px">
            {filtered.map((server) => (
              <ServerCardInline key={server.uuid} server={server} />
            ))}
          </section>
        ) : (
          <section ref={containerRef} className="grid grid-cols-1 gap-2 p-px md:grid-cols-2">
            {filtered.map((server) => (
              <ServerCard key={server.uuid} server={server} />
            ))}
          </section>
        )}
      </div>
    </>
  )
}
