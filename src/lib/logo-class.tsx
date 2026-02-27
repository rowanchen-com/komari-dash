import type { SVGProps } from "react"

// Extract platform identifier from full OS string (e.g. "Ubuntu 22.04.3 LTS" -> "ubuntu")
function extractPlatform(os: string): string {
  if (!os) return ""
  const lower = os.toLowerCase()
  // Check for known platforms in the OS string
  const platforms = [
    "almalinux", "alpine", "aosc", "archlinux", "archlabs", "artix",
    "budgie", "centos", "coreos", "debian", "deepin", "devuan",
    "docker", "elementary", "fedora", "freebsd", "gentoo",
    "illumos", "kali", "linuxmint", "mageia", "mandriva", "manjaro",
    "nixos", "openbsd", "opensuse", "pop-os", "pop!_os",
    "raspberry", "redhat", "red hat", "rocky", "sabayon",
    "slackware", "solus", "ubuntu", "void", "zorin",
    "openwrt", "immortalwrt", "darwin", "macos", "windows", "amazon",
  ]
  for (const p of platforms) {
    if (lower.includes(p)) return p
  }
  if (lower.includes("arch")) return "arch"
  if (lower.includes("linux")) return "linux"
  return lower.split(/\s+/)[0] || ""
}

export function GetFontLogoClass(os: string): string {
  const platform = extractPlatform(os)
  const knownClasses = [
    "almalinux", "alpine", "aosc", "apple", "archlinux", "archlabs", "artix",
    "budgie", "centos", "coreos", "debian", "deepin", "devuan",
    "docker", "elementary", "fedora", "ferris", "flathub", "freebsd", "gentoo",
    "gnu-guix", "illumos", "kali-linux", "linuxmint", "mageia", "mandriva", "manjaro",
    "nixos", "openbsd", "opensuse", "pop-os", "raspberry-pi",
    "redhat", "rocky-linux", "sabayon", "slackware", "snappy", "solus",
    "tux", "ubuntu", "void", "zorin",
  ]
  if (knownClasses.includes(platform)) return platform
  if (platform === "darwin" || platform === "macos") return "apple"
  if (["openwrt", "linux", "immortalwrt"].includes(platform)) return "tux"
  if (platform === "amazon" || platform === "red hat" || platform === "redhat") return "redhat"
  if (platform === "arch") return "archlinux"
  if (platform === "kali") return "kali-linux"
  if (platform === "rocky") return "rocky-linux"
  if (platform === "raspberry") return "raspberry-pi"
  if (platform === "pop!_os" || platform === "pop-os") return "pop-os"
  if (platform.includes("opensuse")) return "opensuse"
  return "tux"
}

export function GetOsName(os: string): string {
  const platform = extractPlatform(os)
  const nameMap: Record<string, string> = {
    darwin: "macOS", macos: "macOS",
    openwrt: "Linux", linux: "Linux", immortalwrt: "Linux",
    amazon: "Redhat", "red hat": "Redhat", redhat: "Redhat",
    arch: "Archlinux",
  }
  if (nameMap[platform]) return nameMap[platform]
  if (platform.includes("opensuse")) return "Opensuse"
  // Return capitalized short platform name (matching original behavior)
  if (platform) return platform.charAt(0).toUpperCase() + platform.slice(1)
  return "Linux"
}

export function IsWindows(os: string): boolean {
  return os.toLowerCase().includes("windows")
}

export function MageMicrosoftWindows(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <title>Mage Microsoft Windows</title>
      <path
        fill="currentColor"
        d="M2.75 7.189V2.865c0-.102 0-.115.115-.115h8.622c.128 0 .14 0 .14.128V11.5c0 .128 0 .128-.14.128H2.865c-.102 0-.115 0-.115-.116zM7.189 21.25H2.865c-.102 0-.115 0-.115-.116V12.59c0-.128 0-.128.128-.128h8.635c.102 0 .115 0 .115.115v8.57c0 .09 0 .103-.116.103zM21.25 7.189v4.31c0 .116 0 .116-.116.116h-8.557c-.102 0-.128 0-.128-.115V2.865c0-.09 0-.102.115-.102h8.48c.206 0 .206 0 .206.205zm-8.763 9.661v-4.273c0-.09 0-.115.103-.09h8.621c.026 0 0 .09 0 .142v8.518a.06.06 0 0 1-.017.06a.06.06 0 0 1-.06.017H12.54s-.09 0-.077-.09V16.85z"
      />
    </svg>
  )
}
