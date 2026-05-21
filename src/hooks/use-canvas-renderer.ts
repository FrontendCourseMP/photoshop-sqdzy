import { useEffect, useRef, type RefObject } from 'react'
import {
  drawRgbaImage,
  drawTransparencyGrid,
  getImageFitRect,
  type CanvasStageSize,
} from '../lib/canvas-preview'
import type { LoadedRasterImage } from '../lib/raster-image'

type UseCanvasRendererOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  displayRgba: Uint8ClampedArray | null
  image: LoadedRasterImage | null
  onError: (message: string) => void
  stageSize: CanvasStageSize
  onRenderComplete?: () => void
}

export function useCanvasRenderer({
  canvasRef,
  displayRgba,
  image,
  onError,
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
      !displayRgba ||
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
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'

      const drawRect = getImageFitRect({
        imageHeight: image.height,
        imageWidth: image.width,
        stageHeight: height,
        stageWidth: width,
      })

      drawTransparencyGrid(context, drawRect)

      context.save()
      context.shadowBlur = 32
      context.shadowColor = 'rgba(0, 0, 0, 0.34)'
      context.shadowOffsetY = 14
      if (displayRgba === image.rgba) {
        context.drawImage(
          image.bitmap,
          drawRect.x,
          drawRect.y,
          drawRect.width,
          drawRect.height,
        )
      } else {
        drawRgbaImage(context, {
          height: image.height,
          rect: drawRect,
          rgba: displayRgba,
          width: image.width,
        })
      }
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
  }, [canvasRef, displayRgba, image, onError, stageSize])
}
