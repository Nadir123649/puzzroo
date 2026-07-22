import { getPatternById } from "@shared/data/crossmath/patterns"
import type { BoardPattern } from "@shared/data/crossmath/patterns"
import CrossMathPuzzle from "@/lib/server/models/CrossMathPuzzle"
import type { EquationResult, VerifyGridResult } from "../types"

interface CrossMathDoc {
  puzzleId: string
  difficulty: string
  patternId: number
  solution: Record<string, number>
  blanks: string[]
  availableNumbers: number[]
  maxMistakes: number
}

function evaluateLeftToRight(values: number[], operators: string[]): number {
  let result = values[0]
  for (let i = 0; i < operators.length; i++) {
    const op = operators[i]
    const nextVal = values[i + 1]
    if (op === '+') {
      result += nextVal
    } else if (op === '−' || op === '-') {
      result -= nextVal
    } else if (op === '×') {
      result *= nextVal
    } else if (op === '÷') {
      if (nextVal === 0) return NaN
      result /= nextVal
    }
  }
  return result
}

export class VerificationEngine {
  async verify(
    puzzleId: string,
    playerGrid: Record<string, number>
  ): Promise<VerifyGridResult> {
    const doc = await CrossMathPuzzle.findOne({ puzzleId }).lean()
    if (!doc) throw new Error("puzzle_not_found")

    const puzzle = doc as unknown as CrossMathDoc
    const pattern = getPatternById(puzzle.patternId)
    if (!pattern) throw new Error("invalid_pattern")

    const equationResults: EquationResult[] = []
    const errors: string[] = []
    let totalMistakes = 0

    for (const equation of pattern.equations) {
      const leftOperands: number[] = []
      const operators: string[] = []
      let expectedResult = 0
      let foundEquals = false

      for (const [row, col] of equation.cells) {
        const pc = pattern.cells.find(c => c.row === row && c.col === col)
        if (!pc) continue

        const key = `${row}-${col}`
        const solutionValue = puzzle.solution[key]
        if (solutionValue === undefined) continue

        if (pc.type === 'NUMBER') {
          const isBlank = puzzle.blanks.includes(key)
          const playerValue = playerGrid[key] !== undefined ? playerGrid[key] : solutionValue

          if (!foundEquals) {
            leftOperands.push(playerValue)
          } else {
            expectedResult = solutionValue
          }

          if (isBlank && playerGrid[key] !== undefined && playerGrid[key] !== solutionValue) {
            totalMistakes++
          }
        } else if (pc.type === 'OPERATOR') {
          const op = pc.operator || '+'
          operators.push(op)
        } else if (pc.type === 'EQUALS') {
          foundEquals = true
        }
      }

      if (leftOperands.length === 0) continue

      const computedResult = evaluateLeftToRight(leftOperands, operators)
      const isCorrect = computedResult === expectedResult

      equationResults.push({
        equationId: equation.id,
        direction: equation.direction,
        operands: leftOperands,
        operators,
        expectedResult,
        actualResult: computedResult,
        correct: isCorrect,
      })

      if (!isCorrect) {
        errors.push(`Equation ${equation.id} is incorrect: expected ${expectedResult}, got ${computedResult}`)
      }
    }

    const allCorrect = equationResults.every(eq => eq.correct)

    const filledBlanks = puzzle.blanks.filter(b => playerGrid[b] !== undefined)
    const allBlanksFilled = filledBlanks.length === puzzle.blanks.length
    const completed = allCorrect && allBlanksFilled

    const totalBlanks = puzzle.blanks.length
    const correctBlanks = puzzle.blanks.filter(
      b => playerGrid[b] !== undefined && playerGrid[b] === puzzle.solution[b]
    ).length
    const accuracy = totalBlanks > 0
      ? Math.round((correctBlanks / totalBlanks) * 100)
      : 100

    return {
      correct: allCorrect,
      completed,
      mistakes: totalMistakes,
      maxMistakes: puzzle.maxMistakes,
      accuracy,
      equations: equationResults,
      errors,
    }
  }
}

export const verificationEngine = new VerificationEngine()
