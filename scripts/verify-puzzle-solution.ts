/**
 * VERIFY: Does the puzzle's solution satisfy its own equations?
 */
import { readFileSync } from "fs"
import { resolve } from "path"

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

async function main() {
  const { default: mongoose } = await import("mongoose")
  const MONGODB_URI = process.env.MONGO_URI!
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
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 })

  // Load pattern data
  const patternModule = await import("../shared/src/data/crossmath/patterns")
  const { getPatternById } = patternModule

  const db = mongoose.connection.db!
  const puzzles = db.collection("crossmathpuzzles")

  const puzzle = await puzzles.findOne({ puzzleId: "crossmath-7x7-easy-f579b450" })
  if (!puzzle) { console.log("PUZZLE NOT FOUND"); return }

  const solution: Record<string, number> = puzzle.solution || {}
  const blanks: string[] = puzzle.blanks || []
  const pattern = getPatternById(puzzle.patternId)

  console.log("\n=== PUZZLE DATA ===")
  console.log("puzzleId:", puzzle.puzzleId)
  console.log("patternId:", puzzle.patternId)
  console.log("blanks:", blanks)
  console.log("solution:", JSON.stringify(solution, null, 2))
  console.log("availableNumbers:", puzzle.availableNumbers)

  if (!pattern) { console.log("NO PATTERN"); return }

  console.log("\n=== EQUATIONS ===")
  for (const eq of pattern.equations) {
    const cells = eq.cells
    const cellInfo = cells.map(([r, c]: [number, number]) => {
      const pc = pattern.cells.find((p: any) => p.row === r && p.col === c)
      const key = `${r}-${c}`
      return { row: r, col: c, type: pc?.type, operator: pc?.operator, solVal: solution[key], isBlank: blanks.includes(key) }
    })
    console.log(`Equation ${eq.id} (${eq.direction}):`, JSON.stringify(cellInfo, null, 2))

    // Evaluate left-to-right
    let result = 0
    let expected = 0
    let foundEquals = false
    let operands: number[] = []
    let operators: string[] = []
    for (const c of cellInfo) {
      if (c.type === 'NUMBER') {
        const val = c.solVal !== undefined ? c.solVal : 0
        if (!foundEquals) {
          operands.push(val)
        } else {
          expected = val
        }
      } else if (c.type === 'OPERATOR') {
        operators.push(c.operator!)
      } else if (c.type === 'EQUALS') {
        foundEquals = true
      }
    }
    if (operands.length > 0) {
      result = operands[0]
      for (let i = 0; i < operators.length; i++) {
        const op = operators[i]
        const next = operands[i + 1]
        if (op === '+') result += next
        else if (op === '−' || op === '-') result -= next
        else if (op === '×') result *= next
        else if (op === '÷') result /= next
      }
      const correct = result === expected
      console.log(`  Computed: ${operands.join(` ${operators[0]} `)} = ${result}, Expected: ${expected}, ${correct ? 'CORRECT' : 'WRONG'}`)
    }
  }

  await mongoose.disconnect()
}

main().catch(console.error)
