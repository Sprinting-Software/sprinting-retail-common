export interface EnvironmentConfig {
  isProduction: boolean
  envPrefix: string
}

/**
 * @deprecated Inject via LibConfig instead of relying on this convention.
 * @returns
 */
export function isProduction() {
  // We use the convention that all variations of p-, p{number}- and production are considered production environments
  return process.env.NODE_ENV && process.env.NODE_ENV.charAt(0) === "p"
}
