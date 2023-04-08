import { LoggerConfig, LoggerService } from "../logger/LoggerService"
import { ConfigMapper } from "../config/ConfigMapper"
import { ApmHelper } from "../apm/ApmHelper"
import { Module } from "@nestjs/common"
import { IConfigRoot } from "../config/IConfigRoot"

@Module({
  imports: [],
  providers: [
    {
      provide: LoggerService,
      useFactory: (config: IConfigRoot) => {
        const loggerConfig: LoggerConfig = ConfigMapper.mapToLoggerConfig(config)
        return new LoggerService(loggerConfig)
      },
    },
    {
      provide: ApmHelper,
      useFactory: (config: IConfigRoot) => {
        const apmConfig = ConfigMapper.mapToApmConfig(config)
        return new ApmHelper(apmConfig)
      },
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
