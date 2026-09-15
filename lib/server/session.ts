import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const connectionCookieName = 'orbit_instagram_connection';
export const oauthStateCookieName = 'orbit_instagram_oauth_state';

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET must be configured with at least 32 characters.',
    );
  }
  return secret;
}

function signature(value: string) {
  return createHmac('sha256', sessionSecret())
    .update(value)
    .digest('base64url');
}

export function signSessionValue(value: string) {
  return `${value}.${signature(value)}`;
}

export function verifySessionValue(signedValue: string | undefined) {
  if (!signedValue) return null;
  const separator = signedValue.lastIndexOf('.');
  if (separator < 1) return null;
  const value = signedValue.slice(0, separator);
  const received = Buffer.from(signedValue.slice(separator + 1));
  const expected = Buffer.from(signature(value));
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    return null;
  return value;
}

export function createOAuthState() {
  return randomBytes(24).toString('base64url');
}

export const secureCookie =
  process.env.APP_URL?.startsWith('https://') ?? false;
