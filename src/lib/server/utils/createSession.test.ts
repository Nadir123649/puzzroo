import { describe, it, expect, vi, beforeEach } from "vitest";

const { findOneAndUpdate, create, updateOne, updateMany } = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn().mockResolvedValue({}),
  updateMany: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/server/models/LoginSession", () => ({
  default: { findOneAndUpdate, create, updateOne, updateMany },
}));

vi.mock("@/lib/server/utils/geoLocate", () => ({
  geoLocate: vi.fn().mockResolvedValue("Unknown Location"),
}));

import { NextRequest } from "next/server";
import { createSession } from "./createSession";

function makeRequest(fingerprint: string): NextRequest {
  const req = new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST",
    headers: {
      "x-device-fingerprint": fingerprint,
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    },
  });
  return req;
}

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("re-uses an existing ACTIVE session for the same device", async () => {
    const existing = { _id: "abc", tokenVersion: 3 };
    findOneAndUpdate.mockResolvedValue(existing);

    const session = await createSession(makeRequest("fp-1"), "user-1", "email", true);

    expect(session).toBe(existing);
    const match = findOneAndUpdate.mock.calls[findOneAndUpdate.mock.calls.length - 1];
    expect(match[0]).toEqual({ userId: "user-1", deviceFingerprint: "fp-1", status: "active" });
  });

  it("resets loginTime (createdAt) when a session is reused after re-login", async () => {
    const existing = { _id: "abc", tokenVersion: 3 };
    findOneAndUpdate.mockResolvedValue(existing);

    await createSession(makeRequest("fp-1"), "user-1", "email", true);

    const match = findOneAndUpdate.mock.calls[findOneAndUpdate.mock.calls.length - 1];
    expect(match[1].$set.createdAt).toBeInstanceOf(Date);
  });

  it("passes overwriteImmutable so mongoose does not strip createdAt from $set", async () => {
    findOneAndUpdate.mockResolvedValue({ _id: "abc" });

    await createSession(makeRequest("fp-1"), "user-1", "email", true);

    const match = findOneAndUpdate.mock.calls[findOneAndUpdate.mock.calls.length - 1];
    expect(match[2]).toMatchObject({ returnDocument: "after", overwriteImmutable: true });
  });

  it("creates a fresh session when no active session exists for the device", async () => {
    findOneAndUpdate.mockResolvedValue(null);
    create.mockResolvedValue({ _id: "new" });

    const session = await createSession(makeRequest("fp-new"), "user-1", "email", true);

    expect(session._id).toBe("new");
    expect(create).toHaveBeenCalledTimes(1);
  });
});