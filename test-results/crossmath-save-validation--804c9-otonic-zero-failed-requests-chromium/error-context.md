# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: crossmath-save-validation.spec.ts >> CrossMath save pipeline validation >> RAPID moves (easy): every move saved 200, moves monotonic, zero failed requests
- Location: e2e\crossmath-save-validation.spec.ts:120:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for locator('button[aria-label="Empty cell"]').filter({ visible: true }).nth(2)

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]:
      - generic [ref=f1e5]:
        - link "Puzzroo" [ref=f1e7] [cursor=pointer]:
          - /url: /
        - generic [ref=f1e13]:
          - link "Sign up" [ref=f1e14] [cursor=pointer]:
            - /url: /signup
          - link "Login" [ref=f1e15] [cursor=pointer]:
            - /url: /login
          - button "Toggle theme" [ref=f1e16] [cursor=pointer]:
            - generic [ref=f1e17]: Light Mode
            - img "Theme icon" [ref=f1e18]
    - main [ref=f1e19]:
      - main [ref=f1e20]:
        - generic [ref=f1e22]:
          - button "Back to games" [ref=f1e23] [cursor=pointer]
          - generic [ref=f1e26]:
            - img "CrossMath" [ref=f1e28]
            - heading "CROSS MATH" [level=1] [ref=f1e29]
        - generic [ref=f1e33]:
          - generic [ref=f1e36]:
            - button "Number 8" [ref=f1e37] [cursor=pointer]: "8"
            - button "Empty cell" [ref=f1e39] [cursor=pointer]
            - button "Operator +" [disabled]: +
            - button "Operator +" [disabled]: +
            - button "Number 9" [ref=f1e49] [cursor=pointer]: "9"
            - button "Operator +" [disabled]: +
            - button "Number 4" [disabled]: "4"
            - button "Operator -" [disabled]: "-"
            - button "Number 3" [disabled]: "3"
            - button "Operator =" [disabled]: =
            - button "Number 2" [disabled]: "2"
            - button "Operator -" [disabled]: "-"
            - button "Operator -" [disabled]: "-"
            - button "Number 8" [disabled]: "8"
            - button "Number 5" [disabled]: "5"
            - button "Operator =" [disabled]: =
            - button "Operator =" [disabled]: =
            - button "Number 1" [disabled]: "1"
            - button "Number 8" [disabled]: "8"
          - generic [ref=f1e70]:
            - generic [ref=f1e71]:
              - text: Difficulty
              - heading "easy" [level=3] [ref=f1e72]
            - generic [ref=f1e73]:
              - generic [ref=f1e75]:
                - generic [ref=f1e77]:
                  - text: "Score:"
                  - generic [ref=f1e78]: "5"
                - generic [ref=f1e79]:
                  - generic [ref=f1e80]:
                    - text: "Mistakes:"
                    - generic [ref=f1e81]: 1/5
                  - generic [ref=f1e82]:
                    - text: "Time:"
                    - generic [ref=f1e83]: 03:33
              - generic [ref=f1e84]:
                - button "Reset" [ref=f1e85] [cursor=pointer]
                - button "Erase" [ref=f1e89] [cursor=pointer]
                - button "Hint" [disabled] [ref=f1e93]
              - generic [ref=f1e98]:
                - button "Number 1" [ref=f1e99] [cursor=pointer]: "1"
                - button "Number 8" [ref=f1e100] [cursor=pointer]: "8"
                - button "Number 9 (used 1 time)" [disabled] [ref=f1e101]: "9"
            - generic [ref=f1e102]:
              - button "New Game" [ref=f1e103] [cursor=pointer]
              - button "Replay" [ref=f1e104] [cursor=pointer]
    - contentinfo [ref=f1e105]:
      - generic [ref=f1e107]:
        - paragraph [ref=f1e109]: © 2026 Puzzroo
        - generic [ref=f1e110]:
          - link "FAQ" [ref=f1e111] [cursor=pointer]:
            - /url: /faq
          - link "Contact Us" [ref=f1e112] [cursor=pointer]:
            - /url: /contact-us
          - link "Privacy Policy" [ref=f1e113] [cursor=pointer]:
            - /url: /privacy-policy
          - link "Terms and Conditions" [ref=f1e114] [cursor=pointer]:
            - /url: /terms-and-conditions
  - button "Open Next.js Dev Tools" [ref=f1e120] [cursor=pointer]
  - alert [ref=f1e124]
```

# Test source

```ts
  12  |   await page.evaluate((gid: string) => {
  13  |     localStorage.clear()
  14  |     localStorage.setItem("puzzroo_guest_id", gid)
  15  |   }, guestId)
  16  |   await page.waitForTimeout(500)
  17  | }
  18  | 
  19  | async function getGuestId(page: Page): Promise<string> {
  20  |   return page.evaluate(() => localStorage.getItem("puzzroo_guest_id") || "")
  21  | }
  22  | 
  23  | async function api(page: Page, url: string, options?: any) {
  24  |   const guestId = await getGuestId(page)
  25  |   return page.evaluate(async ({ url, options, guestId }: { url: string; options: any; guestId: string }) => {
  26  |     const headers: Record<string, string> = { "Content-Type": "application/json" }
  27  |     if (guestId) headers["x-guest-id"] = guestId
  28  |     const res = await fetch(url, { ...options, headers, credentials: "include" })
  29  |     if (!res.ok) {
  30  |       const body = await res.json().catch(() => ({}))
  31  |       return { success: false, status: res.status, ...body }
  32  |     }
  33  |     return res.json()
  34  |   }, { url, options, guestId })
  35  | }
  36  | 
  37  | interface PuzzleInfo {
  38  |   puzzleId: string
  39  |   solution: Record<string, number>
  40  |   emptyKeys: string[]
  41  |   availableNumbers: number[]
  42  |   maxMistakes: number
  43  | }
  44  | 
  45  | async function capturePuzzle(page: Page, difficulty: string): Promise<PuzzleInfo> {
  46  |   const p = new Promise<PuzzleInfo>((resolve) => {
  47  |     page.on("response", async (res) => {
  48  |       if (res.url().includes(`${BASE}/puzzle`) && res.request().method() === "GET") {
  49  |         try {
  50  |           const body = await res.json()
  51  |           const payload = body.payload ?? body
  52  |           const solution: Record<string, number> = payload.solution ?? {}
  53  |           const grid: any[][] = payload.grid ?? []
  54  |           const emptyKeys: string[] = []
  55  |           for (let r = 0; r < grid.length; r++) {
  56  |             for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
  57  |               const cell = grid[r][c]
  58  |               if (cell?.type === "empty" && cell.isEditable) emptyKeys.push(`${r}-${c}`)
  59  |             }
  60  |           }
  61  |           resolve({
  62  |             puzzleId: payload.id,
  63  |             solution,
  64  |             emptyKeys,
  65  |             availableNumbers: payload.availableNumbers ?? [],
  66  |             maxMistakes: payload.maxMistakes ?? 3,
  67  |           })
  68  |         } catch {}
  69  |       }
  70  |     })
  71  |   })
  72  |   const puzzle = await api(page, `${BASE}/puzzle?difficulty=${difficulty}`)
  73  |   expect(puzzle.success).toBe(true)
  74  |   return await p
  75  | }
  76  | 
  77  | async function startSession(page: Page, puzzleId: string, dailyChallengeId?: string) {
  78  |   const body: any = { puzzleId }
  79  |   if (dailyChallengeId) body.dailyChallengeId = dailyChallengeId
  80  |   const session = await api(page, `${BASE}/sessions`, {
  81  |     method: "POST",
  82  |     body: JSON.stringify(body),
  83  |   })
  84  |   expect(session.success).toBe(true)
  85  |   return session.payload.sessionId as string
  86  | }
  87  | 
  88  | function trackSaves(page: Page) {
  89  |   const saves: { status: number; success: boolean; moves?: number; mistakes?: number; sessionStatus?: string }[] = []
  90  |   const failed: { url: string; error: string }[] = []
  91  |   page.on("response", async (res) => {
  92  |     if (res.url().includes("/save") && res.request().method() === "POST") {
  93  |       let body: any = {}
  94  |       try {
  95  |         body = await res.json()
  96  |       } catch {}
  97  |       saves.push({ status: res.status(), success: body.success, moves: body.payload?.moves, mistakes: body.payload?.mistakes, sessionStatus: body.payload?.sessionStatus })
  98  |     }
  99  |   })
  100 |   page.on("requestfailed", (req) => {
  101 |     failed.push({ url: req.url(), error: req.failure()?.errorText ?? "unknown" })
  102 |   })
  103 |   return { saves, failed }
  104 | }
  105 | 
  106 | async function getEmptyCells(page: Page) {
  107 |   return page.locator('button[aria-label="Empty cell"]').filter({ visible: true })
  108 | }
  109 | 
  110 | async function fillCell(page: Page, cellIndex: number, value: number, delayMs = 0) {
  111 |   const cells = await getEmptyCells(page)
> 112 |   await cells.nth(cellIndex).click()
      |                              ^ Error: locator.click: Test timeout of 90000ms exceeded.
  113 |   if (delayMs) await page.waitForTimeout(delayMs)
  114 |   await page.locator(`div.flex.gap-\\[12px\\] button[aria-label^="Number ${value}"]`).filter({ visible: true }).click()
  115 | }
  116 | 
  117 | test.setTimeout(90_000)
  118 | 
  119 | test.describe("CrossMath save pipeline validation", () => {
  120 |   test("RAPID moves (easy): every move saved 200, moves monotonic, zero failed requests", async ({ page }) => {
  121 |     const guestId = makeGuestId()
  122 |     await withGuestId(page, guestId)
  123 | 
  124 |     const puzzle = await capturePuzzle(page, "easy")
  125 |     const sessionId = await startSession(page, puzzle.puzzleId)
  126 |     await page.reload()
  127 |     await page.waitForTimeout(2000)
  128 | 
  129 |     const { saves, failed } = trackSaves(page)
  130 |     const moveCount = Math.min(8, puzzle.emptyKeys.length)
  131 | 
  132 |     for (let i = 0; i < moveCount; i++) {
  133 |       const key = puzzle.emptyKeys[i]
  134 |       await fillCell(page, i, puzzle.solution[key])
  135 |       await page.waitForTimeout(60)
  136 |     }
  137 |     await page.waitForTimeout(2500)
  138 | 
  139 |     expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
  140 |     expect(saves.length).toBe(moveCount)
  141 |     for (const s of saves) {
  142 |       expect(s.status).toBe(200)
  143 |       expect(s.success).toBe(true)
  144 |     }
  145 |     const moves = saves.map((s) => s.moves!)
  146 |     for (let i = 1; i < moves.length; i++) expect(moves[i]).toBeGreaterThan(moves[i - 1])
  147 |     expect(moves[moves.length - 1]).toBe(moveCount)
  148 |     expect(saves.every((s) => s.sessionStatus === "playing" || s.sessionStatus === "active")).toBe(true)
  149 |   })
  150 | 
  151 |   test("RAPID moves (medium): every move saved 200, zero failed requests", async ({ page }) => {
  152 |     const guestId = makeGuestId()
  153 |     await withGuestId(page, guestId)
  154 | 
  155 |     const puzzle = await capturePuzzle(page, "medium")
  156 |     const sessionId = await startSession(page, puzzle.puzzleId)
  157 |     await page.reload()
  158 |     await page.waitForTimeout(2000)
  159 | 
  160 |     const { saves, failed } = trackSaves(page)
  161 |     const moveCount = Math.min(8, puzzle.emptyKeys.length)
  162 | 
  163 |     for (let i = 0; i < moveCount; i++) {
  164 |       const key = puzzle.emptyKeys[i]
  165 |       await fillCell(page, i, puzzle.solution[key])
  166 |       await page.waitForTimeout(50)
  167 |     }
  168 |     await page.waitForTimeout(2500)
  169 | 
  170 |     expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
  171 |     expect(saves.length).toBe(moveCount)
  172 |     for (const s of saves) {
  173 |       expect(s.status).toBe(200)
  174 |       expect(s.success).toBe(true)
  175 |     }
  176 |   })
  177 | 
  178 |   test("RAPID moves (hard): every move saved 200, zero failed requests", async ({ page }) => {
  179 |     const guestId = makeGuestId()
  180 |     await withGuestId(page, guestId)
  181 | 
  182 |     const puzzle = await capturePuzzle(page, "hard")
  183 |     const sessionId = await startSession(page, puzzle.puzzleId)
  184 |     await page.reload()
  185 |     await page.waitForTimeout(2000)
  186 | 
  187 |     const { saves, failed } = trackSaves(page)
  188 |     const moveCount = Math.min(8, puzzle.emptyKeys.length)
  189 | 
  190 |     for (let i = 0; i < moveCount; i++) {
  191 |       const key = puzzle.emptyKeys[i]
  192 |       await fillCell(page, i, puzzle.solution[key])
  193 |       await page.waitForTimeout(50)
  194 |     }
  195 |     await page.waitForTimeout(2500)
  196 | 
  197 |     expect(failed.filter((f) => f.url.includes("/save"))).toEqual([])
  198 |     expect(saves.length).toBe(moveCount)
  199 |     for (const s of saves) {
  200 |       expect(s.status).toBe(200)
  201 |       expect(s.success).toBe(true)
  202 |     }
  203 |   })
  204 | 
  205 |   test("SLOW moves (easy): every move saved 200, moves monotonic", async ({ page }) => {
  206 |     const guestId = makeGuestId()
  207 |     await withGuestId(page, guestId)
  208 | 
  209 |     const puzzle = await capturePuzzle(page, "easy")
  210 |     const sessionId = await startSession(page, puzzle.puzzleId)
  211 |     await page.reload()
  212 |     await page.waitForTimeout(2000)
```