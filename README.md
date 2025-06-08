<h1>Sprinting Retail Common</h1>

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
import { CommonAppModule } from "sprinting-retail-common"
...
const config: RetailCommonConfig = {
    ...assign config properties from your AppConfig...
}
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

<h2>Using the LoggerService</h2>

Once you have imported CommonAppModule in your AppModule,
the LoggerService with be provided globally.

This means you can inject the LoggerService in the constructor of your controllers or providers like here:
With this you can log messages, events and errors as shown below.

```javascript
export class DevSupportController {
    constructor(private readonly logger: LoggerService) { }

    @Get("trigger-logs") async triggerLogs()
    {
      const contextData = { a: 1, b: 2 }
      const sharedContext: ICommonLogContext = { client: { name: "Bifrost" }, tenantId: 100 }
      this.logger.info(__filename, "my message info", contextData, )
      this.logger.debug(__filename, "my message info", contextData)
      this.logger.warn(__filename, "my message info", contextData)
      this.logger.logError(new Exception("SomeError", "Some description", contextData, innerError))
      this.logger.event(__fileName, "SomeEvent", { someKey: "someValue" }, "SomeCategory")
    }
}
```

Please notice:

- You have three normal log methods: info, debug and warn, each taking a message and contextData. ContextData will be serialized and concatenated to the message field in ELK.
- You have a special method logError for error handling. You have to create an AppException or one of the derived classes to invoke it.
- You have a special method event for logging custom events. You have to pass an eventName, eventData and eventCategory.

<h2>Using the error classes</h2>

You should preferably use the following error classes for error handling:

- **Exception** is a custom exception class which extends Error. You need to provide a http status for this exception.
- **ServerException** is a custom exception class which extends Exception, use it for internal server errors. It has http status 500.
- **ClientException** is a custom exception class which extends Exception, use it for errors that you assume to be caused by the clients calling your API. It has http status 400

We have these additional exception classes for special occasions:

- CustomBadRequestException
- SecurityException

If needed you can create your own exception classes by extending the AppException class - although it should not be necessary under normal circumstances.

The logError function will both log the error as part of application logs and at the same time send the error to APM

```
    this.logger.logError(new ForbiddenException('Access denied'), {});
```

<h2>Appendix</h2>

For the sending logs the module using Logstash UDP transport.
To test if udp port is responding, use netcat.

`$ nc -v -u -z -w 3 10.0.0.xxx 5xxx`
