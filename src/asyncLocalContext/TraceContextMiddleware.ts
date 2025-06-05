import { Injectable, NestMiddleware } from "@nestjs/common"
import { NextFunction, Request } from "express"
import { AsyncContext } from "./AsyncContext"
import { ClientTrace, RequestTrace } from "./types"
import { RawLogger } from "../logger/RawLogger"

@Injectable()
export class TraceContextMiddleware implements NestMiddleware {
  constructor(private readonly applicationContext: AsyncContext) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    try {
      const requestRoute = req.route?.path
      const requestRouteRoots = getRoots(requestRoute, 5, "requestRoute")
      const url: RequestTrace = {
        requestDomain: req.headers.host || "",
        requestUrl: `${req.protocol}://${req.headers.host || ""}${req.originalUrl}`,
        requestRouteRaw: req.originalUrl,
        requestRoute: requestRoute || "",
        ...requestRouteRoots,
      }
      this.applicationContext.initProperties(removeUndefinedFields(url), true)
    } catch (error) {
      RawLogger.error("Error in TraceContextMiddleware (Request)", error)
    }

    try {
      const clientRoute = req.headers["x-clientroute"]?.toString()
      const clientRouteRoots = getRoots(clientRoute, 5, "clientRoute")
      const client: ClientTrace = {
        clientTraceId: req.headers["x-clienttraceid"]?.toString(),
        clientInMemoryId: req.headers["x-clientinmemoryid"]?.toString(),
        clientLoginSessionId: req.headers["x-clientloginsessionid"]?.toString(),
        clientRoute,
        ...clientRouteRoots,
        clientRouteRaw: req.headers["x-clientrouteraw"]?.toString(),
        clientRouteFull: req.headers["x-clientroutefull"]?.toString(),
        clientDomain: req.headers["x-clientdomain"]?.toString(),
        clientAppVersion: req.headers["x-clientappversion"]?.toString(),
        clientAppCommitHash: req.headers["x-clientappcommithash"]?.toString(),
      }
      this.applicationContext.initProperties(removeUndefinedFields(client))
    } catch (error) {
      RawLogger.error("Error in TraceContextMiddleware (Client)", error)
    }

    next()
  }
}

function removeUndefinedFields(x: any): Record<string, any> {
  return Object.fromEntries(Object.entries(x).filter(([, value]) => value !== undefined && value !== null))
}

/**
 * Takes a string on the format a/b/c/d/e (or /a/b/c/d/e) and returns the first n roots.
 * For example, if n=3:
 *   getRoots("a/b/c/d", 3)  -> { level1: 'a',   level2: 'a/b',     level3: 'a/b/c' }
 *   getRoots("/a/b/c/d", 3) -> { level1: '/a',  level2: '/a/b',    level3: '/a/b/c' }
 *
 * @param route  the path string, with or without a leading slash
 * @param n      how many levels to return
 */
function getRoots(route: string, n: number, fieldName = "level"): Record<string, string> {
  if (!route) return {}

  // Remember if there was a leading slash
  const hasLeadingSlash = route.startsWith("/")

  // Remove all leading/trailing slashes, then split
  const clean = route.replace(/^\/+|\/+$/g, "")
  const parts = clean ? clean.split("/") : []

  const roots: Record<string, string> = {}
  for (let i = 0; i < n && i < parts.length; i++) {
    const level = i + 1
    const segment = parts.slice(0, level).join("/")
    // Only prefix slash if original route had one
    roots[`${fieldName}${level}`] = hasLeadingSlash ? `/${segment}` : segment
  }

  return roots
}
