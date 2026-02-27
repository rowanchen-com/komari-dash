import { CheckCircleIcon } from "@heroicons/react/20/solid"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/context/theme-context"
import { useLocale } from "@/context/locale-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { t } = useLocale()

  const handleSelect = (e: Event, newTheme: "light" | "dark" | "system") => {
    e.preventDefault()
    setTheme(newTheme)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-full bg-white px-[9px] hover:bg-accent/50 dark:bg-black dark:hover:bg-accent/50"
          title="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="flex flex-col gap-0.5 border-none shadow-md shadow-stone-200/50 ring ring-stone-200 dark:shadow-none dark:ring-stone-800"
        align="end"
      >
        <DropdownMenuItem
          className={cn("rounded-b-[5px]", { "gap-3 bg-muted font-semibold": theme === "light" })}
          onSelect={(e) => handleSelect(e, "light")}
        >
          {t("ThemeSwitcher", "Light")} {theme === "light" && <CheckCircleIcon className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn("rounded-[5px]", { "gap-3 bg-muted font-semibold": theme === "dark" })}
          onSelect={(e) => handleSelect(e, "dark")}
        >
          {t("ThemeSwitcher", "Dark")} {theme === "dark" && <CheckCircleIcon className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn("rounded-t-[5px]", { "gap-3 bg-muted font-semibold": theme === "system" })}
          onSelect={(e) => handleSelect(e, "system")}
        >
          {t("ThemeSwitcher", "System")} {theme === "system" && <CheckCircleIcon className="size-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
