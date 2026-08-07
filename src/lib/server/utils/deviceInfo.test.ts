import { describe, expect, it } from "vitest";
import { parseUserAgent } from "./deviceInfo";

describe("parseUserAgent", () => {
  it("detects mobile Chrome on Android", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36";
    const r = parseUserAgent(ua);
    expect(r.browser.name).toBe("Chrome");
    expect(r.browser.version).toBe("151");
    expect(r.os.name).toBe("Android");
    expect(r.os.version).toBe("14");
    expect(r.deviceType).toBe("mobile");
    expect(r.label).toBe("Mobile Chrome 151 - Android 14");
  });

  it("detects desktop Chrome on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
    const r = parseUserAgent(ua);
    expect(r.browser.name).toBe("Chrome");
    expect(r.browser.version).toBe("151");
    expect(r.os.name).toBe("Windows");
    expect(r.os.version).toBe("10");
    expect(r.deviceType).toBe("desktop");
    expect(r.label).toBe("Chrome 151 - Windows 10");
  });

  it("reports Windows 11 from the platform-version Client Hint", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
    const r = parseUserAgent(ua, { platform: "Windows", platformVersion: "17.0.0" });
    expect(r.os.name).toBe("Windows");
    expect(r.os.version).toBe("11");
    expect(r.label).toBe("Chrome 151 - Windows 11");
  });

  it("keeps Windows 10 when the hint version is below 13", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
    const r = parseUserAgent(ua, { platform: "Windows", platformVersion: "12.0.0" });
    expect(r.os.version).toBe("10");
  });

  it("keeps Windows 10 when no hint is sent (first request / non-Chromium)", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
    const r = parseUserAgent(ua, { platform: "Windows", platformVersion: null });
    expect(r.os.version).toBe("10");
  });

  it("ignores hints for non-Windows platforms", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36";
    const r = parseUserAgent(ua, { platform: "Android", platformVersion: "14.0.0" });
    expect(r.os.name).toBe("Android");
    expect(r.os.version).toBe("14");
  });

  it("detects Safari on iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1";
    const r = parseUserAgent(ua);
    expect(r.browser.name).toBe("Safari");
    expect(r.os.name).toBe("iOS");
    expect(r.os.version).toBe("18.2");
    expect(r.deviceType).toBe("mobile");
    expect(r.label.startsWith("Mobile Safari 18")).toBe(true);
  });

  it("detects Firefox on macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:137.0) Gecko/20100101 Firefox/137.0";
    const r = parseUserAgent(ua);
    expect(r.browser.name).toBe("Firefox");
    expect(r.browser.version).toBe("137");
    expect(r.os.name).toBe("macOS");
    expect(r.deviceType).toBe("desktop");
  });

  it("detects tablet (iPad)", () => {
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
    const r = parseUserAgent(ua);
    expect(r.os.name).toBe("iOS");
    expect(r.os.version).toBe("16.5");
    expect(r.deviceType).toBe("tablet");
  });

  it("handles missing / unknown UA gracefully", () => {
    const r = parseUserAgent("");
    expect(r.browser.name).toBe("Unknown");
    expect(r.os.name).toBe("Unknown");
    expect(r.deviceType).toBe("unknown");
    expect(r.label).toBe("Unknown device");
  });
});