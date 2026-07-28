import { NextRequest } from "next/server"
import { z } from "zod"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"
import { validate } from "@/lib/server/middleware/validate"

const completeSchema = z.object({
  grid: z.array(z.any()).default([]),
  pieces: z.array(z.any()),
  elapsedTime: z.number().min(0),
  hintsUsed: z.number().min(0),
  mistakes: z.number().min(0),
  moves: z.number().min(0),
})

export const POST = withAuth(async (req, user, params) => {
  if (!rateLimit(req, "tangram-complete", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const parsed = validate(completeSchema, body)
  if (parsed.error) return parsed.error
  const { grid, pieces, elapsedTime, hintsUsed, mistakes, moves } = parsed.data!

  const result = await sessionService.completeSession(
    params.id, user.id, grid, pieces, elapsedTime, hintsUsed, mistakes, moves
  )

  return successResponse(result)
})