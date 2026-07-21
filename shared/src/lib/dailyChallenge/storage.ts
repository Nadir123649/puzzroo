/**
 * Daily Challenge Storage
 * Manage challenge status in localStorage
 */

import { DailyChallengeStatus } from './types'

const STORAGE_KEY = 'puzzroo_daily_challenges'

interface ChallengeProgress {
  [challengeId: string]: {
    status: DailyChallengeStatus
    completedAt?: number
    score?: number
    time?: number
  }
}

/**
 * Get all challenge progress
 */
export function getChallengeProgress(): ChallengeProgress {
  if (typeof window === 'undefined') return {}
  
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

/**
 * Update challenge status
 */
export function updateChallengeStatus(
  challengeId: string,
  status: DailyChallengeStatus,
  metadata?: { score?: number; time?: number }
): void {
  if (typeof window === 'undefined') return
  
  try {
    const progress = getChallengeProgress()
    progress[challengeId] = {
      status,
      completedAt: status === 'completed' ? Date.now() : undefined,
      ...metadata,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('Failed to update challenge status:', error)
  }
}

/**
 * Get challenge status
 */
export function getChallengeStatus(challengeId: string): DailyChallengeStatus {
  const progress = getChallengeProgress()
  return progress[challengeId]?.status || 'not-started'
}

/**
 * Check if user is guest (determines access level).
 * Pass the real auth state from the client — never hardcode.
 */
export function isGuestUser(authed = false): boolean {
  return !authed
}

/**
 * Get number of accessible past challenges.
 * Registered users get a wider window; guests get the minimum 3.
 */
export function getAccessiblePastChallenges(authed = false): number {
  return authed ? 7 : 3
}
