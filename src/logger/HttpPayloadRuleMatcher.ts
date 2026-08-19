import { HttpPayloadDirection, HttpPayloadLogRule } from "../config/interface/LibConfig"

export type HttpPayloadMatchInput = {
  direction: HttpPayloadDirection
  method: string
  domain: string
  path: string
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")
  return new RegExp(`^${escaped}$`, "i")
}

/**
 * Returns the first rule matching the given HTTP call, or undefined if none match
 * (meaning the call should not be logged).
 */
export function matchHttpPayloadRule(
  rules: HttpPayloadLogRule[] | undefined,
  input: HttpPayloadMatchInput
): HttpPayloadLogRule | undefined {
  if (!rules?.length) return undefined
  return rules.find((rule) => {
    if (rule.direction !== input.direction) return false
    if (rule.method && rule.method !== "*" && rule.method.toLowerCase() !== input.method.toLowerCase()) return false
    if (!globToRegExp(rule.domain).test(input.domain)) return false
    if (!globToRegExp(rule.path).test(input.path)) return false
    return true
  })
}
