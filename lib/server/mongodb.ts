import { MongoClient, type Db } from 'mongodb';

const databaseName = process.env.MONGODB_DB || 'orbit_ig';

declare global {
  var orbitMongoClientPromise: Promise<MongoClient> | undefined;
  var orbitMongoIndexPromise: Promise<void> | undefined;
}

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

async function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured.');

  if (!global.orbitMongoClientPromise) {
    const client = new MongoClient(uri, {
      appName: 'orbit-instagram-operations',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5_000,
    });
    global.orbitMongoClientPromise = client.connect().catch((error) => {
      global.orbitMongoClientPromise = undefined;
      throw error;
    });
  }

  return global.orbitMongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClient();
  const database = client.db(databaseName);

  if (!global.orbitMongoIndexPromise) {
    global.orbitMongoIndexPromise = Promise.all([
      database
        .collection('instagram_connections')
        .createIndex({ instagramUserId: 1 }, { unique: true }),
      database
        .collection('panel_states')
        .createIndex({ accountId: 1 }, { unique: true }),
      database.collection('jobs').createIndex({ accountId: 1, startedAt: -1 }),
      database.collection('jobs').createIndex({ startedAt: -1 }),
    ])
      .then(() => undefined)
      .catch((error) => {
        global.orbitMongoIndexPromise = undefined;
        throw error;
      });
  }

  await global.orbitMongoIndexPromise;
  return database;
}
