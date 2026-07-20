import mongoose from "mongoose";
import dns from "dns";
import { promisify } from "util";

const resolveSrv = promisify(dns.resolveSrv);

const MONGODB_URI = process.env.MONGO_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define MONGO_URI in .env.local");
}

let cached = (global as any)._mongooseConnection;

function buildDirectURI(srv: string, hosts: string): string {
  const url = new URL(srv.replace("mongodb+srv://", "mongodb://"));
  const dbName = url.pathname.replace(/^\//, "") || "puzzroo";
  const creds = url.username
    ? `${encodeURIComponent(url.username)}:${encodeURIComponent(url.password)}`
    : "";
  return `mongodb://${creds}@${hosts}/${dbName}?ssl=true&authSource=admin&retryWrites=true&w=majority`;
}

async function resolveSRVHosts(srv: string): Promise<string> {
  const hostname = new URL(srv.replace("mongodb+srv://", "mongodb://")).hostname;
  const records = await resolveSrv(`_mongodb._tcp.${hostname}`);
  const hosts = records.map((r) => `${r.name}:${r.port}`).join(",");
  return buildDirectURI(srv, hosts);
}

export async function connectDB() {
  if (cached) return cached;

  let uri = MONGODB_URI;
  if (uri.startsWith("mongodb+srv://")) {
    try {
      uri = await resolveSRVHosts(uri);
    } catch {
      // fallback to direct SRV format
    }
  }

  (global as any)._mongooseConnection = mongoose.connect(uri, { autoIndex: false });
  cached = (global as any)._mongooseConnection;
  try {
    await cached;
  } catch (e) {
    // Reset so a transient connect failure doesn't permanently poison the cache.
    cached = null;
    (global as any)._mongooseConnection = null;
    throw e;
  }
  return cached;
}
