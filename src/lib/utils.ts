import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ServerInfo } from "@/types/komari"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

export function formatSpeed(bytesPerSec: number): string {
  const mbps = bytesPerSec / 1024 / 1024
  if (mbps >= 1024) return `${(mbps / 1024).toFixed(2)} G/s`
  return `${mbps.toFixed(2)} M/s`
}

export function formatUptime(seconds: number, t?: (section: string, key: string) => string): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const daysLabel = t ? t("ServerDetail", "Days") : "Days"
  const hoursLabel = t ? t("ServerDetail", "Hours") : "Hours"
  if (days >= 1) return `${days} ${daysLabel} ${hours} ${hoursLabel}`
  return `${hours} ${hoursLabel}`
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  if (hours > 24) return `${Math.floor(hours / 24)}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

export function formatDateTime(date: Date): string {
  if (isNaN(date.getTime())) return "N/A"
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

export function getMemPercent(s: ServerInfo): number {
  if (!s.host.memTotal) return 0
  return (s.status.memUsed / s.host.memTotal) * 100
}

export function getDiskPercent(s: ServerInfo): number {
  if (!s.host.diskTotal) return 0
  return (s.status.diskUsed / s.host.diskTotal) * 100
}

export function getSwapPercent(s: ServerInfo): number {
  if (!s.host.swapTotal) return 0
  return (s.status.swapUsed / s.host.swapTotal) * 100
}

// Emoji flag to country code
const EMOJI_TO_CC: Record<string, string> = {
  "🇭🇰":"HK","🇨🇳":"CN","🇯🇵":"JP","🇸🇬":"SG","🇩🇪":"DE","🇳🇱":"NL","🇺🇸":"US",
  "🇬🇧":"GB","🇫🇷":"FR","🇰🇷":"KR","🇦🇺":"AU","🇨🇦":"CA","🇧🇷":"BR","🇮🇳":"IN",
  "🇷🇺":"RU","🇮🇹":"IT","🇪🇸":"ES","🇹🇼":"TW","🇲🇴":"MO","🇹🇭":"TH","🇲🇾":"MY",
  "🇻🇳":"VN","🇵🇭":"PH","🇮🇩":"ID","🇳🇴":"NO","🇸🇪":"SE","🇫🇮":"FI","🇩🇰":"DK",
  "🇨🇭":"CH","🇦🇹":"AT","🇧🇪":"BE","🇮🇪":"IE","🇵🇹":"PT","🇵🇱":"PL","🇨🇿":"CZ",
  "🇭🇺":"HU","🇬🇷":"GR","🇹🇷":"TR","🇺🇦":"UA","🇷🇴":"RO","🇧🇬":"BG","🇭🇷":"HR",
  "🇸🇮":"SI","🇸🇰":"SK","🇱🇹":"LT","🇱🇻":"LV","🇪🇪":"EE","🇮🇸":"IS","🇱🇺":"LU",
  "🇲🇹":"MT","🇨🇾":"CY",
}

export function isEmojiFlag(str: string): boolean {
  return /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(str)
}

export function emojiToCountryCode(emoji: string): string | null {
  if (!isEmojiFlag(emoji)) return emoji.toUpperCase()
  return EMOJI_TO_CC[emoji] || null
}

export function getCountryCode(region: string): string | null {
  if (!region) return null
  if (isEmojiFlag(region)) return EMOJI_TO_CC[region] || null
  return region.toUpperCase()
}

export function getThemeSetting<T>(settings: Record<string, unknown> | null | undefined, key: string, defaultValue: T): T {
  if (!settings || !(key in settings)) return defaultValue
  return settings[key] as T
}
