import { TestConfigRaw } from "./TestConfig"

import { RetailCommonConfigConvict } from "../interface/RetailCommonConfigConvict"

describe("RetailCommonConfigProvider.spec", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeAll(async () => {})

  it("should validate properly", async () => {
    // expect(() => new RetailCommonConfigProvider({} as RetailCommonConfig)).toThrow("some")
  })

  it("RetailCommonConfigConvict can validate TestConfig ", async () => {
    const config = TestConfigRaw
    RetailCommonConfigConvict.validate(config)
  })
})
