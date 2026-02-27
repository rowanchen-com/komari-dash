import GlobalInfo from "@/components/GlobalInfo"
import { InteractiveMap } from "@/components/InteractiveMap"
import { useServerData } from "@/context/server-data-context"
import { TooltipProvider } from "@/context/tooltip-context"
import { Loader } from "@/components/Loader"
import { geoJsonString } from "@/lib/geo/geo-json-string"
import { getCountryCode } from "@/lib/utils"

export default function ServerGlobal() {
  const { data, error } = useServerData()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="font-medium text-sm opacity-40">{error.message}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader visible />
      </div>
    )
  }

  const countryList: string[] = []
  const serverCounts: Record<string, number> = {}

  for (const server of data.servers) {
    if (server.region) {
      const countryCode = getCountryCode(server.region)
      if (countryCode) {
        if (!countryList.includes(countryCode)) {
          countryList.push(countryCode)
        }
        serverCounts[countryCode] = (serverCounts[countryCode] || 0) + 1
      }
    }
  }

  const width = 900
  const height = 500

  const geoJson = JSON.parse(geoJsonString)
  const filteredFeatures = geoJson.features.filter(
    (feature: any) => feature.properties.iso_a3_eh !== "",
  )

  return (
    <section className="mt-[3.2px] flex flex-col gap-4">
      <GlobalInfo countries={countryList} />
      <div className="w-full overflow-x-auto">
        <TooltipProvider>
          <InteractiveMap
            countries={countryList}
            serverCounts={serverCounts}
            width={width}
            height={height}
            filteredFeatures={filteredFeatures}
            servers={data.servers}
          />
        </TooltipProvider>
      </div>
    </section>
  )
}
