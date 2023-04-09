import {IConfig} from "config"

/**
 * An interface for a configuration provider. It is compatible with the NestJS ConfigServic and with the built-in NodeJS config module.
 */
// eslint-disable-next-line prettier/prettier
export interface IConfigProvider {
  get<T>(setting: string): T

  has(setting: string): boolean
}
