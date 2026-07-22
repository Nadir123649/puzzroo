// Server API Types Consolidation

// Types from crossmath
export type CrossMathDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

// Common server-side types
export interface ServerResponse<T> {
  success: boolean
  payload?: T
  error?: string
  timestamp?: number
}

export interface ServerError {
  message: string
  code?: string
}