import { useLocale } from "@/context/locale-context"
import { useEffect, useState } from "react"

export default function Footer() {
  const { t } = useLocale()
  const year = new Date().getFullYear()
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(/macintosh|mac os x/i.test(navigator.userAgent))
  }, [])

  return (
    <footer className="mx-auto flex w-full max-w-5xl items-center justify-between">
      <section className="flex flex-col">
        <p className="mt-3 flex gap-1 text-[13px] font-light tracking-tight text-neutral-600/50 dark:text-neutral-300/50">
          Powered by{" "}
          <a
            href="https://github.com/komari-monitor/komari"
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer font-normal underline decoration-2 decoration-yellow-500 underline-offset-2 transition-colors hover:decoration-yellow-600 dark:decoration-yellow-500/60"
          >
            Komari Monitor
          </a>
          .
        </p>
        <section className="mt-1 flex items-center gap-2 text-[13px] font-light tracking-tight text-neutral-600/50 dark:text-neutral-300/50">
          {t("Footer", "copyright")} 2020-{year}{" "}
          <a
            href="https://github.com/hamster1963/nezha-dash"
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer font-normal underline decoration-2 decoration-yellow-500 underline-offset-2 transition-colors hover:decoration-yellow-600 dark:decoration-yellow-500/60 dark:hover:decoration-yellow-500/80"
          >
            NezhaDash
          </a>
        </section>
      </section>
      <p className="mt-1 text-[13px] font-light tracking-tight text-neutral-600/50 dark:text-neutral-300/50">
        <kbd className="pointer-events-none mx-1 inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground opacity-100">
          {isMac ? <span className="text-xs">⌘</span> : "Ctrl "}K
        </kbd>
      </p>
    </footer>
  )
}
