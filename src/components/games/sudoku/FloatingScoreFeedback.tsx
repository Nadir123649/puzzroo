'use client'

import { useEffect, useState } from 'react'

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
    <div className="absolute inset-0 pointer-events-none overflow-visible z-[100]">
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
  const [stage, setStage] = useState<'enter' | 'float' | 'exit'>('enter')

  useEffect(() => {
    const enterTimer = setTimeout(() => {
      setStage('float')
    }, 100)

    const floatTimer = setTimeout(() => {
      setStage('exit')
    }, 1200)

    const exitTimer = setTimeout(() => {
      onComplete(id)
    }, 1600)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(floatTimer)
      clearTimeout(exitTimer)
    }
  }, [id, onComplete])

  const isPositive = value > 0
  const color = isPositive ? '#22C55E' : '#F75555'
  const sign = isPositive ? '+' : ''

  // Calculate transform based on stage
  const getTransform = () => {
    switch (stage) {
      case 'enter':
        return 'translate(-50%, -20px) scale(0.9)'
      case 'float':
        return 'translate(-50%, -60px) scale(1)'
      case 'exit':
        return 'translate(-50%, -80px) scale(0.9)'
      default:
        return 'translate(-50%, -20px) scale(0.9)'
    }
  }

  const getOpacity = () => {
    switch (stage) {
      case 'enter':
        return 0
      case 'float':
        return 1
      case 'exit':
        return 0
      default:
        return 0
    }
  }

  return (
    <div
      className="absolute top-1/2 left-1/2 font-urbanist font-bold text-2xl pointer-events-none z-[100]"
      style={{
        color,
        transform: getTransform(),
        opacity: getOpacity(),
        transition: stage === 'enter' 
          ? 'none' 
          : stage === 'float'
          ? 'transform 800ms ease-out, opacity 200ms ease-out'
          : 'transform 400ms ease-in, opacity 400ms ease-in',
        willChange: 'transform, opacity',
      }}
    >
      {sign}{value}
    </div>
  )
}
