import { NextRequest } from "next/server"
import { auth } from "@/lib/server/middleware/auth"
import type { Actor } from "@/app/api/v1/games/crossmath/route-helpers"

export async function resolveActor(request: NextRequest): Promise<Actor | null> {
  const authResult = await auth(request)
  const guestId = request.headers.get("x-guest-id")
  if (!("error" in authResult)) {
    return { type: "user", id: authResult.user.id, role: authResult.user.role }
  }
  if (guestId) {
    return { type: "guest", id: guestId }
  }
  return null
}
