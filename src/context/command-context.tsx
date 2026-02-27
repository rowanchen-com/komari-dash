import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

interface CommandContextType {
  isOpen: boolean
  openCommand: () => void
  closeCommand: () => void
  toggleCommand: () => void
}

const CommandContext = createContext<CommandContextType | undefined>(undefined)

export function CommandProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openCommand = useCallback(() => setIsOpen(true), [])
  const closeCommand = useCallback(() => setIsOpen(false), [])
  const toggleCommand = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <CommandContext.Provider value={{ isOpen, openCommand, closeCommand, toggleCommand }}>
      {children}
    </CommandContext.Provider>
  )
}

export function useCommand() {
  const ctx = useContext(CommandContext)
  if (!ctx) throw new Error("useCommand must be used within CommandProvider")
  return ctx
}
