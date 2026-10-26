export class RpcError extends Error {
  constructor(message: string, readonly details: { status?: number; code?: number; retryAfterMs?: number; timeout?: boolean } = {}) {
    super(message)
    this.name = "RpcError"
  }
}

export function isAuthorizationError(error: unknown): boolean {
  return error instanceof RpcError && (
    error.details.status === 401 || error.details.status === 403 ||
    error.details.code === -32040 || error.details.code === -32041
  )
}

export function getRetryDelay(error: unknown, failures: number, baseMs = 2000): number | null {
  if (isAuthorizationError(error) || (error instanceof Error && error.name === "AbortError")) return null
  const transient = error instanceof TypeError || (error instanceof RpcError && (
    error.details.timeout || error.details.status === 408 || error.details.status === 429 ||
    (error.details.status !== undefined && error.details.status >= 500) ||
    [-32603, -32011, -32021, -32051].includes(error.details.code ?? 0)
  ))
  if (!transient) return null
  const backoff = Math.min(30_000, baseMs * 2 ** Math.min(4, Math.max(0, failures - 1)))
  return Math.max(backoff, error instanceof RpcError ? error.details.retryAfterMs ?? 0 : 0)
}

interface JsonRpcOptions {
  signal?: AbortSignal
  timeout?: number
}

let nextRequestId = 0
let rateLimitedUntil = 0

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseRpcResponse<TResult>(value: unknown): TResult {
  if (!isRecord(value) || value.jsonrpc !== "2.0") {
    throw new RpcError("Invalid RPC2 response")
  }

  if (isRecord(value.error)) {
    const error = value.error
    const message = typeof error.message === "string" ? error.message : "RPC2 request failed"
    const code = typeof error.code === "number" ? ` (${error.code})` : ""
    throw new RpcError(`${message}${code}`, { code: typeof error.code === "number" ? error.code : undefined })
  }

  if (!("result" in value)) {
    throw new RpcError("RPC2 response is missing a result")
  }

  return value.result as TResult
}

export async function rpcCall<TParams, TResult>(
  method: string,
  params?: TParams,
  options: JsonRpcOptions = {},
): Promise<TResult> {
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError")
  const rateLimitRemaining = rateLimitedUntil - Date.now()
  if (rateLimitRemaining > 0) {
    throw new RpcError("RPC2 request delayed (HTTP 429)", { status: 429, retryAfterMs: rateLimitRemaining })
  }
  rateLimitedUntil = 0
  const controller = new AbortController()
  const abort = () => controller.abort()
  let timedOut = false
  const timeout = globalThis.setTimeout(() => { timedOut = true; abort() }, options.timeout ?? 15000)
  if (options.signal?.aborted) {
    controller.abort()
  } else {
    options.signal?.addEventListener("abort", abort, { once: true })
  }

  try {
    const body: Record<string, unknown> = {
      jsonrpc: "2.0",
      id: ++nextRequestId,
      method,
    }
    if (params !== undefined) body.params = params

    const response = await fetch("/api/rpc2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      signal: controller.signal,
    })

    if (!response.ok) {
      const retryAfter = response.headers.get("Retry-After")
      const seconds = retryAfter === null ? NaN : Number(retryAfter)
      const retryAfterMs = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : Math.max(0, Date.parse(retryAfter ?? "") - Date.now())
      if (response.status === 429 && Number.isFinite(retryAfterMs)) {
        rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + retryAfterMs)
      }
      throw new RpcError(`RPC2 request failed (HTTP ${response.status})`, {
        status: response.status, retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
      })
    }

    return parseRpcResponse<TResult>(await response.json())
  } catch (error) {
    if (timedOut && !options.signal?.aborted) throw new RpcError("RPC2 request timed out", { timeout: true })
    if (error instanceof SyntaxError) throw new RpcError("Invalid RPC2 JSON response")
    throw error
  } finally {
    globalThis.clearTimeout(timeout)
    options.signal?.removeEventListener("abort", abort)
  }
}
