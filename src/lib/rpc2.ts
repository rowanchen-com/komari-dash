interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

interface JsonRpcOptions {
  signal?: AbortSignal
  timeout?: number
}

let nextRequestId = 0

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseRpcResponse<TResult>(value: unknown): TResult {
  if (!isRecord(value) || value.jsonrpc !== "2.0") {
    throw new Error("Invalid RPC2 response")
  }

  if (isRecord(value.error)) {
    const error = value.error as Partial<JsonRpcError>
    const message = typeof error.message === "string" ? error.message : "RPC2 request failed"
    const code = typeof error.code === "number" ? ` (${error.code})` : ""
    throw new Error(`${message}${code}`)
  }

  if (!("result" in value)) {
    throw new Error("RPC2 response is missing a result")
  }

  return value.result as TResult
}

export async function rpcCall<TParams, TResult>(
  method: string,
  params?: TParams,
  options: JsonRpcOptions = {},
): Promise<TResult> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timeout = globalThis.setTimeout(abort, options.timeout ?? 15000)
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
      throw new Error(`RPC2 request failed (HTTP ${response.status})`)
    }

    return parseRpcResponse<TResult>(await response.json())
  } finally {
    globalThis.clearTimeout(timeout)
    options.signal?.removeEventListener("abort", abort)
  }
}
