import { getCurrentInstagramAccountId } from '@/lib/server/current-account';
import { isMongoConfigured } from '@/lib/server/mongodb';
import { listJobs } from '@/lib/server/records';

export async function GET(request: Request) {
  if (!isMongoConfigured())
    return Response.json({ jobs: [], configured: false });
  const accountId = await getCurrentInstagramAccountId();
  if (!accountId) return Response.json({ jobs: [], configured: true });
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') || '50');
  return Response.json({
    jobs: await listJobs(accountId, limit),
    configured: true,
  });
}
