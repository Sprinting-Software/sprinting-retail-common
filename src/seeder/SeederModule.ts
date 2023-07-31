import { Module } from "@nestjs/common"
import { SeederService } from "./SeederService"
import { LoggerModule } from "../logger/LoggerModule"

@Module({
  imports: [LoggerModule],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
