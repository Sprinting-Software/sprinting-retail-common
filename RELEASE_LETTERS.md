<h1>Release letter for sprinting-retail-common</h1>

<h2>Release letter for version 2.2.1</h2>

- Making the the new error format with httpStatus instead of statusCode the default choice. Make sure your clients adopt the new behavior if they rely on the statusCode field. 
- 


<h2>Release letter for version 2.2</h2>

- Adding errorTraceId on all errors
- Changing the method ApmHelper.setLabel to ApmHelper.setLabelOnCurrentTransaction to make it more self-explanatory

<h2>Release letter for version 2.0</h2>

- Easier setup by import of the CommonAppModule

<h2>Release letter for version 1.0.4</h2>

Breaking changes: 
- apmSamplingRate has changed name to transactionSampleRate
