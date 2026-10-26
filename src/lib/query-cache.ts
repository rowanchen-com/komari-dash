interface PendingQuery<T> {
  promise: Promise<T>
  controller: AbortController
  users: number
  generation: number
}

export class QueryCache<T> {
  private entries = new Map<string, { value: T; expires: number }>()
  private pending = new Map<string, PendingQuery<T>>()
  private generation = 0

  constructor(private ttlMs: number, private limit: number, private usable: (value: T) => boolean) {}

  peek(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry || entry.expires <= Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.value
  }

  update(key: string, value: T) {
    const entry = this.entries.get(key)
    if (entry && entry.expires > Date.now()) entry.value = value
  }

  clear() {
    this.generation++
    this.entries.clear()
    for (const query of this.pending.values()) query.controller.abort()
    this.pending.clear()
  }

  load(key: string, fetcher: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal, force = false): Promise<T> {
    if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"))
    const cached = force ? undefined : this.peek(key)
    if (cached !== undefined) {
      const generation = this.generation
      return Promise.resolve().then(() => {
        if (signal?.aborted || generation !== this.generation) throw new DOMException("Aborted", "AbortError")
        return cached
      })
    }

    let query = this.pending.get(key)
    if (!query || query.controller.signal.aborted) {
      const controller = new AbortController()
      query = { controller, users: 0, promise: undefined!, generation: this.generation }
      const current = query
      current.promise = Promise.resolve().then(() => fetcher(controller.signal)).then((value) => {
        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError")
        this.entries.delete(key)
        if (this.usable(value)) {
          this.entries.set(key, { value, expires: Date.now() + this.ttlMs })
          while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value!)
        }
        return value
      }).finally(() => {
        if (this.pending.get(key) === current) this.pending.delete(key)
      })
      this.pending.set(key, current)
    }

    // A cancelled view must not abort a shared request still used by another view.
    const current = query
    current.users++
    return new Promise<T>((resolve, reject) => {
      let released = false
      const release = () => {
        if (released) return false
        released = true
        signal?.removeEventListener("abort", cancel)
        if (--current.users === 0) current.controller.abort()
        return true
      }
      const cancel = () => {
        if (release()) reject(new DOMException("Aborted", "AbortError"))
      }
      signal?.addEventListener("abort", cancel, { once: true })
      current.promise.then(
        (value) => {
          const valid = current.generation === this.generation && !signal?.aborted
          if (release()) {
            if (valid) resolve(value)
            else reject(new DOMException("Aborted", "AbortError"))
          }
        },
        (error) => { if (release()) reject(error) },
      )
    })
  }
}
