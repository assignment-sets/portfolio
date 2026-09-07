import { MongoClient } from "mongodb";

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClientPromise(): Promise<MongoClient> {
  const connectionUri = process.env.MONGODB_URI;
  if (!connectionUri) {
    throw new Error(
      "Please add your MongoDB connection string to .env (MONGODB_URI)"
    );
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
      client = new MongoClient(connectionUri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!clientPromise) {
      client = new MongoClient(connectionUri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDb(dbName?: string) {
  const resolvedDbName = dbName || process.env.MONGODB_DB || "portfolio";
  const connectedClient = await getMongoClientPromise();
  return connectedClient.db(resolvedDbName);
}
