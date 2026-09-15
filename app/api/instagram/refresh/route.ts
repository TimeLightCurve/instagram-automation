import { getCurrentInstagramAccountId } from '@/lib/server/current-account';
import {
  getInstagramProfile,
  refreshInstagramToken,
} from '@/lib/server/instagram';
import {
  accessTokenFromConnection,
  connectionToView,
  getInstagramConnection,
  markInstagramConnection,
  markInstagramVerified,
  recordJobSafe,
  updateInstagramToken,
} from '@/lib/server/records';

export async function POST() {
  const startedAt = new Date();
  const accountId = await getCurrentInstagramAccountId();
  if (!accountId)
    return Response.json(
      { error: 'No Instagram account is connected.' },
      { status: 401 },
    );
  const connection = await getInstagramConnection(accountId);
  if (!connection)
    return Response.json(
      { error: 'The saved connection was not found.' },
      { status: 404 },
    );

  try {
    const currentToken = accessTokenFromConnection(connection);
    const profile = await getInstagramProfile(currentToken);
    const tokenAge =
      Date.now() - (connection.tokenIssuedAt ?? connection.createdAt).getTime();
    const canRefresh = tokenAge >= 24 * 60 * 60 * 1000;
    if (canRefresh) {
      const refreshed = await refreshInstagramToken(currentToken);
      await updateInstagramToken(
        accountId,
        refreshed.accessToken,
        refreshed.expiresIn,
      );
    } else {
      await markInstagramVerified(accountId);
    }
    await recordJobSafe({
      accountId,
      kind: 'instagram.refresh',
      status: 'completed',
      summary: canRefresh
        ? `Verified @${profile.username} and refreshed its token.`
        : `Verified @${profile.username}; the new token does not need refreshing yet.`,
      startedAt,
    });
    return Response.json(
      connectionToView(await getInstagramConnection(accountId)),
    );
  } catch (error) {
    await markInstagramConnection(accountId, 'error');
    const message =
      error instanceof Error
        ? error.message
        : 'Instagram token refresh failed.';
    await recordJobSafe({
      accountId,
      kind: 'instagram.refresh',
      status: 'failed',
      summary: message,
      startedAt,
    });
    return Response.json({ error: message }, { status: 502 });
  }
}
