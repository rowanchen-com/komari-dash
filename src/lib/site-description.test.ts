import { describe, expect, it } from "vitest"
import { messages } from "@/context/locale-context"
import { resolveSiteDescription } from "@/lib/site-description"

describe("resolveSiteDescription", () => {
  it("translates Komari's default description for every theme language", () => {
    for (const language of ["en", "id", "ja", "zh-TW", "zh"]) {
      const localized = messages[language].Header.desc
      expect(resolveSiteDescription("A simple server monitor tool.", localized)).toBe(localized)
      expect(resolveSiteDescription("", localized)).toBe(localized)
    }
  })

  it("preserves a custom description configured in Komari", () => {
    expect(resolveSiteDescription("  My own status page  ", messages.zh.Header.desc))
      .toBe("My own status page")
  })
})
