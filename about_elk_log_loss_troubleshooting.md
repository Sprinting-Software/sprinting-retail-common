# ELK Log Loss Analysis & Troubleshooting Guide

## Overview

Log loss in ELK environments is a common issue that can occur at multiple points in the logging pipeline. This document summarizes the main causes of lost logs and provides comprehensive troubleshooting strategies based on current industry research and best practices.

## Common Causes of Log Loss based on internet Research

### 1. Transport Layer Issues

#### UDP Packet Loss

**Problem:** UDP transport is inherently unreliable and prone to packet drops

- **Symptoms:** Up to 80% data loss reported in high-volume scenarios
- **Root Causes:**
  - Network congestion and buffer overflows
  - OS-level UDP receive buffer limitations
  - Inadequate UDP_WORKERS and UDP_QUEUE_SIZE configuration
  - High CPU utilization on Logstash nodes

**Our Implementation Impact:**

```typescript
// In sprinting-retail-common LoggerService
if (config.elkLogstash.isUDPEnabled) {
  const udpTransport = new UDPTransport(conf)
  // Risk: Messages may be lost during network congestion
}
```

#### TCP/REST API Reliability

**Advantage:** More reliable delivery with retry mechanisms

```typescript
// Our buffered TCP approach mitigates loss
if (config.elkRestApi?.useForErrors && this.tcpLoggerErrors) {
  this.enrichForTcpAndSend(formatedMessage, "error")
  // Buffered with retry logic - much more reliable
}
```

### 2. Elasticsearch Rejection Issues

#### Field Mapping Conflicts

**Problem:** Type mismatches cause silent document rejection

- **Scenario:** Field sent as string initially, then as integer later
- **Result:** Elasticsearch rejects documents with conflicting field types
- **Impact:** Complete loss of affected documents

**Example Conflict:**

```json
// First document
{ "userId": "12345" }  // String type established

// Later document - REJECTED
{ "userId": 12345 }    // Integer conflicts with mapping
```

#### Document Size and Structure Issues

**Common Rejections:**

- Documents exceeding size limits
- Invalid JSON structure
- Missing required fields
- Malformed timestamp formats

### 3. Logstash Pipeline Problems

#### Configuration Errors

**Silent Failures:**

- Incorrect filter configurations
- Output plugin misconfigurations
- Pipeline parsing errors

#### Memory and Resource Constraints

**Symptoms:**

- Logstash OOM kills causing buffer loss
- Queue overflow during Elasticsearch downtime
- Backpressure causing input throttling

### 4. Dead Letter Queue Issues

**Our Current Gap:**

```typescript
// Current implementation lacks DLQ configuration
// Only Elasticsearch output supports DLQ (400/404 responses)
```

**Missing Protection:**

- No DLQ configured for UDP transport issues
- Limited error recovery for network failures
- No systematic replay mechanism for failed events

## Monitoring and Detection Strategies

### 1. Network Level Monitoring

#### UDP Statistics

```bash
# Monitor UDP drops in real-time
watch netstat -s --udp

# Look for:
# - Packet receive errors
# - UDP receive buffer errors (RcvBufErrors)
# - Socket receive errors
```

#### Traffic Verification

```bash
# Verify packets are arriving
tcpdump -i any port 5044 -c 100

# Check for dropped packets at network interfaces
ip -s link show
```

### 2. Logstash Pipeline Monitoring

#### Stats API Monitoring

```bash
# Get pipeline statistics
curl -X GET "localhost:9600/_node/stats/pipelines?pretty"

# Monitor for:
# - events.in vs events.out discrepancies
# - events.failed counters
# - queue statistics
```

#### Dead Letter Queue Status

```bash
# Check DLQ status (if enabled)
curl -X GET "localhost:9600/_node/stats/pipelines?pretty" | jq '.pipelines.main.dead_letter_queue'
```

### 3. Elasticsearch Monitoring

#### Index Health and Rejections

```bash
# Check for rejected documents
curl -X GET "elasticsearch:9200/_cat/indices?v&health=red"

# Monitor cluster health
curl -X GET "elasticsearch:9200/_cluster/health?pretty"

# Check for mapping conflicts
curl -X GET "elasticsearch:9200/logstash-*/_mapping"
```

#### Bulk Request Failures

```bash
# Monitor bulk request statistics
curl -X GET "elasticsearch:9200/_nodes/stats/indices/indexing?pretty"

# Look for:
# - index_failed counters
# - 429 responses (queue full)
# - 400/404 responses (mapping issues)
```

## Troubleshooting Methodology

### 1. Systematic Pipeline Analysis

#### Step 1: Verify Log Generation

```typescript
// In sprinting-retail-common - ensure logs are being created
logger.info(__filename, "Test message", { testId: "troubleshoot-001" })

// Monitor: Does this appear in application logs?
```

#### Step 2: Network Path Verification

```bash
# Test connectivity from application to Logstash
telnet logstash-host 5044

# Test UDP specifically
nc -u logstash-host 5044
```

#### Step 3: Logstash Processing Verification

```bash
# Check Logstash logs for errors
tail -f /var/log/logstash/logstash-plain.log

# Look for:
# - Configuration errors
# - Connection failures
# - Parsing exceptions
```

#### Step 4: Elasticsearch Storage Verification

```bash
# Check if documents are reaching Elasticsearch
curl -X GET "elasticsearch:9200/logstash-*/_search?q=testId:troubleshoot-001"
```

### 2. Performance Testing

#### Load Testing UDP Transport

```bash
# Generate high-volume test logs
for i in {1..10000}; do
  logger -n logstash-host -P 5044 "Test message $i"
done

# Monitor drops during load
watch netstat -s --udp
```

#### Elasticsearch Capacity Testing

```bash
# Monitor Elasticsearch performance during load
curl -X GET "elasticsearch:9200/_cat/thread_pool/bulk?v&h=node_name,name,active,rejected,completed"
```

## Recommended Solutions

### 1. Transport Layer Improvements

#### Enhanced UDP Configuration

```yaml
# In Logstash UDP input
input {
  udp {
    port => 5044
    buffer_size => 65536    # Increase buffer size
    workers => 4            # Multiple workers
    queue_size => 2000      # Larger queue
    receive_buffer_bytes => 1048576  # OS-level buffer
  }
}
```

#### TCP Failover Strategy

```typescript
// Enhanced configuration for sprinting-retail-common
const robustConfig = {
  elkLogstash: {
    isUDPEnabled: true, // For performance
  },
  elkRestApi: {
    useForErrors: true, // Critical errors via TCP
    useForEvents: true, // Important events via TCP
    enableTcpSender: true, // Custom data via TCP
  },
}
```

### 2. Dead Letter Queue Implementation

#### Enable DLQ in Logstash

```yaml
# In logstash.yml
dead_letter_queue.enable: true
dead_letter_queue.max_bytes: 1024mb
dead_letter_queue.flush_interval: 5000
```

#### DLQ Processing Pipeline

```yaml
# DLQ replay pipeline
input {
  dead_letter_queue {
    path => "/usr/share/logstash/data/dead_letter_queue"
    pipeline_id => "main"
    commit_offsets => true
  }
}

filter {
  # Add DLQ metadata for analysis
  mutate {
    add_field => { "[@metadata][from_dlq]" => "true" }
    add_field => { "[@metadata][dlq_reason]" => "%{[dead_letter_queue][reason]}" }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "logstash-dlq-%{+YYYY.MM.dd}"
  }
}
```

### 3. Monitoring and Alerting

#### Key Metrics to Monitor

```bash
# Create monitoring dashboard for:
# 1. UDP packet loss rates
# 2. Logstash throughput (events/sec)
# 3. Elasticsearch rejection rates
# 4. DLQ growth rates
# 5. Network buffer utilization
```

#### Automated Health Checks

```typescript
// Implement health check in sprinting-retail-common
export class LoggingHealthCheck {
  async checkUDPTransport(): Promise<boolean> {
    // Send test message and verify delivery
  }

  async checkElasticsearchHealth(): Promise<boolean> {
    // Verify ES cluster health
  }

  async checkLogstashPipeline(): Promise<boolean> {
    // Verify pipeline processing
  }
}
```

### 4. Application-Level Resilience

#### Buffering Strategy

```typescript
// Enhanced LoggerService with local buffering
class ResilientLoggerService extends LoggerService {
  private localBuffer: LogMessage[] = []
  private lastSuccessfulSend: Date = new Date()

  async logWithRetry(message: LogMessage) {
    try {
      await this.sendToELK(message)
      await this.flushLocalBuffer() // Send any queued messages
    } catch (error) {
      this.localBuffer.push(message)
      await this.retryBufferedMessages()
    }
  }
}
```

#### Circuit Breaker Pattern

```typescript
// Implement circuit breaker for ELK connectivity
class ELKCircuitBreaker {
  private failures = 0
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED"
  private lastFailure: Date

  async sendLog(message: LogMessage) {
    if (this.state === "OPEN") {
      // Log locally or skip non-critical logs
      return this.handleCircuitOpen(message)
    }

    try {
      await this.elkTransport.send(message)
      this.onSuccess()
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
}
```

## Implementation Recommendations for sprinting-retail-common

### 1. Immediate Actions

1. **Enable DLQ** in Logstash for TCP transports
2. **Add monitoring** for UDP packet drops
3. **Implement health checks** for transport verification
4. **Configure alerts** for log loss detection

### 2. Medium-term Improvements

1. **Add local buffering** with disk persistence for critical logs
2. **Implement circuit breaker** pattern for ELK connectivity
3. **Create replay mechanism** for DLQ processing
4. **Add transport redundancy** (multiple Logstash instances)

### 3. Long-term Strategy

1. **Migrate critical logs** to TCP/REST API transport exclusively
2. **Implement log correlation IDs** for end-to-end tracking
3. **Add automatic mapping validation** before document submission
4. **Create log loss simulation** for testing resilience

## Conclusion

Log loss in ELK environments is typically caused by network issues (UDP packet drops), Elasticsearch rejections (mapping conflicts), or resource constraints (memory/CPU). The key to prevention is implementing multiple layers of protection:

1. **Transport diversity** (UDP for performance, TCP for reliability)
2. **Dead Letter Queues** for recovery
3. **Comprehensive monitoring** for early detection
4. **Application-level resilience** with buffering and retry logic

Our current sprinting-retail-common implementation provides a good foundation with its multi-transport approach, but would benefit from DLQ implementation and enhanced monitoring capabilities to achieve enterprise-grade log reliability.
