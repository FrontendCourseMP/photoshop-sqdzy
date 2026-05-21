export type CanvasStageSize = {
  height: number
  width: number
}

export type DrawRect = {
  height: number
  width: number
  x: number
  y: number
}

export const EMPTY_STAGE_SIZE: CanvasStageSize = { height: 0, width: 0 }

export function getImageFitRect(input: {
  imageHeight: number
  imageWidth: number
  stageHeight: number
  stageWidth: number
}): DrawRect {
  const { imageHeight, imageWidth, stageHeight, stageWidth } = input
  const framePadding = Math.max(20, Math.min(stageWidth, stageHeight) * 0.06)
  const availableWidth = Math.max(1, stageWidth - framePadding * 2)
  const availableHeight = Math.max(1, stageHeight - framePadding * 2)
  const fitScale = Math.min(
    availableWidth / imageWidth,
    availableHeight / imageHeight,
    1,
  )
  const width = Math.max(1, imageWidth * fitScale)
  const height = Math.max(1, imageHeight * fitScale)

  return {
    height,
    width,
    x: (stageWidth - width) / 2,
    y: (stageHeight - height) / 2,
  }
}

export function drawTransparencyGrid(
  context: CanvasRenderingContext2D,
  rect: DrawRect,
  tileSize = 14,
): void {
  const startX = Math.floor(rect.x)
  const startY = Math.floor(rect.y)
  const endX = Math.ceil(rect.x + rect.width)
  const endY = Math.ceil(rect.y + rect.height)

  context.save()
  context.beginPath()
  context.rect(rect.x, rect.y, rect.width, rect.height)
  context.clip()
  context.fillStyle = '#f4f4f5'
  context.fillRect(rect.x, rect.y, rect.width, rect.height)

  for (let y = startY; y < endY; y += tileSize) {
    for (let x = startX; x < endX; x += tileSize) {
      const isAlternate =
        (Math.floor((x - startX) / tileSize) +
          Math.floor((y - startY) / tileSize)) %
          2 ===
        0

      if (isAlternate) {
        context.fillStyle = '#cfd3da'
        context.fillRect(x, y, tileSize, tileSize)
      }
    }
  }

  context.restore()
}

export function drawRgbaImage(
  context: CanvasRenderingContext2D,
  input: {
    height: number
    rect: DrawRect
    rgba: Uint8ClampedArray
    width: number
  },
): void {
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = input.width
  sourceCanvas.height = input.height

  const sourceContext = sourceCanvas.getContext('2d')

  if (!sourceContext) {
    throw new Error('Не удалось создать контекст canvas для отрисовки.')
  }

  const imageData = new ImageData(
    input.rgba as ImageDataArray,
    input.width,
    input.height,
  )

  sourceContext.putImageData(imageData, 0, 0)
  context.drawImage(
    sourceCanvas,
    input.rect.x,
    input.rect.y,
    input.rect.width,
    input.rect.height,
  )
}
