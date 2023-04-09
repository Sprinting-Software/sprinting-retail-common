import { ElkConfigLegacy } from "./ElkConfigLegacy";


/**
 * The old configuration format recommended used on older projects
 */
export interface RetailCommonConfigLegacy {
  envPrefix: string
  elkConfig: ElkConfigLegacy
}

