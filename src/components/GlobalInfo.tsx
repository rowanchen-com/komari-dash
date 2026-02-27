import { useLocale } from "@/context/locale-context"

interface GlobalInfoProps {
  countries: string[]
}

export default function GlobalInfo({ countries }: GlobalInfoProps) {
  const { t } = useLocale()
  return (
    <section className="flex items-center justify-between">
      <p className="font-medium text-sm opacity-40">
        {t("Global", "distributions")} {countries.length} {t("Global", "regions")}
      </p>
    </section>
  )
}
