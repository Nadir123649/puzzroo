"use client";

// Browser-attested IP/OS tools. Used ONLY when the server sees no proxy-set
// client IP (localhost, direct connections, header-stripping proxies). The
// server never trusts these on a proxied request, so falls back to the
// browser's own view of its public IP is safe for display-level fingerprinting.

const ATTEST_CACHE_MS = 15 * 60 * 1000;

let ipCache: { ip: string | null; at: number } | null = null;
let versionCache: { version: string | null; at: number } | null = null;

const IP_PROVIDERS = ["https://api64.ipify.org?format=json", "https://ipwho.is/"];

async function fetchIp(keep = false): Promise<string | null> {
  for (const url of IP_PROVIDERS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) continue;
      const json = await res.json();
      const ip = typeof json?.ip === "string" ? json.ip : null;
      if (ip) {
        ipCache = { ip, at: Date.now() };
        if (keep) sessionStorage.setItem("puzzroo_public_ip", ip);
        return ip;
      }
    } catch {
      // provider unreachable — try next
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/** The browser's own public IP address, cached ~15 min. Null on failure. */
export async function getBrowserIp(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (ipCache && Date.now() - ipCache.at < ATTEST_CACHE_MS) return ipCache.ip;
  try {
    const stored = sessionStorage.getItem("puzzroo_public_ip");
    if (stored) {
      ipCache = { ip: stored, at: Date.now() };
      return stored;
    }
  } catch {}
  return fetchIp(true);
}

/**
 * OS platform version from Chromium Client Hints (e.g. "17.0.0" → Windows 11,
 * "12.0.0" → Windows 10). Null when unavailable (non-Chromium, HTTP, old UA).
 */
export async function getPlatformVersion(): Promise<string | null> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  if (versionCache && Date.now() - versionCache.at < ATTEST_CACHE_MS) return versionCache.version;
  const nav = navigator as Navigator & {
    userAgentData?: { getHighEntropyValues?: (hints: string[]) => Promise<{ platformVersion?: string }> };
  };
  if (!nav.userAgentData?.getHighEntropyValues) return null;
  try {
    const values = await nav.userAgentData.getHighEntropyValues(["platformVersion"]);
    const version = values?.platformVersion ?? null;
    versionCache = { version, at: Date.now() };
    return version;
  } catch {
    return null;
  }
}

/**
 * Headers the server may accept to attest the caller's public IP / OS version
 * when no proxy-set header exists. Sent on every location request; the server
 * only honors them when nothing better arrived.
 */
export async function getLocationAttestation(): Promise<Record<string, string>> {
  const [ip, version] = await Promise.allSettled([getBrowserIp(), getPlatformVersion()]);
  const headers: Record<string, string> = {};
  const resolvedIp = ip.status === "fulfilled" ? ip.value : null;
  const resolvedVersion = version.status === "fulfilled" ? version.value : null;
  if (resolvedIp) headers["x-client-ip"] = resolvedIp;
  if (resolvedVersion) headers["x-ua-platform-version"] = resolvedVersion;
  return headers;
}