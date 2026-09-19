import type { NextRequest } from 'next/server';

import {
  listInstagramConversations,
  listInstagramMessages,
} from '@/lib/server/inbox';
import { getCurrentInstagramAccountId } from '@/lib/server/current-account';

export async function GET(request: NextRequest) {
  const accountId = await getCurrentInstagramAccountId();
  if (!accountId)
    return Response.json(
      { error: 'Connect Instagram first.' },
      { status: 401 },
    );
  const conversationId = request.nextUrl.searchParams.get('conversationId');
  const after = request.nextUrl.searchParams.get('after');
  try {
    const data = conversationId
      ? await listInstagramMessages(accountId, conversationId, after)
      : await listInstagramConversations(accountId, after);
    return Response.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Instagram inbox is unavailable.';
    const status = message.includes('permission')
      ? 403
      : message.includes('Invalid')
        ? 400
        : 502;
    return Response.json({ error: message }, { status });
  }
}
