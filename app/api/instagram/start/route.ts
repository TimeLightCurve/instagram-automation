import { type NextRequest, NextResponse } from 'next/server';

import {
  createInstagramAuthorizationUrl,
  instagramConfiguration,
} from '@/lib/server/instagram';
import {
  createOAuthState,
  oauthStateCookieName,
  secureCookie,
  signSessionValue,
} from '@/lib/server/session';

export async function GET(request: NextRequest) {
  const config = instagramConfiguration();
  if (!config.configured) {
    return Response.json(
      {
        error: 'Instagram connection is not configured.',
        missing: config.missing,
      },
      { status: 503 },
    );
  }

  const configuredOrigin = new URL(config.appUrl).origin;
  if (request.nextUrl.origin !== configuredOrigin) {
    return NextResponse.redirect(
      new URL('/api/instagram/start', configuredOrigin),
    );
  }

  const state = createOAuthState();
  const response = NextResponse.redirect(
    createInstagramAuthorizationUrl(state),
  );
  response.cookies.set(oauthStateCookieName, signSessionValue(state), {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}
