import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUserLocation } from "./useUserLocation";
import type { UserLocation } from "@/lib/location/types";

const apiMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: (...args: any[]) => apiMock(...args),
}));

const gpsResponse = {
  latitude: 52.52,
  longitude: 13.405,
  city: "Berlin",
  region: "Berlin",
  country: "Germany",
  accuracy: 12.5,
  source: "gps",
  timestamp: "2026-08-07T10:00:00.000Z",
};

const ipResponse = {
  latitude: 52.52,
  longitude: 13.405,
  city: "Berlin",
  region: "Berlin",
  country: "Germany",
  accuracy: null,
  source: "ip",
  timestamp: "2026-08-07T10:00:00.000Z",
};

function installGeolocation(impl?: typeof navigator.geolocation) {
  Object.defineProperty(navigator, "geolocation", {
    value: impl,
    configurable: true,
  });
}

function successPosition(lat: number, lon: number) {
  return {
    getCurrentPosition: (success: PositionCallback) =>
      success({
        timestamp: Date.now(),
        coords: {
          latitude: lat,
          longitude: lon,
          accuracy: 12.5,
        } as GeolocationCoordinates,
      } as GeolocationPosition),
  } as Geolocation;
}

afterEach(() => {
  vi.resetAllMocks();
  // Restore absence of geolocation surface so tests are isolated.
  Object.defineProperty(navigator, "geolocation", { value: undefined, configurable: true });
});

describe("useUserLocation", () => {
  beforeEach(() => {
    apiMock.mockResolvedValue({ success: true, payload: undefined });
  });

  it("is idle before any action", () => {
    const { result } = renderHook(() => useUserLocation());
    expect(result.current.state).toBe("idle");
    expect(result.current.location).toBeNull();
  });

  it("posts GPS fix and exposes granted state", async () => {
    installGeolocation(successPosition(52.52, 13.405));
    apiMock.mockResolvedValue({ success: true, payload: gpsResponse });

    const { result } = renderHook(() => useUserLocation());
    let returned: any;
    await act(async () => {
      returned = await result.current.findLocation();
    });

    expect(apiMock).toHaveBeenCalledWith(
      "/api/v1/location",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.current.state).toBe("granted");
    expect(result.current.location?.source).toBe("gps");
    expect(result.current.location?.city).toBe("Berlin");
    expect(returned?.source).toBe("gps");
  });

  it("falls back to IP when GPS permission is denied", async () => {
    installGeolocation({
      getCurrentPosition: (_success, error) =>
        error!({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "denied" } as GeolocationPositionError),
    });
    apiMock.mockResolvedValue({ success: true, payload: ipResponse }); // GET fallback

    const { result } = renderHook(() => useUserLocation());
    await act(async () => {
      await result.current.findLocation();
    });

    expect(result.current.state).toBe("denied");
    expect(result.current.location?.source).toBe("ip");
    expect(apiMock).toHaveBeenCalledWith("/api/v1/location", expect.objectContaining({ suppressToast: true }));
  });

  it("falls back to IP when the browser is unsupported", async () => {
    apiMock.mockResolvedValue({ success: true, payload: ipResponse });
    const { result } = renderHook(() => useUserLocation());
    await act(async () => {
      await result.current.findLocation();
    });
    expect(result.current.state).toBe("unsupported");
    expect(result.current.location?.source).toBe("ip");
    expect(apiMock).toHaveBeenCalledWith("/api/v1/location", expect.objectContaining({ suppressToast: true }));
  });

  it("treats invalid server payloads as null", async () => {
    installGeolocation(successPosition(1, 1));
    apiMock.mockResolvedValue({ success: true, payload: { bogus: true } });
    const { result } = renderHook(() => useUserLocation());
    await act(async () => {
      await result.current.findLocation();
    });
    expect(result.current.location).toBeNull();
  });

  it("clears state", async () => {
    installGeolocation(successPosition(52.52, 13.405));
    apiMock.mockResolvedValue({ success: true, payload: gpsResponse });
    const { result } = renderHook(() => useUserLocation());
    await act(async () => {
      await result.current.findLocation();
    });
    expect(result.current.location).not.toBeNull();
    act(() => result.current.clear());
    expect(result.current.location).toBeNull();
expect(result.current.state).toBe("idle");
  });
});