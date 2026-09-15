import { cookies } from 'next/headers';

import { connectionCookieName, verifySessionValue } from '@/lib/server/session';

export async function getCurrentInstagramAccountId() {
  if (!process.env.SESSION_SECRET) return null;
  const store = await cookies();
  return verifySessionValue(store.get(connectionCookieName)?.value);
}
