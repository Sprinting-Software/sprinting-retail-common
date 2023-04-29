<h1>Release letter for sprinting-retail-common</h1>

<h2>Release letter for version 2.6.2</h2>

- Moving some dependencies from dependencies to devDependencies and removing unused ones

<h2>Release letter for version 2.6.1</h2>

- Removing eventTs (event timestamp) from the log.event interface as it complicates things
- BREAKING CHANGE: Simplify the signature of the logError method. You can no longer pass in LogContext, only ContextData.  

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

- Making the the new error format with httpStatus instead of statusCode the default choice. Make sure your clients adopt the new behavior if they rely on the statusCode field. 
- Adding stacktraces to errors in APM


<h2>Release letter for version 2.2</h2>

- Adding errorTraceId on all errors
- Changing the method ApmHelper.setLabel to ApmHelper.setLabelOnCurrentTransaction to make it more self-explanatory

<h2>Release letter for version 2.0</h2>

- Easier setup by import of the CommonAppModule

<h2>Release letter for version 1.0.4</h2>

Breaking changes: 
- apmSamplingRate has changed name to transactionSampleRate

