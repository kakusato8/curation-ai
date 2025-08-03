import { Env, JWTPayload } from '../types';

// Simple JWT implementation for Cloudflare Workers
export class JWT {
  static async sign(payload: any, secret: string, expiresIn = '7d'): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const exp = now + (expiresIn === '7d' ? 7 * 24 * 60 * 60 : 60 * 60);

    const jwtPayload = {
      ...payload,
      iat: now,
      exp,
    };

    const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadBase64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const data = `${headerBase64}.${payloadBase64}`;
    const signature = await this.sign256(data, secret);

    return `${data}.${signature}`;
  }

  static async verify(token: string, secret: string): Promise<JWTPayload> {
    const [headerBase64, payloadBase64, signature] = token.split('.');
    
    if (!headerBase64 || !payloadBase64 || !signature) {
      throw new Error('Invalid token format');
    }

    const data = `${headerBase64}.${payloadBase64}`;
    const expectedSignature = await this.sign256(data, secret);

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return payload;
  }

  private static async sign256(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const dataBuffer = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}

export async function validateAuth(request: Request, env: Env): Promise<JWTPayload> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization header');
  }

  const token = authHeader.substring(7);
  return await JWT.verify(token, env.JWT_SECRET);
}