const defaultScopes = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
];

function normalizeOrigin(value: string | undefined | null) {
  return value?.trim().replace(/\/$/, '') || '';
}

export function resolveAppUrl(requestOrigin?: string | null) {
  return (
    normalizeOrigin(requestOrigin) ||
    normalizeOrigin(process.env.APP_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  );
}

export function instagramConfiguration(requestOrigin?: string | null) {
  const values = {
    appId: process.env.INSTAGRAM_APP_ID?.trim() || '',
    appSecret: process.env.INSTAGRAM_APP_SECRET?.trim() || '',
    appUrl: resolveAppUrl(requestOrigin),
    graphVersion: process.env.META_GRAPH_API_VERSION?.trim() || 'v26.0',
    scopes: (process.env.INSTAGRAM_SCOPES || defaultScopes.join(','))
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean),
  };
  const missing = [
    !process.env.MONGODB_URI && 'MONGODB_URI',
    !process.env.TOKEN_ENCRYPTION_KEY && 'TOKEN_ENCRYPTION_KEY',
    !process.env.SESSION_SECRET && 'SESSION_SECRET',
    !values.appId && 'INSTAGRAM_APP_ID',
    !values.appSecret && 'INSTAGRAM_APP_SECRET',
    !values.appUrl && 'APP_URL',
  ].filter((value): value is string => Boolean(value));
  return { ...values, missing, configured: missing.length === 0 };
}

export function instagramRedirectUri(requestOrigin?: string | null) {
  const config = instagramConfiguration(requestOrigin);
  return `${config.appUrl}/api/instagram/callback`;
}

export function instagramWebhookCallbackUrl() {
  const config = instagramConfiguration();
  return `${config.appUrl}/api/instagram/webhook`;
}

async function metaJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const nested =
      data.error && typeof data.error === 'object'
        ? (data.error as { message?: unknown }).message
        : undefined;
    const message =
      typeof nested === 'string'
        ? nested
        : typeof data.error_message === 'string'
          ? data.error_message
          : `Instagram returned HTTP ${response.status}.`;
    throw new Error(message);
  }
  return data;
}

export function createInstagramAuthorizationUrl(
  state: string,
  requestOrigin?: string | null,
) {
  const config = instagramConfiguration(requestOrigin);
  if (!config.configured)
    throw new Error(`Missing configuration: ${config.missing.join(', ')}`);
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', config.appId);
  url.searchParams.set('redirect_uri', instagramRedirectUri(requestOrigin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(','));
  url.searchParams.set('state', state);
  url.searchParams.set('enable_fb_login', '0');
  url.searchParams.set('force_authentication', '1');
  return url;
}

export async function exchangeInstagramCode(
  code: string,
  requestOrigin?: string | null,
) {
  const config = instagramConfiguration(requestOrigin);
  const body = new FormData();
  body.set('client_id', config.appId);
  body.set('client_secret', config.appSecret);
  body.set('grant_type', 'authorization_code');
  body.set('redirect_uri', instagramRedirectUri(requestOrigin));
  body.set('code', code.replace(/#_$/, ''));
  const shortToken = await metaJson(
    'https://api.instagram.com/oauth/access_token',
    {
      method: 'POST',
      body,
    },
  );
  if (typeof shortToken.access_token !== 'string')
    throw new Error('Instagram did not return an access token.');

  const exchange = new URL('https://graph.instagram.com/access_token');
  exchange.searchParams.set('grant_type', 'ig_exchange_token');
  exchange.searchParams.set('client_secret', config.appSecret);
  exchange.searchParams.set('access_token', shortToken.access_token);
  const longToken = await metaJson(exchange.toString());
  if (typeof longToken.access_token !== 'string')
    throw new Error('Instagram did not return a long-lived token.');
  return {
    accessToken: longToken.access_token,
    expiresIn:
      typeof longToken.expires_in === 'number'
        ? longToken.expires_in
        : 5_184_000,
  };
}

export async function getInstagramProfile(accessToken: string) {
  const config = instagramConfiguration();
  const url = new URL(`https://graph.instagram.com/${config.graphVersion}/me`);
  url.searchParams.set(
    'fields',
    'id,user_id,username,name,account_type,profile_picture_url',
  );
  url.searchParams.set('access_token', accessToken);
  const data = await metaJson(url.toString());
  const idValue = data.user_id ?? data.id;
  const id =
    typeof idValue === 'string' || typeof idValue === 'number'
      ? String(idValue)
      : '';
  if (!id || typeof data.username !== 'string')
    throw new Error('Instagram profile details were incomplete.');
  return {
    id,
    username: data.username,
    name: typeof data.name === 'string' ? data.name : '',
    accountType:
      typeof data.account_type === 'string' ? data.account_type : 'BUSINESS',
    profilePictureUrl:
      typeof data.profile_picture_url === 'string'
        ? data.profile_picture_url
        : '',
  };
}

export async function refreshInstagramToken(accessToken: string) {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', accessToken);
  const data = await metaJson(url.toString());
  if (typeof data.access_token !== 'string')
    throw new Error('Instagram did not return a refreshed token.');
  return {
    accessToken: data.access_token,
    expiresIn:
      typeof data.expires_in === 'number' ? data.expires_in : 5_184_000,
  };
}
