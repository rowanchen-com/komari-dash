import { useNavigate } from "react-router-dom"
import { useCallback, useEffect, useState } from "react"
import ThemeSwitcher from "@/components/ThemeSwitcher"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { SearchButton } from "@/components/SearchButton"
import { LoginButton } from "@/components/LoginButton"
import { usePublicInfo } from "@/hooks/usePublicInfo"
import { getThemeSetting } from "@/lib/utils"
import { useLocale } from "@/context/locale-context"
import { AnimateCountClient } from "@/components/AnimateCount"

interface CustomLink {
  link: string
  name: string
}

function Links() {
  const { info } = usePublicInfo()
  const linksStr = getThemeSetting<string>(info?.theme_settings, "customLinks", "")
  let links: CustomLink[] = []
  try {
    if (linksStr) links = JSON.parse(linksStr)
  } catch { /* ignore */ }

  if (!links.length) return null

  return (
    <div className="flex items-center gap-2">
      {links.map((link) => (
        <a
          key={link.link}
          href={link.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-medium text-sm opacity-50 transition-opacity hover:opacity-100"
        >
          {link.name}
        </a>
      ))}
    </div>
  )
}

function Clock() {
  const [time, setTime] = useState({ hh: new Date().getHours(), mm: new Date().getMinutes(), ss: new Date().getSeconds() })

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      setTime({ hh: now.getHours(), mm: now.getMinutes(), ss: now.getSeconds() })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center font-medium text-sm">
      <AnimateCountClient count={time.hh} minDigits={2} />
      <span className="mb-px font-medium text-sm opacity-50">:</span>
      <AnimateCountClient count={time.mm} minDigits={2} />
      <span className="mb-px font-medium text-sm opacity-50">:</span>
      <AnimateCountClient count={time.ss} minDigits={2} />
    </div>
  )
}

export default function Header() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const { info } = usePublicInfo()
  const customLogo = getThemeSetting<string>(info?.theme_settings, "customLogo", "")
  const customDesc = getThemeSetting<string>(info?.theme_settings, "customDescription", "")
  const siteName = info?.sitename || "KomariDash"
  const siteDesc = customDesc || t("Header", "desc")

  const handleLogoClick = useCallback(() => {
    sessionStorage.removeItem("selectedTag")
    navigate("/")
  }, [navigate])

  return (
    <div className="mx-auto w-full max-w-5xl">
      <section className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex cursor-pointer items-center font-medium text-base transition-opacity duration-300 hover:opacity-50"
        >
          <div className="mr-1 flex flex-row items-center justify-start">
            {customLogo ? (
              <>
                <img src={customLogo} alt="apple-touch-icon" className="relative m-0! h-6 w-6 border-2 border-transparent object-cover object-top p-0! dark:hidden" />
                <img src={customLogo} alt="apple-touch-icon" className="relative m-0! hidden h-6 w-6 border-2 border-transparent object-cover object-top p-0! dark:block" />
              </>
            ) : (
              <>
                <img src="/apple-touch-icon.png" alt="apple-touch-icon" className="relative m-0! h-6 w-6 border-2 border-transparent object-cover object-top p-0! dark:hidden" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                <img src="/apple-touch-icon-dark.png" alt="apple-touch-icon" className="relative m-0! hidden h-6 w-6 border-2 border-transparent object-cover object-top p-0! dark:block" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
              </>
            )}
          </div>
          {siteName}
          <span className="mx-2 hidden h-4 w-px bg-border md:block" />
          <p className="hidden font-medium text-sm opacity-40 md:block">{siteDesc}</p>
        </button>
        <section className="flex items-center gap-2">
          <div className="hidden sm:block">
            <Links />
          </div>
          <SearchButton />
          <LanguageSwitcher />
          <ThemeSwitcher />
          <LoginButton />
        </section>
      </section>
      <div className="mt-1 flex w-full justify-end sm:hidden">
        <Links />
      </div>
      <section className="mt-10 flex flex-col md:mt-16">
        <p className="font-semibold text-base">{t("Overview", "title")}</p>
        <div className="flex items-center gap-1">
          <p className="font-medium text-sm opacity-50">{t("Overview", "time")}</p>
          <Clock />
        </div>
      </section>
    </div>
  )
}
