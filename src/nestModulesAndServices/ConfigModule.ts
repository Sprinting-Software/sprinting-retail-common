import { Module } from "@nestjs/common"
import { CommonConfigSingleton } from "../config/CommonConfigSingleton";
import { CommonConfigService } from "../config/CommonConfigService";

@Module({
  imports: [],
  providers: [
    {
      provide: CommonConfigService,
      useFactory: () => {
        return new CommonConfigService(CommonConfigSingleton.GetConfig())
      },
      inject: [],
    },
  ],
  exports: [CommonConfigService],
})
export class ConfigModule {}
