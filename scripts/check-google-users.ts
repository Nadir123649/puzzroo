import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually (no dotenv dependency needed)
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db;
  const users = await db?.collection('users').find({ provider: 'google' }).toArray();
  console.log(users?.map(u => ({ username: u.username, email: u.email, googleEmail: u.googleEmail, firebaseUid: u.firebaseUid })));
  process.exit(0);
}
run();
