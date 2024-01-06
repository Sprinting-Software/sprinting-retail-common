<h1>Release letter for sprinting-retail-common</h1>

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

<h2>Release letter for version 2.5.0</h2>
- 

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

