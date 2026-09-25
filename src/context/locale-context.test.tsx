import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider, localeItems, messages, useLocale } from "@/context/locale-context"
import theme from "../../komari-theme.json"

afterEach(() => vi.unstubAllGlobals())

function CurrentLanguage() {
  const { locale, t } = useLocale()
  return <span>{locale}:{t("Overview", "title")}</span>
}

describe("theme languages", () => {
  it("provides the same translation keys in all five languages", () => {
    expect(localeItems.map(({ code }) => code)).toEqual(["en", "id", "ja", "zh-TW", "zh"])
    const baseline = messages.en
    for (const { code } of localeItems) {
      expect(Object.keys(messages[code]).sort()).toEqual(Object.keys(baseline).sort())
      for (const section of Object.keys(baseline)) {
        expect(Object.keys(messages[code][section]).sort()).toEqual(Object.keys(baseline[section]).sort())
      }
    }
  })

  it.each(["id", "id-ID", "id_ID"])("recognizes the stored Komari language %s", (language) => {
    vi.stubGlobal("localStorage", { getItem: () => language })
    vi.stubGlobal("navigator", { language: "en-US" })
    expect(renderToStaticMarkup(<LocaleProvider><CurrentLanguage /></LocaleProvider>))
      .toContain("id:Ikhtisar")
  })

  it("uses the browser's Indonesian language when no preference is stored", () => {
    vi.stubGlobal("localStorage", { getItem: () => null })
    vi.stubGlobal("navigator", { language: "id-ID" })
    expect(renderToStaticMarkup(<LocaleProvider><CurrentLanguage /></LocaleProvider>))
      .toContain("id:Ikhtisar")
  })

  it("supplies five translations for every managed setting without changing its key or default", () => {
    const languages = ["en", "id", "ja", "zh-CN", "zh-TW"]
    expect(Object.keys(theme.configuration.name).sort()).toEqual([...languages].sort())
    expect(theme.configuration.data.map(({ key }: { key: string }) => key)).toEqual([
      "showFlag", "showTag", "showNetTransfer", "disableCartoon", "fixedTopServerName", "showTagCount",
    ])
    expect(theme.configuration.data.map(({ default: value }: { default: boolean }) => value))
      .toEqual([true, true, false, false, false, false])
    for (const field of theme.configuration.data) {
      for (const property of ["name", "help"] as const) {
        expect(Object.keys(field[property]).sort()).toEqual([...languages].sort())
        expect(Object.values(field[property]).every((value) => typeof value === "string" && value.length > 0)).toBe(true)
      }
    }
  })
})
