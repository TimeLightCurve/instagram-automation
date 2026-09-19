import { instagramConfiguration, metaJson } from '@/lib/server/instagram';
import {
  accessTokenFromConnection,
  getInstagramConnection,
} from '@/lib/server/records';

type GraphPage<T> = {
  data?: T[];
  paging?: { cursors?: { after?: string }; next?: string };
};

type GraphConversation = {
  id: string;
  updated_time?: string;
  participants?: {
    data?: Array<{ id: string; username?: string; name?: string }>;
  };
};

type GraphMessage = {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id: string; username?: string };
  attachments?: {
    data?: Array<{
      type?: string;
      image_data?: { url?: string };
      video_data?: { url?: string };
    }>;
  };
};

function cursor(value: string | null) {
  return value && /^[A-Za-z0-9_=-]{1,2048}$/.test(value) ? value : null;
}

async function accountToken(accountId: string) {
  const connection = await getInstagramConnection(accountId);
  if (!connection || connection.status !== 'connected') {
    throw new Error('Connect Instagram first.');
  }
  if (!connection.scopes.includes('instagram_business_manage_messages')) {
    throw new Error('Reconnect Instagram with the manage messages permission.');
  }
  return accessTokenFromConnection(connection);
}

async function graphPage<T>(path: string, token: string, after: string | null) {
  const url = new URL(
    `https://graph.instagram.com/${instagramConfiguration().graphVersion}/${path}`,
  );
  url.searchParams.set('limit', '20');
  if (after) url.searchParams.set('after', after);
  const result = await metaJson(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!Array.isArray(result.data)) {
    throw new Error('Instagram returned an unexpected conversation response.');
  }
  return result as GraphPage<T>;
}

// Instagram Login exposes both /me and a numeric user_id. Some accounts return
// different identifiers for these fields; checking both read paths lets the
// panel distinguish an empty API result from a stale stored identity.
export async function inspectInstagramInbox(accountId: string) {
  const token = await accountToken(accountId);
  const configuration = instagramConfiguration();
  const profile = new URL(
    `https://graph.instagram.com/${configuration.graphVersion}/me`,
  );
  profile.searchParams.set('fields', 'id,user_id');
  const identity = await metaJson(profile.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meId =
    typeof identity.id === 'string' || typeof identity.id === 'number'
      ? String(identity.id)
      : '';
  const userId =
    typeof identity.user_id === 'string' || typeof identity.user_id === 'number'
      ? String(identity.user_id)
      : '';
  const routes = ['me', ...new Set([accountId, meId, userId].filter(Boolean))];
  const checks = await Promise.all(
    routes.map(async (route) => {
      try {
        const page = await graphPage<GraphConversation>(
          `${encodeURIComponent(route)}/conversations?platform=instagram&fields=id`,
          token,
          null,
        );
        return {
          route:
            route === 'me'
              ? 'me'
              : route === accountId
                ? 'connected account'
                : 'profile ID',
          count: page.data?.length ?? 0,
          hasMore: Boolean(page.paging?.next),
        };
      } catch (error) {
        return {
          route:
            route === 'me'
              ? 'me'
              : route === accountId
                ? 'connected account'
                : 'profile ID',
          error: error instanceof Error ? error.message : 'Meta request failed',
        };
      }
    }),
  );
  return {
    identityMatches: accountId === meId || accountId === userId,
    identifiersDiffer: Boolean(meId && userId && meId !== userId),
    checks,
  };
}

export async function listInstagramConversations(
  accountId: string,
  after: string | null,
) {
  const token = await accountToken(accountId);
  const path =
    'conversations?platform=instagram&fields=id,updated_time,participants';
  const usingMe = after?.startsWith('me.') ?? false;
  const next = cursor(usingMe ? after!.slice(3) : after);
  let source: 'account' | 'me' = usingMe ? 'me' : 'account';
  let page = await graphPage<GraphConversation>(
    `${usingMe ? 'me' : encodeURIComponent(accountId)}/${path}`,
    token,
    next,
  );
  // Keep each page on the same Meta edge. Only fall back when the first
  // explicit-account page is empty; the cursor prefix remains server-owned.
  if (!after && !page.data?.length) {
    page = await graphPage<GraphConversation>(`me/${path}`, token, null);
    source = 'me';
  }
  return {
    conversations: (page.data ?? []).map((item) => ({
      id: item.id,
      updatedAt: item.updated_time ?? null,
      participants: (item.participants?.data ?? []).filter(
        (person) => person.id !== accountId,
      ),
    })),
    nextCursor: page.paging?.next && page.paging.cursors?.after
      ? `${source === 'me' ? 'me.' : ''}${page.paging.cursors.after}`
      : null,
  };
}

export async function listInstagramMessages(
  accountId: string,
  conversationId: string,
  after: string | null,
) {
  if (!/^[A-Za-z0-9_]+$/.test(conversationId))
    throw new Error('Invalid conversation ID.');
  const token = await accountToken(accountId);
  // A conversation must belong to the connected account before its messages are returned.
  const ownershipUrl = new URL(
    `https://graph.instagram.com/${instagramConfiguration().graphVersion}/${conversationId}`,
  );
  ownershipUrl.searchParams.set('fields', 'id,participants');
  const ownership = await metaJson(ownershipUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const members =
    (ownership.participants as { data?: Array<{ id: string }> } | undefined)
      ?.data ?? [];
  if (!members.some((person) => person.id === accountId))
    throw new Error('Conversation is not part of this account.');
  const page = await graphPage<GraphMessage>(
    `${encodeURIComponent(conversationId)}/messages?fields=id,message,created_time,from,attachments`,
    token,
    cursor(after),
  );
  return {
    messages: (page.data ?? []).map((item) => ({
      id: item.id,
      text: item.message ?? '',
      createdAt: item.created_time ?? null,
      from: item.from ?? null,
      attachments: (item.attachments?.data ?? []).map((attachment) => ({
        type: attachment.type ?? 'attachment',
        url: attachment.image_data?.url ?? attachment.video_data?.url ?? null,
      })),
    })),
    nextCursor: page.paging?.next ? (page.paging.cursors?.after ?? null) : null,
  };
}
