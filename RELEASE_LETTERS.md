<h2>Release letter for version 10.3.0 - 2025-04-06 - Nikola</h2>

- Add TestUtils to make it easy to create assertions on error handling

- Solving an old bug: Change the logger so logger.debug actually produces debug level logs instead of info.

- Making fetchOrFail able to work with requests with Content-Type other than application/json

<h2>Release letter for version 10.2.0 - 2025-03-03 - Nikola</h2>

- Fix the issue where debug-level logs shows up as warn
- Make it possible to configure log-levels so you can control whether you want to see all logs, info-level and above, warn-level or above etc.
- Add an attribute called envTags to make it possible to trace your own logs in ELK
- Make it possible to unify apm and trace logs by adding processor.event and labels.envTags to messages
- Make errors and events display on the console when running with errors and events sent over tcp
- POSSIBLY BREAKING CHANGE: For events, change the message name from simply eventName to "EVENT: " + eventName to make it stand out more clearly in Discover pane. (This can break ELK visualizations or searches of filtering is done by message instead of eventName but this would be considered a bad practice anyway. )

<h2>Release letter for version 10.1.1 - 2025-02-05 - Nikola</h2>

- Making it possible to configure the truncation limit for errors. You can set it to -1 if you don't want any truncation.

<h2>Release letter for version 10.0.4 - 2025-02-05 - Goran</h2>

- Implemented ELK custom index name sender with buffer and error handling with logs

<h2>Release letter for version 10.0.3 - 2025-01-26 - Nikola</h2>

- Improving the readbility of stack traces. Before, the stack trace would contain some additional lines of information that would only confuse.

<h2>Release letter for version 10.0.2 - Skipped</h2>

<h2>Release letter for version 10.0.1 - 2025-01-26 - Nikola</h2>

- Adding the ability to set or disable the truncation limit of errors. This is useful if you want to disable truncation of error messages.

<h2>Release letter for version 10.0.0 - 2025-01-19 - Nikola</h2>

- Upgrading all NestJS dependencies to Nest 10. A few related dependencies are updated correspondingly.

<h2>Release letter for version 7.1.0 - 2025-01-07 - Nikola</h2>

- Simplify configuration interfaces by a lot and deprecating a lot of the old complex configuration code related to legacy configurations
- Adding support of sending of events and errors via the Elastic REST API to overcome the issue of events being limited in size
- Adding fetchOrFail - a common helper function to take over from Axios. It is based on the built-in fetch function from recent versions of NodeJS
- Removing the PrincipalEnum and instead adding PrincipalName as a type alias for string. This is to ensure that this library remains "agnostic" meaning it can have no concrete references to anything particular from the sprinting platform so that one day this library could be used on other client projects. PrincipalEnum should still be defined but outside this library.
- Improve error handling so we will be seeing fewer unrecognized errors
- Improve logging of errors to avoid the truncation at 800 characters. This is solved by sending them over the REST api like events.

To upgrade from version 6.3 to version 7.0.1:

- Adjust the way configurations are applied. The adoption should be easy enough if you use intellisense to discover how the new config is typed. Everything should be strongly typed. Here are a couple of renaming you should be prepared for:
  -- labels -> globalLabels (ApmHelper)
  -- envPrefix -> env
- If you want to use the new feature for sending of events and/or errors via the REST API, then add this configuration:

```javascript
{
  elkRestApi: {
    useForEvents: true
    useForErrors: true
  }
}
```

<h2>Release letter for version 6.3.0</h2>

- Small adjustment in wrapping of Errors to provide cleaner error logs without loosing any information
- Truncation of errors sent to ELK to avoid issues with too large logs (exceeding the UDP limit)
- Cleaner stack-traces in error logs in ELK

<h2>Release letter for version 6.2.5</h2>
- Bumped Node version up to 18.20.4 because BifrostBackend requires it

- Improved the Exception parser for Axios errors - in case the error is a string and not an object

<h2>Release letter for version 6.2.3</h2>
- Introduced new PrincipalEnum EcoBE for Ecosoft client

<h2>Release letter for version 6.2.1</h2>

- Bugfix: fix stack trace being returned when typing in the incorrect password in IDP

<h1>Release letter for 6.2.0</h1>
`DataRedactor` is a utility class designed to redact Personally Identifiable Information (PII) from data objects. It provides functions to mask strings, emails, and nested objects while allowing specific properties to be included or excluded from masking.

### Import DataRedactor Class

```javascript
import { DataRedactor } from "sprinting-retail-common"
```

## Usage

### Basic Example

The following example demonstrates how to use `DataRedactor` to redact PII from a data object:

```javascript
const personCreateBody = {
  action: "CreatePerson",
  id: "87654321-4321-4321-4321-87654321",
  payload: {
    id: "12345678-1234-1234-1234-12345678",
    firstName: "Testing",
    lastName: "Testing",
    middleName: "",
    dateOfBirth: "1992-12-20",
    email: "testingapi@gmail.com",
    phone: "123456789",
    address: {
      address: "testinging address",
      address2: "testinging address",
      zipcode: 1234,
    },
    countryCode: "pk",
    tenantId: 100,
  },
}

const redactor = new DataRedactor(personCreateBody)
const redactedData = redactor.mask()

console.log(redactedData)
/*
{
    "action": "C**********n",
    "id": "8******************************1",
    "payload": {
        "id": "1******************************8",
        "firstName": "T*****g",
        "lastName": "T*****g",
        "middleName": "",
        "dateOfBirth": "1********0",
        "email": "t********i@gmail.com",
        "phone": "1*******9",
        "address": {
            "address": "t****************s",
            "address2": "t****************s",
            "zipcode": 1234
        },
        "countryCode": "p***",
        "tenantId": 100
    }
}
*/
```

## Excluding Specific Properties

You can also specify properties to exclude from masking by passing an array of property paths to the `exclude` method:

```javascript
const excludeProperties = ["action", "payload.id", "payload.countryCode"]
const redactorWithExclusions = new DataRedactor(personCreateBody).exclude(excludeProperties).mask()

console.log(redactorWithExclusions)
/*
{
    "action": "CreatePerson",
    "id": "8******************************1",
    "payload": {
        "id": "12345678-1234-1234-1234-12345678",
        "firstName": "T*****g",
        "lastName": "T*****g",
        "middleName": "",
        "dateOfBirth": "1********0",
        "email": "t********i@gmail.com",
        "phone": "1*******9",
        "address": {
            "address": "t****************s",
            "address2": "t****************s",
            "zipcode": 1234
        },
        "countryCode": "pk",
        "tenantId": 100
    }
}
*/
```

## Including Specific Properties

You can also specify properties to include in masking by passing an array of property paths to the `include` method:

```javascript
const includeProperties = ["payload.firstName", "payload.lastName"]
const redactorWithInclusions = new DataRedactor(personCreateBody).include(includeProperties).mask()

console.log(redactorWithInclusions)
/*
{
    "action": "CreatePerson",
    "id": "87654321-4321-4321-4321-87654321",
    "payload": {
        "id": "12345678-1234-1234-1234-12345678",
        "firstName": "T*****g",
        "lastName": "T*****g",
        "middleName": "",
        "dateOfBirth": "1992-12-20",
        "email": "testingapi@gmail.com",
        "phone": "123456789",
        "address": {
            "address": "testinging address",
            "address2": "testinging address",
            "zipcode": 1234
        },
        "countryCode": "pk",
        "tenantId": 100
    }
}
*/
```

## Change the masking Characters

You can also specify Symbol to use in masking by passing a symbol to the `setMaskChar` method:

```javascript
const redactorWithCustomSymbol = new DataRedactor(personCreateBody).setMaskChar(".").mask()

console.log(redactorWithCustomSymbol)
/*
{
    "action": "C..........n",
    "id": "8..............................1",
    "payload": {
        "id": "1..............................8",
        "firstName": "T.....g",
        "lastName": "T.....g",
        "middleName": "",
        "dateOfBirth": "1........0",
        "email": "t........i@gmail.com",
        "phone": "1.......9",
        "address": {
            "address": "t................s",
            "address2": "t................s",
            "zipcode": 1234
        },
        "countryCode": "p...",
        "tenantId": 100
    }
}
*/
```

## Methods

`mask(): any`
Redacts PII from the provided data object.

`exclude(keys: string | string[]): DataRedactor`
Specifies properties to exclude from masking.

`include(keys: string | string[]): DataRedactor`
Specifies properties to include in masking.

`setMaskChar(char: string): DataRedactor`
Sets a custom character to use for masking.

- keys: The property paths to be excluded or included.
- char: The custom character for masking.

<h2>Release letter for version 6.1.0</h2>

<h1>Release letter for sprinting-retail-common</h1>

<h2>Release letter for version 6.1.0</h2>

- Changed handling of SecurityException's to have this http response in non-prod:

```
{
          "contextData": {
            "key": "value",
          },
          "debugMessage": "SecurityException(ERROR_NAME: SecurityException | HTTP_STATUS: 403 | ERR_ID: xxx | ERROR_DESCRIPTION: Description | CONTEXT_DATA: { key: 'value' }) ",
          "errorName": "SecurityException",
          "errorTraceId": "xxx",
          "httpStatus": 403,
          "message": "Description",
          "stacktrace": Any<String>,
        }
```

and this http response in prod:

```
        {
          "errorName": "SecurityException",
          "errorTraceId": "xxx",
          "httpStatus": 403,
          "note": "Error details can be looked up in Kibana",
        }
```

<h2>Release letter for version 6.0.12</h2>

- Fixed an issue in error handling when certain properties were undefined

<h2>Release letter for version 6.0.11</h2>

- Improved handling of HttpException errors from Nest making sure all relevant error details are correctly logged to console, ELK and http response

<h2>Release letter for version 6.0.5 -> 6.0.10</h2>

- Various changes related to seeding
- Improved handling of the case where no environment is specified and we will default to envPrefix z.

<h2>Release letter for version 6.0.5</h2>

- Introduced PrincipalEnum base data

<h2>Release letter for version 6.0.4</h2>

- Adding custom message support in event logger using LoggerService

<h2>Release letter for version 6.0.3</h2>

- Changing the environment names in application logs so that it is, say, p-personserviceapi instead of p-env-personserviceapi

<h2>Release letter for version 6.0.2</h2>

Breaking changes:

- LoggerService.event() is fixed not. At the same time the signature of this function has been altered.

Other changes:

- The env-suffix issue has been solved. Meaning, the index in ELK is now properly named so instead of p-env-bifrostbackend* it would be called p-bifrostbackend*

<h2>Release letter for version 5.2.0</h2>

- Improve error reporting so that the full error details are printed in a better way
- Improve error http response to include the debug message and stacktrace in non-production
- Improving console logs by making them simpler localhost

<h2>Release letter for version 5.1.5</h2>

- Improving error reporting by adding messages from inner errors to the field in ELK called error.exception.message. This makes more details from the errors searchable.
- Improving error reporting by preserving the original stacktrace so that errors can be clearly understood.

<h2>Release letter for version 5.1.4</h2>

Breaking changes:

- LoggerService `event` logger now accepts additionalData which takes eventCategory, commonContext, and a new custom message property.
  event name, data, and category are now part of the log event object instead of serialized message string.

<h2>Release letter for version 5.0.1</h2>

Multiple breaking changes were made here.

- ApmHelper is now implemented as a traditional singleton pattern to make it work better with NestJS DI. It has these
  consequences:
  - All functions on the ApmHelper such as startSpan() is now normal methods, not static functions. Hence you need to
    change code such as ApmHelper.startSpan() to ApmHelper.Instance.startSpan().

<h2>Release letter for version 4.5.0</h2>

- Upgrading package elastic-apm-node to latest version

<h2>Release letter for version 4.4.1</h2>

- We now support process.env.NODE_ENV to either include the "-env" or not meaning that both of these will work:
  - NODE_ENV=d
  - NODE_ENV=d-env

<h2>Release letter for version 4.4.0</h2>

- Logged messages are now truncated to 8457 characters
- Logger instance is now static singleton in LoggerService
- Improved process level uncaughtException handling

<h2>Release letter for version 4.3.0</h2>

- added auto seeding functional

<h2>Release letter for version 4.2.0</h2>

- object seeding support

<h1>Release letter for sprinting-retail-common</h1>

<h2>Release letter for version 4.1.4</h2>

- APM metrics sent every 10 second instead of every 120 second
-

<h2>Release letter for version 4.1.0</h2>

- APM configuration extended with all options available in APM as of latest version Aug 2023
- captureHeaders is set to false in p-envs and true otherwise
- captureBody is set to errors in p-envs and all otherwise

<h2>Release letter for version 4.0.2</h2>

- Adding a pipeline to publish to npm with automation.

<h2>Release letter for version 4.0.0</h2>

- Introduced seeding framework for faster and simpler seeding

<h2>Release letter for version 3.0.6</h2>

- Introduced new config "enableConsoleLogs" for determining if winston logger should log errors to console, true by
  default.
- Fixed lint issues.

<h2>Release letter for version 3.0.4</h2>

- Adding support of common context fields in ELK logs
- A small fix for axios error handling - prevent "TypeError: Cannot set properties of undefined" when the axios request
  has no auth config.

<h2>Release letter for version 3.0.3</h2>

- Small refactoring
- Handling of axios errors so they cannot overflow logs

<h2>Release letter for version 3.0.2</h2>

- Adding a default process-level handler for unhandledRejection event, preventing server crash in case of unawaited
  promises. This handler will log an error in case of such events

<h2>Release letter for version 3.0.1</h2>

- Adding extra convenience method to logException with less cluttered code

<h2>Release letter for version 3.0.0</h2>

- Changing name from AppException to Exception.
- Adding SecurityException which is special in the way that only the errorName is sent over the wire and the rest needs
  to be looked up in the error logs.

<h2>Release letter for version 2.6.2</h2>

- Moving some dependencies from dependencies to devDependencies and removing unused ones

<h2>Release letter for version 2.6.1</h2>

- Removing eventTs (event timestamp) from the log.event interface as it complicates things
- BREAKING CHANGE: Simplify the signature of the logError method. You can no longer pass in LogContext, only
  ContextData.

<h2>Release letter for version 2.6.0</h2>

- Adding support for context data in logs.
- Adding support of custom events in logs.

## <h2>Release letter for version 2.5.0</h2>

- Simplify stacktrace generation to make sure stacktraces are clickable in the IDEs

<h2>Release letter for version 2.4.0</h2>

1. The environment variables have been normalized to be consistent with the underlying property names.

This means that the following names have changed:

- process.env.ENABLE_LOGS -> APM_ENABLE_LOGS
- process.env.ELK_SERVICE_URL -> APM_SERVER_URL
- process.env.ELK_SERVICE_SECRET -> APM_SECRET_TOKEN
- process.env.ELK_SERVICE_NAME -> APM_SERVICE_NAME
- process.env.ELK_APM_SAMPLINGRATE -> APM_TRANSACTION_SAMPLE_RATE

The logic is done inside the class RetailCommonConfigConvict

<h2>Release letter for version 2.3.0</h2>

- Making the the new error format with httpStatus instead of statusCode the default choice. Make sure your clients adopt
  the new behavior if they rely on the statusCode field.
- Adding stacktraces to errors in APM

<h2>Release letter for version 2.2</h2>

- Adding errorTraceId on all errors
- Changing the method ApmHelper.setLabel to ApmHelper.setLabelOnCurrentTransaction to make it more self-explanatory

<h2>Release letter for version 2.0</h2>

- Easier setup by import of the CommonAppModule

<h2>Release letter for version 1.0.4</h2>

Breaking changes:

- apmSamplingRate has changed name to transactionSampleRate

```

```
