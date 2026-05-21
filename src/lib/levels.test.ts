import { describe, expect, it } from 'vitest'
import {
  applyLevelsToRgba,
  areLevelsSettingsDefault,
  buildHistogram,
  buildLevelsLut,
  createDefaultLevelsSettings,
  scaleHistogram,
} from './levels'
import type { LoadedRasterImage } from './raster-image'

describe('levels correction', () => {
  it('builds a composite luminance histogram', () => {
    const image = createImage({
      channels: ['red', 'green', 'blue'],
      rgba: [
        255, 0, 0, 255,
        0, 255, 0, 255,
      ],
      width: 2,
    })
    const histogram = buildHistogram(image, 'master', 255)

    expect(histogram[54]).toBe(1)
    expect(histogram[182]).toBe(1)
  })

  it('supports logarithmic histogram scaling', () => {
    const scaled = scaleHistogram(new Uint32Array([0, 1, 9]), 'logarithmic')

    expect(scaled[0]).toBe(0)
    expect(scaled[1]).toBeCloseTo(Math.log1p(1))
    expect(scaled[2]).toBeCloseTo(Math.log1p(9))
  })

  it('detects unchanged level settings', () => {
    const settings = createDefaultLevelsSettings(255)

    expect(areLevelsSettingsDefault(settings, 255)).toBe(true)

    settings.master = { black: 16, gamma: 1, white: 255 }

    expect(areLevelsSettingsDefault(settings, 255)).toBe(false)
  })

  it('creates an input-level LUT with black and white points', () => {
    const lut = buildLevelsLut({ black: 64, gamma: 1, white: 192 }, 255)

    expect(lut[63]).toBe(0)
    expect(lut[64]).toBe(0)
    expect(lut[128]).toBe(128)
    expect(lut[192]).toBe(255)
  })

  it('keeps default LUTs as byte-accurate identity for GB7', () => {
    const lut = buildLevelsLut({ black: 0, gamma: 1, white: 127 }, 127)

    expect(lut[1]).toBe(1)
    expect(lut[128]).toBe(128)
    expect(lut[254]).toBe(254)
  })

  it('applies master and per-channel levels without mutating the source', () => {
    const image = createImage({
      channels: ['red', 'green', 'blue', 'alpha'],
      rgba: [128, 128, 128, 128],
    })
    const settings = createDefaultLevelsSettings(255)

    settings.master = { black: 64, gamma: 1, white: 192 }
    settings.red = { black: 0, gamma: 1, white: 127 }
    settings.alpha = { black: 64, gamma: 1, white: 192 }

    const output = applyLevelsToRgba({ image, maxValue: 255, settings })

    expect(Array.from(output)).toEqual([255, 128, 128, 128])
    expect(Array.from(image.rgba)).toEqual([128, 128, 128, 128])
  })
})

function createImage(input: {
  channels: LoadedRasterImage['channels']
  height?: number
  rgba: number[]
  width?: number
}): LoadedRasterImage {
  return {
    bitmap: {} as ImageBitmap,
    bitDepth: input.channels.includes('alpha') ? 32 : 24,
    channels: input.channels,
    colorModel: input.channels.includes('gray') ? 'Gray' : 'RGB',
    format: 'PNG',
    height: input.height ?? 1,
    mimeType: 'image/png',
    name: 'test.png',
    rgba: new Uint8ClampedArray(input.rgba),
    width: input.width ?? 1,
  }
}
