import { afterEach, describe, expect, it, vi } from "vitest"
import { getRetryDelay, isAuthorizationError, parseRpcResponse, RpcError, rpcCall } from "./rpc2"

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe("official RPC failure handling", () => {
  it.each([-32040, -32041])("does not automatically retry authorization code %s", (code) => {
    let error: unknown
    try { parseRpcResponse({ jsonrpc: "2.0", error: { code, message: "Denied" } }) } catch (caught) { error = caught }
    expect(isAuthorizationError(error)).toBe(true)
    expect(getRetryDelay(error, 1)).toBeNull()
  })

  it.each([-32700, -32600, -32601, -32602, -32044, -32050])("does not repeatedly send a permanent RPC failure %s", (code) => {
    expect(getRetryDelay(new RpcError("Permanent", { code }), 1)).toBeNull()
  })

  it("backs off transient errors, honors Retry-After and distinguishes cancellation", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    expect(getRetryDelay(new TypeError("Offline"), 1)).toBe(2000)
    expect(getRetryDelay(new RpcError("Busy", { code: -32051 }), 3)).toBe(8000)
    expect(getRetryDelay(new TypeError("Offline"), 10)).toBe(30_000)
    expect(getRetryDelay(new DOMException("Aborted", "AbortError"), 1)).toBeNull()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429, headers: { "Retry-After": "90" } })))
    let error: unknown
    try { await rpcCall("common:getNodes") } catch (caught) { error = caught }
    expect(getRetryDelay(error, 1)).toBe(90_000)
  })

  it("does not bypass the server's Retry-After when focus or another view sends a new request", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    const mock = vi.fn().mockImplementation(async () => new Response(null, { status: 429, headers: { "Retry-After": "60" } }))
    vi.stubGlobal("fetch", mock)
    await expect(rpcCall("common:getNodes")).rejects.toThrow("HTTP 429")
    await expect(rpcCall("common:getNodesLatestStatus")).rejects.toThrow("HTTP 429")
    expect(mock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_001)
    mock.mockImplementation(async () => new Response(JSON.stringify({ jsonrpc: "2.0", result: {} })))
    await expect(rpcCall("common:getNodes")).resolves.toEqual({})
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it("retries its own timeout but not a caller's cancellation", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
    })))
    const request = rpcCall("common:getNodes", undefined, { timeout: 10 })
    const failed = expect(request).rejects.toMatchObject({ details: { timeout: true } })
    await vi.advanceTimersByTimeAsync(11)
    await failed
    const controller = new AbortController()
    const cancelled = rpcCall("common:getNodes", undefined, { signal: controller.signal })
    const aborted = expect(cancelled).rejects.toMatchObject({ name: "AbortError" })
    controller.abort()
    await aborted
  })

  it("does not keep retrying malformed response JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json")))
    await expect(rpcCall("common:getNodes")).rejects.toThrow("Invalid RPC2 JSON response")
    expect(getRetryDelay(new RpcError("Invalid RPC2 JSON response"), 1)).toBeNull()
  })
})
