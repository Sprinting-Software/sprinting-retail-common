export default {
  elk: {
    serviceName: "sprinting-retail-common",
    sendLogsToElk: false,
    elkConfig: {
      hostname: "http://10.0.0.170",
      port: 8200,
      apmVersion: "1.0.1",
      apmTransactionSampleRate: 1,
      flushInterval: 500,
    },
    logstashConfig: {
      port: 51420,
      hostname: "10.0.0.170",
    },
  },
}
