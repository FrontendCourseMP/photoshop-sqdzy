import { yieldToBrowser } from './task-yield'

export const MIN_DISPLAY_SCALE_PERCENT = 12
export const MAX_DISPLAY_SCALE_PERCENT = 300
export const DEFAULT_INTERPOLATION_METHOD: InterpolationMethod = 'bilinear'

const SCALE_CHUNK_PIXELS = 120_000

export type InterpolationMethod = 'bilinear' | 'nearest'

export type ScaledRgbaImage = {
  height: number
  rgba: Uint8ClampedArray
  width: number
}

export type InterpolationMethodInfo = {
  description: string
  label: string
  value: InterpolationMethod
}

export const INTERPOLATION_METHODS: InterpolationMethodInfo[] = [
  {
    description:
      'Быстрый метод без смешивания цветов. Хорош для пиксель-арта и резких границ, но даёт ступенчатые края.',
    label: 'Ближайший сосед',
    value: 'nearest',
  },
  {
    description:
      'Смешивает четыре соседних пикселя. Даёт более плавный результат при обычных фотографиях и используется по умолчанию.',
    label: 'Билинейная',
    value: 'bilinear',
  },
]

export function getInterpolationMethodInfo(
  method: InterpolationMethod,
): InterpolationMethodInfo {
  return (
    INTERPOLATION_METHODS.find((candidate) => candidate.value === method) ??
    INTERPOLATION_METHODS[1]
  )
}

export function clampDisplayScalePercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 100
  }

  return Math.min(
    MAX_DISPLAY_SCALE_PERCENT,
    Math.max(MIN_DISPLAY_SCALE_PERCENT, Math.round(value)),
  )
}

export function calculateInitialDisplayScalePercent(input: {
  imageHeight: number
  imageWidth: number
  padding?: number
  stageHeight: number
  stageWidth: number
}): number {
  const padding = input.padding ?? 50
  const availableWidth = Math.max(1, input.stageWidth - padding * 2)
  const availableHeight = Math.max(1, input.stageHeight - padding * 2)
  const fitScale =
    Math.min(
      availableWidth / input.imageWidth,
      availableHeight / input.imageHeight,
    ) * 100

  return clampDisplayScalePercent(fitScale)
}

export function getScaledDimensions(input: {
  height: number
  scalePercent: number
  width: number
}): { height: number; width: number } {
  const scale = clampDisplayScalePercent(input.scalePercent) / 100

  return {
    height: Math.max(1, Math.round(input.height * scale)),
    width: Math.max(1, Math.round(input.width * scale)),
  }
}

export function scaleRgbaImage(input: {
  method: InterpolationMethod
  rgba: Uint8ClampedArray
  sourceHeight: number
  sourceWidth: number
  targetHeight: number
  targetWidth: number
}): ScaledRgbaImage {
  validateScaleInput(input)

  const output = new Uint8ClampedArray(input.targetWidth * input.targetHeight * 4)

  writeScaledRows({
    ...input,
    output,
    yEnd: input.targetHeight,
    yStart: 0,
  })

  return {
    height: input.targetHeight,
    rgba: output,
    width: input.targetWidth,
  }
}

export async function scaleRgbaImageAsync(input: {
  method: InterpolationMethod
  rgba: Uint8ClampedArray
  sourceHeight: number
  sourceWidth: number
  targetHeight: number
  targetWidth: number
}): Promise<ScaledRgbaImage> {
  validateScaleInput(input)

  const output = new Uint8ClampedArray(input.targetWidth * input.targetHeight * 4)
  const chunkRows = Math.max(
    1,
    Math.floor(SCALE_CHUNK_PIXELS / input.targetWidth),
  )

  for (let yStart = 0; yStart < input.targetHeight; yStart += chunkRows) {
    writeScaledRows({
      ...input,
      output,
      yEnd: Math.min(input.targetHeight, yStart + chunkRows),
      yStart,
    })

    await yieldToBrowser()
  }

  return {
    height: input.targetHeight,
    rgba: output,
    width: input.targetWidth,
  }
}

function validateScaleInput(input: {
  rgba: Uint8ClampedArray
  sourceHeight: number
  sourceWidth: number
  targetHeight: number
  targetWidth: number
}): void {
  const sizes = [
    input.sourceWidth,
    input.sourceHeight,
    input.targetWidth,
    input.targetHeight,
  ]

  if (sizes.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new Error('Размеры изображения должны быть целыми положительными числами.')
  }

  if (input.rgba.length !== input.sourceWidth * input.sourceHeight * 4) {
    throw new Error('Некорректный RGBA-буфер для масштабирования.')
  }
}

function writeScaledRows(input: {
  method: InterpolationMethod
  output: Uint8ClampedArray
  rgba: Uint8ClampedArray
  sourceHeight: number
  sourceWidth: number
  targetHeight: number
  targetWidth: number
  yEnd: number
  yStart: number
}): void {
  if (input.method === 'nearest') {
    writeNearestRows(input)
    return
  }

  writeBilinearRows(input)
}

function writeNearestRows(input: {
  output: Uint8ClampedArray
  rgba: Uint8ClampedArray
  sourceHeight: number
  sourceWidth: number
  targetHeight: number
  targetWidth: number
  yEnd: number
  yStart: number
}): void {
  for (let targetY = input.yStart; targetY < input.yEnd; targetY += 1) {
    const sourceY = getMappedCoordinate(
      targetY,
      input.targetHeight,
      input.sourceHeight,
    )
    const nearestY = Math.round(sourceY)

    for (let targetX = 0; targetX < input.targetWidth; targetX += 1) {
      const sourceX = getMappedCoordinate(
        targetX,
        input.targetWidth,
        input.sourceWidth,
      )
      const nearestX = Math.round(sourceX)
      const sourceOffset = (nearestY * input.sourceWidth + nearestX) * 4
      const targetOffset = (targetY * input.targetWidth + targetX) * 4

      input.output[targetOffset] = input.rgba[sourceOffset]
      input.output[targetOffset + 1] = input.rgba[sourceOffset + 1]
      input.output[targetOffset + 2] = input.rgba[sourceOffset + 2]
      input.output[targetOffset + 3] = input.rgba[sourceOffset + 3]
    }
  }
}

function writeBilinearRows(input: {
  output: Uint8ClampedArray
  rgba: Uint8ClampedArray
  sourceHeight: number
  sourceWidth: number
  targetHeight: number
  targetWidth: number
  yEnd: number
  yStart: number
}): void {
  for (let targetY = input.yStart; targetY < input.yEnd; targetY += 1) {
    const sourceY = getMappedCoordinate(
      targetY,
      input.targetHeight,
      input.sourceHeight,
    )
    const y0 = Math.floor(sourceY)
    const y1 = Math.min(input.sourceHeight - 1, y0 + 1)
    const yWeight = sourceY - y0

    for (let targetX = 0; targetX < input.targetWidth; targetX += 1) {
      const sourceX = getMappedCoordinate(
        targetX,
        input.targetWidth,
        input.sourceWidth,
      )
      const x0 = Math.floor(sourceX)
      const x1 = Math.min(input.sourceWidth - 1, x0 + 1)
      const xWeight = sourceX - x0
      const targetOffset = (targetY * input.targetWidth + targetX) * 4

      for (let channel = 0; channel < 4; channel += 1) {
        const topLeft = input.rgba[(y0 * input.sourceWidth + x0) * 4 + channel]
        const topRight = input.rgba[(y0 * input.sourceWidth + x1) * 4 + channel]
        const bottomLeft = input.rgba[(y1 * input.sourceWidth + x0) * 4 + channel]
        const bottomRight =
          input.rgba[(y1 * input.sourceWidth + x1) * 4 + channel]
        const top = interpolate(topLeft, topRight, xWeight)
        const bottom = interpolate(bottomLeft, bottomRight, xWeight)

        input.output[targetOffset + channel] = Math.round(
          interpolate(top, bottom, yWeight),
        )
      }
    }
  }
}

function getMappedCoordinate(
  targetCoordinate: number,
  targetSize: number,
  sourceSize: number,
): number {
  if (targetSize === 1 || sourceSize === 1) {
    return 0
  }

  return (targetCoordinate * (sourceSize - 1)) / (targetSize - 1)
}

function interpolate(start: number, end: number, weight: number): number {
  return start + (end - start) * weight
}
