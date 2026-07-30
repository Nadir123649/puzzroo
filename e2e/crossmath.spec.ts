import { test, expect } from "@playwright/test"
import crypto from "crypto"

function makeGuestId(): string {
  return crypto.randomUUID()
}

async function withGuestId(page: any, guestId: string) {
  await page.goto("/cross-math")
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

test.describe("CrossMath Guest Mode", () => {
  test("Guest can start a new game", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)
    await page.reload()
    await page.waitForTimeout(3000)

    const cells = page.locator('button[aria-label="Empty cell"]')
    const count = await cells.count()
    expect(count).toBeGreaterThan(0)
  })

  test("No active session when no game played", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const data = await api(page, "/api/v1/games/crossmath/continue")
    expect(data.success).toBe(true)
    expect(data.payload.hasActiveSession).toBe(false)
  })

  test("Active session returned after game started", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await api(page, "/api/v1/games/crossmath/puzzle?difficulty=easy")
    expect(puzzle.success).toBe(true)
    const puzzleId = puzzle.payload.id

    const session = await api(page, "/api/v1/games/crossmath/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
    expect(session.success).toBe(true)
    const sessionId = session.payload.sessionId

    const cont = await api(page, "/api/v1/games/crossmath/continue")
    expect(cont.success).toBe(true)
    expect(cont.payload.hasActiveSession).toBe(true)
    expect(cont.payload.session.sessionId).toBe(sessionId)
  })

  test("Replay creates new session with same puzzle, state reset", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await api(page, "/api/v1/games/crossmath/puzzle?difficulty=easy")
    expect(puzzle.success).toBe(true)
    const puzzleId = puzzle.payload.id

    const session = await api(page, "/api/v1/games/crossmath/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
    expect(session.success).toBe(true)
    const oldSessionId = session.payload.sessionId

    const replay = await api(page, `/api/v1/crossmath/session/${oldSessionId}/replay`, {
      method: "POST",
    })
    expect(replay.success).toBe(true)
    expect(replay.payload.puzzleId).toBe(puzzleId)
    expect(replay.payload.sessionId).not.toBe(oldSessionId)
    expect(replay.payload.moves).toBe(0)
    expect(replay.payload.mistakes).toBe(0)
    expect(replay.payload.hintsUsed).toBe(0)
  })

  test("Guest B cannot access guest A session", async ({ page }) => {
    const guestA = makeGuestId()
    const guestB = makeGuestId()

    await withGuestId(page, guestA)
    const puzzle = await api(page, "/api/v1/games/crossmath/puzzle?difficulty=easy")
    const session = await api(page, "/api/v1/games/crossmath/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId: puzzle.payload.id }),
    })
    const sessionId = session.payload.sessionId

    await page.evaluate((gid: string) => {
      localStorage.clear()
      localStorage.setItem("puzzroo_guest_id", gid)
    }, guestB)

    const { status } = await page.evaluate(async ({ sid, gid }) => {
      const res = await fetch(`/api/v1/games/crossmath/sessions/${sid}`, {
        headers: { "x-guest-id": gid },
      })
      return { status: res.status }
    }, { sid: sessionId, gid: guestB })

    expect(status).toBe(403)
  })

  test("Daily challenge session isolated from Play Now", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const today = new Date()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const y = String(today.getFullYear()).slice(-2)
    const dateParam = `${m}-${d}-${y}`
    const dailyChallengeId = `daily-cross-math-${dateParam}`

    // 1. Start Play Now session
    const puzzle = await api(page, "/api/v1/games/crossmath/puzzle?difficulty=easy")
    expect(puzzle.success).toBe(true)
    const puzzleId = puzzle.payload.id

    const session = await api(page, "/api/v1/games/crossmath/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
    expect(session.success).toBe(true)
    const playNowSessionId = session.payload.sessionId

    // 2. Regular continue returns Play Now session
    const cont = await api(page, "/api/v1/games/crossmath/continue")
    expect(cont.success).toBe(true)
    expect(cont.payload.hasActiveSession).toBe(true)
    expect(cont.payload.session.sessionId).toBe(playNowSessionId)

    // 3. Daily continue does NOT return Play Now session
    const dailyCont = await api(page, `/api/v1/games/crossmath/daily/continue?dailyChallengeId=${encodeURIComponent(dailyChallengeId)}`)
    expect(dailyCont.success).toBe(true)
    expect(dailyCont.payload.hasActiveSession).toBe(false)

    // 4. Get daily puzzle and start daily challenge session
    const dailyPuzzle = await api(page, "/api/v1/games/crossmath/daily")
    expect(dailyPuzzle.success).toBe(true)
    const dailyPuzzleId = dailyPuzzle.payload.id

    const dailySession = await api(page, "/api/v1/games/crossmath/daily/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId: dailyPuzzleId, dailyChallengeId }),
    })
    expect(dailySession.success).toBe(true)
    expect(dailySession.payload.gameType).toBe("daily_challenge")
    expect(dailySession.payload.dailyChallengeId).toBe(dailyChallengeId)

    const dailySessionId = dailySession.payload.sessionId

    // 5. Daily continue now returns daily challenge session
    const dailyCont2 = await api(page, `/api/v1/games/crossmath/daily/continue?dailyChallengeId=${encodeURIComponent(dailyChallengeId)}`)
    expect(dailyCont2.success).toBe(true)
    expect(dailyCont2.payload.hasActiveSession).toBe(true)
    expect(dailyCont2.payload.session.sessionId).toBe(dailySessionId)

    // 6. Regular continue still returns Play Now session (not daily)
    const cont2 = await api(page, "/api/v1/games/crossmath/continue")
    expect(cont2.success).toBe(true)
    expect(cont2.payload.hasActiveSession).toBe(true)
    expect(cont2.payload.session.sessionId).toBe(playNowSessionId)
  })

  test("Daily challenge session restored after progress", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const today = new Date()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const y = String(today.getFullYear()).slice(-2)
    const dateParam = `${m}-${d}-${y}`
    const dailyChallengeId = `daily-cross-math-${dateParam}`

    // Fetch daily puzzle
    const dailyPuzzle = await api(page, "/api/v1/games/crossmath/daily")
    expect(dailyPuzzle.success).toBe(true)
    const dailyPuzzleId = dailyPuzzle.payload.id

    // Start daily challenge session
    const dailySession = await api(page, "/api/v1/games/crossmath/daily/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId: dailyPuzzleId, dailyChallengeId }),
    })
    expect(dailySession.success).toBe(true)
    const firstSessionId = dailySession.payload.sessionId

    // Save progress
    const progress = await api(page, `/api/v1/games/crossmath/sessions/${firstSessionId}/save`, {
      method: "POST",
      body: JSON.stringify({
        grid: { "0-1": 5, "1-0": 3 },
        elapsedTime: 30,
        hintsUsed: 0,
        mistakes: 0,
        moves: 2,
      }),
    })
    console.log("Save progress response:", JSON.stringify(progress))
    expect(progress.success).toBe(true)

    // Daily continue restores same session
    const cont = await api(page, `/api/v1/games/crossmath/daily/continue?dailyChallengeId=${encodeURIComponent(dailyChallengeId)}`)
    expect(cont.success).toBe(true)
    expect(cont.payload.hasActiveSession).toBe(true)
    expect(cont.payload.session.sessionId).toBe(firstSessionId)
    expect(cont.payload.session.elapsedTime).toBe(30)
    expect(cont.payload.session.moves).toBe(2)
  })

  test("Guest resume after browser restart: same session restored", async ({ page, context }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await api(page, "/api/v1/games/crossmath/puzzle?difficulty=easy")
    expect(puzzle.success).toBe(true)
    const puzzleId = puzzle.payload.id

    const session = await api(page, "/api/v1/games/crossmath/sessions", {
      method: "POST",
      body: JSON.stringify({ puzzleId }),
    })
    expect(session.success).toBe(true)
    const firstSessionId = session.payload.sessionId

    const progress = await api(page, `/api/v1/games/crossmath/sessions/${firstSessionId}/save`, {
      method: "POST",
      body: JSON.stringify({
        grid: { "0-1": 5, "1-0": 3 },
        elapsedTime: 45,
        hintsUsed: 1,
        mistakes: 0,
        moves: 2,
      }),
    })
    expect(progress.success).toBe(true)

    const cont1 = await api(page, "/api/v1/games/crossmath/continue")
    expect(cont1.payload.hasActiveSession).toBe(true)
    expect(cont1.payload.session.sessionId).toBe(firstSessionId)
    expect(cont1.payload.session.elapsedTime).toBe(45)
    expect(cont1.payload.session.moves).toBe(2)

    await page.goto("about:blank")

    await context.addInitScript((gid: string) => {
      localStorage.setItem("puzzroo_guest_id", gid)
    }, guestId)

    await page.goto("/cross-math")
    await page.waitForTimeout(5000)

    const cont2 = await api(page, "/api/v1/games/crossmath/continue")
    expect(cont2.success).toBe(true)

    if (cont2.payload.hasActiveSession) {
      expect(cont2.payload.session.sessionId).toBe(firstSessionId)
      expect(cont2.payload.session.puzzleId).toBe(puzzleId)
      expect(cont2.payload.session.moves).toBeGreaterThanOrEqual(2)
    } else {
      const sessionsList = await api(page, `/api/v1/games/crossmath/recent`)
      console.log("Recent sessions:", JSON.stringify(sessionsList))
    }

    expect(cont2.payload.hasActiveSession).toBe(true)
    expect(cont2.payload.session.puzzleId).toBe(puzzleId)
  })
})
