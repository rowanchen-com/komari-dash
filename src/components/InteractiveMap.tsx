import { geoEquirectangular, geoPath } from "d3-geo"
import MapTooltip from "@/components/MapTooltip"
import { useTooltip } from "@/context/tooltip-context"
import { countryCoordinates } from "@/lib/geo/geo-limit"
import { getCountryCode } from "@/lib/utils"
import type { ServerInfo } from "@/types/komari"

interface InteractiveMapProps {
  countries: string[]
  serverCounts: Record<string, number>
  width: number
  height: number
  filteredFeatures: any[]
  servers: ServerInfo[]
}

export function InteractiveMap({
  countries,
  serverCounts,
  width,
  height,
  filteredFeatures,
  servers,
}: InteractiveMapProps) {
  const { setTooltipData } = useTooltip()

  const projection = geoEquirectangular()
    .scale(140)
    .translate([width / 2, height / 2])
    .rotate([-12, 0, 0])

  const path = geoPath().projection(projection)

  return (
    <div className="relative aspect-2/1 w-full" onMouseLeave={() => setTooltipData(null)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full"
      >
        <title>Interactive Map</title>
        <g>
          <rect x="0" y="0" width={width} height={height} fill="transparent" onMouseEnter={() => setTooltipData(null)} />
          {filteredFeatures.map((feature: any, index: number) => {
            const isHighlighted = countries.includes(feature.properties.iso_a2_eh)
            const serverCount = serverCounts[feature.properties.iso_a2_eh] || 0

            return (
              <path
                key={feature.properties.iso_a2_eh + String(index)}
                d={path(feature) || ""}
                className={
                  isHighlighted
                    ? "cursor-pointer fill-green-700 transition-all hover:fill-green-600 dark:fill-green-900 dark:hover:fill-green-700"
                    : "fill-neutral-200/50 stroke-[0.5] stroke-neutral-300/40 dark:fill-neutral-800 dark:stroke-neutral-700"
                }
                onMouseEnter={() => {
                  if (!isHighlighted) {
                    setTooltipData(null)
                    return
                  }
                  if (path.centroid(feature)) {
                    const countryCode = feature.properties.iso_a2_eh
                    const countryServers = servers
                      .filter((s) => {
                        const cc = getCountryCode(s.region)
                        return cc === countryCode
                      })
                      .map((s) => ({
                        id: s.uuid,
                        name: s.name,
                        status: s.online,
                      }))
                    setTooltipData({
                      centroid: path.centroid(feature),
                      country: feature.properties.name,
                      count: serverCount,
                      servers: countryServers,
                    })
                  }
                }}
              />
            )
          })}

          {/* Render markers for countries not in filteredFeatures */}
          {countries.map((countryCode) => {
            const isInFilteredFeatures = filteredFeatures.some(
              (feature: any) => feature.properties.iso_a2_eh === countryCode,
            )
            if (isInFilteredFeatures) return null

            const coords = countryCoordinates[countryCode]
            if (!coords) return null

            const [x, y] = projection([coords.lng, coords.lat]) || [0, 0]
            const serverCount = serverCounts[countryCode] || 0

            return (
              <g
                key={countryCode}
                onMouseEnter={() => {
                  const countryServers = servers
                    .filter((s) => {
                      const cc = getCountryCode(s.region)
                      return cc === countryCode
                    })
                    .map((s) => ({
                      id: s.uuid,
                      name: s.name,
                      status: s.online,
                    }))
                  setTooltipData({
                    centroid: [x, y],
                    country: coords.name,
                    count: serverCount,
                    servers: countryServers,
                  })
                }}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  className="fill-sky-700 stroke-white transition-all hover:fill-sky-600 dark:fill-sky-900 dark:hover:fill-sky-700"
                />
              </g>
            )
          })}
        </g>
      </svg>
      <MapTooltip />
    </div>
  )
}
