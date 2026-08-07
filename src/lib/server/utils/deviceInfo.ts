// Server-side User-Agent parsing (hand-rolled, zero dependencies).
// Puzzroo needs browser + OS + device type for activity tracking; a full
// ua-parser library is overkill for header-only signals.

export interface DeviceInfo {
  /** Display name, e.g. "Chrome", "Safari", "Firefox", "Edge". */
  browser: { name: string; version: string };
  /** OS family + version, e.g. { name: "Windows", version: "10" }. */
  os: { name: string; version: string };
  /** "mobile" | "tablet" | "desktop" | "unknown". */
  deviceType: string;
  /** Readable one-liner, e.g. "Mobile Chrome 151 - Android 14". */
  label: string;
}

interface UaMatch {
  name: string;
  version?: string;
}

/** Optional Client Hints — read from Sec-CH-UA-* request headers. */
export interface ClientHints {
  /** e.g. "Windows", "macOS", "Android", "Linux". */
  platform?: string | null;
  /** e.g. "17.0.0" — major >= 13 means Windows 11 (Windows 10 tops out at 12.x). */
  platformVersion?: string | null;
}

const BROWSER_PATTERNS: Array<{ name: string; re: RegExp; version: RegExp }> = [
  { name: "Edge", re: /Edg\//, version: /Edg\/(\d+)/ },
  { name: "Opera", re: /(?:OPR|Opera)\//, version: /(?:OPR|Opera)\/(\d+)/ },
  { name: "Samsung Internet", re: /SamsungBrowser\//, version: /SamsungBrowser\/(\d+)/ },
  { name: "Firefox", re: /Firefox\//, version: /Firefox\/(\d+)/ },
  { name: "Chrome", re: /Chrome\//, version: /Chrome\/(\d+)/ },
  { name: "Safari", re: /Version\/.*Safari\//, version: /Version\/(\d+)/ },
];

function detectBrowser(ua: string): UaMatch {
  for (const p of BROWSER_PATTERNS) {
    if (p.re.test(ua)) {
      const v = p.version.exec(ua);
      return { name: p.name, version: v ? v[1] : undefined };
    }
  }
  return { name: "Unknown" };
}

const WINDOWS_VERSIONS: Array<[string, string]> = [
  ["10.0", "10"],
  ["6.4", "10"],
  ["6.3", "8.1"],
  ["6.2", "8"],
  ["6.1", "7"],
  ["6.0", "Vista"],
  ["5.1", "XP"],
  ["5.0", "2000"],
];

function detectOs(ua: string): UaMatch {
  const android = /Android (\d+[._]?\d*)/.exec(ua);
  if (android) return { name: "Android", version: android[1].replace(/[_.](\d)/, ".$1") };

  const ios = /OS (\d+)[_.](\d+)?/.exec(ua);
  if (/iPhone|iPad|iPod/.test(ua) && ios) {
    return { name: "iOS", version: `${ios[1]}${ios[2] ? `.${ios[2]}` : ""}` };
  }
  if (/iPhone|iPad|iPod/.test(ua)) return { name: "iOS" };

  const win = /Windows NT (\d+\.\d+)/.exec(ua);
  if (win) {
    const entry = WINDOWS_VERSIONS.find(([ntVer]) => ntVer === win[1]);
    return { name: "Windows", version: entry ? entry[1] : win[1] };
  }
  if (/Windows/.test(ua)) return { name: "Windows", version: "" };

  if (/Mac OS X|Macintosh/.test(ua)) return { name: "macOS" };
  if (/CrOS/.test(ua)) return { name: "Chrome OS" };
  if (/Linux/.test(ua)) return { name: "Linux" };
  return { name: "Unknown" };
}

function detectDeviceType(ua: string): string {
  if (!ua.trim()) return "unknown";
  if (/iPad|Tablet|Silk|Kindle/.test(ua)) return "tablet";
  if (/Mobile|Android.*;.*Mobile|iPhone|iPod|Windows Phone/.test(ua)) return "mobile";
  return "desktop";
}

/**
 * The User-Agent cannot tell Windows 10 apart from Windows 11 (both send
 * "Windows NT 10.0"). The Sec-CH-UA-Platform-Version Client Hint can: Windows
 * 11 ships platform versions 13.0.0+, Windows 10 never exceeds 12.x.
 */
export function windowsVersionFromHints(hints: ClientHints): string | null {
  const version = hints.platformVersion;
  if (!version) return null;
  const major = Number(version.split(".")[0]);
  if (!Number.isInteger(major)) return null;
  return major >= 13 ? "11" : null;
}

/** Parse a User-Agent header into browser / OS / device info. */
export function parseUserAgent(
  userAgent: string | null | undefined,
  hints: ClientHints = {}
): DeviceInfo {
  const ua = userAgent || "";
  const browser = detectBrowser(ua);
  const os = detectOs(ua);
  const deviceType = detectDeviceType(ua);

  // Upgrade "Windows 10" to "Windows 11" when the platform hint says so.
  if (os.name === "Windows" && os.version === "10") {
    const win11 = windowsVersionFromHints(hints);
    if (win11) os.version = win11;
  }

  const bv = browser.version || "";
  const ov = os.version ? ` ${os.version}` : "";
  const label =
    browser.name === "Unknown" && os.name === "Unknown"
      ? "Unknown device"
      : [
          deviceType === "mobile" || deviceType === "tablet" ? "Mobile" : "",
          browser.name,
          bv,
          os.name === "Unknown" ? "" : `- ${os.name}${ov}`,
        ]
          .filter(Boolean)
          .join(" ");

  return {
    browser: { name: browser.name, version: bv },
    os: { name: os.name, version: os.version || "" },
    deviceType,
    label,
  };
}