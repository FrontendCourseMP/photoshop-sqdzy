import { useEffect, useRef, type RefObject } from 'react'
import {
  getCenteredImageRect,
  drawRgbaImage,
  drawTransparencyGrid,
  type CanvasPanOffset,
  type CanvasStageSize,
} from '../lib/canvas-preview'
import type { LoadedRasterImage } from '../lib/raster-image'

export type RenderedCanvasImage = {
  height: number
  rgba: Uint8ClampedArray
  width: number
}

type UseCanvasRendererOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  image: LoadedRasterImage | null
  onError: (message: string) => void
  panOffset: CanvasPanOffset
  renderedImage: RenderedCanvasImage | null
  stageSize: CanvasStageSize
  onRenderComplete?: () => void
}

export function useCanvasRenderer({
  canvasRef,
  image,
  onError,
  panOffset,
  renderedImage,
  stageSize,
  onRenderComplete,
}: UseCanvasRendererOptions): void {
  const onRenderCompleteRef = useRef(onRenderComplete)

  useEffect(() => {
    onRenderCompleteRef.current = onRenderComplete
  })

  useEffect(() => {
    if (
      !image ||
      !renderedImage ||
      !canvasRef.current ||
      !stageSize.width ||
      !stageSize.height
    ) {
      return
    }

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      onError('Не удалось получить 2D-контекст canvas.')
      return
    }

    const timeoutId = setTimeout(() => {
      const devicePixelRatio = window.devicePixelRatio || 1
      const width = stageSize.width
      const height = stageSize.height

      canvas.width = Math.max(1, Math.floor(width * devicePixelRatio))
      canvas.height = Math.max(1, Math.floor(height * devicePixelRatio))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)
      context.imageSmoothingEnabled = false

      const drawRect = getCenteredImageRect({
        imageHeight: renderedImage.height,
        imageWidth: renderedImage.width,
        panOffset,
        stageHeight: height,
        stageWidth: width,
      })

      drawTransparencyGrid(context, drawRect)

      context.save()
      context.shadowBlur = 32
      context.shadowColor = 'rgba(0, 0, 0, 0.34)'
      context.shadowOffsetY = 14
      drawRgbaImage(context, {
        height: renderedImage.height,
        rect: drawRect,
        rgba: renderedImage.rgba,
        width: renderedImage.width,
      })
      context.restore()

      context.save()
      context.strokeStyle = 'rgba(255, 255, 255, 0.34)'
      context.lineWidth = 1
      context.strokeRect(
        Math.round(drawRect.x) + 0.5,
        Math.round(drawRect.y) + 0.5,
        Math.round(drawRect.width),
        Math.round(drawRect.height),
      )
      context.restore()

      onRenderCompleteRef.current?.()
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [canvasRef, image, onError, panOffset, renderedImage, stageSize])
}
