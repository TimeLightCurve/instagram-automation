import { getCurrentInstagramAccountId } from '@/lib/server/current-account';
import {
  instagramConfiguration,
  instagramRedirectUri,
  instagramWebhookCallbackUrl,
} from '@/lib/server/instagram';
import {
  connectionToView,
  getInstagramConnection,
  markInstagramConnection,
} from '@/lib/server/records';

export async function GET() {
  const config = instagramConfiguration();
  const setupUrls = config.appUrl
    ? {
        oauthRedirectUri: instagramRedirectUri(),
        webhookCallbackUrl: instagramWebhookCallbackUrl(),
      }
    : {};
  if (!config.configured) {
    return Response.json({
      ...connectionToView(null, config.missing),
      ...setupUrls,
    });
  }

  const accountId = await getCurrentInstagramAccountId();
  let connection = accountId ? await getInstagramConnection(accountId) : null;
  if (
    connection?.status === 'connected' &&
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() <= Date.now()
  ) {
    await markInstagramConnection(connection.instagramUserId, 'expired');
    connection = await getInstagramConnection(connection.instagramUserId);
  }
  return Response.json({
    ...connectionToView(connection, config.missing),
    ...setupUrls,
  });
}
