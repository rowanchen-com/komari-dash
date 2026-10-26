import { afterEach, describe, expect, it, vi } from "vitest"
import { QueryCache } from "./query-cache"

afterEach(() => vi.useRealTimers())

describe("bounded memory query cache", () => {
  it("does not deliver a queued cached response after a permission-related clear", async () => {
    const cache = new QueryCache<number[]>(1000, 2, () => true)
    await cache.load("a", async () => [1])
    const cached = cache.load("a", async () => [2])
    cache.clear()
    await expect(cached).rejects.toMatchObject({ name: "AbortError" })
    expect(cache.peek("a")).toBeUndefined()
  })
  it("reuses a fresh response, isolates keys and expires without extending age on updates", async () => {
    vi.useFakeTimers()
    const cache = new QueryCache<number[]>(1000, 2, (value) => value.length > 0)
    const load = vi.fn(async () => [1])
    await cache.load("a", load)
    await cache.load("a", load)
    expect(load).toHaveBeenCalledTimes(1)
    await cache.load("b", load)
    expect(load).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(500)
    cache.update("a", [2])
    expect(cache.peek("a")).toEqual([2])
    vi.advanceTimersByTime(501)
    expect(cache.peek("a")).toBeUndefined()
  })

  it("shares concurrent requests and keeps the remaining consumer alive when one cancels", async () => {
    const cache = new QueryCache<number[]>(1000, 2, () => true)
    let resolve!: (value: number[]) => void
    let sharedSignal!: AbortSignal
    const load = vi.fn((signal: AbortSignal) => {
      sharedSignal = signal
      return new Promise<number[]>((done) => { resolve = done })
    })
    const controller = new AbortController()
    const first = cache.load("a", load, controller.signal)
    const second = cache.load("a", load)
    const cancelled = expect(first).rejects.toMatchObject({ name: "AbortError" })
    await Promise.resolve()
    controller.abort()
    await cancelled
    expect(sharedSignal.aborted).toBe(false)
    resolve([1])
    expect(await second).toEqual([1])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it("cancels unused requests, never stores their results and permits a new consumer", async () => {
    const cache = new QueryCache<number[]>(1000, 2, () => true)
    let resolve!: (value: number[]) => void
    const controller = new AbortController()
    const first = cache.load("a", () => new Promise<number[]>((done) => { resolve = done }), controller.signal)
    const cancelled = expect(first).rejects.toMatchObject({ name: "AbortError" })
    await Promise.resolve()
    controller.abort()
    await cancelled
    expect(await cache.load("a", async () => [2])).toEqual([2])
    resolve([1])
    await Promise.resolve()
    expect(cache.peek("a")).toEqual([2])
  })

  it("evicts least recently used entries and does not persist empty responses or failures", async () => {
    const cache = new QueryCache<number[]>(1000, 2, (value) => value.length > 0)
    await cache.load("a", async () => [1])
    await cache.load("b", async () => [2])
    cache.peek("a")
    await cache.load("c", async () => [3])
    expect(cache.peek("b")).toBeUndefined()
    await expect(cache.load("failed", async () => { throw new Error("Offline") })).rejects.toThrow("Offline")
    expect(cache.peek("failed")).toBeUndefined()
    await cache.load("a", async () => [], undefined, true)
    expect(cache.peek("a")).toBeUndefined()
  })

  it("clears cached data and prevents a pending old result from repopulating it", async () => {
    const cache = new QueryCache<number[]>(1000, 2, () => true)
    await cache.load("a", async () => [1])
    let resolve!: (value: number[]) => void
    const pending = cache.load("b", () => new Promise<number[]>((done) => { resolve = done }))
    const aborted = expect(pending).rejects.toMatchObject({ name: "AbortError" })
    await Promise.resolve()
    cache.clear()
    resolve([2])
    await aborted
    expect(cache.peek("a")).toBeUndefined()
    expect(cache.peek("b")).toBeUndefined()
  })
})
