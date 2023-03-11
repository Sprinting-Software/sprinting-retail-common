export class AppError extends Error {
  constructor(public readonly status: number = 500, public readonly description: string) {
    super(description)
  }

  toString(): string {
    return `HTTP_STATUS: ${this.status}, DESCRIPTION ${this.description}`
  }

  toHttpResponse() {
    return {
      statusCode: this.status,
      description: this.description,
    }
  }

  getStatus() {
    return this.status
  }
}
