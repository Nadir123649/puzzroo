import { describe, it, expect } from "vitest";
import {
  isValidCoords,
  roundCoord,
  parseNominatimResponse,
  parseIpWhoIsResponse,
  parseIpApiResponse,
  parseIpApiCoResponse,
  parseIpInfoResponse,
} from "./geo";

describe("isValidCoords", () => {
  it("accepts in-range coordinates", () => {
    expect(isValidCoords(52.52, 13.405)).toBe(true);
    expect(isValidCoords(-90, -180)).toBe(true);
    expect(isValidCoords(90, 180)).toBe(true);
  });

  it("rejects out-of-range, NaN, and non-number inputs", () => {
    expect(isValidCoords(91, 0)).toBe(false);
    expect(isValidCoords(-91, 0)).toBe(false);
    expect(isValidCoords(0, 181)).toBe(false);
    expect(isValidCoords(0, -181)).toBe(false);
    expect(isValidCoords(Number.NaN, 0)).toBe(false);
    expect(isValidCoords("52.5" as any, 13)).toBe(false);
    expect(isValidCoords(null as any, null as any)).toBe(false);
  });
});

describe("roundCoord", () => {
  it("rounds to 5 decimals by default", () => {
    expect(roundCoord(52.5200066)).toBe(52.52001);
  });
  it("honors custom precision", () => {
    expect(roundCoord(1.123456, 3)).toBe(1.123);
  });
});

describe("parseNominatimResponse", () => {
  it("maps city/region/country from address details", () => {
    const parsed = parseNominatimResponse({
      address: { city: "Berlin", state: "Berlin", country: "Germany" },
    });
    expect(parsed).toEqual({ city: "Berlin", region: "Berlin", country: "Germany" });
  });

  it("falls back to town/village and handles missing fields", () => {
    const parsed = parseNominatimResponse({
      address: { town: "Keflavík", country: "Iceland" },
    });
    expect(parsed).toEqual({ city: "Keflavík", region: null, country: "Iceland" });
  });

  it("returns nulls for empty payloads", () => {
    expect(parseNominatimResponse({})).toEqual({ city: null, region: null, country: null });
    expect(parseNominatimResponse(null)).toEqual({ city: null, region: null, country: null });
  });
});

describe("parseIpWhoIsResponse", () => {
  it("maps ipwho.is payload", () => {
    const parsed = parseIpWhoIsResponse({
      success: true,
      latitude: 52.52,
      longitude: 13.405,
      city: "Berlin",
      region: "Berlin",
      country: "Germany",
      timezone: { id: "Europe/Berlin" },
      connection: { isp: "MyISP", asn: 3320, type: "Cable/DSL" },
    });
    expect(parsed).toEqual({
      latitude: 52.52,
      longitude: 13.405,
      city: "Berlin",
      region: "Berlin",
      country: "Germany",
      timezone: "Europe/Berlin",
      isp: "MyISP",
      asn: "3320",
      connectionType: "Cable/DSL",
      provider: "ipwhois",
    });
  });

  it("returns nulls for missing enrichment fields", () => {
    const parsed = parseIpWhoIsResponse({
      success: true,
      latitude: 52.52,
      longitude: 13.405,
      city: "Berlin",
    });
    expect(parsed).toEqual({
      latitude: 52.52,
      longitude: 13.405,
      city: "Berlin",
      region: null,
      country: null,
      timezone: null,
      isp: null,
      asn: null,
      connectionType: null,
      provider: "ipwhois",
    });
  });

  it("rejects failed lookups and bad coordinates", () => {
    expect(parseIpWhoIsResponse({ success: false })).toBeNull();
    expect(parseIpWhoIsResponse({ city: "X", latitude: "n/a" })).toBeNull();
    expect(parseIpWhoIsResponse(null)).toBeNull();
  });
});

describe("parseIpApiResponse", () => {
  it("maps an ip-api success payload", () => {
    const parsed = parseIpApiResponse({
      status: "success",
      country: "Germany",
      regionName: "Berlin",
      city: "Berlin",
      lat: 52.52,
      lon: 13.405,
      timezone: "Europe/Berlin",
      isp: "MyISP",
      as: "AS12345 MyISP",
    });
    expect(parsed).toEqual({
      latitude: 52.52,
      longitude: 13.405,
      city: "Berlin",
      region: "Berlin",
      country: "Germany",
      timezone: "Europe/Berlin",
      isp: "MyISP",
      asn: "AS12345 MyISP",
      connectionType: null,
      provider: "ip-api",
    });
  });

  it("rejects failure status", () => {
    expect(parseIpApiResponse({ status: "fail" })).toBeNull();
    expect(parseIpApiResponse(null)).toBeNull();
  });
});

describe("parseIpApiCoResponse", () => {
  it("maps an ipapi.co payload", () => {
    const parsed = parseIpApiCoResponse({
      city: "Lahore",
      region: "Punjab",
      country_name: "Pakistan",
      latitude: 31.5204,
      longitude: 74.3587,
      timezone: "Asia/Karachi",
      org: "AS17557 PTCL",
    });
    expect(parsed).toEqual({
      latitude: 31.5204,
      longitude: 74.3587,
      city: "Lahore",
      region: "Punjab",
      country: "Pakistan",
      timezone: "Asia/Karachi",
      isp: "AS17557 PTCL",
      asn: "AS17557",
      connectionType: null,
      provider: "ipapi.co",
    });
  });

  it("rejects errors and missing coords", () => {
    expect(parseIpApiCoResponse({ error: true })).toBeNull();
    expect(parseIpApiCoResponse({ city: "X" })).toBeNull();
    expect(parseIpApiCoResponse(null)).toBeNull();
  });
});

describe("parseIpInfoResponse", () => {
  it("maps an ipinfo payload", () => {
    const parsed = parseIpInfoResponse({
      city: "Lahore",
      region: "Punjab",
      country: "PK",
      country_name: "Pakistan",
      loc: "31.5204,74.3587",
      timezone: "Asia/Karachi",
      org: "AS45595 StormFiber",
    });
    expect(parsed).toEqual({
      latitude: 31.5204,
      longitude: 74.3587,
      city: "Lahore",
      region: "Punjab",
      country: "Pakistan",
      timezone: "Asia/Karachi",
      isp: "AS45595 StormFiber",
      asn: "AS45595",
      connectionType: null,
      provider: "ipinfo",
    });
  });

  it("rejects bogon and bad loc", () => {
    expect(parseIpInfoResponse({ bogon: true })).toBeNull();
    expect(parseIpInfoResponse({ city: "X", loc: "nope" })).toBeNull();
    expect(parseIpInfoResponse(null)).toBeNull();
  });
});