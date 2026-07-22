"use client";

type CallType = "page" | "track" | "identify";

interface QueuedEvent {
  type: CallType;
  event?: string | null;
  properties?: Record<string, any>;
  anonymousId: string | null;
  sessionId: string | null;
  path?: string | null;
  url?: string | null;
  referrer?: string | null;
  title?: string | null;
  locale?: string | null;
  screen?: string | null;
  ts: number;
}

const ENDPOINT = `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/v1/track`;
const ANON_KEY = "pz_anon_id";
const SESSION_KEY = "pz_session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_BATCH = 20;

let queue: QueuedEvent[] = [];
let flushScheduled = false;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getAnonymousId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const now = Date.now();
    const raw = localStorage.getItem(SESSION_KEY);
    let session: { id: string; last: number } | null = null;
    if (raw) {
      try {
        session = JSON.parse(raw);
      } catch {
        session = null;
      }
    }
    if (!session || now - session.last > SESSION_TIMEOUT_MS) {
      session = { id: uuid(), last: now };
    } else {
      session.last = now;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session.id;
  } catch {
    return null;
  }
}

function baseContext() {
  if (typeof window === "undefined") return {};
  return {
    path: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer || null,
    title: document.title || null,
    locale: navigator.language || null,
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
  };
}

function enqueue(e: QueuedEvent) {
  queue.push(e);
  if (queue.length >= MAX_BATCH) {
    flush();
    return;
  }
  scheduleFlush();
}

// Batch multiple rapid events (e.g. several track() calls) into one API request
// using a microtask — no interval timers running when idle.
function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    flush(false);
  });
}

async function flush(useKeepalive = false) {
  if (typeof window === "undefined" || queue.length === 0) return;
  const events = queue.splice(0, queue.length);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const token = localStorage.getItem("accessToken");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {}
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ events }),
      keepalive: useKeepalive,
      credentials: "include",
    });
  } catch {
    if (queue.length < 200) queue = events.concat(queue);
  }
}

// Reliable delivery on page close (no interval timers).
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}

export function page(path?: string, properties?: Record<string, any>) {
  const ctx = baseContext();
  enqueue({
    type: "page",
    event: "$pageview",
    properties: properties || {},
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    ...ctx,
    path: path || (ctx as any).path,
    ts: Date.now(),
  });
}

export function track(event: string, properties?: Record<string, any>) {
  enqueue({
    type: "track",
    event,
    properties: properties || {},
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    ...baseContext(),
    ts: Date.now(),
  });
}

export function identify(userId: string, traits?: Record<string, any>) {
  enqueue({
    type: "identify",
    event: "$identify",
    properties: { userId, ...(traits || {}) },
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    ...baseContext(),
    ts: Date.now(),
  });
  // Flush immediately so identity is linked server-side without delay.
  flush(false);
}

export function reset() {
  if (typeof window === "undefined") return;
  flush(false);
  try {
    localStorage.setItem(ANON_KEY, uuid());
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export const analytics = { page, track, identify, reset };
