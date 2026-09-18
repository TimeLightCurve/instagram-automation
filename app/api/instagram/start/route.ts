import { type NextRequest, NextResponse } from 'next/server';

import {
  createInstagramAuthorizationUrl,
  instagramConfiguration,
  instagramRedirectUri,
} from '@/lib/server/instagram';
import {
  createOAuthState,
  isSecureCookie,
  oauthStateCookieName,
  signSessionValue,
} from '@/lib/server/session';

export async function GET(request: NextRequest) {
  const requestOrigin = request.nextUrl.origin;
  const config = instagramConfiguration(requestOrigin);
  if (!config.configured) {
    return Response.json(
      {
        error: 'Instagram connection is not configured.',
        missing: config.missing,
        redirectUri: config.appUrl
          ? instagramRedirectUri(requestOrigin)
          : null,
      },
      { status: 503 },
    );
  }

  const configuredOrigin = new URL(config.appUrl).origin;
  if (requestOrigin !== configuredOrigin) {
    return NextResponse.redirect(
      new URL('/api/instagram/start', configuredOrigin),
    );
  }

  const state = createOAuthState();
  const response = NextResponse.redirect(
    createInstagramAuthorizationUrl(state, requestOrigin),
  );
  response.cookies.set(oauthStateCookieName, signSessionValue(state), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie(configuredOrigin),
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}
