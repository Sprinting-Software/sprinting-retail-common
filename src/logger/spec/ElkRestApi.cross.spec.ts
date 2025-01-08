import { ElkRestApi } from "../ElkRestApi"
import { TestUtil } from "./TestUtil"

describe("ElkRestApi integration test", () => {
  let elkRestApi: ElkRestApi

  beforeEach(() => {
    // API key nonp-ecobe-tcplogs
    const apiKey = "xxx"
    // Mock ElkRestApi
    elkRestApi = new ElkRestApi({ apiKey, endpoint: "http://10.0.0.170:9200", indexName: "a-ecobe-event-2025.02" })
  })

  test("should process logs and send them to ElkRestApi", async () => {
    await elkRestApi.postSingleDocument(TestUtil.getLogMessages(1)[0])
  })
})
