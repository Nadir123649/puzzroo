import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import NonogramPuzzle from '@/lib/server/models/NonogramPuzzle'
import NonogramPlaySession from '@/lib/server/models/NonogramPlaySession'
import { sessionService } from './SessionService'
import type { Actor } from '@/app/api/v1/games/nonogram/route-helpers'
import { easyPuzzles } from '@shared/data/nonogram'

const userActor: Actor = { type: 'user', id: '65f2a1b2c3d4e5f60718293a', role: 'free' }
const otherActor: Actor = { type: 'user', id: '65f2a1b2c3d4e5f60718293b', role: 'free' }
const guestActor: Actor = { type: 'guest', id: 'guest-11111111-2222-3333-4444-555555555555' }
const guestActor2: Actor = { type: 'guest', id: 'guest-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }

let mongo: MongoMemoryServer
let puzzleId: string
let solvedGrid: string[][]

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri(), { dbName: 'nonogram-test' })

  const p = easyPuzzles[0]
  puzzleId = p.id
  solvedGrid = p.solution.map((row) => row.map((v) => (v === 1 ? 'filled' : 'empty')))
  await NonogramPuzzle.create({
    puzzleId: p.id,
    game: 'nonogram',
    difficulty: p.difficulty,
    size: p.size,
    title: p.title,
    category: p.category,
    estimatedTime: p.estimatedTime,
    solution: p.solution,
    rowClues: p.rowClues.map((c) => (Array.isArray(c) ? c : c.values)),
    columnClues: p.columnClues.map((c) => (Array.isArray(c) ? c : c.values)),
  })
})

afterAll(async () => {
  await mongoose.disconnect()
  if (mongo) await mongo.stop()
})

beforeEach(async () => {
  await NonogramPlaySession.deleteMany({})
})

describe('SessionService (nonogram, unified actor model)', () => {
  it('startSession creates a NonogramPlaySession with uuid sessionId (user)', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    expect(s.sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(s.sessionStatus).toBe('playing')
    expect(s.gameType).toBe('nonogram')
    expect(s.puzzleId).toBe(puzzleId)

    const doc = await NonogramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc).not.toBeNull()
    expect(doc?.userId?.toString()).toBe(userActor.id)
    expect(doc?.guestId).toBeNull()
  })

  it('startSession creates a guest-owned session (guestId, no userId)', async () => {
    const s = await sessionService.startSession(guestActor, puzzleId)
    expect(s.sessionStatus).toBe('playing')

    const doc = await NonogramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.guestId).toBe(guestActor.id)
    expect(doc?.userId).toBeNull()
  })

  it('startSession returns the existing active session on duplicate (dedupe, both actors)', async () => {
    const a = await sessionService.startSession(userActor, puzzleId)
    const b = await sessionService.startSession(userActor, puzzleId)
    expect(b.sessionId).toBe(a.sessionId)
    expect(await NonogramPlaySession.countDocuments({})).toBe(1)

    const ga = await sessionService.startSession(guestActor, puzzleId)
    const gb = await sessionService.startSession(guestActor, puzzleId)
    expect(gb.sessionId).toBe(ga.sessionId)
    expect(await NonogramPlaySession.countDocuments({})).toBe(2)
  })

  it('startSession allows a new session after completion (replay semantics)', async () => {
    const a = await sessionService.startSession(userActor, puzzleId)
    await sessionService.completeSession(a.sessionId, userActor, solvedGrid, 42, 1, 0, 5)
    const b = await sessionService.startSession(userActor, puzzleId)
    expect(b.sessionId).not.toBe(a.sessionId)
    expect(b.sessionStatus).toBe('playing')
  })

  it('getSession enforces ownership (not_owner), user and guest', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    await expect(sessionService.getSession(s.sessionId, otherActor)).rejects.toThrow('not_owner')
    await expect(sessionService.getSession(s.sessionId, guestActor)).rejects.toThrow('not_owner')
    await expect(sessionService.getSession('missing-session', userActor)).rejects.toThrow('session_not_found')

    const g = await sessionService.startSession(guestActor, puzzleId)
    await expect(sessionService.getSession(g.sessionId, guestActor2)).rejects.toThrow('not_owner')
    await expect(sessionService.getSession(g.sessionId, userActor)).rejects.toThrow('not_owner')
  })

  it('saveProgress persists grid and max-elapsed; progress computed from filled cells', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    const partial = solvedGrid.map((row) => row.map(() => 'empty' as string))
    const res = await sessionService.saveProgress(s.sessionId, userActor, partial, 55, 2, 0, 3)
    expect(res.sessionStatus).toBe('playing')
    expect(res.progress.filledCells).toBe(0)
    expect(res.elapsedTime).toBe(55)

    // $max semantics: a lower elapsed must not rewind the stored value
    await sessionService.saveProgress(s.sessionId, userActor, partial, 10, 2, 0, 3)
    const doc = await NonogramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.elapsedTime).toBe(55)
    expect(doc?.grid).toHaveLength(partial.length)
  })

  it('saveProgress on a foreign session throws not_owner', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    await expect(
      sessionService.saveProgress(s.sessionId, otherActor, [], 1, 0, 0, 0)
    ).rejects.toThrow('not_owner')
  })

  it('completeSession: solved grid -> isCompleted true, result + owner persisted (user)', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    const res = await sessionService.completeSession(s.sessionId, userActor, solvedGrid, 60, 1, 0, 5)
    expect(res.isCompleted).toBe(true)
    expect(res.result?.accuracy).toBe(100)
    expect(res.result?.score).toBeGreaterThan(0)

    const doc = await NonogramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.status).toBe('completed')
    expect(doc?.completedAt).toBeTruthy()
    expect(doc?.result?.accuracy).toBe(100)
    expect(doc?.result?.correct).toBe(doc?.result?.total)
    expect(doc?.userId?.toString()).toBe(userActor.id)
  })

  it('completeSession works for guests and keeps guest ownership', async () => {
    const s = await sessionService.startSession(guestActor, puzzleId)
    const res = await sessionService.completeSession(s.sessionId, guestActor, solvedGrid, 30, 0, 0, 5)
    expect(res.isCompleted).toBe(true)

    const doc = await NonogramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.status).toBe('completed')
    expect(doc?.guestId).toBe(guestActor.id)
    expect(doc?.userId).toBeNull()
  })

  it('completeSession with wrong grid -> isCompleted false, session stays playing', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    const wrong = solvedGrid.map((row) => row.map(() => 'empty' as string))
    wrong[0][0] = 'filled'
    if (solvedGrid[0][0] === 'filled') wrong[0][0] = 'empty'

    const res = await sessionService.completeSession(s.sessionId, userActor, wrong, 10, 0, 1, 1)
    expect(res.isCompleted).toBe(false)
    const doc = await NonogramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.status).toBe('playing')
  })

  it('completeSession twice throws already_completed', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    await sessionService.completeSession(s.sessionId, userActor, solvedGrid, 60, 1, 0, 5)
    await expect(
      sessionService.completeSession(s.sessionId, userActor, solvedGrid, 60, 1, 0, 5)
    ).rejects.toThrow('already_completed')
  })

  it('abandonSession marks abandoned; double abandon throws', async () => {
    const s = await sessionService.startSession(guestActor, puzzleId)
    const abandoned = await sessionService.abandonSession(s.sessionId, guestActor)
    expect(abandoned.sessionStatus).toBe('abandoned')
    await expect(sessionService.abandonSession(s.sessionId, guestActor)).rejects.toThrow('already_abandoned')
    await expect(sessionService.abandonSession(s.sessionId, userActor)).rejects.toThrow('not_owner')
  })

  it('startDailyChallenge sets gameType daily_challenge + dailyChallengeId; dedupes per challenge', async () => {
    const dcId = 'daily-nonogram-08-04-26'
    const s = await sessionService.startDailyChallenge(userActor, puzzleId, dcId)
    expect(s.gameType).toBe('daily_challenge')
    expect(s.dailyChallengeId).toBe(dcId)

    const again = await sessionService.startDailyChallenge(userActor, puzzleId, dcId)
    expect(again.sessionId).toBe(s.sessionId)
    expect(await NonogramPlaySession.countDocuments({})).toBe(1)

    const g = await sessionService.startDailyChallenge(guestActor, puzzleId, dcId)
    expect(g.dailyChallengeId).toBe(dcId)
    const gDoc = await NonogramPlaySession.findOne({ sessionId: g.sessionId }).lean()
    expect(gDoc?.guestId).toBe(guestActor.id)
  })

  it('getContinuePlaying returns active session; auto-completes a solved grid', async () => {
    const s = await sessionService.startSession(userActor, puzzleId)
    await sessionService.saveProgress(s.sessionId, userActor, solvedGrid, 20, 0, 0, 5)

    const result = await sessionService.getContinuePlaying(userActor)
    expect(result.hasActiveSession).toBe(false)

    const doc = await NonogramPlaySession.findOne({ sessionId: s.sessionId }).lean()
    expect(doc?.status).toBe('completed')
  })

  it('getContinueDailyChallenge works for guests and users', async () => {
    const dcId = 'daily-nonogram-08-04-26'
    await sessionService.startDailyChallenge(guestActor, puzzleId, dcId)
    const result = await sessionService.getContinueDailyChallenge(guestActor, dcId)
    expect(result.hasActiveSession).toBe(true)
    expect(result.session?.sessionId).toBeTruthy()

    const none = await sessionService.getContinueDailyChallenge(guestActor, 'daily-nonogram-08-05-26')
    expect(none.hasActiveSession).toBe(false)
  })

  it('getCompletedPuzzles filters by owner (user vs guest)', async () => {
    await sessionService.startSession(userActor, puzzleId)
    const u = await sessionService.startSession(userActor, puzzleId)
    await sessionService.completeSession(u.sessionId, userActor, solvedGrid, 60, 1, 0, 5)

    const g = await sessionService.startSession(guestActor, puzzleId)
    await sessionService.completeSession(g.sessionId, guestActor, solvedGrid, 60, 1, 0, 5)

    const userCompleted = await sessionService.getCompletedPuzzles(userActor)
    expect(userCompleted.total).toBe(1)
    expect(userCompleted.sessions[0].sessionId).toBe(u.sessionId)

    const guestCompleted = await sessionService.getCompletedPuzzles(guestActor)
    expect(guestCompleted.total).toBe(1)
    expect(guestCompleted.sessions[0].sessionId).toBe(g.sessionId)
  })
})
