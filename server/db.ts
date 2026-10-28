import 'server-only';
import mongoose from 'mongoose';
import { env } from './config/env';

type MongoCache = { promise: Promise<typeof mongoose> | null };
const globalForMongo = globalThis as typeof globalThis & { __attendeMongo?: MongoCache };

/**
 * The Attende database (`ATTENDE_MONGODB_URI`) on Mongoose's default connection, opened once per
 * process and cached on `globalThis` so serverless invocations and dev reloads reuse it. This is
 * not the JSYNQ database NextAuth reads (`MONGODB_URI`).
 */
export async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  const cache = (globalForMongo.__attendeMongo ??= { promise: null });
  cache.promise ??= mongoose.connect(env().ATTENDE_MONGODB_URI, { serverSelectionTimeoutMS: 10_000 }).catch((error) => {
    cache.promise = null;
    throw error;
  });
  await cache.promise;
}
