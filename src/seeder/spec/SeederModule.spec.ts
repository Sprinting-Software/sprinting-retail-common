import { Test, TestingModule } from "@nestjs/testing"
import { SeederService } from "../SeederService"
import { LoggerService } from "../../logger/LoggerService"

describe("SeederService", () => {
  let seederService: SeederService
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let loggerService: LoggerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        {
          provide: LoggerService,
          useValue: {
            // You can mock methods here
            logError: jest.fn(),
            event: jest.fn(),
          },
        },
      ],
    }).compile()

    seederService = module.get<SeederService>(SeederService)
    loggerService = module.get<LoggerService>(LoggerService)
  })

  it("should be defined", () => {
    expect(seederService).toBeDefined()
  })
})
