import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  resolved: "light" | "dark"
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("appearance") as Theme) || "system"
  })

  const [resolved, setResolved] = useState<"light" | "dark">("light")

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem("appearance", t)
  }

  useEffect(() => {
    const apply = () => {
      let r: "light" | "dark"
      if (theme === "system") {
        r = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      } else {
        r = theme
      }
      setResolved(r)
      document.documentElement.classList.toggle("dark", r === "dark")
    }
    apply()
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
