import { Home, Languages, Moon, Sun, SunMoon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useCommand } from "@/context/command-context"
import { useServerData } from "@/context/server-data-context"
import { useTheme } from "@/context/theme-context"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useLocale, localeItems } from "@/context/locale-context"

export function DashCommand() {
  const [search, setSearch] = useState("")
  const { data } = useServerData()
  const { isOpen, closeCommand, toggleCommand } = useCommand()
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { t, setLocale } = useLocale()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggleCommand()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [toggleCommand])

  if (!data?.servers) return null

  const sortedServers = [...data.servers].sort((a, b) => (a.weight || 0) - (b.weight || 0))

  const languageShortcuts = localeItems.map((item) => ({
    icon: <Languages />,
    label: item.name,
    action: () => { setLocale(item.code) },
    value: `language ${item.name.toLowerCase()} ${item.code}`,
  }))

  const shortcuts = [
    {
      icon: <Home />,
      label: t("DashCommand", "Home"),
      action: () => navigate("/"),
      value: "home homepage",
    },
    {
      icon: <Sun />,
      label: t("DashCommand", "ToggleLightMode"),
      action: () => setTheme("light"),
      value: "light theme lightmode",
    },
    {
      icon: <Moon />,
      label: t("DashCommand", "ToggleDarkMode"),
      action: () => setTheme("dark"),
      value: "dark theme darkmode",
    },
    {
      icon: <SunMoon />,
      label: t("DashCommand", "ToggleSystemMode"),
      action: () => setTheme("system"),
      value: "system theme systemmode",
    },
    ...languageShortcuts,
  ]

  return (
    <CommandDialog open={isOpen} onOpenChange={closeCommand}>
      <CommandInput placeholder={t("DashCommand", "TypeCommand")} value={search} onValueChange={setSearch} />
      <CommandList className="border-t">
        <CommandEmpty>{t("DashCommand", "NoResults")}</CommandEmpty>
        <CommandGroup heading={t("DashCommand", "Servers")}>
          {sortedServers.map((server) => (
            <CommandItem
              key={server.uuid}
              value={server.name}
              onSelect={() => {
                navigate(`/server/${server.uuid}`)
                closeCommand()
              }}
            >
              {server.online ? (
                <span className="h-2 w-2 shrink-0 self-center rounded-full bg-green-500" />
              ) : (
                <span className="h-2 w-2 shrink-0 self-center rounded-full bg-red-500" />
              )}
              <span>{server.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t("DashCommand", "Shortcuts")}>
          {shortcuts.map((item) => (
            <CommandItem
              key={item.label}
              value={`${item.value} ${item.label}`}
              onSelect={() => {
                item.action()
                closeCommand()
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
