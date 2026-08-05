import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { verifySessionSchema } from "@/lib/server/puzzles/tangram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req: NextRequest, actor: Actor, params: any) => {
  if (!rateLimit(req, "tangram-verify", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const parsed = verifySessionSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(400, "validation_error", parsed.error.issues[0].message)
  }

  const result = await sessionService.verifyPieces(params.id, actor, parsed.data.pieceStates)

  return successResponse({
    isComplete: result.isComplete,
    valid: result.valid,
    accuracy: result.accuracy,
    piecesCorrect: result.piecesCorrect,
    totalPieces: result.totalPieces,
    totalCellsRequired: result.totalPieces,
    pieceResults: result.pieceResults,
    errors: result.errors,
    coverage: result.coverage,
  })
})
