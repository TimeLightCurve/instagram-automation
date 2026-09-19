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
  return result as GraphPage<T>;
}

export async function listInstagramConversations(
  accountId: string,
  after: string | null,
) {
  const token = await accountToken(accountId);
  const page = await graphPage<GraphConversation>(
    `${encodeURIComponent(accountId)}/conversations?platform=instagram&fields=id,updated_time,participants`,
    token,
    cursor(after),
  );
  return {
    conversations: (page.data ?? []).map((item) => ({
      id: item.id,
      updatedAt: item.updated_time ?? null,
      participants: (item.participants?.data ?? []).filter(
        (person) => person.id !== accountId,
      ),
    })),
    nextCursor: page.paging?.next ? (page.paging.cursors?.after ?? null) : null,
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
