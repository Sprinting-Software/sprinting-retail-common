import { Module } from "@nestjs/common"
import { SeederService } from "./SeederService"

@Module({
  imports: [],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
