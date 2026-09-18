import { type NextRequest } from 'next/server';

import type { MonitoringSnapshot } from '@/lib/instagram/types';
import { getCurrentInstagramAccountId } from '@/lib/server/current-account';
import {
  instagramConfiguration,
  instagramRedirectUri,
} from '@/lib/server/instagram';
import { isMongoConfigured } from '@/lib/server/mongodb';
import {
  connectionToView,
  getInstagramConnection,
  getJobTotals,
  listJobs,
} from '@/lib/server/records';

export async function GET(request: NextRequest) {
  const checkedAt = new Date().toISOString();
  const origin = request.nextUrl.origin;
  const config = instagramConfiguration(origin);
  const redirectUri = config.appUrl ? instagramRedirectUri(origin) : undefined;
  if (!isMongoConfigured()) {
    const snapshot: MonitoringSnapshot = {
      database: 'not-configured',
      account: connectionToView(null, config.missing, redirectUri),
      totals: { all: 0, completed: 0, failed: 0, blocked: 0, last24Hours: 0 },
      recentJobs: [],
      checkedAt,
    };
    return Response.json(snapshot);
  }

  try {
    const accountId = await getCurrentInstagramAccountId();
    if (!accountId) {
      const snapshot: MonitoringSnapshot = {
        database: 'connected',
        account: connectionToView(null, config.missing, redirectUri),
        totals: { all: 0, completed: 0, failed: 0, blocked: 0, last24Hours: 0 },
        recentJobs: [],
        checkedAt,
      };
      return Response.json(snapshot);
    }
    const [connection, totals, recentJobs] = await Promise.all([
      getInstagramConnection(accountId),
      getJobTotals(accountId),
      listJobs(accountId, 30),
    ]);
    const snapshot: MonitoringSnapshot = {
      database: 'connected',
      account: connectionToView(connection, config.missing, redirectUri),
      totals,
      recentJobs,
      checkedAt,
    };
    return Response.json(snapshot);
  } catch {
    const snapshot: MonitoringSnapshot = {
      database: 'unavailable',
      account: connectionToView(null, config.missing, redirectUri),
      totals: { all: 0, completed: 0, failed: 0, blocked: 0, last24Hours: 0 },
      recentJobs: [],
      checkedAt,
    };
    return Response.json(snapshot, { status: 503 });
  }
}
