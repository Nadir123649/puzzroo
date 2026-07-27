/**
 * FULL LIFECYCLE RUNTIME TEST — CrossMath
 *
 * 1. Creates test user in DB
 * 2. Generates JWT
 * 3. Starts a session 
 * 4. Saves a completed grid (simulating the last move)
 * 5. DOES NOT call complete (simulating tab close race)
 * 6. Calls Continue API
 * 7. Reports exactly what Continue returns
 * 8. Checks DB state at every step
 *
 * Usage: npx tsx scripts/full-lifecycle-test.ts
 */

import { readFileSync } from "fs"
import { resolve } from "path"

// Load .env
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

const TEST_USER_ID = `test-lifecycle-${Date.now()}`
const TEST_USER_EMAIL = `${TEST_USER_ID}@test.com`

async function main() {
  const { default: mongoose } = await import("mongoose")
  const { default: jwt } = await import("jsonwebtoken")

  // ── Connect to MongoDB ───────────────────────────────────────────
  const MONGODB_URI = process.env.MONGO_URI!
  let uri = MONGODB_URI
  if (uri.startsWith("mongodb+srv://")) {
    const { Resolver } = await import("dns/promises")
    const resolver = new Resolver()
    resolver.setServers(["8.8.8.8", "8.8.4.4"])
    const urlObj = new URL(uri.replace("mongodb+srv://", "mongodb://"))
    const dbName = urlObj.pathname.replace(/^\//, "") || "puzzroo"
    const creds = urlObj.username ? `${encodeURIComponent(urlObj.username)}:${encodeURIComponent(urlObj.password)}` : ""
    const records = await resolver.resolveSrv(`_mongodb._tcp.${urlObj.hostname}`)
    const hosts = records.map((r) => `${r.name}:${r.port}`).join(",")
    uri = `mongodb://${creds}@${hosts}/${dbName}?ssl=true&authSource=admin&retryWrites=true&w=majority`
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 })
  log("MONGO_CONNECTED", {})

  const db = mongoose.connection.db!
  const puzzlesCol = db.collection("crossmathpuzzles")

  // Use Mongoose models to ensure schema casting (ObjectId for userId etc.)
  const sessionSchema = new mongoose.Schema({}, { strict: false, collection: "crossmathplaysessions" })
  const SessionModel = mongoose.models.CrossMathPlaySessionTest || mongoose.model("CrossMathPlaySessionTest", sessionSchema)
  
  const userSchema = new mongoose.Schema({}, { strict: false, collection: "users" })
  const UserModel = mongoose.models.UserTest || mongoose.model("UserTest", userSchema)

  // ── Get a real puzzle ─────────────────────────────────────────────
  const puzzle = await puzzlesCol.findOne({ game: "crossmath", difficulty: "easy" })
  if (!puzzle) throw new Error("No puzzle found")
  const blanks: string[] = puzzle.blanks || []
  const solution: Record<string, number> = puzzle.solution || {}
  const fullGrid: Record<string, number> = {}
  for (const key of blanks) fullGrid[key] = solution[key]
  log("PUZZLE", { puzzleId: puzzle.puzzleId, blanksCount: blanks.length, gridKeys: Object.keys(fullGrid).length })

  // ── Create a test user ────────────────────────────────────────────
  const usersCol = db.collection("users")
  const usersBefore = await usersCol.countDocuments({ email: TEST_USER_EMAIL })
  const userObj = { _id: new (mongoose.Types as any).ObjectId(), email: TEST_USER_EMAIL, username: TEST_USER_ID, role: "user" }
  if (usersBefore === 0) {
    await usersCol.insertOne(userObj)
  }
  log("TEST_USER", { userId: userObj._id.toString(), email: TEST_USER_EMAIL })

  // ── Generate JWT ──────────────────────────────────────────────────
  const accessToken = jwt.sign(
    { id: userObj._id.toString(), role: "user" },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "7d" }
  )
  log("JWT_GENERATED", { tokenPrefix: accessToken.substring(0, 20) + "..." })

  const BASE = "http://localhost:3001"
  const HEADERS = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
  const uid = userObj._id.toString()

  // ── STEP 1: Create session via Mongoose model ────────────────────
  // This ensures userId is cast to ObjectId (matches schema), matching what the app does.
  const sessionId = `test-lc-${Date.now()}`
  const sessionDoc = await SessionModel.create({
    sessionId,
    userId: userObj._id,
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
  })
  log("SESSION_CREATED", { sessionId, status: "playing" })

  // ── STEP 2: Save the completed grid (simulating last move) ────────
  log("=== SAVING COMPLETED GRID (simulating last move) ===", { sessionId })
  
  const saveUrl = `${BASE}/api/v1/games/crossmath/sessions/${sessionId}/save`
  log("SAVE_REQUEST", { url: saveUrl, gridSize: Object.keys(fullGrid).length })

  try {
    const saveResp = await fetch(saveUrl, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        grid: fullGrid,
        elapsedTime: 120,
        hintsUsed: 0,
        mistakes: 0,
        moves: 42,
      }),
    })
    const saveJson = await saveResp.json()
    log("SAVE_RESPONSE", {
      status: saveResp.status,
      ok: saveResp.ok,
      body: saveJson,
    })
  } catch (e: any) {
    log("SAVE_ERROR", { error: e.message })
  }

  // ── STEP 3: DO NOT call complete — simulating tab close ───────────
  log("=== SKIPPING COMPLETE (simulating tab close) ===", {})

  // Check DB state (using raw collection to avoid Mongoose transform issues)
  const rawSessions = db.collection("crossmathplaysessions")
  let dbSession = await rawSessions.findOne({ sessionId }) as any
  log("DB_AFTER_SAVE", {
    status: dbSession?.status,
    gridKeys: Object.keys(dbSession?.grid || {}).length,
    blanksCount: blanks.length,
    gridComplete: Object.keys(dbSession?.grid || {}).length === blanks.length,
  })

  // ── STEP 4: Call Continue API ─────────────────────────────────────
  log("=== CALLING CONTINUE API ===", {})
  
  const continueUrl = `${BASE}/api/v1/games/crossmath/continue`
  log("CONTINUE_REQUEST", { url: continueUrl })

  try {
    const contResp = await fetch(continueUrl, { headers: HEADERS })
    const contJson = await contResp.json()
    log("CONTINUE_RESPONSE", {
      status: contResp.status,
      ok: contResp.ok,
      body: contJson,
    })
  } catch (e: any) {
    log("CONTINUE_ERROR", { error: e.message })
  }

  // ── STEP 5: Check DB AFTER continue ──────────────────────────────
  dbSession = await rawSessions.findOne({ sessionId }) as any
  log("DB_AFTER_CONTINUE", {
    sessionId,
    status: dbSession?.status,
    hasCompletedAt: !!dbSession?.completedAt,
    hasResult: !!dbSession?.result,
  })

  // ── STEP 6: Call Continue again (should return hasActiveSession: false) ──
  log("=== CALLING CONTINUE AGAIN ===", {})
  try {
    const contResp2 = await fetch(continueUrl, { headers: HEADERS })
    const contJson2 = await contResp2.json()
    log("CONTINUE_RESPONSE_2", {
      status: contResp2.status,
      ok: contResp2.ok,
      body: contJson2,
    })
  } catch (e: any) {
    log("CONTINUE_ERROR_2", { error: (e as any).message })
  }

  // ── FINAL DB CHECK ──────────────────────────────────────────────
  const allTest = await rawSessions.find({ userId: userObj._id.toString() }).toArray()
  log("FINAL_DB", {
    sessionCount: allTest.length,
    sessions: allTest.map((s: any) => ({ id: s.sessionId, status: s.status, hasCompletedAt: !!s.completedAt })),
  })

  // Cleanup
  await rawSessions.deleteMany({ userId: userObj._id.toString() })
  await usersCol.deleteMany({ _id: userObj._id })
  log("CLEANUP_DONE", {})
  await mongoose.disconnect()
  log("DONE", {})
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
