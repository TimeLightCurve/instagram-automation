import { createHmac, timingSafeEqual } from 'node:crypto';

import type { NextRequest } from 'next/server';

import { recordJobSafe } from '@/lib/server/records';

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode') ?? '';
  const token = request.nextUrl.searchParams.get('hub.verify_token') ?? '';
  const challenge = request.nextUrl.searchParams.get('hub.challenge') ?? '';
  const expectedToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim();

  if (!expectedToken) {
    return Response.json(
      { error: 'Instagram webhook verification is not configured.' },
      { status: 503 },
    );
  }

  if (
    mode !== 'subscribe' ||
    !challenge ||
    !safeEqual(token, expectedToken)
  ) {
    return Response.json(
      { error: 'Instagram webhook verification failed.' },
      { status: 403 },
    );
  }

  return new Response(challenge, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim();
  if (!appSecret) {
    return Response.json(
      { error: 'Instagram webhook signature verification is not configured.' },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256') ?? '';
  const expectedSignature = `sha256=${createHmac('sha256', appSecret)
    .update(body)
    .digest('hex')}`;

  if (!safeEqual(signature, expectedSignature)) {
    return Response.json(
      { error: 'Invalid Instagram webhook signature.' },
      { status: 401 },
    );
  }

  let payload: { object?: unknown; entry?: unknown[] };
  try {
    payload = JSON.parse(body) as { object?: unknown; entry?: unknown[] };
  } catch {
    return Response.json(
      { error: 'Invalid Instagram webhook payload.' },
      { status: 400 },
    );
  }

  const object =
    typeof payload.object === 'string' ? payload.object : 'instagram';
  const entryCount = Array.isArray(payload.entry) ? payload.entry.length : 0;
  await recordJobSafe({
    kind: 'instagram.webhook',
    status: 'completed',
    summary: `Received ${object} webhook with ${entryCount} entr${entryCount === 1 ? 'y' : 'ies'}.`,
    metadata: { object, entryCount },
  });

  return Response.json({ received: true });
}
