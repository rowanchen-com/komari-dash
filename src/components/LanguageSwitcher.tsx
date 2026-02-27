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
  const { locale, setLocale } = useLocale()

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
          title="Change language"
        >
          <LanguageIcon className="size-4" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="flex flex-col gap-0.5 border-none shadow-md shadow-stone-200/50 ring ring-stone-200 dark:shadow-none dark:ring-stone-800"
        align="end"
      >
        {localeItems.map((item, index) => (
          <DropdownMenuItem
            key={item.code}
            onSelect={(e) => handleSelect(e, item.code)}
            className={cn(
              { "gap-3 bg-muted font-semibold": locale === item.code },
              {
                "rounded-t-[5px]": index === localeItems.length - 1,
                "rounded-[5px]": index !== 0 && index !== localeItems.length - 1,
                "rounded-b-[5px]": index === 0,
              },
            )}
          >
            {item.name} {locale === item.code && <CheckCircleIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
