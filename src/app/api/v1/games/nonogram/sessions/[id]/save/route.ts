import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { saveProgressSchema } from "@/lib/server/puzzles/nonogram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

async function saveHandler(req: NextRequest, user: { id: string; role: string }, params: { id: string }) {
  if (!rateLimit(req, "nonogram-save", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const val = saveProgressSchema.safeParse(body)
  if (!val.success) {
    return errorResponse(400, "validation_error", val.error.issues[0].message)
  }

  const { grid, elapsedTime, hintsUsed, mistakes, moves } = val.data
  const result = await sessionService.saveProgress(params.id, user.id, grid, elapsedTime, hintsUsed, mistakes, moves)
  return successResponse(result)
}

const wrapped = withAuth(saveHandler)
export const PUT = wrapped
export const POST = wrapped
