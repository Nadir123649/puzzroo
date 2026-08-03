import { test, expect } from "@playwright/test"
import crypto from "crypto"

function makeGuestId(): string {
  return crypto.randomUUID()
}

async function withGuestId(page: any, guestId: string) {
  await page.goto("/game/tangram")
  await page.evaluate((gid: string) => {
    localStorage.clear()
    localStorage.setItem("puzzroo_guest_id", gid)
  }, guestId)
  await page.waitForTimeout(500)
}

async function getGuestId(page: any): Promise<string> {
  return page.evaluate(() => localStorage.getItem("puzzroo_guest_id") || "")
}

async function api(page: any, url: string, options?: any) {
  const guestId = await getGuestId(page)
  return page.evaluate(async ({ url, options, guestId }: { url: string; options: any; guestId: string }) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (guestId) headers["x-guest-id"] = guestId
    const res = await fetch(url, { ...options, headers, credentials: "include" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { success: false, status: res.status, ...body }
    }
    return res.json()
  }, { url, options, guestId })
}

// Dataset pieces are pre-positioned: the identity placement (position 0,0,
// rotation 0) reproduces the exact 7-piece tiling the server verifies.
function solvedStates(ids: string[]) {
  return ids.map((id) => ({
    pieceId: id,
    position: { x: 0, y: 0 },
    rotation: 0,
    flipped: false,
    placed: true,
    snapped: true,
  }))
}

test.describe("Tangram Guest Mode (modern /games/tangram API)", () => {
  test("No active session when no game played", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const data = await api(page, "/api/v1/games/tangram/continue")
    expect(data.success).toBe(true)
    expect(data.payload.hasActiveSession).toBe(false)
  })

  test("Fresh puzzle fetch returns 7 pieces for difficulty=easy", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await api(page, "/api/v1/games/tangram/puzzle?difficulty=easy")
    expect(puzzle.success).toBe(true)
    expect(puzzle.payload.pieceShapeIds.length).toBe(7)
    expect(Array.isArray(puzzle.payload.individualPiecePolygons)).toBe(true)
  })

  test("Active session returned after game started; save persists pieceStates", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await api(page, "/api/v1/games/tangram/puzzle?difficulty=easy")
    expect(puzzle.success).toBe(true)
    const puzzleId = puzzle.payload.id

    const session = await api(page, "/api/v1/games/tangram/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
    expect(session.success).toBe(true)
    const sessionId = session.payload.sessionId

    const cont = await api(page, "/api/v1/games/tangram/continue")
    expect(cont.success).toBe(true)
    expect(cont.payload.hasActiveSession).toBe(true)
    expect(cont.payload.session.sessionId).toBe(sessionId)
    expect(cont.payload.session.puzzle.pieceShapeIds.length).toBe(7)

    const states = solvedStates(puzzle.payload.pieceShapeIds).slice(0, 3)
    const save = await api(page, `/api/v1/games/tangram/sessions/${sessionId}/save`, {
      method: "POST",
      body: JSON.stringify({ pieceStates: states, elapsedSeconds: 12, hintsUsed: 1, mistakes: 0, moves: 3 }),
    })
    expect(save.success).toBe(true)
    expect(save.payload.progress.filledCells).toBe(3)

    const fetched = await api(page, `/api/v1/games/tangram/sessions/${sessionId}`)
    expect(fetched.success).toBe(true)
    expect(fetched.payload.pieceStates.length).toBe(3)
    expect(fetched.payload.elapsedTime).toBe(12)
    expect(fetched.payload.hintsUsed).toBe(1)
  })

  test("Complete with solved placement -> isCompleted true, accuracy 100", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await api(page, "/api/v1/games/tangram/puzzle?difficulty=easy")
    const puzzleId = puzzle.payload.id

    const session = await api(page, "/api/v1/games/tangram/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
    const sessionId = session.payload.sessionId

    const complete = await api(page, `/api/v1/games/tangram/sessions/${sessionId}/complete`, {
      method: "POST",
      body: JSON.stringify({
        pieceStates: solvedStates(puzzle.payload.pieceShapeIds),
        elapsedSeconds: 40,
        hintsUsed: 0,
        mistakes: 0,
        moves: 7,
      }),
    })
    expect(complete.success).toBe(true)
    expect(complete.payload.isCompleted).toBe(true)
    expect(complete.payload.result.accuracy).toBe(100)
    expect(complete.payload.result.piecesCorrect).toBe(7)

    const cont = await api(page, "/api/v1/games/tangram/continue")
    expect(cont.payload.hasActiveSession).toBe(false)
  })

  test("Wrong placement -> isCompleted false, session stays active", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await api(page, "/api/v1/games/tangram/puzzle?difficulty=easy")
    const session = await api(page, "/api/v1/games/tangram/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId: puzzle.payload.id }),
    })

    const bad = solvedStates(puzzle.payload.pieceShapeIds).map((st) => ({
      ...st,
      position: { x: 100, y: 100 },
    }))
    const complete = await api(page, `/api/v1/games/tangram/sessions/${session.payload.sessionId}/complete`, {
      method: "POST",
      body: JSON.stringify({ pieceStates: bad, elapsedSeconds: 10, hintsUsed: 0, mistakes: 0, moves: 7 }),
    })
    expect(complete.success).toBe(true)
    expect(complete.payload.isCompleted).toBe(false)
    expect(complete.payload.verification.accuracy).toBeLessThan(100)

    const cont = await api(page, "/api/v1/games/tangram/continue")
    expect(cont.payload.hasActiveSession).toBe(true)
  })

  test("Replay creates a fresh session; old one completed via complete route", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await api(page, "/api/v1/games/tangram/puzzle?difficulty=easy")
    const puzzleId = puzzle.payload.id

    const a = await api(page, "/api/v1/games/tangram/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
    const aId = a.payload.sessionId

    const b = await api(page, "/api/v1/games/tangram/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
    expect(b.payload.sessionId).toBe(aId)

    const complete = await api(page, `/api/v1/games/tangram/sessions/${aId}/complete`, {
      method: "POST",
      body: JSON.stringify({
        pieceStates: solvedStates(puzzle.payload.pieceShapeIds),
        elapsedSeconds: 30,
        hintsUsed: 0,
        mistakes: 0,
        moves: 7,
      }),
    })
    expect(complete.payload.isCompleted).toBe(true)

    const c = await api(page, "/api/v1/games/tangram/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
    expect(c.payload.sessionId).not.toBe(aId)
  })

  test("Guest B cannot access guest A session", async ({ page }) => {
    const guestA = makeGuestId()
    const guestB = makeGuestId()

    await withGuestId(page, guestA)
    const puzzle = await api(page, "/api/v1/games/tangram/puzzle?difficulty=easy")
    const session = await api(page, "/api/v1/games/tangram/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId: puzzle.payload.id }),
    })
    const sessionId = session.payload.sessionId

    await page.evaluate((gid: string) => {
      localStorage.clear()
      localStorage.setItem("puzzroo_guest_id", gid)
    }, guestB)

    const { status } = await page.evaluate(async ({ sid, gid }) => {
      const res = await fetch(`/api/v1/games/tangram/sessions/${sid}`, {
        headers: { "x-guest-id": gid },
      })
      return { status: res.status }
    }, { sid: sessionId, gid: guestB })

    expect(status).toBe(403)
  })

  test("Completed and recent lists are owner-scoped", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await api(page, "/api/v1/games/tangram/puzzle?difficulty=easy")
    const session = await api(page, "/api/v1/games/tangram/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId: puzzle.payload.id }),
    })
    const sessionId = session.payload.sessionId

    const complete = await api(page, `/api/v1/games/tangram/sessions/${sessionId}/complete`, {
      method: "POST",
      body: JSON.stringify({
        pieceStates: solvedStates(puzzle.payload.pieceShapeIds),
        elapsedSeconds: 25,
        hintsUsed: 0,
        mistakes: 0,
        moves: 7,
      }),
    })
    expect(complete.payload.isCompleted).toBe(true)

    const completed = await api(page, "/api/v1/games/tangram/completed")
    expect(completed.success).toBe(true)
    expect(completed.payload.total).toBeGreaterThanOrEqual(1)
    expect(completed.payload.sessions.some((s: any) => s.puzzleId === puzzle.payload.id)).toBe(true)

    const recent = await api(page, "/api/v1/games/tangram/recent")
    expect(recent.success).toBe(true)
    expect(recent.payload.sessions.length).toBeGreaterThanOrEqual(1)

    const history = await api(page, "/api/v1/games/tangram/history")
    expect(history.success).toBe(true)
    expect(history.payload.total).toBeGreaterThanOrEqual(1)
  })

  test("Daily challenge: session created, continue returns it, completion scoped", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const today = new Date()
    const m = String(today.getMonth() + 1).padStart(2, "0")
    const d = String(today.getDate()).padStart(2, "0")
    const y = String(today.getFullYear()).slice(-2)
    const challengeId = `daily-tangram-${m}-${d}-${y}`

    const dailyPuzzle = await api(page, "/api/v1/games/tangram/daily")
    expect(dailyPuzzle.success).toBe(true)
    const puzzleId = dailyPuzzle.payload.id
    expect(Array.isArray(dailyPuzzle.payload.pieceShapeIds)).toBe(true)

    const session = await api(page, "/api/v1/games/tangram/daily/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId, dailyChallengeId: challengeId }),
    })
    expect(session.success).toBe(true)
    expect(session.payload.gameType).toBe("daily_challenge")
    expect(session.payload.dailyChallengeId).toBe(challengeId)
    const sessionId = session.payload.sessionId

    const cont = await api(page, `/api/v1/games/tangram/daily/continue?dailyChallengeId=${challengeId}`)
    expect(cont.success).toBe(true)
    expect(cont.payload.hasActiveSession).toBe(true)
    expect(cont.payload.session.sessionId).toBe(sessionId)

    const completion = await api(page, "/api/v1/games/tangram/daily/completion")
    expect(completion.success).toBe(true)

    const complete = await api(page, `/api/v1/games/tangram/sessions/${sessionId}/complete`, {
      method: "POST",
      body: JSON.stringify({
        pieceStates: solvedStates(dailyPuzzle.payload.pieceShapeIds),
        elapsedSeconds: 20,
        hintsUsed: 0,
        mistakes: 0,
        moves: 7,
      }),
    })
    expect(complete.success).toBe(true)
    expect(complete.payload.isCompleted).toBe(true)

    const cont2 = await api(page, `/api/v1/games/tangram/daily/continue?dailyChallengeId=${challengeId}`)
    expect(cont2.payload.hasActiveSession).toBe(false)
  })
})


