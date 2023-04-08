import { Module } from "@nestjs/common"
import { ConfigModule } from "./ConfigModule";
import { LoggerModule } from "./LoggerModule";

@Module({
  imports: [ConfigModule, LoggerModule],
  exports: [LoggerModule],
  controllers: [],
  providers: [],
})
export class CommonAppModule {}
