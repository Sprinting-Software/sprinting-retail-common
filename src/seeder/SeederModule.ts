import { DynamicModule, Module } from "@nestjs/common"
import { SeederService } from "./SeederService"
import { LoggerService } from "../logger/LoggerService"
import { LoggerConfig } from "../logger/LoggerConfig"

@Module({})
export class SeederModule {
  static forRoot({ loggerConfig }: { loggerConfig: LoggerConfig }): DynamicModule {
    return {
      module: SeederModule,
      providers: [
        SeederService,
        {
          provide: LoggerService,
          useFactory() {
            return new LoggerService(loggerConfig)
          },
        },
      ],
      exports: [SeederService],
    }
  }
}
