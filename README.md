<h3 style="color:#ad206e;">Logger monitoring system ELK
<h3 style="color:#3788c3;">Release letters</h3>
<h4>Release letter for version 1.0.4</h4>
Breaking changes: 
- apmSamplingRate has changed name to transactionSampleRate

<h3 style="color:#3788c3;">Introduction:</h3>
<p>
This service is designed to provide real-time monitoring and analysis of log data from various sources using the ELK (Elasticsearch, Logstash, Kibana) stack. It allows users to collect, store, and search through log data in a centralized location for easier troubleshooting and problem-solving.
<p>

_Note: It is recommended that you have some knowledge of ELK stack and its components for better usage of the service._

<h3 style="color:#3788c3;">Features:</h3>
<ul>
    <li>Real-time log data collection from various sources such as servers, applications, and devices using Logstash</li>
    <li>Centralized storage and search functionality using Elasticsearch</li>
    <li>Visualization and analysis of log data using Kibana</li>
</ul>

<h3 style="color:#3788c3;">Setup</h3>
In Your local machine
<ul>
    <li>Install the ELK stack on a server or host machine </li>
    <li>Configure Logstash to collect log data from your desired sources</li>
    <li>Set up Elasticsearch and Kibana</li>
    <li>Set up alerts and customized dashboards/reports as needed</li>
</ul>


```bash 
$ npm i sprinting-retail-common
```

<h3 style="color:#3788c3;">Configuration interface</h3>
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


<h3 style="color:#3788c3;">Using the logger module</h3>

Import logger module wherever you need it:

```javascript
import { LoggerModule } from "../logger/logger.module";

@Module({
  imports: [LoggerModule],
  controllers: [DevSupportController],
  providers: [],
  exports: [],
})
export class DevSupportModule {}
```

**AppException** is a custom exception class which extends HttpException.
**CustomBadRequestException** is a custom exception class which extends 
**AppException** and converts **BadRequestException** to **AppException**.
**ServerErrorException** is a custom exception class which extends AppException, use it for internal server errors.

LogError function will log the error to the logstash and will send the error to the APM server.

    this.logger.logError(new ForbiddenException('Access denied'), {});

More detailed example of the usage of the logger service:

```typescript
import { ConflictException, Controller, Get, Header, NotFoundException } from "@nestjs/common";
import { ApiTags } from '@nestjs/swagger';
import { LoggerService, HttpException, ErrorFactory } from 'sprinting-retail-common';

@Controller('api/devSupport')
@ApiTags('DevSupport')
export class DevSupportController {
  constructor(private readonly logger: LoggerService) {
  }
  
  @Get('trigger-logstash')
  @Header('content-type', 'application/json')
  public async triggerLogStash() {
    this.logger.info(__filename, 'Check if logstash sends the INFO request using the configs');
    this.logger.debug(__filename, 'Check if logstash sends the DEBUG request using the configs');
    this.logger.warn(__filename, 'Check if logstash sends the  WARN request using the configs');
    this.logger.logError(new ForbiddenException('Access denied'), {});
    throw new NotFoundException({ name: 'Tenant', id: 123 });
  }
  
  @Get('trigger-errors')
  @Header('content-type', 'application/json')
  public async triggerErrors(): Promise<void> {
    this.startEmptyLoop();
    const span = ApmHelper.startSpan('SomeHardWork', 'Some message');
    this.startEmptyLoop();
    
    span?.end();
    
    ApmHelper.logSpanEvent(__filename, 'SomeEvent', {
      message: 'Some event message',
    });
    
    const firstError = new AppException(HttpStatus.FORBIDDEN, 'Forbidden', 'Forbidden error description');
    this.logger.logError(firstError);
    
    const secondError = new AppException(400, 'SomeException', 'Some inner business error description')
      .setContextData({
        someKey: 'someValue',
        anotherKey: 123,
      })
      .setInnerError(new Error('Some inner error'));
    
    this.logger.logError(secondError, {
      someKey: 'someValue',
      anotherKey: 123,
    });
    
    throw firstError;
  }
  
  startEmptyLoop() {
    for (let i = 0; i < 1000000000; i++) {
      // do nothing
    }
  }
}

```

<h3 style="color:#3788c3;">Http Exceptions</h3>

The Logger provides `GlobalErrorFilter` for filtering exceptions
It takes parameter LogContext which contains tenantId and userId.
Enable filter in the app module:

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalErrorFilter } from 'sprinting-retail-common';

@Module({
  imports: [],
  providers: [
    {
      provide: APP_FILTER,
      useFactory: (loggerService: LoggerService, userContext: UserContext) =>
        new GlobalErrorFilter(loggerService, {
          tenantId: userContext.user?.tenantId,
          userId: userContext.user?.userId,
        }),
      scope: Scope.REQUEST,
      inject: [LoggerService, UserContext],
    },
  ],
  exports: [],
})
export class AppModule {}
```




<h3 style="color:#3788c3;">Useful information</h3>
For the sending logs the module using Logstash UDP transport.
To test if udp port is responding, use netcat.

`
$ nc -v -u -z -w 3 10.0.0.170 51420
`


<h3 style="color:#3788c3;">Usage</h3>

<ul>
<li>Use Logstash to collect log data from various sources in real-time</li>
<li>Use APM to collect log error data check transactins and error stack</li>
<li>Search and analyze log data using Elasticsearch and Kibana for troubleshooting and problem-solving</li>
<li>Use the alerting system to stay informed of potential issues or errors</li>
<li>Utilize customized dashboards and reports in Kibana for in-depth analysis of log data</li>
</ul>

For APM click the link and choose the service.
https://kibana.io/app/apm/services

For the Logstash
https://kibana.io/app/discover#
