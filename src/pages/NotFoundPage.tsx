import { Link } from "react-router-dom"
import { useLocale } from "@/context/locale-context"

export default function NotFoundPage() {
  const { t } = useLocale()
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-4 py-20">
      <h1 className="font-bold text-4xl">404</h1>
      <p className="text-muted-foreground">{t("NotFound", "title")}</p>
      <Link to="/" className="text-sm text-primary underline underline-offset-4 hover:opacity-70">
        {t("NotFound", "back")}
      </Link>
    </div>
  )
}
