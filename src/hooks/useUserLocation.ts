"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api/client";
import { getLocationAttestation } from "@/lib/client/browserIp";
import type {
  GpsCoordinatesInput,
  LocationPermissionState,
  UserLocation,
  UseUserLocationResult,
} from "@/lib/location/types";

function mapPayload(payload: any): UserLocation | null {
  if (!payload || typeof payload.latitude !== "number" || typeof payload.longitude !== "number") {
    return null;
  }
  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    city: payload.city ?? null,
    region: payload.region ?? null,
    country: payload.country ?? null,
    accuracy: payload.accuracy ?? null,
    source: payload.source === "ip" ? "ip" : "gps",
    timestamp: payload.timestamp || new Date().toISOString(),
  };
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 5 * 60 * 1000,
      timeout: 15_000,
    });
  });
}

/**
 * Finds the user's location on demand (never on mount).
 *
 * 1. Browser GPS (high accuracy) — posted to the server, which reverse-
 *    geocodes and stores it.
 * 2. IP fallback — used only when GPS is denied or unsupported; resolves
 *    city-level approximations via the server (no permission needed).
 */
export function useUserLocation(): UseUserLocationResult {
  const [state, setState] = useState<LocationPermissionState>("idle");
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fallbackToIp = useCallback(async (): Promise<UserLocation | null> => {
    const attest = await getLocationAttestation();
    const res = await api<{ [k: string]: any }>("/api/v1/location", {
      suppressToast: true,
      headers: { ...attest },
    });
    if (!res.success) return null;
    const mapped = mapPayload(res.payload);
    if (mapped) setLocation(mapped);
    return mapped;
  }, []);

  const findLocation = useCallback(async (): Promise<UserLocation | null> => {
    setError(null);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setState("unsupported");
      return fallbackToIp();
    }

    setState("requesting");
    try {
      const pos = await getPosition();
      const input: GpsCoordinatesInput = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: new Date(pos.timestamp).toISOString(),
      };
      const res = await api<{ [k: string]: any }>("/api/v1/location", {
        method: "POST",
        body: JSON.stringify(input),
        suppressToast: true,
      });
      const mapped = mapPayload(res.payload);
      if (!mapped) throw new Error("invalid_location_response");
      setState("granted");
      setLocation(mapped);
      return mapped;
    } catch (err: any) {
      if (err?.code === 1 || err?.name === "NotAllowedError" || err?.code === 3 || err?.name === "TimeoutError") {
        setState("denied");
      } else {
        setState("error");
      }
      // GPS unavailable/denied — approximate via IP, still useful at city level.
      return fallbackToIp();
    }
  }, [fallbackToIp]);

  const clear = useCallback(() => {
    setLocation(null);
    setState("idle");
    setError(null);
  }, []);

  return { state, location, error, findLocation, clear };
}