import ServerOverviewClient from "@/components/ServerOverview"
import ServerListClient from "@/components/ServerList"

export default function HomePage() {
  return (
    <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-[minmax(0,1fr)] gap-4 md:gap-6">
      <ServerOverviewClient />
      <ServerListClient />
    </div>
  )
}
