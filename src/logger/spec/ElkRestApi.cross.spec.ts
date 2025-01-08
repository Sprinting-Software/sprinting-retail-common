import { ElkRestApi } from "../ElkRestApi"
import { TestUtil } from "./TestUtil"

/**
 * This should not be run in the pipeline as it is an integration test
 */
describe.skip("ElkRestApi integration test", () => {
  let elkRestApi: ElkRestApi

  beforeEach(() => {
    // API key nonp-ecobe-tcplogs
    const apiKey = "xxx"
    // Mock ElkRestApi
    elkRestApi = new ElkRestApi({ apiKey, endpoint: "yyy", indexName: "zzz" })
  })

  test("should process logs and send them to ElkRestApi", async () => {
    await elkRestApi.sendSingleDocument(TestUtil.getLogMessages(1)[0])
  })
})
