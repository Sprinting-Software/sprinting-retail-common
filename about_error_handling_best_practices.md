# Error Handling Framework - Best Practices Guide

## Overview

This library provides a comprehensive error handling framework designed for NestJS applications with integrated APM monitoring, structured logging to ELK stack, and robust error reporting capabilities. The framework emphasizes security, observability, and developer experience.

## Core Architecture

### Exception Hierarchy

The framework is built around a base `Exception` class located at `src/errorHandling/exceptions/Exception.ts:20` that provides:

- **Unique Error Tracking**: Each exception gets an auto-generated `errorTraceId` (e.g., `ERRABCDEF`)
- **HTTP Status Integration**: Direct mapping to HTTP response codes
- **Structured Logging**: ELK-compatible log formatting
- **Context Preservation**: Maintains contextual data and debug information
- **Stack Trace Management**: Intelligent stack trace handling and formatting

### Exception Types

#### 1. Base Exception Class

```typescript
// src/errorHandling/exceptions/Exception.ts:20
export class Exception extends Error {
  constructor(
    public readonly httpStatus: number = HttpStatus.BAD_REQUEST,
    public errorName: string,
    public description?: string,
    public contextData: Record<string, any> = {},
    public innerError?: Error | unknown,
    public debugData: Record<string, any> = {}
  )
}
```

#### 2. Specialized Exception Classes

- **ClientException** (`src/errorHandling/exceptions/ClientException.ts:7`): HTTP 400 - Client-side errors
- **ServerException** (`src/errorHandling/exceptions/ServerException.ts:7`): HTTP 500 - Server-side errors
- **SecurityException** (`src/errorHandling/exceptions/SecurityException.ts:10`): HTTP 403 - Security-related errors (information leak protection)
- **AssertionException** (`src/errorHandling/exceptions/AssertionException.ts:10`): HTTP 502 - Assertion failures
- **DbError** (`src/errorHandling/exceptions/DbError.ts:3`): Database operation failures
- **CustomBadRequestException** (`src/errorHandling/exceptions/CustomBadRequestException.ts:5`): Validation errors

## Error Handling Best Practices

### 1. Exception Creation

**✅ Recommended Approach:**

```typescript
// Use specific exception types
throw new ServerException("DatabaseConnectionFailed", "Unable to connect to primary database", {
  retryAttempts: 3,
  lastError: error.message,
})

// Add context data fluently
throw new ClientException("InvalidInput")
  .setContextData({ field: "email", value: userInput })
  .setDebugData({ validationRules: rules })
```

**❌ Avoid:**

```typescript
// Don't throw generic errors
throw new Error("Something went wrong")

// Don't lose context
throw new Exception(500, "Error")
```

### 2. Error Parsing and Wrapping

The framework provides automatic error parsing via `ExceptionUtil.parse()` (`src/errorHandling/ExceptionUtil.ts:15`):

```typescript
// Automatically handles different error types
const parsedException = ExceptionUtil.parse(caughtError)
// Supports: Exception instances, Axios errors, NestJS HTTP exceptions, generic errors
```

### 3. Global Error Handling

The `GlobalErrorFilter` (`src/errorHandling/GlobalErrorFilter.ts:8`) automatically:

- Catches all unhandled exceptions
- Parses them through `ExceptionUtil`
- Logs errors with full context
- Returns appropriate HTTP responses

```typescript
@Injectable()
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost): void {
    const exception = ExceptionUtil.parse(error)
    this.logger.logError(exception, this.logContext)

    const response = ctx.getResponse()
    response.status(exception.getStatus()).send(exception.getResponse(this.hideErrorDetailsInHttpResponse))
  }
}
```

### 4. Security Considerations

**Information Leak Protection:**

- `SecurityException` and `AssertionException` never expose sensitive details to clients
- Debug information is redacted in production environments
- Sensitive fields are automatically masked in logs using `StringUtils.redactAndTruncateForLogging()` (`src/helpers/StringUtils.ts:68`)

**Sensitive Field Redaction:**
The framework automatically redacts fields containing:

- `password`, `passphrase`, `secret`, `token`
- `apikey`, `accesstoken`, `authtoken`

### 5. Logging Integration

**Structured Logging:**

- Exceptions integrate with `LoggerService` (`src/logger/LoggerService.ts:39`)
- ELK stack compatibility with ECS format
- APM integration for distributed tracing
- UDP and TCP transport options

**Log Context:**

```typescript
// Error messages include structured information
Exception(ERROR_NAME: DatabaseError | HTTP_STATUS: 500 | ERR_ID: ERRABCDEF |
         ERROR_DESCRIPTION: Connection timeout |
         CONTEXT_DATA: {server: "db-primary", timeout: 5000})
```

### 6. APM Integration

The framework integrates with Elastic APM (`src/apm/ApmHelper.ts`) for:

- Distributed tracing
- Error correlation across services
- Performance monitoring
- Transaction labeling

## Implementation Guidelines

### 1. Service Layer Error Handling

```typescript
class UserService {
  async createUser(userData: CreateUserDto): Promise<User> {
    try {
      return await this.userRepository.save(userData)
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ClientException("UserAlreadyExists", "User with this email already exists", { email: userData.email })
      }

      throw new ServerException("UserCreationFailed")
        .setInnerError(error)
        .setContextData({ userData: StringUtils.redactAndTruncateForLogging(userData) })
    }
  }
}
```

### 2. Controller Error Handling

```typescript
@Controller("users")
export class UserController {
  // No explicit error handling needed - GlobalErrorFilter handles all exceptions

  @Post()
  async createUser(@Body() userData: CreateUserDto): Promise<User> {
    return this.userService.createUser(userData) // Exceptions bubble up automatically
  }
}
```

### 3. Database Error Handling

```typescript
// Use DbError for database-specific operations
throw new DbError("findUserByEmail", [email]).setContextData({ table: "users", operation: "SELECT" })
```

### 4. Validation Error Handling

```typescript
// Framework automatically converts NestJS validation errors
// No manual handling needed - ExceptionUtil.parse() handles BadRequestException
```

### 5. External API Error Handling

```typescript
try {
  const response = await axios.get(externalApiUrl)
  return response.data
} catch (error) {
  // ExceptionUtil automatically handles Axios errors with request/response details
  throw ExceptionUtil.parse(error)
}
```

## Configuration

### Error Message Truncation

```typescript
// Configure truncation limits for large error messages
ExceptionConst.overrideTruncationLimitForExceptions(16000) // Default: 8445 (UDP limit)
```

### Response Filtering

```typescript
// Control error detail exposure
const hideErrorDetails = process.env.NODE_ENV === "production"
const response = exception.getResponse(hideErrorDetails)
```

## Testing Error Handling

### Unit Testing

```typescript
describe("UserService", () => {
  it("should throw ClientException for duplicate email", async () => {
    // Arrange
    const userData = { email: "test@example.com" }
    jest.spyOn(userRepository, "save").mockRejectedValue({ code: "ER_DUP_ENTRY" })

    // Act & Assert
    await expect(userService.createUser(userData)).rejects.toThrow(ClientException)
  })
})
```

### Error Snapshot Testing

```typescript
// Convert exceptions to plain JSON for snapshot testing
const errorJson = ExceptionUtil.toPlainJsonForSpec(exception)
expect(errorJson).toMatchSnapshot()
```

## Migration from Legacy Error Handling

1. **Replace generic Error throws** with specific Exception types
2. **Add context data** to provide debugging information
3. **Remove try-catch blocks** in controllers (let GlobalErrorFilter handle)
4. **Use ExceptionUtil.parse()** for external library error handling
5. **Configure APM** for distributed tracing

## Key Files Reference

- **Core Exception**: `src/errorHandling/exceptions/Exception.ts:20`
- **Exception Utilities**: `src/errorHandling/ExceptionUtil.ts:15`
- **Global Filter**: `src/errorHandling/GlobalErrorFilter.ts:8`
- **Logger Integration**: `src/logger/LoggerService.ts:39`
- **String Utilities**: `src/helpers/StringUtils.ts:68`
- **APM Integration**: `src/apm/ApmHelper.ts`
- **Configuration**: `src/errorHandling/exceptions/ExceptionConst.ts:2`

## Monitoring and Observability

The error handling framework provides:

- **Unique error tracking** via `errorTraceId`
- **ELK stack integration** for log aggregation
- **APM correlation** for distributed tracing
- **Structured logging** for easy filtering and analysis
- **Security-conscious** information exposure

This framework ensures consistent error handling across your NestJS application while maintaining security, observability, and developer productivity.
