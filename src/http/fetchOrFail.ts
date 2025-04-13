import { Exception } from "../errorHandling/exceptions/Exception"

export type FetchResponse<T = any> = {
  httpStatus: number
  data: T
  headers: Record<string, string>
}
/**
 * Same as fetchOrFailRaw but returns the body as either json or text depending on the content type.
 * @param input
 * @param init
 * @returns
 */
export async function fetchOrFail(input: RequestInfo, init?: RequestInit, nameOfService?: string) {
  const response = await fetchOrFailRaw(input, init, nameOfService)
  const contentType = response.headers.get("Content-Type")
  if (contentType && contentType.includes("application/json")) {
    return await response.json()
  } else {
    return await response.text()
  }
}

/**
 * A simple wrapper around the built-in fetch function with convenient error handling
 * using the Exception error class.
 * @param input
 * @param init
 * @returns
 */
export async function fetchOrFailRaw(
  input: RequestInfo,
  init: RequestInit,
  serviceName?: string
): Promise<ReturnType<typeof fetch>> {
  const response = await fetch(input, init)
  if (!response.ok) {
    const errorBody = await response.text()
    // mask Authorization header, but only if it was present
    const myinit = (init?.headers as any)["Authorization"]
      ? { ...init, headers: { ...init?.headers, Authorization: "****" } }
      : init
    throw new Exception(response.status, serviceName ? `${serviceName}Error` : "OutboundHttpCallFailed")
      .setDebugData({
        errorBody,
        url: input,
        ...myinit,
        statusText: response.statusText,
      })
      .setContextData({ serviceName: serviceName })
  }
  return response
}

async function fetchOrFailRawClean<T = any>(
  input: RequestInfo,
  init: RequestInit,
  serviceName?: string
): Promise<FetchResponse<T>> {
  const response = await fetchOrFailRaw(input, init, serviceName)
  const contentType = response.headers.get("Content-Type")
  const responseBody =
    contentType && contentType.includes("application/json") ? await response.json() : await response.text()
  return {
    httpStatus: response.status,
    data: responseBody,
    headers: response.headers ? headersToObject(response.headers) : {},
  }
}
/**
 * Provides even more convenience by allowing you to specify the service name and the url in a single object.
 * Supports this syntax:
 * ApiCall("myService", authToken).get("/api/v1/endpoint")
 * It should set Content-Type to application/json by default and take service name and auth token as a parameter for the constructor.
 * @param serviceName
 * @returns
 */
export const ApiCall = (serviceName: string, authorizationHeader?: string, contentTypeHeader?: string) => {
  const headers = {
    "Content-Type": contentTypeHeader ?? "application/json",
    Authorization: authorizationHeader,
  }
  // remove Authorization header if it is not set so we are sure there are not weird side-effects of including the header
  if (!authorizationHeader) {
    delete headers["Authorization"]
  }
  return {
    GET: async <T = any>(url: string, extraHeaders?: HeadersInit) => {
      const response = await fetchOrFailRawClean<T>(
        url,
        { method: "GET", headers: { ...headers, ...extraHeaders } },
        serviceName
      )
      return response
    },
    POST: async <T = any>(url: string, body: any, extraHeaders?: HeadersInit) => {
      const response = await fetchOrFailRawClean<T>(
        url,
        { method: "POST", body: stringify(body), headers: { ...headers, ...extraHeaders } },
        serviceName
      )
      return response
    },
    PUT: async <T = any>(url: string, body: any, extraHeaders?: HeadersInit) => {
      const response = await fetchOrFailRawClean<T>(
        url,
        { method: "PUT", body: stringify(body), headers: { ...headers, ...extraHeaders } },
        serviceName
      )
      return response
    },
    DELETE: async <T = any>(url: string, body?: any, extraHeaders?: HeadersInit) => {
      const response = await fetchOrFailRawClean<T>(
        url,
        { method: "DELETE", body: stringify(body), headers: { ...headers, ...extraHeaders } },
        serviceName
      )
      return response
    },
    PATCH: async <T = any>(url: string, body: any, extraHeaders?: HeadersInit) => {
      const response = await fetchOrFailRawClean<T>(
        url,
        { method: "PATCH", body: stringify(body), headers: { ...headers, ...extraHeaders } },
        serviceName
      )
      return response
    },
    HEAD: async (url: string, extraHeaders?: HeadersInit) => {
      const response = await fetchOrFailRawClean(
        url,
        { method: "HEAD", headers: { ...headers, ...extraHeaders } },
        serviceName
      )
      return response
    },
    OPTIONS: async (url: string, extraHeaders?: HeadersInit) => {
      const response = await fetchOrFailRawClean(
        url,
        { method: "OPTIONS", headers: { ...headers, ...extraHeaders } },
        serviceName
      )
      return response
    },
  }
}
function stringify(body: any): BodyInit {
  if (typeof body === "string") return body as BodyInit
  if (body === null || body === undefined) return undefined
  else return JSON.stringify(body)
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}
