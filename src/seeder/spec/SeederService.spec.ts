import { Test, TestingModule } from "@nestjs/testing"
import { SeederService, SeedTableParams } from "../SeederService"
import { LoggerService } from "../../logger/LoggerService"
import { PrincipalEnum } from "../../baseData/PrincipalEnum"

describe("SeederService", () => {
  let service: SeederService
  let loggerService: LoggerService
  let mockDbConnection

  const loggerServiceMock = {
    event: jest.fn(),
    info: jest.fn(),
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

    // Mock private methods
    service["dryRun"] = jest.fn()
    service["resetQuery"] = jest.fn().mockReturnValue("delete query")
    service["upsertQuery"] = jest.fn().mockReturnValue("upsert query")
  })

  it("should seed the table successfully", async () => {
    const params: SeedTableParams = {
      systemName: PrincipalEnum.TestSystemName,
      envName: "testEnv",
      dbConnection: mockDbConnection,
      path: "",
      seed: {
        tableName: "testTable",
        primaryKeys: ["id"],
        data: [
          { id: 1, name: "Test1" },
          { id: 2, name: "Test2" },
        ],
      },
      dryRun: false,
    }
    jest.spyOn(mockDbConnection, "query").mockImplementation(async () => true)

    await service.seedItem(params)
    // expect(loggerService.event).toHaveBeenCalledTimes(params.seed.data.length)
    expect(loggerService.event).not.toHaveBeenCalled()
    expect(mockDbConnection.query).toHaveBeenCalledWith("BEGIN")
    expect(mockDbConnection.query).toHaveBeenCalledWith("upsert query")
    expect(mockDbConnection.query).toHaveBeenCalledWith("COMMIT")
  })

  it("should rollback if error happens during seeding", async () => {
    const params: SeedTableParams = {
      systemName: PrincipalEnum.TestSystemName,
      envName: "testEnv",
      dbConnection: mockDbConnection,
      path: "",
      seed: {
        tableName: "testTable",
        primaryKeys: ["id"],
        data: [
          { id: 1, name: "Test1" },
          { id: 2, name: "Test2" },
        ],
      },
      dryRun: false,
    }

    jest.spyOn(mockDbConnection, "query").mockImplementationOnce(() => {
      throw new Error("An error occurred")
    })

    try {
      await service.seedItem(params)
    } catch (error) {
      expect(loggerService.logError).toHaveBeenCalled()
      expect(mockDbConnection.query).toHaveBeenCalledWith("ROLLBACK")
    }
  })

  it("should call dryRun when dryRun is true", async () => {
    const params: SeedTableParams = {
      systemName: PrincipalEnum.TestSystemName,
      envName: "testEnv",
      dbConnection: mockDbConnection,
      path: "",
      seed: {
        tableName: "testTable",
        primaryKeys: ["id"],
        data: [],
      },
      dryRun: true,
    }

    await service.seedItem(params)
    expect(service["dryRun"]).toHaveBeenCalled()
  })

  it("should call resetQuery when resetBy is provided", async () => {
    const params: SeedTableParams = {
      systemName: PrincipalEnum.TestSystemName,
      envName: "testEnv",
      dbConnection: mockDbConnection,
      path: "",
      seed: {
        tableName: "testTable",
        primaryKeys: ["id"],
        data: [],
        resetBy: { id: 1 },
      },
    }

    await service.seedItem(params)
    expect(service["resetQuery"]).toHaveBeenCalled()
    expect(mockDbConnection.query).toHaveBeenCalledWith("BEGIN")
    expect(mockDbConnection.query).toHaveBeenCalledWith("delete query")
    expect(mockDbConnection.query).toHaveBeenCalledWith("COMMIT")
  })

  it("should call upsertQuery when jsonData is provided", async () => {
    const params: SeedTableParams = {
      systemName: PrincipalEnum.TestSystemName,
      envName: "testEnv",
      dbConnection: mockDbConnection,
      path: "",
      seed: {
        tableName: "testTable",
        primaryKeys: ["id"],
        data: [
          { id: 1, name: "Test1" },
          { id: 2, name: "Test2" },
        ],
      },
    }

    await service.seedItem(params)
    expect(service["upsertQuery"]).toHaveBeenCalled()
    expect(mockDbConnection.query).toHaveBeenCalledWith("BEGIN")
    expect(mockDbConnection.query).toHaveBeenCalledWith("upsert query")
    expect(mockDbConnection.query).toHaveBeenCalledWith("COMMIT")
  })
})
