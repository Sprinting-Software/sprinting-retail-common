/**
 * An interface for a configuration provider. It is compatible with the NestJS ConfigServic and with the built-in NodeJS config module.
 */
export interface IConfigProvider {
  get<T>(setting: string): T

  has(setting: string): boolean
}
