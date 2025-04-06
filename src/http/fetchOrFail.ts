import { Exception } from "../errorHandling/exceptions/Exception"

/**
 * A simple wrapper around the built-in fetch function with convenient error handling
 * using the Exception error class.
 * @param input
 * @param init
 * @returns
 */
export async function fetchOrFail(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init)

  if (!response.ok) {
    const errorBody = await response.text()
    // mask Authorization header, but only if it was present
    const myinit = (init?.headers as any)["Authorization"]
      ? { ...init, headers: { ...init?.headers, Authorization: "****" } }
      : init
    throw new Exception(response.status, "OutboundHttpCallFailed", undefined, {
      statusText: response.statusText,
      errorBody,
      url: input,
      ...myinit,
    })
  }
  const contentType = response.headers.get("Content-Type")
  if (contentType && contentType.includes("application/json")) {
    return response.json()
  } else {
    return response.text()
  }
}
