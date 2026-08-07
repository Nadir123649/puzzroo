import { connectDB } from "@/lib/server/db";
import UserLocation from "@/lib/server/models/UserLocation";
import { lookupLocationFromIp, reverseGeocode } from "@/lib/server/location/geo";
import type { ReverseGeoResult } from "@/lib/server/location/geo";

export type LocationSource = "gps" | "ip";

export interface StoredLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  isp: string | null;
  asn: string | null;
  connectionType: string | null;
  /** Which provider produced an IP-intel result ("gps" for GPS fixes). */
  provider: string | null;
  /** 0-100 likelihood estimate for IP-derived results. */
  confidence: number | null;
  accuracy: number | null;
  source: LocationSource;
  timestamp: Date;
}

/** Confidence heuristic per provider: newer/more reliable sources score higher. */
const PROVIDER_CONFIDENCE: Record<string, number> = {
  ipwhois: 70,
  "ip-api": 55,
  "ipapi.co": 45,
  ipinfo: 75,
  gps: 95,
};

interface Owner {
  userId?: string | null;
  guestId?: string | null;
}

function docToStored(doc: any): StoredLocation {
  return {
    latitude: doc.latitude,
    longitude: doc.longitude,
    city: doc.city || null,
    region: doc.region || null,
    country: doc.country || null,
    timezone: doc.timezone || null,
    isp: doc.isp || null,
    asn: doc.asn || null,
    connectionType: doc.connectionType || null,
    provider: doc.provider || null,
    confidence: doc.confidence ?? null,
    accuracy: doc.accuracy ?? null,
    source: doc.source as LocationSource,
    timestamp: doc.updatedAt || doc.createdAt || new Date(),
  };
}

/** Readable one-liner, e.g. "Lahore, Pakistan" (city + country). */
export function formatLocationLabel(loc: {
  city: string | null;
  region: string | null;
  country: string | null;
}): string {
  return [loc.city, loc.country].filter(Boolean).join(", ") ||
    [loc.region, loc.country].filter(Boolean).join(", ") ||
    loc.country ||
    "Unknown location";
}

/**
 * Persist a GPS fix for the identity. Reverse-geocodes best-effort; on
 * reverse-geocode failure the raw coordinates are still stored.
 */
export async function upsertGpsLocation(
  owner: Owner,
  input: { latitude: number; longitude: number; accuracy?: number | null },
  ip?: string | null
): Promise<StoredLocation> {
  await connectDB();
  const geo: ReverseGeoResult | null = await reverseGeocode(input.latitude, input.longitude);

  const doc = await UserLocation.findOneAndUpdate(
    { userId: owner.userId || null, guestId: owner.guestId || null },
    {
      $set: {
        userId: owner.userId || null,
        guestId: owner.guestId || null,
        ip: ip || null,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? null,
        source: "gps",
        city: geo?.city || null,
        region: geo?.region || null,
        country: geo?.country || null,
        timezone: null,
        isp: null,
        asn: null,
        connectionType: null,
        provider: "gps",
        confidence: PROVIDER_CONFIDENCE.gps,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!doc) throw new Error("location_upsert_failed");
  return docToStored(doc.toObject());
}

/**
 * IP fallback: resolve the client's approximate location. Never persisted —
 * it's an anonymous approximation and there is nothing meaningful to store.
 */
export async function resolveIpLocation(ip: string | null | undefined): Promise<StoredLocation | null> {
  const geo = await lookupLocationFromIp(ip);
  if (!geo) return null;
  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    city: geo.city,
    region: geo.region,
    country: geo.country,
    timezone: geo.timezone,
    isp: geo.isp,
    asn: geo.asn,
    connectionType: geo.connectionType,
    provider: geo.provider,
    confidence: PROVIDER_CONFIDENCE[geo.provider] ?? 50,
    accuracy: null,
    source: "ip",
    timestamp: new Date(),
  };
}

/** Latest stored GPS fix for the identity, or null. */
export async function getStoredGpsLocation(owner: Owner): Promise<StoredLocation | null> {
  await connectDB();
  const doc = await UserLocation.findOne({
    userId: owner.userId || null,
    guestId: owner.guestId || null,
    source: "gps",
  })
    .sort({ updatedAt: -1 })
    .lean();
  return doc ? docToStored(doc) : null;
}