import { type NextRequest, NextResponse } from 'next/server';

import { recordJobSafe } from '@/lib/server/records';

function webhookVerifyToken() {
  return process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim() || '';
}

/**
 * Meta webhook verification (GET) and event delivery (POST).
 * Callback URL must be this route — not /api/instagram/callback (OAuth).
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  const expected = webhookVerifyToken();

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json(
    {
      error: 'Webhook verification failed.',
      hint: expected
        ? 'Verify token does not match INSTAGRAM_WEBHOOK_VERIFY_TOKEN.'
        : 'Set INSTAGRAM_WEBHOOK_VERIFY_TOKEN in the server environment.',
    },
    { status: 403 },
  );
}

export async function POST(request: NextRequest) {
  const startedAt = new Date();
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const object =
    payload && typeof payload === 'object' && 'object' in payload
      ? String((payload as { object?: unknown }).object ?? '')
      : '';

  await recordJobSafe({
    kind: 'instagram.webhook',
    status: 'completed',
    summary: object
      ? `Received Instagram webhook for object "${object}".`
      : 'Received Instagram webhook payload.',
    startedAt,
    metadata:
      payload && typeof payload === 'object'
        ? { object: object || null }
        : undefined,
  });

  // Acknowledge immediately; Meta retries on non-2xx.
  return NextResponse.json({ received: true });
}
