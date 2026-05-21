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
