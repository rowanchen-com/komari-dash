import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import ServerCard from "@/components/ServerCard"
import ServerCardInline from "@/components/ServerCardInline"
import { normalizeLatestStatuses, normalizeNodes, normalizeServer } from "@/lib/komari-rpc"

const settings = vi.hoisted(() => ({ showNetTransfer: false, fixedTopServerName: false }))
vi.mock("@/hooks/usePublicInfo", () => ({ usePublicInfo: () => ({ info: { theme_settings: settings } }) }))
vi.mock("@/context/locale-context", () => ({ useLocale: () => ({ t: (_section: string, key: string) => key }) }))
afterEach(() => { settings.showNetTransfer = false; settings.fixedTopServerName = false })

describe("server layout transition targets", () => {
  it.each([
    { mode: "grid", online: true, Component: ServerCard },
    { mode: "grid", online: false, Component: ServerCard },
    { mode: "full width", online: true, Component: ServerCardInline },
    { mode: "full width", online: false, Component: ServerCardInline },
  ])("keeps the same scoped target in $mode with online=$online", ({ online, Component }) => {
    const [node] = normalizeNodes({ "node-1": { uuid: "node-1", name: "Edge" } })
    const latest = normalizeLatestStatuses({ "node-1": { online, time: "2026-10-26T00:00:00Z" } })
    const server = normalizeServer(node, latest["node-1"])
    const html = renderToStaticMarkup(<MemoryRouter><Component server={server} /></MemoryRouter>)
    expect(html).toContain('class="server-card-link"')
    expect(html).toContain("view-transition-name:server-node-1")
    expect(html).toContain('href="/server/node-1"')
    expect(html).toContain("view-transition-name:server-node-1-identity")
    if (online) for (const field of ["cpu", "memory", "disk", "upload", "download"]) {
      expect(html).toContain(`view-transition-name:server-node-1-${field}`)
    }
    const names = [...html.matchAll(/view-transition-name:([^;"\s]+)/g)].map((match) => match[1])
    expect(new Set(names).size).toBe(names.length)
  })

  it("keeps optional transfer and top-name fields uniquely named in both layouts", () => {
    settings.showNetTransfer = true
    settings.fixedTopServerName = true
    const [node] = normalizeNodes({ a: { uuid: "a", name: "Edge" } })
    const latest = normalizeLatestStatuses({ a: { online: true } })
    const server = normalizeServer(node, latest.a)
    for (const Component of [ServerCard, ServerCardInline]) {
      const html = renderToStaticMarkup(<MemoryRouter><Component server={server} /></MemoryRouter>)
      const names = [...html.matchAll(/view-transition-name:([^;"\s]+)/g)].map((match) => match[1])
      expect(new Set(names).size).toBe(names.length)
      expect(names).toContain("server-a-system")
    }
  })
})
