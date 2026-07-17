import { NextResponse } from "next/server";

export function successResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, payload: data, timestamp: Date.now() }, { status });
}

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, payload: { error: { code, message } }, timestamp: Date.now() },
    { status }
  );
}
