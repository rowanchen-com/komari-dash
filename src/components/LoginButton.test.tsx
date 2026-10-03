import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { LoginButton } from "@/components/LoginButton"

describe("LoginButton", () => {
  it("links to Komari's official admin entry with full-page navigation", () => {
    const html = renderToStaticMarkup(<LoginButton />)

    expect(html).toContain('href="/admin"')
    expect(html).not.toContain("<button")
  })
})
