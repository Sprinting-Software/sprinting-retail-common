import { Test, TestingModule } from "@nestjs/testing"
import { SeederService, SeederServiceParams } from "../SeederService"
import { LoggerService } from "../../logger/LoggerService"

describe("SeederService", () => {
  let service: SeederService
  let loggerService: LoggerService
  let mockDbConnection

  const loggerServiceMock = {
    event: jest.fn(),
    logError: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    mockDbConnection = {
      query: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        {
          provide: LoggerService,
          useValue: loggerServiceMock,
        },
        {
          provide: "DbConnection", // replace with appropriate token
          useValue: mockDbConnection,
        },
      ],
    }).compile()

    service = module.get<SeederService>(SeederService)
    loggerService = module.get<LoggerService>(LoggerService)
  })

  it("should seed the table successfully", async () => {
    const params: SeederServiceParams = {
      systemName: "testSystem",
      envName: "testEnv",
      jsonData: [
        { id: 1, name: "Test1" },
        { id: 2, name: "Test2" },
      ],
      dbConnection: mockDbConnection,
      tableName: "testTable",
      primaryKeys: ["id"],
      dryRun: false,
    }
    jest.spyOn(mockDbConnection, "query").mockImplementation(async () => true)

    await service.seedTable(params)
    expect(loggerService.event).toHaveBeenCalledTimes(params.jsonData.length)
  })

  it("should rollback if error happens during seeding", async () => {
    const params: SeederServiceParams = {
      systemName: "testSystem",
      envName: "testEnv",
      jsonData: [
        { id: 1, name: "Test1" },
        { id: 2, name: "Test2" },
      ],
      dbConnection: mockDbConnection,
      tableName: "testTable",
      primaryKeys: ["id"],
      dryRun: false,
    }
    jest.spyOn(mockDbConnection, "query").mockImplementationOnce(() => {
      throw new Error("An error occurred")
    })

    await service.seedTable(params)
    expect(loggerService.logError).toHaveBeenCalled()
  })
})
