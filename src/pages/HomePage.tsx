import ServerOverviewClient from "@/components/ServerOverview"
import ServerListClient from "@/components/ServerList"

export default function HomePage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 md:gap-6">
      <ServerOverviewClient />
      <ServerListClient />
    </div>
  )
}
