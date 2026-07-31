import { test, expect, Page, BrowserContext } from "@playwright/test"
import crypto from "crypto"

const BASE = "/api/v1/games/crossmath"

function makeGuestId(): string {
  return crypto.randomUUID()
}

async function withGuestId(page: Page, guestId: string) {
  await page.goto("/cross-math")
  await page.evaluate((gid: string) => {
    localStorage.clear()
    localStorage.setItem("puzzroo_guest_id", gid)
  }, guestId)
  await page.waitForTimeout(500)
}

async function getGuestId(page: Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem("puzzroo_guest_id") || "")
}

async function api(page: Page, url: string, options?: any) {
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

interface PuzzleInfo {
  puzzleId: string
  solution: Record<string, number>
  emptyKeys: string[]
  availableNumbers: number[]
  maxMistakes: number
}

async function capturePuzzle(page: Page, difficulty: string): Promise<PuzzleInfo> {
  const p = new Promise<PuzzleInfo>((resolve) => {
    page.on("response", async (res) => {
      if (res.url().includes(`${BASE}/puzzle`) && res.request().method() === "GET") {
        try {
          const body = await res.json()
          const payload = body.payload ?? body
          const solution: Record<string, number> = payload.solution ?? {}
          const grid: any[][] = payload.grid ?? []
          const emptyKeys: string[] = []
          for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
              const cell = grid[r][c]
              if (cell?.type === "empty" && cell.isEditable) emptyKeys.push(`${r}-${c}`)
            }
          }
          resolve({
            puzzleId: payload.id,
            solution,
            emptyKeys,
            availableNumbers: payload.availableNumbers ?? [],
            maxMistakes: payload.maxMistakes ?? 3,
          })
        } catch {}
      }
    })
  })
  const puzzle = await api(page, `${BASE}/puzzle?difficulty=${difficulty}`)
  expect(puzzle.success).toBe(true)
  return await p
}

async function startSession(page: Page, puzzleId: string, dailyChallengeId?: string) {
  const body: any = { puzzleId }
  if (dailyChallengeId) body.dailyChallengeId = dailyChallengeId
  const session = await api(page, `${BASE}/sessions`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  expect(session.success).toBe(true)
  return session.payload.sessionId as string
}

function trackSaves(page: Page) {
  const saves: { status: number; success: boolean; moves?: number; mistakes?: number; sessionStatus?: string }[] = []
  const failed: { url: string; error: string }[] = []
  page.on("response", async (res) => {
    if (res.url().includes("/save") && res.request().method() === "POST") {
      let body: any = {}
      try {
        body = await res.json()
      } catch {}
      saves.push({ status: res.status(), success: body.success, moves: body.payload?.moves, mistakes: body.payload?.mistakes, sessionStatus: body.payload?.sessionStatus })
    }
  })
  page.on("requestfailed", (req) => {
    failed.push({ url: req.url(), error: req.failure()?.errorText ?? "unknown" })
  })
  return { saves, failed }
}

async function getEmptyCells(page: Page) {
  return page.locator('button[aria-label="Empty cell"]').filter({ visible: true })
}

async function fillCell(page: Page, cellIndex: number, value: number, delayMs = 0) {
  const cells = await getEmptyCells(page)
  await cells.nth(cellIndex).click()
  if (delayMs) await page.waitForTimeout(delayMs)
  await page.locator(`div.flex.gap-\\[12px\\] button[aria-label^="Number ${value}"]`).filter({ visible: true }).click()
}

test.setTimeout(90_000)

test.describe("CrossMath save pipeline validation", () => {
  test("RAPID moves (easy): every move saved 200, moves monotonic, zero failed requests", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves, failed } = trackSaves(page)
    const moveCount = Math.min(8, puzzle.emptyKeys.length)

    for (let i = 0; i < moveCount; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(2500)

    expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(saves.length).toBe(moveCount)
    for (const s of saves) {
      expect(s.status).toBe(200)
      expect(s.success).toBe(true)
    }
    const moves = saves.map((s) => s.moves!)
    for (let i = 1; i < moves.length; i++) expect(moves[i]).toBeGreaterThan(moves[i - 1])
    expect(moves[moves.length - 1]).toBe(moveCount)
    expect(saves.every((s) => s.sessionStatus === "playing" || s.sessionStatus === "active")).toBe(true)
  })

  test("RAPID moves (medium): every move saved 200, zero failed requests", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "medium")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves, failed } = trackSaves(page)
    const moveCount = Math.min(8, puzzle.emptyKeys.length)

    for (let i = 0; i < moveCount; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(2500)

    expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(saves.length).toBe(moveCount)
    for (const s of saves) {
      expect(s.status).toBe(200)
      expect(s.success).toBe(true)
    }
  })

  test("RAPID moves (hard): every move saved 200, zero failed requests", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "hard")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves, failed } = trackSaves(page)
    const moveCount = Math.min(8, puzzle.emptyKeys.length)

    for (let i = 0; i < moveCount; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(2500)

    expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(saves.length).toBe(moveCount)
    for (const s of saves) {
      expect(s.status).toBe(200)
      expect(s.success).toBe(true)
    }
  })

  test("SLOW moves (easy): every move saved 200, moves monotonic", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves, failed } = trackSaves(page)
    const moveCount = Math.min(5, puzzle.emptyKeys.length)

    for (let i = 0; i < moveCount; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key], 700)
      await page.waitForTimeout(700)
    }
    await page.waitForTimeout(2500)

    expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(saves.length).toBe(moveCount)
    const moves = saves.map((s) => s.moves!)
    for (let i = 1; i < moves.length; i++) expect(moves[i]).toBeGreaterThan(moves[i - 1])
    expect(moves[moves.length - 1]).toBe(moveCount)
  })

  test("LOSS (hard): server finalizes on 2nd mistake, exactly one abandon request, session abandoned", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "hard")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves, failed } = trackSaves(page)
    let abandonCount = 0
    page.on("response", async (res) => {
      if (res.url().includes("/abandon") && res.request().method() === "POST") {
        abandonCount++
      }
    })

    for (let i = 0; i < 2; i++) {
      const key = puzzle.emptyKeys[i]
      const val = puzzle.solution[key]
      const wrong = puzzle.availableNumbers.find((n) => n !== val) ?? (val >= 9 ? val - 1 : val + 1)
      await fillCell(page, i, wrong)
      await page.waitForTimeout(800)
    }

    await page.waitForTimeout(4000)

    expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(saves.length).toBe(2)
    expect(saves[1].sessionStatus).toBe("abandoned")

    const session = await api(page, `${BASE}/sessions/${sessionId}`)
    expect(session.success).toBe(true)
    expect(session.payload.session.status).toBe("abandoned")
    expect(session.payload.session.moves).toBe(2)
    expect(session.payload.session.mistakes).toBe(2)
  })

  test("COMPLETE (easy): solve -> completed, moves == filled cells", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves, failed } = trackSaves(page)
    let completeCount = 0
    page.on("response", async (res) => {
      if (res.url().includes("/complete") && res.request().method() === "POST") {
        completeCount++
      }
    })

    for (let i = 0; i < puzzle.emptyKeys.length; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(300)
    }
    await page.waitForTimeout(4000)

    expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(completeCount).toBe(1)
    const moves = saves.map((s) => s.moves!)
    expect(moves[moves.length - 1]).toBe(puzzle.emptyKeys.length)

    const session = await api(page, `${BASE}/sessions/${sessionId}`)
    expect(session.success).toBe(true)
    expect(session.payload.session.status).toBe("completed")
  })

  test("CONTINUE restore: reload restores board+moves, next save carries cumulative counters", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    for (let i = 0; i < 3; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(2000)

    await page.reload()
    await page.waitForTimeout(3000)

    const cellsAfterReload = await getEmptyCells(page)
    const remaining = await cellsAfterReload.count()
    expect(remaining).toBe(puzzle.emptyKeys.length - 3)

    const { saves } = trackSaves(page)
    const key = puzzle.emptyKeys[3]
    await fillCell(page, 0, puzzle.solution[key])
    await page.waitForTimeout(2500)

    expect(saves.length).toBe(1)
    expect(saves[0].moves).toBe(4)
    expect(saves[0].mistakes).toBe(0)
  })

  test("REPLAY: same puzzle, new session, state reset", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    for (let i = 0; i < 3; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(2000)

    await page.getByRole("button", { name: /replay/i }).click()
    await page.waitForTimeout(3000)

    const cells = await getEmptyCells(page)
    expect(await cells.count()).toBe(puzzle.emptyKeys.length)

    const cont = await api(page, `${BASE}/continue`)
    expect(cont.success).toBe(true)
    expect(cont.payload.hasActiveSession).toBe(true)
    expect(cont.payload.session.sessionId).not.toBe(sessionId)
    expect(cont.payload.session.puzzleId).toBe(puzzle.puzzleId)
    expect(cont.payload.session.moves).toBe(0)
    expect(cont.payload.session.mistakes).toBe(0)
  })

  test("MULTI-TAB: saves from two tabs all 200, server counters never regress", async ({ page, context }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves: savesA, failed: failedA } = trackSaves(page)
    for (let i = 0; i < 3; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(2000)

    const pageB = await context.newPage()
    await pageB.goto("/cross-math")
    await pageB.waitForTimeout(3000)

    const { saves: savesB, failed: failedB } = trackSaves(pageB)
    for (let i = 0; i < 2; i++) {
      const key = puzzle.emptyKeys[i + 3]
      await fillCell(pageB, 0, puzzle.solution[key])
      await pageB.waitForTimeout(200)
    }
    await pageB.waitForTimeout(2500)

    expect(failedA.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(failedB.filter((f) => f.url.includes("/save"))).toEqual([])
    for (const s of [...savesA, ...savesB]) {
      expect(s.status).toBe(200)
      expect(s.success).toBe(true)
    }

    const session = await api(page, `${BASE}/sessions/${sessionId}`)
    expect(session.payload.session.moves).toBe(5)
  })

  test("BACK navigation: session restored after leaving and returning", async ({ page }) => {
    const guestId = makeGuestId()
    await withGuestId(page, guestId)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const key = puzzle.emptyKeys[0]
    await fillCell(page, 0, puzzle.solution[key])
    await page.waitForTimeout(2000)

    await page.goto("/")
    await page.waitForTimeout(1000)
    await page.goto("/cross-math")
    await page.waitForTimeout(3000)

    const cells = await getEmptyCells(page)
    expect(await cells.count()).toBe(puzzle.emptyKeys.length - 1)
  })
})

test.describe("CrossMath authenticated user save pipeline", () => {
  async function registerAndLogin(page: Page): Promise<string> {
    await page.goto("/")
    const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.dev`
    const password = "E2EPass123"
    const reg = await page.evaluate(async ({ email, password }) => {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "E2E User", email, password }),
      })
      return { status: res.status, body: await res.json().catch(() => ({})) }
    }, { email, password })
    expect(reg.status).toBe(201)

    const login = await page.evaluate(async ({ email, password }) => {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password, rememberMe: false }),
      })
      return { status: res.status, body: await res.json().catch(() => ({})) }
    }, { email, password })
    expect(login.status).toBe(200)

    const payload = login.body.payload
    await page.evaluate(({ token, user }: any) => {
      localStorage.clear()
      localStorage.setItem("accessToken", token.accessToken)
      localStorage.setItem("puzzroo_auth", "true")
      localStorage.setItem("puzzroo_user", JSON.stringify(user))
    }, { token: payload.token, user: payload.user })
    return email
  }

  test("AUTH RAPID moves (easy): every save 200, zero failed requests", async ({ page }) => {
    await registerAndLogin(page)
    await page.goto("/cross-math")
    await page.waitForTimeout(2000)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves, failed } = trackSaves(page)
    const moveCount = Math.min(8, puzzle.emptyKeys.length)

    for (let i = 0; i < moveCount; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(50)
    }
    await page.waitForTimeout(2500)

    expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(saves.length).toBe(moveCount)
    for (const s of saves) {
      expect(s.status).toBe(200)
      expect(s.success).toBe(true)
    }
    const moves = saves.map((s) => s.moves!)
    expect(moves[moves.length - 1]).toBe(moveCount)

    const session = await api(page, `${BASE}/sessions/${sessionId}`)
    expect(session.payload.session.moves).toBe(moveCount)
  })

  test("AUTH LOSS (hard): server finalize exactly-once, single abandon, session abandoned", async ({ page }) => {
    await registerAndLogin(page)
    await page.goto("/cross-math")
    await page.waitForTimeout(2000)

    const puzzle = await capturePuzzle(page, "hard")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves, failed } = trackSaves(page)
    let abandonCount = 0
    page.on("response", async (res) => {
      if (res.url().includes("/abandon") && res.request().method() === "POST") {
        abandonCount++
      }
    })

    for (let i = 0; i < 2; i++) {
      const key = puzzle.emptyKeys[i]
      const val = puzzle.solution[key]
      const wrong = puzzle.availableNumbers.find((n) => n !== val) ?? (val >= 9 ? val - 1 : val + 1)
      await fillCell(page, i, wrong)
      await page.waitForTimeout(800)
    }
    await page.waitForTimeout(4000)

    expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(saves.length).toBe(2)
    expect(abandonCount).toBe(1)

    const session = await api(page, `${BASE}/sessions/${sessionId}`)
    expect(session.payload.session.status).toBe("abandoned")
    expect(session.payload.session.mistakes).toBe(2)
  })

  test("AUTH COMPLETE (easy): solved -> completed, exactly one complete call", async ({ page }) => {
    await registerAndLogin(page)
    await page.goto("/cross-math")
    await page.waitForTimeout(2000)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    const { saves, failed } = trackSaves(page)
    let completeCount = 0
    page.on("response", async (res) => {
      if (res.url().includes("/complete") && res.request().method() === "POST") {
        completeCount++
      }
    })

    for (let i = 0; i < puzzle.emptyKeys.length; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(300)
    }
    await page.waitForTimeout(4000)

    expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
    expect(completeCount).toBe(1)

    const session = await api(page, `${BASE}/sessions/${sessionId}`)
    expect(session.payload.session.status).toBe("completed")
    expect(session.payload.session.moves).toBe(puzzle.emptyKeys.length)
  })

  test("AUTH CONTINUE restore: reload restores board, counters cumulative", async ({ page }) => {
    await registerAndLogin(page)
    await page.goto("/cross-math")
    await page.waitForTimeout(2000)

    const puzzle = await capturePuzzle(page, "easy")
    const sessionId = await startSession(page, puzzle.puzzleId)
    await page.reload()
    await page.waitForTimeout(2000)

    for (let i = 0; i < 3; i++) {
      const key = puzzle.emptyKeys[i]
      await fillCell(page, i, puzzle.solution[key])
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(2000)

    await page.reload()
    await page.waitForTimeout(3000)

    const cellsAfterReload = await getEmptyCells(page)
    expect(await cellsAfterReload.count()).toBe(puzzle.emptyKeys.length - 3)

    const { saves } = trackSaves(page)
    const key = puzzle.emptyKeys[3]
    await fillCell(page, 0, puzzle.solution[key])
    await page.waitForTimeout(2500)

    expect(saves.length).toBe(1)
    expect(saves[0].moves).toBe(4)
    expect(saves[0].mistakes).toBe(0)
  })
})
