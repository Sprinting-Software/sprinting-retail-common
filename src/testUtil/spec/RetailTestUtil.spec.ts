import { CatchSync, CatchAsync } from "../RetailTestUtil"
import { ClientException } from "../../errorHandling/exceptions/ClientException"

describe("JwtHelper", () => {
  it("basic snapshot-testing", () => {
    const user = {
      createdAt: new Date(),
      createdOn: `str${new Date()}`,
      name: "Bond... James Bond",
    }

    expect(user).toMatchSnapshot({
      createdAt: expect.any(Date),
      createdOn: expect.any(String),
      name: "Bond... James Bond",
    })
  })

  it("exceptions and snapshot-testing sync", () => {
    const err = new ClientException("SomeErrorName", "some description", { a: 1, b: "xxx" }, new Error("InnerError"))

    function util() {
      throw err
    }

    expect(CatchSync(() => util())).toMatchSnapshot()
  })

  it("exceptions and snapshot-testing async", async () => {
    const err = new ClientException("SomeErrorName", "some description", { a: 1, b: "xxx" }, new Error("InnerError"))
    function utilAsync(): Promise<void> {
      return new Promise(function (resolve, reject) {
        reject(err)
      })
    }
    //await utilAsync()
    expect(await CatchAsync(async () => await utilAsync())).toMatchSnapshot()
  })
})
