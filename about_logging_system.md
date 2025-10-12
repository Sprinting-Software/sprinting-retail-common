# Logging System - Comprehensive Guide

## Overview

The sprinting-retail-common library provides a sophisticated logging framework designed for NestJS applications with integrated ELK stack support, APM monitoring, and robust error handling. The system emphasizes security, observability, performance, and developer experience through multiple transport mechanisms and intelligent data handling.

## Core Architecture

### Main Components

The logging system is built around several key components working together:

- **LoggerService** (`src/logger/LoggerService.ts:39`): Main logging interface with multiple transport support
- **ElkBufferedTcpLogger** (`src/logger/ElkBufferedTcpLogger.ts:7`): Buffered TCP transport for reliable event/error delivery
- **ElkRestApi** (`src/logger/ElkRestApi.ts:6`): REST API client for ELK communication
- **AsyncContext** (`src/asyncLocalContext/AsyncContext.ts:9`): Request-scoped context management
- **RawLogger** (`src/logger/RawLogger.ts:4`): Internal debugging utility

### Transport Mechanisms

#### 1. UDP Transport (Winston + ELK Logstash)

**Configuration:**
```typescript
elkLogstash: {
  isUDPEnabled: true,
  host: "logstash-host",
  port: 5044
}
```

**Characteristics:**
- **Fast, fire-and-forget** delivery to ELK Logstash
- **Size limitation**: 8445 characters (UDP packet limit)
- **Automatic truncation** with `"...(truncated due to UDP limit)"` message
- **Best for**: High-frequency logs, debug information, general application logs

**Truncation Handling:**
```typescript
// Messages are automatically truncated if they exceed UDP limits
const TRUNCATION_MESSAGE = "...(truncated due to UDP limit)"
if (exceptionString.length > limit) {
  return `${exceptionString.substring(0, limit - TRUNCATION_MESSAGE.length)}${TRUNCATION_MESSAGE}`
}
```

#### 2. TCP/REST API Transport

**Configuration:**
```typescript
elkRestApi: {
  useForEvents: true,
  useForErrors: true,
  endpoint: "https://elk-api-endpoint",
  apiKey: "your-api-key",
  enableTcpSender: true
}
```

**Characteristics:**
- **Reliable delivery** with buffering and retry mechanisms
- **No size limitations** - can handle large payloads
- **Automatic batching** every 5 seconds (configurable)
- **Best for**: Critical events, detailed error information, large context data

**Buffer Management:**
```typescript
// ElkBufferedTcpLogger automatically manages buffering
private buffer: LogMessage[] = []
private interval = 5000 // 5 second flush interval

// Retry logic for failed deliveries
catch (error) {
  this.buffer.unshift(...logsToSend) // Re-add logs for retry
}
```

#### 3. Console Transport

**Development Mode:**
```typescript
const consoleFormatterForDevelopers = printf((args) => {
  const fileName = args.filename ? `| ${args.filename.split("/").pop()}` : ""
  return `${args.timestamp} | ${args["log.level"]} | ${args.message} | ${fileName}`
})
```

**Characteristics:**
- **Developer-friendly formatting** with timestamps, levels, and file names
- **Optional trace context** inclusion (configurable)
- **ECS format compatibility** for consistency with ELK logs

## Context and Tracing Integration

### AsyncContext System

The logging system integrates with `AsyncContext` to provide request-scoped context information:

```typescript
interface LogContext {
  tenantId: string | number
  userId?: string | number
}

interface ClientTrace {
  clientTraceId?: string
  clientInMemoryId?: string
  clientLoginSessionId?: string
  clientRoute?: string
  clientDomain?: string
  clientAppVersion?: string
}
```

### APM Integration

**Automatic Trace Correlation:**
```typescript
// APM trace information is automatically added to logs
const tx = ApmHelper.Instance.getApmAgent().currentTransaction
if (tx) {
  eventObj["trace.id"] = tx.ids["trace.id"]
  eventObj["transaction.id"] = tx.ids["transaction.id"]
}
```

**Benefits:**
- **Distributed tracing** across microservices
- **Error correlation** with APM transactions
- **Performance monitoring** integration
- **Service topology mapping**

## Security and Data Protection

### Automatic Redaction

The system automatically redacts sensitive information using `StringUtils.redactAndTruncateForLogging()`:

**Sensitive Fields Detected:**
- `password`, `passphrase`, `secret`, `token`
- `apikey`, `accesstoken`, `authtoken`

**Redaction Process:**
```typescript
const sensitiveWords = ["password", "passphrase", "secret", "token", "apikey", "accesstoken", "authtoken"]

// Fields matching sensitive patterns are replaced with "REDACTED"
if (sensitiveWords.some((sw) => normKey.includes(sw))) {
  out[rawKey] = "REDACTED"
}
```

### Data Truncation and Pruning

**String Truncation:**
- Strings longer than 500 characters are truncated
- Format: `original_content...(TRUNCATED FROM LENGTH 1234)`

**Array Truncation:**
- Arrays longer than 100 elements are truncated
- Extra entry added: `"TRUNCATED FROM LENGTH 500"`

**Field Exclusion:**
```typescript
// Specific fields can be marked as pruned
redactAndTruncateForLogging(data, ["sensitiveField", "largeObject"])
// Results in: { sensitiveField: "PRUNED", ... }
```

## Usage Patterns

### Basic Logging

```typescript
import { LoggerService } from 'sprinting-retail-common'

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {}

  createUser(userData: CreateUserDto) {
    // Info logging with context
    this.logger.info(__filename, "Creating new user", { email: userData.email })

    // Debug logging
    this.logger.debug(__filename, "User validation completed", { isValid: true })

    // Warning
    this.logger.warn(__filename, "Deprecated API usage detected")
  }
}
```

### Event Logging

```typescript
// Structured event logging with categorization
this.logger.event(
  __filename,
  "UserRegistration",      // eventName
  "Authentication",        // eventCategory
  "UserManagement",        // eventDomain
  { email: user.email },   // eventData (deprecated, use customData)
  "User successfully registered", // message
  { source: "api", version: "v2" }, // eventContext
  { metadata: { timestamp: new Date() } } // customData
)
```

### Error Logging

```typescript
try {
  await this.userRepository.save(user)
} catch (error) {
  // Automatic error parsing and context addition
  this.logger.logError(error, {
    operation: "user_creation",
    userId: user.id
  })

  // Or create specific exception
  this.logger.logException(
    "UserCreationFailed",
    "Unable to save user to database",
    { email: user.email, retryCount: 3 },
    error
  )
}
```

### Custom Index Logging

```typescript
// Send data to custom ELK indices
this.logger.sendToIndex({
  indexName: "user-analytics-2024.45",
  id: `user-${userId}-${Date.now()}`,
  data: {
    userId,
    action: "login",
    timestamp: new Date().toISOString(),
    metadata: { device: "mobile" }
  }
})
```

## Configuration

### Basic Setup

```typescript
import { LoggerModule } from 'sprinting-retail-common'

@Module({
  imports: [
    LoggerModule.forRootV2({
      env: "production",
      serviceName: "user-service",
      logLevel: "info",
      enableElkLogs: true,
      enableConsoleLogs: false,
      elkLogstash: {
        isUDPEnabled: true,
        host: "logstash.example.com",
        port: 5044
      },
      elkRestApi: {
        useForEvents: true,
        useForErrors: true,
        endpoint: "https://elasticsearch.example.com",
        apiKey: process.env.ELK_API_KEY,
        enableTcpSender: true
      },
      errorTruncationLimit: 1000
    })
  ]
})
export class AppModule {}
```

### Environment-Specific Configuration

**Development:**
```typescript
{
  enableConsoleLogs: true,
  elkLogstash: { isUDPEnabled: false },
  elkRestApi: { useForEvents: false, useForErrors: false },
  logLevel: "debug"
}
```

**Production:**
```typescript
{
  enableConsoleLogs: false,
  elkLogstash: { isUDPEnabled: true },
  elkRestApi: { useForEvents: true, useForErrors: true },
  logLevel: "info",
  errorTruncationLimit: -1 // No truncation for REST API
}
```

## Internal Architecture for Debugging

### RawLogger for Internal Debugging

```typescript
// Enable internal debugging
process.env.DEBUG_ERROR_HANDLING = "true"
process.env.DEBUG_LOGGING = "true"

// Internal logs will then be visible
RawLogger.debug("Successfully flushed 15 logs to ELK")
RawLogger.error("Failed to connect to ELK endpoint")
```

### Buffer Management

**ElkBufferedTcpLogger Process:**
1. Logs are added to internal buffer: `this.buffer.push(log)`
2. Every 5 seconds, buffer is processed: `processLogs()`
3. Failed deliveries are re-queued: `this.buffer.unshift(...failedLogs)`
4. On shutdown, remaining logs are flushed: `flushAndStop()`

**Monitoring Buffer Health:**
```typescript
// Check if logging system is running
if (!this.isRunning) {
  RawLogger.debug("You must first call start(). Logs discarded.", log)
}
```

### Cleanup and Shutdown

```typescript
// Automatic cleanup on application shutdown
async destroyTcpLoggers() {
  if (this.tcpLoggerEvents) {
    await this.tcpLoggerEvents.flushAndStop()
  }
  if (this.udpTransport) {
    this.udpTransport.close()
  }
}
```

## Testing Utilities

### Mock Transport for Testing

```typescript
class MockTransport extends Transport {
  public logMessages: any[] = []

  log(info: any, callback: () => void) {
    this.logMessages.push(info)
    this.emit("logged", info)
    if (callback) callback()
  }
}

// Use in tests
const mockTransport = new MockTransport()
const logger = new LoggerService(config, [mockTransport], asyncContext)
```

### Exception Testing

```typescript
// Convert exceptions to plain JSON for snapshot testing
const errorJson = ExceptionUtil.toPlainJsonForSpec(exception)
expect(errorJson).toMatchSnapshot()
```

## Performance Considerations

### Transport Selection Strategy

1. **High-frequency logs** (debug, info): Use UDP transport
2. **Critical events/errors**: Use TCP/REST API transport
3. **Large context data**: Use TCP/REST API transport
4. **Development**: Use console + UDP transport

### Optimization Tips

```typescript
// Conditional debug logging to avoid string concatenation overhead
if (RawLogger.isEnabled()) {
  RawLogger.debug("Expensive debug info", expensiveDataGeneration())
}

// Use structured data instead of string interpolation
logger.info(__filename, "User action", { action: "login", userId })
// Instead of: logger.info(__filename, `User ${userId} performed ${action}`)
```

## Index Naming Convention

**Automatic Index Names:**
- Format: `${env}-${serviceName}-${logType}-${yyyyww}`
- Example: `prod-user-service-event-2024.45`
- Week-based rotation for efficient ELK management

**Custom Indices:**
```typescript
// Use custom index names for specific analytics
logger.sendToIndex({
  indexName: "analytics-user-behavior-2024.11",
  id: uniqueEventId,
  data: analyticsData
})
```

## Best Practices

### 1. Always Pass `__filename`
```typescript
// Correct - enables file-based filtering in ELK
logger.info(__filename, "Operation completed")

// Incorrect - loses source file context
logger.info("SomeService", "Operation completed")
```

### 2. Use Structured Context Data
```typescript
// Good - structured, searchable
logger.event(__filename, "PaymentProcessed", "Finance", "Payments", null, null, {
  amount: 99.99,
  currency: "USD",
  userId: 12345
})

// Avoid - unstructured string
logger.info(__filename, "Payment of $99.99 USD processed for user 12345")
```

### 3. Security-First Logging
```typescript
// Automatic redaction handles sensitive data
logger.debug(__filename, "User data", {
  email: "user@example.com",
  password: "secret123", // Automatically becomes "REDACTED"
  profile: userData
})
```

### 4. Error Context Enrichment
```typescript
// Add relevant context to errors
try {
  await operation()
} catch (error) {
  logger.logError(error, {
    operation: "user_update",
    userId: user.id,
    attemptCount: retryCount,
    timestamp: new Date().toISOString()
  })
}
```

## Key Files Reference

- **Main Service**: `src/logger/LoggerService.ts:39`
- **Module Setup**: `src/logger/LoggerModule.ts:13`
- **TCP Logger**: `src/logger/ElkBufferedTcpLogger.ts:7`
- **REST API Client**: `src/logger/ElkRestApi.ts:6`
- **Context Management**: `src/asyncLocalContext/AsyncContext.ts:9`
- **Security Utils**: `src/helpers/StringUtils.ts:68`
- **Log Redactor**: `src/helpers/LogRedactor.ts:1`
- **Internal Debug**: `src/logger/RawLogger.ts:4`
- **Type Definitions**: `src/logger/types.ts:14`

## Migration from Other Logging Solutions

1. **Replace manual Winston setup** with LoggerModule.forRootV2()
2. **Update log calls** to include `__filename` parameter
3. **Leverage structured events** instead of free-text logging
4. **Configure appropriate transports** for your environment
5. **Enable APM integration** for distributed tracing

This logging framework ensures consistent, secure, and observable logging across your NestJS applications while providing the flexibility to adapt to different deployment environments and monitoring requirements.