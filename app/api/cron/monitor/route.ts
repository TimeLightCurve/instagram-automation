import { refreshInstagramToken } from '@/lib/server/instagram';
import {
  accessTokenFromConnection,
  listConnectionsExpiringBefore,
  markInstagramConnection,
  recordJobSafe,
  updateInstagramToken,
} from '@/lib/server/records';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const due = await listConnectionsExpiringBefore(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const results = await Promise.all(
    due.map(async (connection) => {
      const startedAt = new Date();
      try {
        const token = await refreshInstagramToken(
          accessTokenFromConnection(connection),
        );
        await updateInstagramToken(
          connection.instagramUserId,
          token.accessToken,
          token.expiresIn,
        );
        await recordJobSafe({
          accountId: connection.instagramUserId,
          kind: 'monitor.token-refresh',
          status: 'completed',
          summary: `Automatically refreshed @${connection.username}.`,
          startedAt,
        });
        return { accountId: connection.instagramUserId, status: 'completed' };
      } catch (error) {
        await markInstagramConnection(connection.instagramUserId, 'error');
        await recordJobSafe({
          accountId: connection.instagramUserId,
          kind: 'monitor.token-refresh',
          status: 'failed',
          summary:
            error instanceof Error
              ? error.message
              : 'Automatic token refresh failed.',
          startedAt,
        });
        return { accountId: connection.instagramUserId, status: 'failed' };
      }
    }),
  );

  return Response.json({
    checked: due.length,
    results,
    checkedAt: new Date().toISOString(),
  });
}
