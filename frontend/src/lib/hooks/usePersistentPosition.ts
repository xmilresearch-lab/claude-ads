'use client'

import { useCallback, useEffect, useState } from 'react'

interface Position {
  x: number
  y: number
}

function clampToViewport(pos: Position): Position {
  if (typeof window === 'undefined') return pos
  return {
    x: Math.max(0, Math.min(pos.x, window.innerWidth - 56)),
    y: Math.max(0, Math.min(pos.y, window.innerHeight - 56)),
  }
}

export function usePersistentPosition(
  key: string,
  defaultPos?: Partial<Position>,
): { position: Position; savePosition: (pos: Position) => void } {
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === 'undefined') {
      return { x: defaultPos?.x ?? 0, y: defaultPos?.y ?? 0 }
    }
    try {
      const stored = localStorage.getItem(`bubble-pos:${key}`)
      if (stored) return clampToViewport(JSON.parse(stored) as Position)
    } catch {
      // ignore parse errors
    }
    return clampToViewport({
      x: defaultPos?.x ?? window.innerWidth - 88,
      y: defaultPos?.y ?? window.innerHeight - 88,
    })
  })

  useEffect(() => {
    function onResize() {
      setPosition((prev) => clampToViewport(prev))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const savePosition = useCallback(
    (pos: Position) => {
      const clamped = clampToViewport(pos)
      setPosition(clamped)
      try {
        localStorage.setItem(`bubble-pos:${key}`, JSON.stringify(clamped))
      } catch {
        // ignore storage errors
      }
    },
    [key],
  )

  return { position, savePosition }
}
