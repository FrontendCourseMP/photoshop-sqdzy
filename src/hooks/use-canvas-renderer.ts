import { useEffect, type RefObject } from 'react'
import {
  drawTransparencyGrid,
  getImageFitRect,
  type CanvasStageSize,
} from '../lib/canvas-preview'
import type { LoadedRasterImage } from '../lib/raster-image'

type UseCanvasRendererOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  image: LoadedRasterImage | null
  onError: (message: string) => void
  stageSize: CanvasStageSize
}

export function useCanvasRenderer({
  canvasRef,
  image,
  onError,
  stageSize,
}: UseCanvasRendererOptions): void {
  useEffect(() => {
    if (!image || !canvasRef.current || !stageSize.width || !stageSize.height) {
      return
    }

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      onError('Не удалось получить 2D-контекст canvas.')
      return
    }

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
    context.drawImage(
      image.bitmap,
      drawRect.x,
      drawRect.y,
      drawRect.width,
      drawRect.height,
    )
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
  }, [canvasRef, image, onError, stageSize])
}
