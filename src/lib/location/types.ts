export type LocationSource = "gps" | "ip";

export interface UserLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country: string | null;
  accuracy: number | null;
  source: LocationSource;
  timestamp: string;
  /** Readable one-liner, e.g. "Lahore, Pakistan". */
  location?: string | null;
  /** Real client IP derived server-side from proxy headers (IP lookups only). */
  ipAddress?: string | null;
  timezone?: string | null;
  isp?: string | null;
  asn?: string | null;
  browser?: { name: string; version: string | null } | null;
  os?: { name: string; version: string | null } | null;
  device?: string | null;
  /** Detected IP-intelligence provider ("ipwhois", "ip-api", "ipinfo"...). */
  provider?: string | null;
  locationSource?: string | null;
  /** 0-100 likelihood for IP-derived estimates. */
  confidence?: number | null;
  network?: { isp: string | null; asn: string | null; connectionType: string | null } | null;
  coordinates?: { latitude: number; longitude: number };
}

export interface GpsCoordinatesInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export type LocationPermissionState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported"
  | "unavailable"
  | "error";

export interface UseUserLocationResult {
  state: LocationPermissionState;
  location: UserLocation | null;
  error: string | null;
  /** Ask the browser for GPS; falls back to IP on deny/unavailable. */
  findLocation: () => Promise<UserLocation | null>;
  /** Clear the cached result without touching the server. */
  clear: () => void;
}