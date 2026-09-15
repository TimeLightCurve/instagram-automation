import { NextResponse } from 'next/server';

import { getCurrentInstagramAccountId } from '@/lib/server/current-account';
import {
  disconnectInstagramConnection,
  recordJobSafe,
} from '@/lib/server/records';
import { connectionCookieName } from '@/lib/server/session';

export async function POST() {
  const accountId = await getCurrentInstagramAccountId();
  if (accountId) {
    await disconnectInstagramConnection(accountId);
    await recordJobSafe({
      accountId,
      kind: 'instagram.disconnect',
      status: 'completed',
      summary: 'Disconnected the Instagram account from Orbit.',
    });
  }
  const response = NextResponse.json({ disconnected: true });
  response.cookies.delete(connectionCookieName);
  return response;
}
