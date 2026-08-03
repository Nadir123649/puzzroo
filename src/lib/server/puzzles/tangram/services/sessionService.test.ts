import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import TangramPuzzle from '@/lib/server/models/TangramPuzzle'
import TangramPlaySession from '@/lib/server/models/TangramPlaySession'
import { sessionService } from './SessionService'
import type { Actor } from '@/app/api/v1/games/tangram/route-helpers'
import { easyPuzzles } from '@shared/data/tangram'

const userActor: Actor = { type: 'user', id: '65f2a1b2c3d4e5f60718293a', role: 'free' }
const otherActor: Actor = { type: 'user', id: '65f2a1b2c3d4e5f60718293b', role: 'free' }
const guestActor: Actor = { type: 'guest', id: 'guest-11111111-2222-3333-4444-555555555555' }
const guestActor2: Actor = { type: 'guest', id: 'guest-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }

let mongo: MongoMemoryServer
let puzzleId: string

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri(), { dbName: 'tangram-test' })

  const p = easyPuzzles[0]
  puzzleId = p.id
  await TangramPuzzle.create({
    puzzleId: p.id,
    sourceId: p.sourceId,
    difficulty: p.difficulty,
    pieceShapeIds: p.pieceShapeIds,
    individualPiecePolygons: p.individualPiecePolygons,
    fullPolygon: p.fullPolygon,
    metadata: { pieceCount: p.pieceShapeIds.length },
  })
})

afterAll(async () => {
  await mongoose.disconnect()
  if (mongo) await mongo.stop()
})

beforeEach(async () => {
  await TangramPlaySession.deleteMany({})
})

// Dataset pieces are pre-positioned: the identity placement (position 0,0,
// rotation 0) reproduces the exact 7-piece tiling, which the geometry engine
// verifies. A "solved" state is all pieces at identity.
function solvedStates() {
  return [
    { pieceId: 'baseTriangle1', position: { x: 0, y: 0 }, rotation: 0, flipped: false, placed: true, snapped: true },
    { pieceId: 'baseTriangle2', position: { x: 0, y: 0 }, rotation: 0, flipped: false, placed: true, snapped: true },
    { pieceId: 'mediumTriangle', position: { x: 0, y: 0 }, rotation: 0, flipped: false, placed: true, snapped: true },
    { pieceId: 'smallTriangle1', position: { x: 0, y: 0 }, rotation: 0, flipped: false, placed: true, snapped: true },
    { pieceId: 'smallTriangle2', position: { x: 0, y: 0 }, rotation: 0, flipped: false, placed: true, snapped: true },
    { pieceId: 'square', position: { x: 0, y: 0 }, rotation: 0, flipped: false, placed: true, snapped: true },
    { pieceId: 'parallelogram', position: { x: 0, y: 0 }, rotation: 0, flipped: false, placed: true, snapped: true },
  ]
}

describe('SessionService (tangram, unified model)', () => {
  it('startSession creates a TangramPlaySession with uuid sessionId', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    expect(s.sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(s.sessionStatus).toBe('playing')
    expect(s.gameType).toBe('tangram')
    expect(s.puzzleId).toBe(puzzleId)

    const doc = await TangramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc).not.toBeNull()
    expect(doc?.userId?.toString()).toBe(userActor.id)
  })

  it('startSession returns the existing active session on duplicate (dedupe)', async () => {
    const a = await sessionService.startSession(userActor, puzzleId)
    const b = await sessionService.startSession(userActor, puzzleId)
    expect(b.sessionId).toBe(a.sessionId)
    expect(await TangramPlaySession.countDocuments({})).toBe(1)
  })

  it('startSession allows a new session after completion (replay semantics)', async () => {
    const a = await sessionService.startSession(userActor, puzzleId)
    await sessionService.completeSession(a.sessionId, userActor, solvedStates(), 42, 1, 0, 7)
    const b = await sessionService.startSession(userActor, puzzleId)
    expect(b.sessionId).not.toBe(a.sessionId)
    expect(b.sessionStatus).toBe('playing')
  })

  it('getSession enforces ownership (not_owner)', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    await expect(sessionService.getSession(s.sessionId, otherActor)).rejects.toThrow('not_owner')
    await expect(sessionService.getSession('missing-session', userActor)).rejects.toThrow('session_not_found')
  })

  it('saveProgress persists pieceStates and max-elapsed; progress computed from placed pieces', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    const states = solvedStates().map((st, i) => ({ ...st, placed: i < 3, snapped: i < 3 }))
    const res = await sessionService.saveProgress(s.sessionId, userActor, states, 55, 2, 0, 3)
    expect(res.sessionStatus).toBe('playing')
    expect(res.progress.filledCells).toBe(3)
    expect(res.progress.totalPieces).toBe(7)
    expect(res.elapsedTime).toBe(55)

    // $max semantics: a lower elapsed must not rewind the stored value
    await sessionService.saveProgress(s.sessionId, userActor, states, 10, 2, 0, 3)
    const doc = await TangramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.elapsedTime).toBe(55)
    expect(doc?.pieceStates?.length).toBe(7)
  })

  it('saveProgress on a foreign session throws not_owner', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    await expect(
      sessionService.saveProgress(s.sessionId, otherActor, [], 1, 0, 0, 0)
    ).rejects.toThrow('not_owner')
  })

  it('completeSession: solved placement -> isCompleted true, result + stats persisted', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    const res = await sessionService.completeSession(s.sessionId, userActor, solvedStates(), 60, 1, 0, 7)
    expect(res.isCompleted).toBe(true)
    expect(res.result?.accuracy).toBe(100)
    expect(res.result?.piecesCorrect).toBe(7)
    expect(res.result?.totalPieces).toBe(7)
    expect(res.result?.score).toBeGreaterThan(0)

    const doc = await TangramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.status).toBe('completed')
    expect(doc?.completedAt).not.toBeNull()
    expect(doc?.result?.score).toBe(res.result?.score)
  })

  it('completeSession: wrong placement -> isCompleted false, session stays playing', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    const bad = solvedStates().map(st => ({ ...st, position: { x: 100, y: 100 } }))
    const res = await sessionService.completeSession(s.sessionId, userActor, bad, 10, 0, 0, 1)
    expect(res.isCompleted).toBe(false)
    expect(res.verification.accuracy).toBeLessThan(100)
    expect(res.verification.pieceResults.some(p => !p.correct)).toBe(true)

    const doc = await TangramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.status).toBe('playing')
  })

  it('completeSession twice throws already_completed', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    await sessionService.completeSession(s.sessionId, userActor, solvedStates(), 30, 0, 0, 7)
    await expect(
      sessionService.completeSession(s.sessionId, userActor, solvedStates(), 30, 0, 0, 7)
    ).rejects.toThrow('already_completed')
  })

  it('interchangeable triangles count as correct against either slot', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    const swapped = solvedStates().map(st => {
      if (st.pieceId === 'baseTriangle1') return { ...st, pieceId: 'baseTriangle2' }
      if (st.pieceId === 'baseTriangle2') return { ...st, pieceId: 'baseTriangle1' }
      return st
    })
    const res = await sessionService.completeSession(s.sessionId, userActor, swapped, 30, 0, 0, 7)
    expect(res.isCompleted).toBe(true)
    expect(res.result?.accuracy).toBe(100)
  })

  it('abandonSession flips status and blocks further saves', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    const abandoned = await sessionService.abandonSession(s.sessionId, userActor)
    expect(abandoned.sessionStatus).toBe('abandoned')
    await expect(
      sessionService.saveProgress(s.sessionId, userActor, [], 1, 0, 0, 0)
    ).rejects.toThrow('session_not_active')
    await expect(
      sessionService.completeSession(s.sessionId, userActor, solvedStates(), 1, 0, 0, 7)
    ).rejects.toThrow('session_abandoned')
  })

  it('getContinuePlaying returns the active session with puzzle, then auto-completes a solved one', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    await sessionService.saveProgress(s.sessionId, userActor, solvedStates().slice(0, 2), 5, 0, 0, 1)
    const cont = await sessionService.getContinuePlaying(userActor, 'tangram')
    expect(cont.hasActiveSession).toBe(true)
    expect(cont.session?.sessionId).toBe(s.sessionId)
    expect(cont.session?.puzzle?.pieceShapeIds?.length).toBe(7)
    expect(cont.session?.elapsedTime).toBe(5)

    // Mark fully placed -> continue auto-completes server-side
    await sessionService.saveProgress(s.sessionId, userActor, solvedStates(), 9, 0, 0, 7)
    const cont2 = await sessionService.getContinuePlaying(userActor, 'tangram')
    expect(cont2.hasActiveSession).toBe(false)
    const doc = await TangramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.status).toBe('completed')
  })

  it('getContinuePlaying filters by difficulty', async () => {
    await sessionService.startSession(userActor, puzzleId)
    const cont = await sessionService.getContinuePlaying(userActor, 'tangram', 'medium')
    expect(cont.hasActiveSession).toBe(false)
  })

  it('guest sessions are fully supported and scoped per guest id', async () => {
    const s = await sessionService.startSession(guestActor, puzzleId)
    expect(s.sessionId).toBeTruthy()
    const doc = await TangramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.guestId).toBe(guestActor.id)
    expect(doc?.userId).toBeNull()

    const res = await sessionService.completeSession(s.sessionId, guestActor, solvedStates(), 45, 0, 0, 7)
    expect(res.isCompleted).toBe(true)

    // second guest cannot see the first guest's session
    await expect(sessionService.getSession(s.sessionId, guestActor2)).rejects.toThrow('not_owner')

    const cont = await sessionService.getContinuePlaying(guestActor, 'tangram')
    expect(cont.hasActiveSession).toBe(false) // completed
  })

  it('daily challenge sessions: start, continue with puzzle, scoped completion', async () => {
    const challengeId = 'daily-tangram-08-03-26'
    const s = await sessionService.startDailyChallenge(userActor, puzzleId, challengeId)
    expect(s.gameType).toBe('daily_challenge')
    expect(s.dailyChallengeId).toBe(challengeId)

    // duplicate start returns the same active daily session
    const dup = await sessionService.startDailyChallenge(userActor, puzzleId, challengeId)
    expect(dup.sessionId).toBe(s.sessionId)

    const cont = await sessionService.getContinueDailyChallenge(userActor, challengeId)
    expect(cont.hasActiveSession).toBe(true)
    expect(cont.session?.dailyChallengeId).toBe(challengeId)

    await sessionService.completeSession(s.sessionId, userActor, solvedStates(), 20, 0, 0, 7)
    const cont2 = await sessionService.getContinueDailyChallenge(userActor, challengeId)
    expect(cont2.hasActiveSession).toBe(false)
  })

  it('recent/completed/history lists are owner-scoped', async () => {
    await sessionService.startSession(userActor, puzzleId)
    const s2 = await sessionService.startSession(otherActor, puzzleId)
    await sessionService.completeSession(s2.sessionId, otherActor, solvedStates(), 15, 0, 0, 7)

    const recent = await sessionService.getRecentSessions(userActor, 10)
    expect(recent.length).toBe(1)
    expect(recent[0].puzzleId).toBe(puzzleId)

    const completed = await sessionService.getCompletedPuzzles(userActor)
    expect(completed.total).toBe(0)
    const completedOther = await sessionService.getCompletedPuzzles(otherActor)
    expect(completedOther.total).toBe(1)

    const history = await sessionService.getSessionHistory(userActor, {})
    expect(history.total).toBe(1)
  })
})
