import mongoose from "mongoose";
import dns from "dns";
import { Resolver } from "dns/promises";
import { promisify } from "util";

const resolveSrv = promisify(dns.resolveSrv);

const MONGODB_URI = process.env.MONGO_URI;

let cached = (global as any)._mongooseConnection;

const CUSTOM_DNS = ["8.8.8.8", "8.8.4.4"];

// Override default resolver so dns.resolveSrv (used for SRV lookups) uses
// Google DNS.  dns.lookup uses the OS resolver, which we've already set to
// 8.8.8.8 / 8.8.4.4 via netsh, so all hostname resolution goes through
// Google DNS and Atlas hostnames resolve correctly.
dns.setServers(CUSTOM_DNS);

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

mongoose.connection.on("error", (err) => {
  console.error("[db] mongoose connection error:", err);
});

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("Please define MONGO_URI in .env.local");
  }

  if (cached) return cached;

  let uri = MONGODB_URI;
  if (uri.startsWith("mongodb+srv://")) {
    uri = await resolveSRVHosts(uri);
  }

  (global as any)._mongooseConnection = mongoose.connect(uri, {
    autoIndex: false,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  cached = (global as any)._mongooseConnection;
  try {
    await cached;
  } catch (e) {
    cached = null;
    (global as any)._mongooseConnection = null;
    throw e;
  }
  return cached;
}