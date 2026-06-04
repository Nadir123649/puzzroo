/**
 * Floating Score Feedback Component
 * Shows animated score changes (+10, -5, -20)
 */

'use client'

import React, { useEffect, useState } from 'react'

export interface ScoreFeedback {
  id: string
  value: number
  timestamp: number
}

interface FloatingScoreFeedbackProps {
  feedbacks: ScoreFeedback[]
  onComplete: (id: string) => void
}

export function FloatingScoreFeedback({
  feedbacks,
  onComplete,
}: FloatingScoreFeedbackProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {feedbacks.map((feedback) => (
        <FloatingScore
          key={feedback.id}
          id={feedback.id}
          value={feedback.value}
          onComplete={onComplete}
        />
      ))}
    </div>
  )
}

interface FloatingScoreProps {
  id: string
  value: number
  onComplete: (id: string) => void
}

function FloatingScore({ id, value, onComplete }: FloatingScoreProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Fade out and remove after animation
    const timer = setTimeout(() => {
      setIsVisible(false)
      onComplete(id)
    }, 1000) // 1 second total

    return () => clearTimeout(timer)
  }, [id, onComplete])

  const isPositive = value > 0
  const color = isPositive ? 'text-green-500' : 'text-red-500'
  const sign = isPositive ? '+' : ''

  return (
    <div
      className={`
        absolute top-0 left-1/2 -translate-x-1/2
        font-urbanist font-bold text-2xl
        ${color}
        transition-all duration-1000 ease-out
        ${isVisible ? 'opacity-100 -translate-y-8' : 'opacity-0 -translate-y-12'}
      `}
      style={{
        animation: 'float-up 1s ease-out forwards',
      }}
    >
      {sign}{value}
    </div>
  )
}
