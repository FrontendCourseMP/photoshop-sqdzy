import { useEffect, useRef, useState } from 'react'
import {
  EMPTY_STAGE_SIZE,
  type CanvasStageSize,
} from '../lib/canvas-preview'

export function useElementSize<TElement extends HTMLElement>() {
  const elementRef = useRef<TElement>(null)
  const [size, setSize] = useState<CanvasStageSize>(EMPTY_STAGE_SIZE)

  useEffect(() => {
    if (!elementRef.current) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      setSize({
        height: Math.max(0, Math.floor(entry.contentRect.height)),
        width: Math.max(0, Math.floor(entry.contentRect.width)),
      })
    })

    observer.observe(elementRef.current)

    return () => observer.disconnect()
  }, [])

  return { elementRef, size }
}
