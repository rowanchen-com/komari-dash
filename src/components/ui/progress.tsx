import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  className?: string
  indicatorClassName?: string
  "aria-label"?: string
  "aria-labelledby"?: string
}

export function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} {...props}>
      <div
        className={cn("h-full transition-all", indicatorClassName || "bg-primary")}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
