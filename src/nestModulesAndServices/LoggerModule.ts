import { LoggerConfig, LoggerService } from "../logger/LoggerService"
import { ConfigMapper } from "../config/configFormats/ConfigMapper"
import { ApmHelper } from "../apm/ApmHelper"
import { Module } from "@nestjs/common"
import { ConfigModule } from "./ConfigModule";
import { CommonConfigService } from "../config/CommonConfigService";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LoggerService,
      useFactory: (config: CommonConfigService) => {
        const loggerConfig: LoggerConfig = ConfigMapper.mapToLoggerConfig(config)
        return new LoggerService(loggerConfig)
      },
      inject: [CommonConfigService],
    },
    {
      provide: ApmHelper,
      useFactory: (configProvider: CommonConfigService) => {
        const apmConfig = ConfigMapper.mapToApmConfig(configProvider)
        return new ApmHelper(apmConfig)
      },
      inject: [CommonConfigService],
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
