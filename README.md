<h1>Sprinting Retail Comon</h1>

<h2>Introduction</h2>
This library provides: 
<ul>
    <li>Error handling</li>
    <li>Logging to ELK - both logs and APM</li>
</ul>

[Check out the RELEASE_LETTERS here](RELEASE_LETTERS.md)

<h2>Setup</h2>

1. Install in your project
```bash 
$ npm i sprinting-retail-common
```
2. Add CommonAppModule to your AppModule using forRoot to pass config which must implement the RetailCommonConfig interface.
```
import { CommonAppModule, PrepareNestAppModule } from "sprinting-retail-common"
...
@Module(
  {
    imports: [
      CommonAppModule.forRoot(config),
      ...
    ],
    ...
  }
)
export class AppModule {}
```

<h2>Using the logger module</h2>

Once you have imported CommonAppModule in your AppModule, 
you can import the LoggerModule in all other modules.

```javascript
import { LoggerModule } from "../logger/logger.module";

@Module({
  imports: [LoggerModule],
  controllers: [SomeController],
  providers: [SomeProvider],
  exports: [],
})
export class SomeModule {}
```

Next, you inject the LoggerService in the constructor of your controllers or providers like here: 
With this you can log messages, events and errors as shown below.

```javascript
export class DevSupportController {
  constructor(private

  readonly
  logger: LoggerService
) {
}

@Get("trigger-logs")
async
triggerLogs()
{
  const contextData = { a: 1, b: 2 }
  this.logger.info(__filename, "my message info", contextData)
  this.logger.debug(__filename, "my message info", contextData)
  this.logger.warn(__filename, "my message info", contextData)
  this.logger.logError(new Exception("SomeError", "Some description", contextData, innerError))
  this.logger.event(__fileName, "SomeEvent", { someKey: "someValue" }, "SomeCategory")
)
}
}
```

Please notice: 
- You have three normal log methods: info, debug and warn, each taking a message and contextData. ContextData will be serialized and concatenated to the message field in ELK. 
- You have a special method logError for error handling. You have to create an AppException or one of the derived classes to invoke it. 
- You have a special method event for logging custom events. You have to pass an eventName, eventData and eventCategory.

<h2>Using the error classes</h2>

You should preferably use the following error classes for error handling:
- **AppException** is a custom exception class which extends HttpException. You need to provide a http status for this exception. 
- **ServerException** is a custom exception class which extends AppException, use it for internal server errors. It has http status 500.
- **ClientException** is a custom exception class which extends AppException, use it for errors that you assume to be caused by the clients calling your API. It has http status 400

We have these additional exception classes: 
- CustomBadRequestException
- DbError

If needed you can create your own exception classes by extending the AppException class - although it should not be necessary under normal circumstances. 

The LogError function will log the error to the logstash and will send the error to the APM server.

    this.logger.logError(new ForbiddenException('Access denied'), {});

<h3>Global error handler</h3>

This library provides the `GlobalErrorFilter` for filtering exceptions. 
It is automatically setup once you have imported the `CommonAppModule` in your AppModule.

<h2>Useful information</h2>

For the sending logs the module using Logstash UDP transport.
To test if udp port is responding, use netcat.

`
$ nc -v -u -z -w 3 10.0.0.xxx 5xxx
`
<h2>Setup - prior to version 2</h2>

Use configurations libraries like convict, or any other alternative which will allow getting params easily.
https://www.npmjs.com/package/convict

`config.ts`
```javascript
import convict from 'convict';

const conf = {
  elk: {
    enableLogs: {
      env: 'ENABLE_LOGS',
      format: Boolean,
      default: true,
    },
    apm: {
      serviceUrl: {
        doc: 'The name of the service in ELK',
        format: String,
        default: 'http://10.0.0.170:8200',
        env: 'ELK_APM_SERVICE_URL',
      },
      serviceSecret: {
        doc: 'The name of the service in ELK',
        format: String,
        default: '',
        env: 'ELK_APM_SERVICE_SECRET',
      },
      apmSamplingRate: {
        doc: 'The percentage of transactions that will be sent to ELK. 1 means 100%.',
        format: Number,
        default: 1,
        env: 'ELK_APM_SAMPLINGRATE',
      },
    },
    logstash: {
      enableUDP: {
        doc: 'Enable udo transport for the logstash',
        format: Boolean,
        default: true,
        env: 'ENABLE_UDP',
      },
      host: {
        doc: 'The logstash host',
        env: 'LOGSTASH_HOST',
        default: '10.0.0.170',
      },
      port: {
        doc: 'The logstash port',
        env: '',
        default: 51420,
      },
    },
  },
}
```

Create the logger module, which will contain APM and logger services.
`logger/logger.module.ts`
import conf from '../../config/configuration';

```javascript
@Module({
  imports: [],
  providers: [
    {
      provide: LoggerService,
      useFactory: () => {
        const configOptions: ConfigOptions = {
          env: conf.env,
          serviceName: conf.serviceName,
          enableLogs: conf.elk.enableLogs,
          logstash: {
            isUDPEnabled: conf.elk.logstash.enableUDP,
            host: conf.elk.logstash.host,
            port: conf.elk.logstash.port,
          },
        };

        return new LoggerService(configOptions);
      },
    },
    {
      provide: ApmHelper,
      useValue: new ApmHelper({
        serviceName: conf.serviceName,
        serverUrl: conf.elk.apm.serviceUrl,
        secretToken: conf.elk.apm.serviceSecret,
        enableLogs: conf.elk.enableLogs,
      }),
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}


```
