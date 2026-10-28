import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let server: MongoMemoryServer | null = null;

export async function startMongo() {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri(), { dbName: 'attende-test' });
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

export async function clearMongo() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export async function stopMongo() {
  await mongoose.disconnect();
  await server?.stop();
  server = null;
}
