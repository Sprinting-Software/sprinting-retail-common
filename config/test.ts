export default {
  elk: {
    serviceName: "sprinting-retail-common",
    sendLogsToElk: false,
    elkConfig: {
      hostname: "http://10.0.0.0",
      port: 9999,
      apmVersion: "1.0.1",
      apmTransactionSampleRate: 1,
      flushInterval: 500,
    },
    logstashConfig: {
      port: 9999,
      hostname: "10.0.0.0",
    },
  },
}
