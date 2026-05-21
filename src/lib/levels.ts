import type { LoadedRasterImage, RasterChannel } from './raster-image'
import { yieldToBrowser } from './task-yield'

export type HistogramScale = 'linear' | 'logarithmic'
export type LevelsTarget = 'master' | RasterChannel

export type LevelsAdjustment = {
  black: number
  gamma: number
  white: number
}

export type LevelsSettings = Record<LevelsTarget, LevelsAdjustment>

export const LEVEL_TARGET_LABELS: Record<LevelsTarget, string> = {
  alpha: 'Alpha',
  blue: 'Blue',
  gray: 'Gray',
  green: 'Green',
  master: 'Master',
  red: 'Red',
}

const ALL_TARGETS: LevelsTarget[] = [
  'master',
  'gray',
  'red',
  'green',
  'blue',
  'alpha',
]
const LEVELS_CHUNK_PIXELS = 140_000
const MIN_GAMMA = 0.1
const MAX_GAMMA = 9.9

export function getLevelsMaxValue(image: LoadedRasterImage): 127 | 255 {
  return image.format === 'GB7' ? 127 : 255
}

export function getAvailableLevelsTargets(
  channels: readonly RasterChannel[],
): LevelsTarget[] {
  return ALL_TARGETS.filter(
    (target) => target === 'master' || channels.includes(target),
  )
}

export function createDefaultLevelsAdjustment(
  maxValue: number,
): LevelsAdjustment {
  return {
    black: 0,
    gamma: 1,
    white: maxValue,
  }
}

export function createDefaultLevelsSettings(maxValue: number): LevelsSettings {
  return {
    alpha: createDefaultLevelsAdjustment(maxValue),
    blue: createDefaultLevelsAdjustment(maxValue),
    gray: createDefaultLevelsAdjustment(maxValue),
    green: createDefaultLevelsAdjustment(maxValue),
    master: createDefaultLevelsAdjustment(maxValue),
    red: createDefaultLevelsAdjustment(maxValue),
  }
}

export function areLevelsSettingsDefault(
  settings: LevelsSettings,
  maxValue: number,
): boolean {
  return ALL_TARGETS.every((target) => {
    const adjustment = settings[target]

    return (
      adjustment.black === 0 &&
      adjustment.gamma === 1 &&
      adjustment.white === maxValue
    )
  })
}

export function clampLevelsAdjustment(
  adjustment: LevelsAdjustment,
  maxValue: number,
): LevelsAdjustment {
  const black = clampInteger(adjustment.black, 0, maxValue - 1)
  const white = clampInteger(adjustment.white, black + 1, maxValue)

  return {
    black,
    gamma: clampNumber(adjustment.gamma, MIN_GAMMA, MAX_GAMMA),
    white,
  }
}

export function getGammaMarkerPosition(
  adjustment: LevelsAdjustment,
): number {
  const ratio = 1 / (1 + adjustment.gamma)

  return adjustment.black + (adjustment.white - adjustment.black) * ratio
}

export function getGammaFromMarkerPosition(
  markerValue: number,
  adjustment: LevelsAdjustment,
): number {
  const span = adjustment.white - adjustment.black

  if (span <= 0) {
    return 1
  }

  const ratio = clampNumber((markerValue - adjustment.black) / span, 0.01, 0.99)

  return clampNumber((1 - ratio) / ratio, MIN_GAMMA, MAX_GAMMA)
}

export function buildHistogram(
  image: LoadedRasterImage,
  target: LevelsTarget,
  maxValue = getLevelsMaxValue(image),
): Uint32Array {
  const histogram = new Uint32Array(maxValue + 1)

  writeHistogramRange({
    endOffset: image.rgba.length,
    histogram,
    image,
    maxValue,
    startOffset: 0,
    target,
  })

  return histogram
}

export async function buildHistogramAsync(
  image: LoadedRasterImage,
  target: LevelsTarget,
  maxValue = getLevelsMaxValue(image),
): Promise<Uint32Array> {
  const histogram = new Uint32Array(maxValue + 1)
  const chunkByteLength = LEVELS_CHUNK_PIXELS * 4

  for (
    let startOffset = 0;
    startOffset < image.rgba.length;
    startOffset += chunkByteLength
  ) {
    writeHistogramRange({
      endOffset: Math.min(image.rgba.length, startOffset + chunkByteLength),
      histogram,
      image,
      maxValue,
      startOffset,
      target,
    })

    await yieldToBrowser()
  }

  return histogram
}

export function scaleHistogram(
  histogram: Uint32Array,
  scale: HistogramScale,
): number[] {
  return Array.from(histogram, (count) =>
    scale === 'logarithmic' ? Math.log1p(count) : count,
  )
}

export function buildLevelsLut(
  adjustment: LevelsAdjustment,
  maxValue: number,
): Uint8ClampedArray {
  const clampedAdjustment = clampLevelsAdjustment(adjustment, maxValue)
  const lut = new Uint8ClampedArray(256)

  if (
    clampedAdjustment.black === 0 &&
    clampedAdjustment.gamma === 1 &&
    clampedAdjustment.white === maxValue
  ) {
    for (let value = 0; value <= 255; value += 1) {
      lut[value] = value
    }

    return lut
  }

  const inputSpan = clampedAdjustment.white - clampedAdjustment.black

  for (let value = 0; value <= 255; value += 1) {
    const level = componentToLevel(value, maxValue)
    const normalized = clampNumber(
      (level - clampedAdjustment.black) / inputSpan,
      0,
      1,
    )
    const corrected = Math.pow(normalized, 1 / clampedAdjustment.gamma)
    const outputLevel = Math.round(corrected * maxValue)

    lut[value] = levelToComponent(outputLevel, maxValue)
  }

  return lut
}

export function applyLevelsToRgba(input: {
  image: LoadedRasterImage
  maxValue?: number
  settings: LevelsSettings
}): Uint8ClampedArray {
  const output = new Uint8ClampedArray(input.image.rgba.length)

  writeLevelsRange({
    endOffset: input.image.rgba.length,
    image: input.image,
    luts: createLevelsLuts(
      input.settings,
      input.maxValue ?? getLevelsMaxValue(input.image),
    ),
    output,
    startOffset: 0,
  })

  return output
}

export async function applyLevelsToRgbaAsync(input: {
  image: LoadedRasterImage
  maxValue?: number
  settings: LevelsSettings
}): Promise<Uint8ClampedArray> {
  const output = new Uint8ClampedArray(input.image.rgba.length)
  const luts = createLevelsLuts(
    input.settings,
    input.maxValue ?? getLevelsMaxValue(input.image),
  )
  const chunkByteLength = LEVELS_CHUNK_PIXELS * 4

  for (
    let startOffset = 0;
    startOffset < input.image.rgba.length;
    startOffset += chunkByteLength
  ) {
    writeLevelsRange({
      endOffset: Math.min(
        input.image.rgba.length,
        startOffset + chunkByteLength,
      ),
      image: input.image,
      luts,
      output,
      startOffset,
    })

    await yieldToBrowser()
  }

  return output
}

function writeHistogramRange(input: {
  endOffset: number
  histogram: Uint32Array
  image: LoadedRasterImage
  maxValue: number
  startOffset: number
  target: LevelsTarget
}): void {
  const { endOffset, histogram, image, maxValue, startOffset, target } = input

  for (let offset = startOffset; offset < endOffset; offset += 4) {
    histogram[getTargetLevel(image.rgba, offset, target, maxValue)] += 1
  }
}

function getTargetLevel(
  rgba: Uint8ClampedArray,
  offset: number,
  target: LevelsTarget,
  maxValue: number,
): number {
  if (target === 'alpha') {
    return componentToLevel(rgba[offset + 3], maxValue)
  }

  if (target === 'red') {
    return componentToLevel(rgba[offset], maxValue)
  }

  if (target === 'green') {
    return componentToLevel(rgba[offset + 1], maxValue)
  }

  if (target === 'blue') {
    return componentToLevel(rgba[offset + 2], maxValue)
  }

  if (target === 'gray') {
    return componentToLevel(rgba[offset], maxValue)
  }

  return componentToLevel(
    Math.round(
      0.2126 * rgba[offset] +
        0.7152 * rgba[offset + 1] +
        0.0722 * rgba[offset + 2],
    ),
    maxValue,
  )
}

function createLevelsLuts(
  settings: LevelsSettings,
  maxValue: number,
): Record<LevelsTarget, Uint8ClampedArray> {
  return {
    alpha: buildLevelsLut(settings.alpha, maxValue),
    blue: buildLevelsLut(settings.blue, maxValue),
    gray: buildLevelsLut(settings.gray, maxValue),
    green: buildLevelsLut(settings.green, maxValue),
    master: buildLevelsLut(settings.master, maxValue),
    red: buildLevelsLut(settings.red, maxValue),
  }
}

function writeLevelsRange(input: {
  endOffset: number
  image: LoadedRasterImage
  luts: Record<LevelsTarget, Uint8ClampedArray>
  output: Uint8ClampedArray
  startOffset: number
}): void {
  const { endOffset, image, luts, output, startOffset } = input
  const isGray = image.channels.includes('gray')
  const hasAlpha = image.channels.includes('alpha')

  for (let offset = startOffset; offset < endOffset; offset += 4) {
    if (isGray) {
      const gray = luts.gray[luts.master[image.rgba[offset]]]

      output[offset] = gray
      output[offset + 1] = gray
      output[offset + 2] = gray
    } else {
      output[offset] = luts.red[luts.master[image.rgba[offset]]]
      output[offset + 1] = luts.green[luts.master[image.rgba[offset + 1]]]
      output[offset + 2] = luts.blue[luts.master[image.rgba[offset + 2]]]
    }

    output[offset + 3] = hasAlpha
      ? luts.alpha[image.rgba[offset + 3]]
      : image.rgba[offset + 3]
  }
}

function componentToLevel(value: number, maxValue: number): number {
  return clampInteger(Math.round((value * maxValue) / 255), 0, maxValue)
}

function levelToComponent(level: number, maxValue: number): number {
  return clampInteger(Math.round((level * 255) / maxValue), 0, 255)
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.round(clampNumber(value, min, max))
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}
