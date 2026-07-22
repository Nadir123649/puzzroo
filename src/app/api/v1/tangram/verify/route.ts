import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { validate } from '@/lib/server/middleware/validate';
import { rateLimit } from '@/lib/server/utils/http';
import { verifyRequestSchema } from '@/lib/server/tangram/validators/verification.validator';
import { verifySession } from '@/lib/server/tangram/services/verification.service';

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 'tangram-verify', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const val = validate(verifyRequestSchema, body);
  if (val.error) return val.error;

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const result = await verifySession(
      val.data!.sessionId,
      userResult.user.id,
      val.data!.pieceStates
    );

    return successResponse({
      valid: result.valid,
      accuracy: result.accuracy,
      piecesCorrect: result.piecesCorrect,
      totalPieces: result.totalPieces,
      errors: result.errors,
    });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    if (error.message.includes('already') || error.message.includes('abandoned')) {
      return errorResponse(400, 'invalid_state', error.message);
    }
    console.error('[tangram] verify error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
