import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { subscribe, unsubscribe } from "@/lib/server/auth/sessionBroker"
import { connectDB } from "@/lib/server/db"
import LoginSession from "@/lib/server/models/LoginSession"

export async function GET(request: NextRequest) {
  await connectDB()

  // Browser EventSource can't set an Authorization header, so authenticate via
  // the httpOnly refresh cookie (same pattern as /auth/refresh).
  const refreshToken = request.cookies.get("refreshToken")?.value
  if (!refreshToken) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let userId: string | null = null
  let jti: string | undefined
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, { algorithms: ["HS256"] }) as any
    userId = decoded.id
    jti = decoded.jti
  } catch {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Confirm the session is still active so a revoked refresh cookie can't hold
  // a stream open forever. Stale/expired → close immediately.
  if (jti) {
    const session = await LoginSession.findById(jti).select("status userId").lean()
    if (!session || session.status !== "active" || session.userId.toString() !== userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
  }

  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  const write = (chunk: string) => writer.write(encoder.encode(chunk))

  let closed = false
  const keepAlive = setInterval(() => {
    if (closed) return
    write(": keep-alive\n\n").catch(() => {})
  }, 25_000)

  const unregister = () => {
    if (closed) return
    closed = true
    clearInterval(keepAlive)
    unsubscribe(userId!, sseController)
    writer.close().catch(() => {})
  }

  const sseController = {
    enqueue(chunk: string) {
      if (closed) return false
      write(chunk)
      return true
    },
    close() {
      unregister()
    },
  }
  subscribe(userId!, sseController)

  request.signal?.addEventListener?.("abort", unregister)

  return new NextResponse(stream.readable, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
