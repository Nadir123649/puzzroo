import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { validate } from '@/lib/server/middleware/validate';
import { rateLimit } from '@/lib/server/utils/http';
import { saveSessionSchema } from '@/lib/server/tangram/validators/session.validator';
import { saveProgress } from '@/lib/server/tangram/services/session.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(request, 'tangram-session-save', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const { id } = await params;

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const val = validate(saveSessionSchema, body);
  if (val.error) return val.error;

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await saveProgress(id, userResult.user.id, {
      pieceStates: val.data!.pieceStates,
      elapsedSeconds: val.data!.elapsedSeconds,
      hintsUsed: val.data!.hintsUsed,
      mistakes: val.data!.mistakes,
    });

    return successResponse({
      sessionId: session._id.toString(),
      status: session.status,
      lastSaveAt: session.lastSaveAt,
      elapsedSeconds: session.elapsedSeconds,
    });
  } catch (error: any) {
    if (error.message === 'Active session not found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    console.error('[tangram] save error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
