<h3 style="color:#ad206e;">Logger monitoring system ELK


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
$ npm i nest-logger
```

<h3 style="color:#3788c3;">Configuration interface</h3>
Use configurations libraries like convict, or any other alternative which will allow getting params easily.
https://www.npmjs.com/package/convict

`config.ts`
```javascript
const convictSchema = convict({elk: {
    enableApm: {
      doc: 'Set to true if transaction data should be sent to APM',
      format: Boolean,
      default: true,
      env: 'ENABLE_APM',
    },
    serviceUrl: {
      doc: 'The name of the service in ELK',
      format: String,
      default: 'SERVICE_URL',
      env: 'ELK_SERVICE_URL',
    },
    serviceSecret: {
      doc: 'The name of the service in ELK',
      format: String,
      default: 'loyaltyBE',
      env: 'ELK_SERVICE_SECRET',
    },
    apmSamplingRate: {
      doc: 'The percentage of transactions that will be sent to ELK. 1 means 100%.',
      format: Number,
      default: 1,
      env: 'ELK_APM_SAMPLINGRATE',
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
  }});
```

Create the logger module.
`logger/logger.module.ts`
```javascript

import { Module } from '@nestjs/common';
import { ConfigOptions, LoggerService } from 'nest-logger';
import conf from '../../config/configuration';

@Module({
  imports: [],
  providers: [
    {
      provide: LoggerService,
      useFactory: () => {
        const configOptions: ConfigOptions = {
          env: conf.env,
          serviceName: conf.serviceName,
          logging: {
            enableLogs: conf.logging.silent,
            enableAPM: conf.elk.enableApm,
          },
          logstash: {
            isUDPEnabled: conf.elk.logstash.enableUDP,
            host: conf.elk.logstash.host,
            port: conf.elk.logstash.port,
          },
          apm: {
            serviceUrl: conf.elk.serviceUrl,
            serviceSecret: conf.elk.serviceSecret,
          },
        };

        return new LoggerService(configOptions);
      },
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

Example of Dev support controller and usage of all logs functions
```typescript
import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import formatError from '../../error/formatError';
import { BaseError } from '../../error/error.base';
import { LoggerService } from 'nest-logger';
import { HttpException, InternalServerError } from 'nest-logger';

@Controller('api/devSupport')
@ApiTags('DevSupport')
export class DevSupportController {
  constructor(private readonly logger: LoggerService) {}
  
  @Get('trigger-errors')
  @Header('content-type', 'application/json')
  public async triggerErrors(): Promise<void> {
    this.startEmptyLoop();
    const span = this.logger.apm.startSpan('SomeHardWork', 'Some message');
    this.startEmptyLoop();
    
    span?.end();
    
    this.logger.apm.logSpanEvent(__filename, 'SomeEvent', { message: 'Some event message' });
    this.logger.log(__filename, 'message XXXXX');
    this.logger.log(__filename, 'Log message XXXXX');
    this.logger.log(__filename, 'Log something important');
    this.logger.debug(__filename, 'Debug messages for the logger');
    this.logger.warn(__filename, 'Warning messages for the logger');
    this.logger.error(__filename, 'ERROR messages for the logger');
    
    // Demonstrate erors and check if the APM and logs working properly
    const firstError = new HttpException(
      400,
      'BadRequestExceptionDevSupportError',
      'some detailed message',
      { someKey: 'someValue', anotherKey: 123 },
      new Error('inner error'),
    );
    
    this.logger.error(
      __filename,
      `Caught ${firstError.name}: ${formatError(firstError)}, response: ${JSON.stringify(firstError.toJson())}`,
      firstError,
    );
    
    const secondError = new HttpException(
      400,
      'ForbiddenExceptionDevSupportError',
      'some detailed message',
      { someKey: 'someValue', anotherKey: 123 },
      new Error('inner error'),
    );
    this.logger.error(
      __filename,
      `Caught ${secondError.name}: ${formatError(secondError)}, response: ${JSON.stringify(secondError.toJson())}`,
      secondError,
    );
    
    const innerError = new InternalServerError(
      'InnerErrorName',
      'Inner detailed message',
      { someKey: 'someValue', anotherKey: 123 },
      new Error('some inner error'),
    );
    
    throw new BaseError(
      { someKeyValue: 'someKeyValue' },
      innerError,
      'InnerError',
      'Three errors have been created to demonstrate the framework around error logging. In addition to this error, the error logs should show two other errors with these error trace IDs: ',
    );
  }
  
  startEmptyLoop() {
    for (let i = 0; i < 1000000000; i++) {
      // do nothing
    }
  }
}
```

<h3 style="color:#3788c3;">Http Exceptions</h3>
The logger uses a custom-created interface for the Exceptions. It's for having structured error messages.
For making another exception, you should extend HttpException as `InternalServerError` shown in the code.

```typescript
import { HttpException as DefaultHttpException, HttpStatus } from '@nestjs/common';

export class HttpException extends DefaultHttpException implements IException {
  constructor(
    readonly statusCode: number,
    readonly name: string,
    readonly message: string,
    readonly data?: Record<string, any>,
    readonly innerError?: any,
  ) {
    super(name, statusCode);
  }
  
  override toString() {
    return (
      this.name +
      ' (http status ' +
      this.statusCode +
      ')' +
      (this.data ? ' - errorData: ' + util.inspect(this.data) : '') +
      (this.message ? ' - ' + this.message : '') +
      (this.innerError ? '\n    |-> innerError: ' + error2string(this.innerError) : '')
    );
  }
  
  toJson(): any {
    return {
      errorName: this.name,
      innerError: error2string(this.innerError),
      errorData: this.data,
      message: this.message,
      httpStatus: this.statusCode,
    };
  }
}

export class InternalServerError extends HttpException {
  constructor(
    name: string,
    message: string,
    data?: Record<string, any>,
    innerError?: any
  ) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, name, message, data, innerError)
  }
}
```

<h3 style="color:#3788c3;">Tenants Information</h3>

The logger service uses the ``Utils.getJwtTokenData`` data to get tenant id from jwt token.
The function decodes the JWT token and returns the needed field
```typescript
    const tenantId = Utils.getJwtTokenData(context?.getRequest().headers?.authorization, 'tenantId')
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
<li>Search and analyze log data using Elasticsearch and Kibana for troubleshooting and problem-solving</li>
<li>Use the alerting system to stay informed of potential issues or errors</li>
<li>Utilize customized dashboards and reports in Kibana for in-depth analysis of log data</li>
</ul>

For APM click the link and choose the service.
https://kibana.sprinting.io/app/apm/services

For the Logstash
https://kibana.sprinting.io/app/discover#
