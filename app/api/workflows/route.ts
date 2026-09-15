import { getWorkflowEngine, workflowCatalog } from '@/lib/workflows/catalog';
import type { AccountMode } from '@/lib/workflows/types';

export async function GET() {
  return Response.json({ workflows: workflowCatalog });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workflowId?: string;
    accountMode?: AccountMode;
    approved?: boolean;
    payload?: Record<string, unknown>;
  };

  const engine = getWorkflowEngine(body.workflowId ?? '');
  if (!engine) return Response.json({ error: 'Unknown workflow.' }, { status: 404 });

  const result = await engine.run({
    accountMode: body.accountMode === 'professional' ? 'professional' : 'personal',
    approved: body.approved === true,
    payload: body.payload ?? {},
  });

  return Response.json(result);
}
