import { type NextRequest, NextResponse } from 'next/server';

import {
  exchangeInstagramCode,
  getInstagramProfile,
  instagramConfiguration,
} from '@/lib/server/instagram';
import { recordJobSafe, saveInstagramConnection } from '@/lib/server/records';
import {
  connectionCookieName,
  isSecureCookie,
  oauthStateCookieName,
  signSessionValue,
  verifySessionValue,
} from '@/lib/server/session';

function panelRedirect(request: NextRequest, result: string) {
  const url = new URL('/', request.url);
  url.searchParams.set('instagram', result);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const startedAt = new Date();
  const requestOrigin = request.nextUrl.origin;
  const config = instagramConfiguration(requestOrigin);
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const errorMessage = request.nextUrl.searchParams.get('error_description');
  const cookieState = config.configured
    ? verifySessionValue(request.cookies.get(oauthStateCookieName)?.value)
    : null;

  if (
    !config.configured ||
    !code ||
    !state ||
    !cookieState ||
    state !== cookieState
  ) {
    await recordJobSafe({
      kind: 'instagram.connect',
      status: 'failed',
      summary: errorMessage || 'Instagram OAuth callback validation failed.',
      startedAt,
    });
    const response = panelRedirect(
      request,
      errorMessage ? 'denied' : 'invalid_state',
    );
    response.cookies.delete(oauthStateCookieName);
    return response;
  }

  try {
    const token = await exchangeInstagramCode(code, requestOrigin);
    const profile = await getInstagramProfile(token.accessToken);
    await saveInstagramConnection({
      instagramUserId: profile.id,
      username: profile.username,
      name: profile.name,
      accountType: profile.accountType,
      profilePictureUrl: profile.profilePictureUrl,
      accessToken: token.accessToken,
      scopes: config.scopes,
      expiresIn: token.expiresIn,
    });
    await recordJobSafe({
      accountId: profile.id,
      kind: 'instagram.connect',
      status: 'completed',
      summary: `Connected @${profile.username}.`,
      startedAt,
    });

    const response = panelRedirect(request, 'connected');
    response.cookies.delete(oauthStateCookieName);
    response.cookies.set(connectionCookieName, signSessionValue(profile.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureCookie(config.appUrl),
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    await recordJobSafe({
      kind: 'instagram.connect',
      status: 'failed',
      summary:
        error instanceof Error ? error.message : 'Instagram connection failed.',
      startedAt,
    });
    const response = panelRedirect(request, 'error');
    response.cookies.delete(oauthStateCookieName);
    return response;
  }
}
