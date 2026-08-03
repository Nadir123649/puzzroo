'use client'

import { useState, useEffect } from 'react'
import { PastPuzzlesContent } from '@/components/past-puzzles/PastPuzzlesContent'

export default function TangramPastPuzzlesPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <PastPuzzlesContent gameId="tangram" />
  )
}
