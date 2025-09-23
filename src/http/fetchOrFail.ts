import { Exception } from "../errorHandling/exceptions/Exception"
import { StringUtils } from "../helpers/StringUtils"
import { ApmHelper } from "../apm/ApmHelper"
import type { LoggerService2 } from "../logger/LoggerService2"

let __globalHttpLogger: LoggerService2 | undefined
export function setGlobalHttpLogger(logger?: LoggerService2) {
  __globalHttpLogger = logger
}

export type FetchResponse<T = any> = {
  httpStatus: number
  data: T
  headers: Record<string, string>
}

export type HttpLogOptions = {
  logger?: LoggerService2
  logSuccess?: boolean
  logFailure?: boolean
  logResponseBody?: boolean
  samplingRate?: number
  extraContext?: Record<string, any>
}
/**
 * Same as fetchOrFailRaw but returns the body as either json or text depending on the content type.
 * @param input
 * @param init
 * @returns
 */
export async function fetchOrFail(
  input: RequestInfo,
  init?: RequestInit,
  nameOfService?: string,
  logOptions?: HttpLogOptions
) {
  const started = Date.now()
  const method = (init?.method || "GET").toUpperCase()
  try {
    const response = await fetchOrFailRaw(input, init, nameOfService)
    const contentType = response.headers.get("Content-Type")
    const result =
      contentType && contentType.includes("application/json") ? await response.json() : await response.text()
    const loggerToUse = logOptions?.logger ?? __globalHttpLogger
    const sampled = logOptions?.samplingRate === undefined || Math.random() <= logOptions.samplingRate

    if (loggerToUse && sampled) {
      loggerToUse.event(
        __filename,
        "OutboundHttpCallSuccess",
        "OutboundHttp",
        {
          service: nameOfService,
          method,
          status: response.status,
          durationMs: Date.now() - started,
          ...logOptions?.extraContext,
          url: toUrlString(input),
        },
        {
          response: logOptions?.logResponseBody ? StringUtils.redactAndTruncateForLogging(result) : undefined,
        }
      )
    }
    return result
  } catch (error) {
    const loggerToUse = logOptions?.logger ?? __globalHttpLogger
    if (loggerToUse) {
      const ctx = {
        service: nameOfService,
        method,
        url: input,
        durationMs: Date.now() - started,
        ...logOptions?.extraContext,
      }
      loggerToUse.logError(error as Error, ctx)
    }
    throw error
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
  const method = (init?.method || "GET").toUpperCase()
  const urlStr = toUrlString(input)
  const { host, path } = parseUrlParts(urlStr)
  const agent = ApmHelper.Instance.getApmAgent()
  const span: any = agent?.startSpan(`HTTP ${method} ${host || "unknown"}`, "external", "http", "request")
  if (span) {
    try {
      span.setLabel?.("method", method)
      span.setServiceTarget?.("http", host)
      if (serviceName) span.setLabel?.("service", serviceName)
      span.setLabel?.("url_host", host || "")
      span.setLabel?.("url_full", urlStr)
      if (path) span.setLabel?.("url_path", StringUtils.truncate(path, 120))
      if (urlStr) span.setLabel?.("url_query", new URL(urlStr).search || "")
    } catch {}
  }

  const response = await fetch(input, init)
  if (!response.ok) {
    const errorBody = await response.text()
    // mask Authorization header, but only if it was present
    const myinit = (init?.headers as any)["Authorization"]
      ? { ...init, headers: { ...init?.headers, Authorization: "****" } }
      : init
    if (span) {
      try {
        span.setOutcome?.("failure")
        span.setLabel?.("status", response.status)
        span.setLabel?.("ok", false as any)
      } catch {}
      try {
        span.end?.()
      } catch {}
    }
    throw new Exception(response.status, serviceName ? `${serviceName}Error` : "OutboundHttpCallFailed")
      .setDebugData({
        errorBody,
        url: input,
        ...myinit,
        statusText: response.statusText,
      })
      .setContextData({ serviceName: serviceName })
  }
  if (span) {
    try {
      span.setOutcome?.("success")
      span.setLabel?.("status", response.status)
      span.setLabel?.("ok", true as any)
    } catch {}
    try {
      span.setLabel?.("labels", JSON.stringify(ApmHelper.getLabelsOfCurrentTransaction()))
      span.end?.()
    } catch {}
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
export const ApiCall = (
  serviceName: string,
  authorizationHeader?: string,
  contentTypeHeader?: string,
  options?: HttpLogOptions
) => {
  const headers = {
    "Content-Type": contentTypeHeader ?? "application/json",
    Authorization: authorizationHeader,
  }
  // remove Authorization header if it is not set so we are sure there are not weird side-effects of including the header
  if (!authorizationHeader) {
    delete headers["Authorization"]
  }
  const shouldSample = () => options?.samplingRate === undefined || Math.random() <= options.samplingRate
  const loggerToUse = options?.logger ?? __globalHttpLogger
  const logSuccess = !!(loggerToUse && shouldSample())
  const logFailure = !!loggerToUse
  const logResponseBody = options?.logResponseBody === true

  const doCall = async <T = any>(method: string, url: string, body?: any, extraHeaders?: HeadersInit) => {
    const started = Date.now()
    try {
      const response = await fetchOrFailRawClean<T>(
        url,
        { method, body: stringify(body), headers: { ...headers, ...extraHeaders } },
        serviceName
      )
      if (loggerToUse && logSuccess) {
        loggerToUse.event(
          __filename,
          "OutboundHttpCallSuccess",
          "OutboundHttp",
          {
            service: serviceName,
            method,
            status: response.httpStatus,
            durationMs: Date.now() - started,
            ...options?.extraContext,
          },
          { url, response: logResponseBody ? StringUtils.redactAndTruncateForLogging(response.data) : undefined }
        )
      }
      return response
    } catch (error) {
      if (loggerToUse && logFailure) {
        loggerToUse.logError(error as Error, {
          service: serviceName,
          method,
          url,
          durationMs: Date.now() - started,
          ...options?.extraContext,
        })
      }
      throw error
    }
  }
  return {
    GET: async <T = any>(url: string, extraHeaders?: HeadersInit) => doCall<T>("GET", url, undefined, extraHeaders),
    POST: async <T = any>(url: string, body: any, extraHeaders?: HeadersInit) =>
      doCall<T>("POST", url, body, extraHeaders),
    PUT: async <T = any>(url: string, body: any, extraHeaders?: HeadersInit) =>
      doCall<T>("PUT", url, body, extraHeaders),
    DELETE: async <T = any>(url: string, body?: any, extraHeaders?: HeadersInit) =>
      doCall<T>("DELETE", url, body, extraHeaders),
    PATCH: async <T = any>(url: string, body: any, extraHeaders?: HeadersInit) =>
      doCall<T>("PATCH", url, body, extraHeaders),
    HEAD: async (url: string, extraHeaders?: HeadersInit) => doCall("HEAD", url, undefined, extraHeaders),
    OPTIONS: async (url: string, extraHeaders?: HeadersInit) => doCall("OPTIONS", url, undefined, extraHeaders),
  }
}
function stringify(body: any): BodyInit {
  if (typeof body === "string") return body as BodyInit
  if (body === null || body === undefined) return undefined
  else return StringUtils.stringifySafe(body)
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

function toUrlString(input: RequestInfo): string {
  try {
    if (typeof input === "string") return input
    const anyInput: any = input as any
    if (anyInput && typeof anyInput.url === "string") return anyInput.url
  } catch {}
  return ""
}

function parseUrlParts(url: string): { host: string; path: string } {
  try {
    const u = new URL(url)
    return { host: u.host, path: u.pathname }
  } catch {
    return { host: "", path: "" }
  }
}
