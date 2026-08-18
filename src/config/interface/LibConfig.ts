import { PrincipalName } from "../../baseData/PrincipalName"

export const ElkVersion = {
  V7: "v7",
  V9: "v9",
} as const
export type ElkVersion = (typeof ElkVersion)[keyof typeof ElkVersion]

export type ElkV7Config = {
  elkVersion?: typeof ElkVersion.V7
  errorTruncationLimit?: number
  elkRestApi?: {
    useForEvents: boolean
    useForErrors: boolean
    endpoint: string
    apiKey: string
    enableTcpSender: boolean
  }
  elkLogstash: {
    isUDPEnabled: boolean
    host: string
    port: number
  }
}

export type ElkV9BulkConfig = {
  endpoint: string
  apiKey: string
  /**
   * @deprecated No longer used to select the target index. ElkV9LoggerService now computes a
   * separate, weekly-rotating index per log type (event/error/log) from the surrounding
   * LibConfig's `env`/`serviceName` instead. Kept optional so existing configs that still set
   * it don't need to change.
   */
  dataStream?: string
  maxBatchSize?: number
  flushIntervalMs?: number
  maxRetries?: number
  maxBufferSize?: number
}

export type ElkV9Config = {
  elkVersion: typeof ElkVersion.V9
  elkRestApi: ElkV9BulkConfig
  errorTruncationLimit?: number
}

/**
 * This configuration is used to configure the instantiation of this library
 */
export interface BaseLibConfig {
  env: string
  logLevel?: string
  enableConsoleLogs?: boolean
  isProdZone?: boolean
  serviceName: PrincipalName
  envTags?: string
  /**
   * Set to true if you don't want to set up the global process handlers for uncaught exceptions and unhandled rejections.
   * This is useful during testing where other libraries may set up their own handlers.
   */
  skipGlobalProcessHandlers?: boolean
  /**
   * When true, the human-readable error `description` is included as `message` in the HTTP
   * response body for general (non-security) errors.
   *
   * Defaults to false so that internal error descriptions are never leaked to clients unless a
   * service explicitly opts in. Setting this to true reproduces the behaviour of the legacy
   * `-withErrorMessage` library fork (as used by BifrostNest).
   */
  includeErrorMessageInHttpResponse?: boolean
}

export type LibConfig = BaseLibConfig & (ElkV7Config | ElkV9Config)
