/**
 * RUNTIME INVESTIGATION — CrossMath Complete → Continue lifecycle
 * Direct DB access, no app abstractions. Traces every step with runtime evidence.
 *
 * Usage: npx tsx scripts/runtime-investigation.ts
 */

import { readFileSync } from "fs"
import { resolve } from "path"

// Manual .env parser
const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8")
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eqIdx = trimmed.indexOf("=")
  if (eqIdx === -1) continue
  const key = trimmed.substring(0, eqIdx).trim()
  let val = trimmed.substring(eqIdx + 1).trim()
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
  val = val.replace(/\\n/g, "\n")
  process.env[key] = val
}

function log(phase: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: Date.now(), phase, ...data }))
}

const TEST_USER_ID = `test-investigation-${Date.now()}`

async function main() {
  const MONGODB_URI = process.env.MONGO_URI
  if (!MONGODB_URI) throw new Error("MONGO_URI not in env")

  const { default: mongoose } = await import("mongoose")

  let uri = MONGODB_URI
  if (uri.startsWith("mongodb+srv://")) {
    const { Resolver } = await import("dns/promises")
    const resolver = new Resolver()
    resolver.setServers(["8.8.8.8", "8.8.4.4"])
    const urlObj = new URL(uri.replace("mongodb+srv://", "mongodb://"))
    const dbName = urlObj.pathname.replace(/^\//, "") || "puzzroo"
    const creds = urlObj.username
      ? `${encodeURIComponent(urlObj.username)}:${encodeURIComponent(urlObj.password)}`
      : ""
    const records = await resolver.resolveSrv(`_mongodb._tcp.${urlObj.hostname}`)
    const hosts = records.map((r) => `${r.name}:${r.port}`).join(",")
    uri = `mongodb://${creds}@${hosts}/${dbName}?ssl=true&authSource=admin&retryWrites=true&w=majority`
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 })
  log("MONGO_CONNECTED", {})

  const db = mongoose.connection.db!
  const puzzlesCol = db.collection("crossmathpuzzles")
  const sessionsCol = db.collection("crossmathplaysessions")

  // ── 1. Get a puzzle ──────────────────────────────────────────────
  const puzzle = await puzzlesCol.findOne({ game: "crossmath", difficulty: "easy" })
  if (!puzzle) throw new Error("No puzzle found")
  const blanks: string[] = puzzle.blanks || []
  const solution: Record<string, number> = puzzle.solution || {}
  log("PUZZLE", { puzzleId: puzzle.puzzleId, blanksCount: blanks.length })

  const fullGrid: Record<string, number> = {}
  for (const key of blanks) fullGrid[key] = solution[key]
  log("GRID_BUILT", { gridSize: Object.keys(fullGrid).length })

  // Helper to create a session doc
  function makeSession(sessionId: string) {
    return {
      sessionId,
      userId: TEST_USER_ID,
      puzzleId: puzzle.puzzleId,
      difficulty: puzzle.difficulty,
      status: "playing",
      grid: {},
      blanks,
      availableNumbers: puzzle.availableNumbers || [],
      moves: 0,
      mistakes: 0,
      hintsUsed: 0,
      elapsedTime: 0,
      startedAt: new Date(),
      lastSaveAt: new Date(),
    }
  }

  // ── 2. SCENARIO A: Normal flow (save+complete both succeed) ──────
  log("=== SCENARIO A: Normal Complete ===", {})

  const sA = `test-a-${Date.now()}`
  await sessionsCol.insertOne(makeSession(sA))
  log("A_CREATED", { sessionId: sA })

  // Save completed grid
  const saveA = await sessionsCol.findOneAndUpdate(
    { sessionId: sA, status: "playing" },
    { $set: { grid: fullGrid, elapsedTime: 120, lastSaveAt: new Date() }, $max: { moves: 42 } },
    { returnDocument: "after" }
  )
  log("A_SAVE", {
    found: !!saveA,
    status: saveA?.status,
    gridComplete: Object.keys(saveA?.grid || {}).length === blanks.length,
  })

  // Complete
  const compA = await sessionsCol.findOneAndUpdate(
    { sessionId: sA, status: "playing" },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
        "result.correct": blanks.length,
        "result.total": blanks.length,
        "result.accuracy": 100,
        "result.elapsedTime": 120,
        "result.moves": 42,
        "result.mistakes": 0,
        "result.hintsUsed": 0,
        "result.score": 420,
        lastSaveAt: new Date(),
      },
    },
    { returnDocument: "after" }
  )
  log("A_COMPLETE", {
    found: !!compA,
    status: compA?.status,
    returnValue: compA ? "non-null" : "null",
  })

  // Continue check
  const contA = await sessionsCol.findOne(
    { userId: TEST_USER_ID, status: { $in: ["playing", "paused"] } },
    { sort: { lastSaveAt: -1 } }
  )
  log("A_CONTINUE", {
    found: !!contA,
    expected: false,
    passed: !contA,
  })

  // ── 3. SCENARIO B: Tab close (save only, no complete) ────────────
  log("=== SCENARIO B: Tab Close ===", {})

  const sB = `test-b-${Date.now()}`
  await sessionsCol.insertOne(makeSession(sB))
  log("B_CREATED", { sessionId: sB })

  // Save completed grid only
  const saveB = await sessionsCol.findOneAndUpdate(
    { sessionId: sB, status: "playing" },
    { $set: { grid: fullGrid, elapsedTime: 120, lastSaveAt: new Date() }, $max: { moves: 42 } },
    { returnDocument: "after" }
  )
  log("B_SAVE", {
    found: !!saveB,
    status: saveB?.status,
    gridComplete: Object.keys(saveB?.grid || {}).length === blanks.length,
  })

  // NO complete call — simulating tab close

  // Continue API (like getContinuePlaying)
  const contB = await sessionsCol.findOne(
    { userId: TEST_USER_ID, status: { $in: ["playing", "paused"] } },
    { sort: { lastSaveAt: -1 } }
  )
  log("B_CONTINUE_FIND", {
    found: !!contB,
    status: contB?.status,
    sessionId: contB?.sessionId,
  })

  if (contB) {
    const bBlanks: string[] = contB.blanks || []
    const bGrid: Record<string, number> = contB.grid || {}
    const bFilled = bBlanks.filter((b: string) => bGrid[b] !== undefined).length
    log("B_AUTO_CHECK", {
      blanksLength: bBlanks.length,
      filledCount: bFilled,
      shouldAutoComplete: bFilled === bBlanks.length && bBlanks.length > 0,
    })

    if (bFilled === bBlanks.length && bBlanks.length > 0) {
      // Auto-complete: verify (skip verification — testing only the DB update)
      const autoComp = await sessionsCol.findOneAndUpdate(
        { sessionId: contB.sessionId, status: { $in: ["playing", "paused"] } },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            "result.correct": blanks.length,
            "result.total": blanks.length,
            "result.accuracy": 100,
            lastSaveAt: new Date(),
          },
        },
        { returnDocument: "after" }
      )
      log("B_AUTO_COMPLETE", {
        found: !!autoComp,
        returnValue: autoComp ? "non-null" : "null",
        statusAfter: autoComp?.status,
      })

      // Re-check Continue
      const contB2 = await sessionsCol.findOne(
        { userId: TEST_USER_ID, status: { $in: ["playing", "paused"] } },
        { sort: { lastSaveAt: -1 } }
      )
      log("B_CONTINUE_AFTER", {
        found: !!contB2,
        expected: false,
        passed: !contB2,
      })
    } else {
      log("B_AUTO_SKIPPED", { reason: bFilled !== bBlanks.length ? "not filled" : "no blanks" })
    }
  } else {
    log("B_CONTINUE_NO_SESSION", {})
  }

  // ── 4. KEY: What's the active session status? ────────────────────
  const activeSession = await sessionsCol.findOne(
    { userId: TEST_USER_ID, status: { $in: ["playing", "paused"] } },
    { sort: { lastSaveAt: -1 } }
  )
  log("FINAL_ACTIVE_CHECK", {
    found: !!activeSession,
    status: activeSession?.status,
    expected: false,
    passed: !activeSession,
  })

  // ── 5. Show all sessions ─────────────────────────────────────────
  const all = await sessionsCol.find({ userId: TEST_USER_ID }).toArray()
  log("ALL_SESSIONS", {
    count: all.length,
    sessions: all.map((s: any) => ({
      id: s.sessionId,
      status: s.status,
      completed: !!s.completedAt,
      gridSize: Object.keys(s.grid || {}).length,
    })),
  })

  // ── 6. SUMMARY ───────────────────────────────────────────────────
  const allCompleted = all.every((s: any) => s.status === "completed")
  log("SUMMARY", {
    scenarioA: contA ? "FAIL: Continue found completed session" : "PASS: Continue correct",
    scenarioB: "Auto-complete should restore session to completed",
    allCompleted,
  })

  // Cleanup
  await sessionsCol.deleteMany({ userId: TEST_USER_ID })
  log("CLEANUP_DONE", {})
  await mongoose.disconnect()
  log("DONE", {})
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
