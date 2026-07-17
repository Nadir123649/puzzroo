import { UAParser } from "ua-parser-js";

export function parseUserAgent(ua: string | null): { browser: string; os: string; deviceType: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown", deviceType: "unknown" };
  const parser = new UAParser(ua);
  const browser = parser.getBrowser().name || "Unknown";
  const os = parser.getOS().name || "Unknown";
  const device = parser.getDevice();
  let deviceType = "desktop";
  if (device.type === "mobile") deviceType = "mobile";
  else if (device.type === "tablet") deviceType = "tablet";
  else if (device.type === "wearable") deviceType = "mobile";
  return { browser: `${browser}`, os: `${os}`, deviceType };
}
