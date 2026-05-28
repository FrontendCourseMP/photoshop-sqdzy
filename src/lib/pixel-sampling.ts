import { getCenteredImageRect } from './canvas-preview'
import { rgbToCielab, type CielabColor } from './color-space'
import type { LoadedRasterImage } from './raster-image'

export type ImageCoordinates = {
  x: number
  y: number
}

export type PixelSample = ImageCoordinates & {
  alpha: number
  blue: number
  green: number
  hex: string
  lab: CielabColor
  red: number
}

export function getImageCoordinatesFromCanvasPoint(input: {
  canvasRect: DOMRect
  clientX: number
  clientY: number
  imageHeight: number
  imageWidth: number
  renderedImageHeight: number
  renderedImageWidth: number
}): ImageCoordinates | null {
  const {
    canvasRect,
    clientX,
    clientY,
    imageHeight,
    imageWidth,
    renderedImageHeight,
    renderedImageWidth,
  } = input
  const pointX = clientX - canvasRect.left
  const pointY = clientY - canvasRect.top
  const drawRect = getCenteredImageRect({
    imageHeight: renderedImageHeight,
    imageWidth: renderedImageWidth,
    stageHeight: canvasRect.height,
    stageWidth: canvasRect.width,
  })

  if (
    pointX < drawRect.x ||
    pointY < drawRect.y ||
    pointX >= drawRect.x + drawRect.width ||
    pointY >= drawRect.y + drawRect.height
  ) {
    return null
  }

  const x = Math.min(
    imageWidth - 1,
    Math.max(0, Math.floor(((pointX - drawRect.x) / drawRect.width) * imageWidth)),
  )
  const y = Math.min(
    imageHeight - 1,
    Math.max(0, Math.floor(((pointY - drawRect.y) / drawRect.height) * imageHeight)),
  )

  return { x, y }
}

export function sampleImagePixel(
  image: LoadedRasterImage,
  coordinates: ImageCoordinates,
): PixelSample {
  const pixelOffset = (coordinates.y * image.width + coordinates.x) * 4
  const red = image.rgba[pixelOffset]
  const green = image.rgba[pixelOffset + 1]
  const blue = image.rgba[pixelOffset + 2]
  const alpha = image.rgba[pixelOffset + 3]

  return {
    ...coordinates,
    alpha,
    blue,
    green,
    hex: rgbToHex({ blue, green, red }),
    lab: rgbToCielab({ blue, green, red }),
    red,
  }
}

function rgbToHex({
  blue,
  green,
  red,
}: {
  blue: number
  green: number
  red: number
}): string {
  return `#${toHexByte(red)}${toHexByte(green)}${toHexByte(blue)}`
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase()
}
