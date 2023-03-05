import { CommonException } from './CommonException';
import util from 'util';

describe('CommonException', () => {
  const httpStatus = 500;
  const errorName = 'TestError';
  const contextData = { somekey: 'somevalue' };
  const description = 'Test description';
  const innerError = new Error('Inner error message');

  describe('constructor', () => {
    it('should create a new instance of CommonException', () => {
      const exception = new CommonException(httpStatus, errorName);
      expect(exception).toBeInstanceOf(CommonException);
    });

    it('should set httpStatus, errorName, contextData, description, and innerError properties', () => {
      const exception = new CommonException(httpStatus, errorName, contextData, description, innerError);
      expect(exception.httpStatus).toEqual(httpStatus);
      expect(exception.errorName).toEqual(errorName);
      expect(exception.contextData).toEqual(contextData);
      expect(exception.description).toEqual(description);
      expect(exception.innerError).toEqual(innerError);
    });

    it('should set description and innerError to undefined if not provided', () => {
      const exception = new CommonException(httpStatus, errorName, contextData);
      expect(exception.description).toBeUndefined();
      expect(exception.innerError).toBeUndefined();
    });
  });

  describe('toPrintFriendlyString', () => {
    it('should return a string with error details', () => {
      const exception = new CommonException(httpStatus, errorName, contextData, description, innerError);
      const result = exception.toPrintFriendlyString();
      expect(result).toContain(errorName);
      expect(result).toContain(httpStatus.toString());
      expect(result).toContain(util.inspect(contextData));
      expect(result).toContain(description);
      expect(result).toContain(innerError.message);
    });
  });

  describe('toJson', () => {
    it('should return an object with error details', () => {
      const exception = new CommonException(httpStatus, errorName, contextData, description, innerError);
      const result = exception.toJson();
      expect(result.errorName).toEqual(errorName);
      expect(result.contextData).toEqual(contextData);
      expect(result.description).toEqual(description);
      expect(result.innerError).toEqual('Error: Inner error message');
    });
  });

  describe('addContextData', () => {
    it('should add context data to the contextData property', () => {
      const exception = new CommonException(httpStatus, errorName, contextData);
      const newContextData = { newKey: 'newValue' };
      const updatedException = exception.addContextData(newContextData);
      expect(updatedException.contextData).toEqual({ ...contextData, ...newContextData });
    });
  });

  describe('setInnerError', () => {
    it('should set the innerError property', () => {
      const exception = new CommonException(httpStatus, errorName);
      const updatedException = exception.setInnerError(innerError);
      expect(updatedException.innerError).toEqual(innerError);
    });
  });

  describe('setDescription', () => {
    it('should set the description property', () => {
      const exception = new CommonException(httpStatus, errorName);
      const updatedException = exception.setDescription(description);
      expect(updatedException.description).toEqual(description);
    });
  });
});
