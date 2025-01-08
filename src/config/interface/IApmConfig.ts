import { AgentConfigOptions } from "elastic-apm-node"

/**
 * @deprecated Should be phased out and instead we should just rely on AgentConfigOptions
 */
export type IApmConfig = AgentConfigOptions & {
  enableLogs: boolean
}
