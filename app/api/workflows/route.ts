import { getWorkflowEngine, workflowCatalog } from '@/lib/workflows/catalog';
import type { AccountMode } from '@/lib/workflows/types';
import { getCurrentInstagramAccountId } from '@/lib/server/current-account';
import { recordJobSafe } from '@/lib/server/records';

export async function GET() {
  return Response.json({ workflows: workflowCatalog });
}

export async function POST(request: Request) {
  const startedAt = new Date();
  const body = (await request.json()) as {
    workflowId?: string;
    accountMode?: AccountMode;
    approved?: boolean;
    payload?: Record<string, unknown>;
  };

  const engine = getWorkflowEngine(body.workflowId ?? '');
  if (!engine)
    return Response.json({ error: 'Unknown workflow.' }, { status: 404 });

  if (body.workflowId !== 'content-prep') {
    return Response.json(
      {
        error:
          'This workflow has no provider action yet. It cannot be run as an automation.',
      },
      { status: 501 },
    );
  }

  const result = await engine.run({
    accountMode:
      body.accountMode === 'professional' ? 'professional' : 'personal',
    approved: body.approved === true,
    payload: body.payload ?? {},
  });

  await recordJobSafe({
    accountId: await getCurrentInstagramAccountId(),
    kind: `workflow.${result.id}`,
    status: result.status === 'completed' ? 'completed' : 'blocked',
    summary: result.results.at(-1)?.message ?? 'Workflow finished.',
    metadata: { workflowId: result.id, nodeCount: result.results.length },
    startedAt,
  });

  return Response.json(result);
}
