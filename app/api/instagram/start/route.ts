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
  const origin = request.nextUrl.origin;
  const config = instagramConfiguration(origin);
  if (!config.configured) {
    return Response.json(
      {
        error: 'Instagram connection is not configured.',
        missing: config.missing,
        redirectUri: config.appUrl ? instagramRedirectUri(origin) : null,
      },
      { status: 503 },
    );
  }

  const state = createOAuthState();
  const response = NextResponse.redirect(
    createInstagramAuthorizationUrl(state, origin),
  );
  response.cookies.set(oauthStateCookieName, signSessionValue(state), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie(origin),
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}
