import mongoose from "mongoose"

export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    const result = await fn(session)
    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export function isValidElapsedTime(elapsedTime: number): boolean {
  return Number.isFinite(elapsedTime) && elapsedTime >= 0 && elapsedTime < 86400
}

export function validateTimer(elapsedTime: number, hintsUsed: number, mistakes: number, moves: number): string | null {
  if (!isValidElapsedTime(elapsedTime)) {
    return "Invalid elapsed time"
  }
  if (!Number.isFinite(hintsUsed) || hintsUsed < 0 || hintsUsed > 1000) {
    return "Invalid hints count"
  }
  if (!Number.isFinite(mistakes) || mistakes < 0 || mistakes > 10000) {
    return "Invalid mistakes count"
  }
  if (!Number.isFinite(moves) || moves < 0 || moves > 100000) {
    return "Invalid moves count"
  }
  return null
}
