import { NextRequest, NextResponse } from "next/server";

export function successResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, payload: data, timestamp: Date.now() }, { status });
}

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, payload: { error: { code, message } }, timestamp: Date.now() },
    { status }
  );
}

export function getOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}`;
}
