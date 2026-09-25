import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { LoginButton } from "@/components/LoginButton"

describe("LoginButton", () => {
  it("links to Komari's stable admin entry", () => {
    const html = renderToStaticMarkup(<LoginButton />)

    expect(html).toContain('href="/admin/dashboard"')
    expect(html).not.toContain("<button")
  })
})
