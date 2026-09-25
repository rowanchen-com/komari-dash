import { CheckCircleIcon, LanguageIcon } from "@heroicons/react/20/solid"
import { useLocale, localeItems } from "@/context/locale-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()

  const handleSelect = (e: Event, newLocale: string) => {
    e.preventDefault()
    setLocale(newLocale)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-full bg-white px-[9px] hover:bg-accent/50 dark:bg-black dark:hover:bg-accent/50"
          title={t("LanguageSwitcher", "title")}
        >
          <LanguageIcon className="size-4" />
          <span className="sr-only">{t("LanguageSwitcher", "title")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="flex w-44 flex-col gap-0.5 border-none shadow-md shadow-stone-200/50 ring ring-stone-200 dark:shadow-none dark:ring-stone-800"
        align="end"
      >
        {localeItems.map((item, index) => (
          <DropdownMenuItem
            key={item.code}
            onSelect={(e) => handleSelect(e, item.code)}
            className={cn(
              "justify-between gap-3",
              { "bg-muted font-semibold": locale === item.code },
              {
                "rounded-t-[5px]": index === localeItems.length - 1,
                "rounded-[5px]": index !== 0 && index !== localeItems.length - 1,
                "rounded-b-[5px]": index === 0,
              },
            )}
          >
            <span>{item.name}</span>
            <CheckCircleIcon className={cn("size-4 shrink-0", locale !== item.code && "invisible")} aria-hidden="true" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
