import type { WithId } from 'mongodb';

import type {
  InstagramAccountView,
  JobStatus,
  JobView,
} from '@/lib/instagram/types';
import { decryptSecret, encryptSecret } from '@/lib/server/crypto';
import { getDatabase, isMongoConfigured } from '@/lib/server/mongodb';

export type InstagramConnectionDocument = {
  instagramUserId: string;
  username: string;
  name: string;
  accountType: string;
  profilePictureUrl: string;
  encryptedAccessToken?: string;
  scopes: string[];
  tokenIssuedAt?: Date;
  tokenExpiresAt?: Date;
  lastVerifiedAt: Date;
  status: 'connected' | 'expired' | 'disconnected' | 'error';
  createdAt: Date;
  updatedAt: Date;
};

type JobDocument = {
  accountId: string | null;
  kind: string;
  status: JobStatus;
  summary: string;
  metadata?: Record<string, unknown>;
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
};

type PanelStateDocument = {
  accountId: string;
  content: unknown[];
  approvals: unknown[];
  watchlist: string[];
  updatedAt: Date;
};

export function connectionToView(
  connection: WithId<InstagramConnectionDocument> | null,
  missingConfiguration: string[] = [],
): InstagramAccountView {
  if (!connection) {
    return {
      configured: missingConfiguration.length === 0,
      connected: false,
      missingConfiguration,
    };
  }
  return {
    configured: missingConfiguration.length === 0,
    connected: connection.status === 'connected',
    id: connection.instagramUserId,
    username: connection.username,
    name: connection.name,
    accountType: connection.accountType,
    profilePictureUrl: connection.profilePictureUrl,
    scopes: connection.scopes,
    tokenExpiresAt: connection.tokenExpiresAt?.toISOString(),
    lastVerifiedAt: connection.lastVerifiedAt.toISOString(),
    status: connection.status,
    missingConfiguration,
  };
}

export async function saveInstagramConnection(input: {
  instagramUserId: string;
  username: string;
  name: string;
  accountType: string;
  profilePictureUrl: string;
  accessToken: string;
  scopes: string[];
  expiresIn: number;
}) {
  const database = await getDatabase();
  const now = new Date();
  const tokenExpiresAt = new Date(now.getTime() + input.expiresIn * 1000);
  await database
    .collection<InstagramConnectionDocument>('instagram_connections')
    .updateOne(
      { instagramUserId: input.instagramUserId },
      {
        $set: {
          username: input.username,
          name: input.name,
          accountType: input.accountType,
          profilePictureUrl: input.profilePictureUrl,
          encryptedAccessToken: encryptSecret(input.accessToken),
          scopes: input.scopes,
          tokenIssuedAt: now,
          tokenExpiresAt,
          lastVerifiedAt: now,
          status: 'connected',
          updatedAt: now,
        },
        $setOnInsert: {
          instagramUserId: input.instagramUserId,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  return getInstagramConnection(input.instagramUserId);
}

export async function getInstagramConnection(instagramUserId: string) {
  const database = await getDatabase();
  return database
    .collection<InstagramConnectionDocument>('instagram_connections')
    .findOne({ instagramUserId });
}

export async function disconnectInstagramConnection(instagramUserId: string) {
  const database = await getDatabase();
  await database
    .collection<InstagramConnectionDocument>('instagram_connections')
    .updateOne(
      { instagramUserId },
      {
        $set: { status: 'disconnected', updatedAt: new Date() },
        $unset: {
          encryptedAccessToken: '',
          tokenIssuedAt: '',
          tokenExpiresAt: '',
        },
      },
    );
}

export async function updateInstagramToken(
  instagramUserId: string,
  accessToken: string,
  expiresIn: number,
) {
  const database = await getDatabase();
  const now = new Date();
  await database
    .collection<InstagramConnectionDocument>('instagram_connections')
    .updateOne(
      { instagramUserId },
      {
        $set: {
          encryptedAccessToken: encryptSecret(accessToken),
          tokenIssuedAt: now,
          tokenExpiresAt: new Date(now.getTime() + expiresIn * 1000),
          lastVerifiedAt: now,
          status: 'connected',
          updatedAt: now,
        },
      },
    );
}

export async function markInstagramVerified(instagramUserId: string) {
  const database = await getDatabase();
  const now = new Date();
  await database
    .collection<InstagramConnectionDocument>('instagram_connections')
    .updateOne(
      { instagramUserId },
      { $set: { lastVerifiedAt: now, status: 'connected', updatedAt: now } },
    );
}

export async function markInstagramConnection(
  instagramUserId: string,
  status: InstagramConnectionDocument['status'],
) {
  const database = await getDatabase();
  await database
    .collection<InstagramConnectionDocument>('instagram_connections')
    .updateOne(
      { instagramUserId },
      { $set: { status, updatedAt: new Date() } },
    );
}

export function accessTokenFromConnection(
  connection: InstagramConnectionDocument,
) {
  if (!connection.encryptedAccessToken) {
    throw new Error(
      'The Instagram connection does not contain an access token.',
    );
  }
  return decryptSecret(connection.encryptedAccessToken);
}

export async function listConnectionsExpiringBefore(date: Date) {
  const database = await getDatabase();
  return database
    .collection<InstagramConnectionDocument>('instagram_connections')
    .find({ status: 'connected', tokenExpiresAt: { $lte: date } })
    .toArray();
}

function jobToView(job: WithId<JobDocument>): JobView {
  return {
    id: job._id.toHexString(),
    kind: job.kind,
    status: job.status,
    summary: job.summary,
    startedAt: job.startedAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString(),
    durationMs: job.durationMs,
  };
}

export async function recordJob(input: {
  accountId?: string | null;
  kind: string;
  status: JobStatus;
  summary: string;
  metadata?: Record<string, unknown>;
  startedAt?: Date;
}) {
  const database = await getDatabase();
  const finishedAt = new Date();
  const startedAt = input.startedAt ?? finishedAt;
  await database.collection<JobDocument>('jobs').insertOne({
    accountId: input.accountId ?? null,
    kind: input.kind,
    status: input.status,
    summary: input.summary.slice(0, 500),
    metadata: input.metadata,
    startedAt,
    finishedAt,
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
  });
}

export async function recordJobSafe(input: Parameters<typeof recordJob>[0]) {
  if (!isMongoConfigured()) return;
  try {
    await recordJob(input);
  } catch (error) {
    console.error('Unable to record Orbit job history.', error);
  }
}

export async function listJobs(accountId: string | null, limit = 50) {
  const database = await getDatabase();
  const filter = accountId ? { accountId } : {};
  const jobs = await database
    .collection<JobDocument>('jobs')
    .find(filter)
    .sort({ startedAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray();
  return jobs.map(jobToView);
}

export async function getJobTotals(accountId: string | null) {
  const database = await getDatabase();
  const accountFilter = accountId ? { accountId } : {};
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const collection = database.collection<JobDocument>('jobs');
  const [all, completed, failed, blocked, last24Hours] = await Promise.all([
    collection.countDocuments(accountFilter),
    collection.countDocuments({ ...accountFilter, status: 'completed' }),
    collection.countDocuments({ ...accountFilter, status: 'failed' }),
    collection.countDocuments({ ...accountFilter, status: 'blocked' }),
    collection.countDocuments({ ...accountFilter, startedAt: { $gte: since } }),
  ]);
  return { all, completed, failed, blocked, last24Hours };
}

export async function getPanelState(accountId: string) {
  const database = await getDatabase();
  const state = await database
    .collection<PanelStateDocument>('panel_states')
    .findOne({ accountId });
  if (!state) return null;
  return {
    content: state.content,
    approvals: state.approvals,
    watchlist: state.watchlist,
    updatedAt: state.updatedAt.toISOString(),
  };
}

export async function savePanelState(
  accountId: string,
  input: Pick<PanelStateDocument, 'content' | 'approvals' | 'watchlist'>,
) {
  const database = await getDatabase();
  await database.collection<PanelStateDocument>('panel_states').updateOne(
    { accountId },
    {
      $set: { ...input, updatedAt: new Date() },
      $setOnInsert: { accountId },
    },
    { upsert: true },
  );
}
