import { useEffect, useState } from "react"
import type { KomariPublicInfo } from "@/types/komari"
import { fetchPublicInfo } from "@/lib/komari-rpc"

let cachedInfo: KomariPublicInfo | null = null
let fetchPromise: Promise<KomariPublicInfo | null> | null = null

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
        return null
      })
    }
    fetchPromise.then((data) => {
      if (data) setInfo(data)
    })
  }, [])

  return { info }
}
