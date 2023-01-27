import * as jws from 'jws';

export class Utils {
  static getJwtTokenData(token: string | undefined, field: string): string | undefined {
    if (token === undefined) return;
    const signature = token.split(' ')[1];
    if (!jws.isValid(signature)) {
      return;
    }
    
    const decodedJWT = jws.decode(signature);
    
    return decodedJWT.payload[field];
  }
}
