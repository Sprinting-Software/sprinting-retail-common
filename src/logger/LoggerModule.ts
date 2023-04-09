import { LoggerService } from "./LoggerService"
import { ConfigMapper } from "../config/legacyInterfaces/ConfigMapper"
import { ApmHelper } from "../apm/ApmHelper"
import { Module } from "@nestjs/common"
import { ConfigModule } from "../config/ConfigModule"
import { LoggerConfig } from "./LoggerConfig"
import { RetailCommonConfigProvider } from "../config/RetailCommonConfigProvider"

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LoggerService,
      useFactory: (provider: RetailCommonConfigProvider) => {
        const loggerConfig: LoggerConfig = ConfigMapper.mapToLoggerConfig(provider.config)
        return new LoggerService(loggerConfig)
      },
      inject: [RetailCommonConfigProvider],
    },
    {
      provide: ApmHelper,
      useFactory: (provider: RetailCommonConfigProvider) => {
        return new ApmHelper(provider.config.elk.apm)
      },
      inject: [RetailCommonConfigProvider],
    },
  ],
  exports: [LoggerService, ApmHelper],
})
export class LoggerModule {}
