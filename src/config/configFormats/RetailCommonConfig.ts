import { ElkConfig } from "./ElkConfig";

/**
 * The new configuration format recommended for new services.
 */
export interface RetailCommonConfig {
  envPrefix: string;
  elkConfig: ElkConfig;
}