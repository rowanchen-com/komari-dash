import { useEffect, useState } from "react"
import type { KomariPublicInfo } from "@/types/komari"
import { fetchPublicInfo } from "@/lib/api"

let cachedInfo: KomariPublicInfo | null = null
let fetchPromise: Promise<KomariPublicInfo> | null = null

export function usePublicInfo() {
  const [info, setInfo] = useState<KomariPublicInfo | null>(cachedInfo)

  useEffect(() => {
    if (cachedInfo) {
      setInfo(cachedInfo)
      return
    }
    if (!fetchPromise) {
      fetchPromise = fetchPublicInfo().then((data) => {
        cachedInfo = data
        return data
      }).catch(() => {
        fetchPromise = null
        return null as any
      })
    }
    fetchPromise.then((data) => {
      if (data) setInfo(data)
    })
  }, [])

  return { info }
}
