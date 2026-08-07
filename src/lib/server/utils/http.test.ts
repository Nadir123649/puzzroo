import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp, getClientIpAttested, normalizeIp, isPublicIp, parseForwarded } from "./http";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/v1/location", { headers });
}

describe("getClientIp", () => {
  it("uses CF-Connecting-IP with highest priority", () => {
    const req = makeRequest({
      "cf-connecting-ip": "203.0.113.5",
      "x-forwarded-for": "198.51.100.2, 10.0.0.1",
      "x-real-ip": "203.0.113.9",
    });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("skips private X-Forwarded-For entries and picks the first public one", () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.1, 203.0.113.7, 198.51.100.9" });
    expect(getClientIp(req)).toBe("203.0.113.7");
  });

  it("falls back to first public entry of X-Forwarded-For", () => {
    const req = makeRequest({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" });
    expect(getClientIp(req)).toBe("198.51.100.2");
  });

  it("falls back to X-Real-IP", () => {
    const req = makeRequest({ "x-real-ip": "203.0.113.9" });
    expect(getClientIp(req)).toBe("203.0.113.9");
  });

  it("falls back to RFC 7239 Forwarded header", () => {
    const req = makeRequest({ forwarded: "for=198.51.100.2;proto=https" });
    expect(getClientIp(req)).toBe("198.51.100.2");
  });

  it("falls back to request.ip when no headers present", () => {
    const req = new NextRequest("http://localhost/api/v1/location", {
      headers: {},
    });
    expect(getClientIp(req)).toBe(req.ip || null);
  });

  it("returns null when nothing usable is available", () => {
    const req = makeRequest({ "user-agent": "test" });
    expect(getClientIp(req)).toBeNull();
  });

  it("returns null when every candidate is private", () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.1, 192.168.1.5, 172.16.0.3" });
    expect(getClientIp(req)).toBeNull();
  });
});

describe("getClientIpAttested", () => {
  it("prefers proxy-derived IP and ignores client attestation", () => {
    const req = makeRequest({
      "x-forwarded-for": "203.0.113.5",
      "x-client-ip": "198.51.100.9",
    });
    expect(getClientIpAttested(req)).toEqual({ ip: "203.0.113.5", clientAttested: false });
  });

  it("accepts a public x-client-ip when no proxy IP exists", () => {
    const req = makeRequest({ "x-client-ip": "198.51.100.9" });
    expect(getClientIpAttested(req)).toEqual({ ip: "198.51.100.9", clientAttested: true });
  });

  it("rejects private or loopback attested addresses", () => {
    const req = makeRequest({ "x-client-ip": "192.168.1.5" });
    expect(getClientIpAttested(req)).toEqual({ ip: null, clientAttested: false });
  });

  it("returns null when nothing is available", () => {
    const req = makeRequest({});
    expect(getClientIpAttested(req)).toEqual({ ip: null, clientAttested: false });
  });
});

describe("parseForwarded", () => {
  it("parses a plain for= entry", () => {
    expect(parseForwarded("for=203.0.113.7;proto=https")).toBe("203.0.113.7");
  });

  it("parses quoted IPv6 entries", () => {
    expect(parseForwarded('for="[2001:db8:cafe::17]";proto=https')).toBe("2001:db8:cafe::17");
  });

  it("picks the first for= in a chain", () => {
    expect(parseForwarded("for=198.51.100.2, for=203.0.113.7")).toBe("198.51.100.2");
  });

  it("returns null when absent or malformed", () => {
    expect(parseForwarded(null)).toBeNull();
    expect(parseForwarded("proto=https")).toBeNull();
  });
});

describe("normalizeIp", () => {
  it("strips IPv4-mapped IPv6 wrapper", () => {
    expect(normalizeIp("::ffff:39.49.168.117")).toBe("39.49.168.117");
  });

  it("trims whitespace and drops port", () => {
    expect(normalizeIp("  203.0.113.5:443 ")).toBe("203.0.113.5");
  });

  it("keeps clean IPv4", () => {
    expect(normalizeIp("39.49.168.117")).toBe("39.49.168.117");
  });

  it("keeps native IPv6", () => {
    expect(normalizeIp("2400:cb00:2048:1::c629:d7a2")).toBe("2400:cb00:2048:1::c629:d7a2");
  });

  it("returns null for garbage", () => {
    expect(normalizeIp("not-an-ip")).toBeNull();
    expect(normalizeIp("")).toBeNull();
    expect(normalizeIp(null)).toBeNull();
  });
});

describe("isPublicIp", () => {
  it("accepts public IPv4", () => {
    expect(isPublicIp("39.49.168.117")).toBe(true);
    expect(isPublicIp("8.8.8.8")).toBe(true);
  });

  it("rejects loopback, private and link-local ranges", () => {
    expect(isPublicIp("127.0.0.1")).toBe(false);
    expect(isPublicIp("::1")).toBe(false);
    expect(isPublicIp("192.168.1.5")).toBe(false);
    expect(isPublicIp("10.0.0.1")).toBe(false);
    expect(isPublicIp("172.16.0.1")).toBe(false);
    expect(isPublicIp("169.254.1.1")).toBe(false);
  });

  it("rejects null / unknown", () => {
    expect(isPublicIp(null)).toBe(false);
    expect(isPublicIp("unknown")).toBe(false);
  });
});
