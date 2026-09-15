import { getCurrentInstagramAccountId } from '@/lib/server/current-account';
import { getPanelState, savePanelState } from '@/lib/server/records';

export async function GET() {
  const accountId = await getCurrentInstagramAccountId();
  if (!accountId)
    return Response.json(
      { error: 'Connect Instagram first.' },
      { status: 401 },
    );
  return Response.json({ state: await getPanelState(accountId) });
}

export async function PUT(request: Request) {
  const accountId = await getCurrentInstagramAccountId();
  if (!accountId)
    return Response.json(
      { error: 'Connect Instagram first.' },
      { status: 401 },
    );
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 1_000_000) {
    return Response.json(
      { error: 'Panel state is too large.' },
      { status: 413 },
    );
  }
  const body = (await request.json()) as Record<string, unknown>;
  const content = Array.isArray(body.content) ? body.content.slice(0, 500) : [];
  const approvals = Array.isArray(body.approvals)
    ? body.approvals.slice(0, 1_000)
    : [];
  const watchlist = Array.isArray(body.watchlist)
    ? body.watchlist
        .filter((value): value is string => typeof value === 'string')
        .slice(0, 1_000)
    : [];
  await savePanelState(accountId, { content, approvals, watchlist });
  return Response.json({ saved: true, updatedAt: new Date().toISOString() });
}
