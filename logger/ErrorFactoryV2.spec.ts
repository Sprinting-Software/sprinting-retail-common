import { ErrorFactoryV2 } from './ErrorFactoryV2';
describe('ErrorFactory2', () => {
  it('should createNamedException', () => {
    console.log(ErrorFactoryV2.createNamedException('MyError').toString());
    console.log(ErrorFactoryV2.createNamedException('MyError').toJson());
    console.log(
      ErrorFactoryV2.createNamedException('MyError', 'Detailed message', { a: 1, b: 2 })
        .setInnerError(new Error('Some other error'))
        .toString(),
    );
  });

  it('should create CommonException 2', () => {
    console.log(ErrorFactoryV2.createNamedException('MyError').toString());
  });
});
