import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/server/db'
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse'
import { auth } from '@/lib/server/middleware/auth'
import { rateLimit } from '@/lib/server/utils/http'
import CrossMathPlaySession from '@/lib/server/models/CrossMathPlaySession'

function dailyChallengeIdFromDate(dateStr: string): string {
  const d = new Date(dateStr)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = String(d.getFullYear()).slice(-2)
  return `daily-cross-math-${m}-${day}-${y}`
}

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'crossmath-daily-completion', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests')
  }

  const params = Object.fromEntries(new URL(request.url).searchParams)
  const date = params.date as string | undefined

  await connectDB()
  const authResult = await auth(request)

  const today = date || new Date().toISOString().split('T')[0]
  const challengeId = dailyChallengeIdFromDate(today)

  try {
    if ('error' in authResult) {
      const guestId = request.headers.get('x-guest-id')
      if (!guestId) {
        return successResponse({ completed: false, date: today })
      }
      const session = await CrossMathPlaySession.findOne({
        dailyChallengeId: challengeId,
        gameType: 'daily_challenge',
        status: 'completed',
        guestId,
      }).sort({ completedAt: -1 }).lean()

      if (!session) {
        return successResponse({ completed: false, date: today })
      }

      const s = session as any
      return successResponse({
        completed: true,
        date: today,
        elapsedSeconds: s.elapsedTime || 0,
        hintsUsed: s.hintsUsed || 0,
        mistakes: s.mistakes || 0,
        score: s.result?.score || 0,
        accuracy: s.result?.accuracy || 0,
      })
    }

    const userId = authResult.user.id
    const session = await CrossMathPlaySession.findOne({
      dailyChallengeId: challengeId,
      gameType: 'daily_challenge',
      status: 'completed',
      userId,
    }).sort({ completedAt: -1 }).lean()

    if (!session) {
      return successResponse({ completed: false, date: today })
    }

    const s = session as any
    return successResponse({
      completed: true,
      date: today,
      elapsedSeconds: s.elapsedTime || 0,
      hintsUsed: s.hintsUsed || 0,
      mistakes: s.mistakes || 0,
      score: s.result?.score || 0,
      accuracy: s.result?.accuracy || 0,
    })
  } catch (error: any) {
    console.error('[crossmath] daily completion error:', error)
    return errorResponse(500, 'internal_error', 'Internal Server Error')
  }
}
