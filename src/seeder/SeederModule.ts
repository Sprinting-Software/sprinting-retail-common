import { Module } from "@nestjs/common"
import { SeederService } from "./SeederService"
import { LoggerModule } from "../logger/LoggerModule"

@Module({
  providers: [SeederService],
  exports: [SeederService],
  imports: [LoggerModule],
})
export class SeederModule {}
