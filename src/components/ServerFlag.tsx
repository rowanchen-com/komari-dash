import { cn, isEmojiFlag, emojiToCountryCode } from "@/lib/utils"

interface ServerFlagProps {
  region: string
  className?: string
}

export default function ServerFlag({ region, className }: ServerFlagProps) {
  if (!region) return null

  // If it's an emoji flag, convert to country code for flag-icons
  const code = isEmojiFlag(region) ? emojiToCountryCode(region) : region

  if (!code) {
    // Fallback: show the emoji directly
    return <span className={cn("text-[12px] text-muted-foreground", className)}>{region}</span>
  }

  return (
    <span
      className={cn(`fi fi-${code.toLowerCase()}`, "text-[12px] text-muted-foreground", className)}
    />
  )
}
