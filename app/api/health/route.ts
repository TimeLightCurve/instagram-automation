import type { NextRequest } from 'next/server';

import { getCurrentInstagramAccountId } from '@/lib/server/current-account';
import {
  instagramConfiguration,
  instagramRedirectUri,
} from '@/lib/server/instagram';
import { getDatabase, isMongoConfigured } from '@/lib/server/mongodb';

export async function GET(request: NextRequest) {
  const requestOrigin = request.nextUrl.origin;
  const config = instagramConfiguration(requestOrigin);
  let database: 'connected' | 'not-configured' | 'unavailable' =
    'not-configured';
  if (isMongoConfigured()) {
    try {
      await (await getDatabase()).command({ ping: 1 });
      database = 'connected';
    } catch {
      database = 'unavailable';
    }
  }
  const accountId = await getCurrentInstagramAccountId();
  return Response.json({
    status: database === 'unavailable' ? 'degraded' : 'ok',
    accountMode: accountId ? 'professional' : 'personal',
    instagramApi: config.configured ? 'configured' : 'not-configured',
    redirectUri: config.appUrl
      ? instagramRedirectUri(requestOrigin)
      : null,
    database,
    timestamp: new Date().toISOString(),
  });
}
