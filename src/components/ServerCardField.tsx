import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

type Field = "identity" | "cpu" | "memory" | "disk" | "upload" | "download" | "system" | "uptime" | "total-upload" | "total-download" | "transfer-upload" | "transfer-download"

export function ServerCardField({ uuid, name, as: Element = "div", className, style, children }: {
  uuid: string
  name: Field
  as?: "div" | "section"
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <Element
      className={cn("server-card-field", className)}
      data-server-field={name}
      style={{ ...style, viewTransitionName: `server-${uuid}-${name}` }}
    >
      {children}
    </Element>
  )
}
