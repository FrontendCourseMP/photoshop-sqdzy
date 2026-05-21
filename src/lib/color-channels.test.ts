import { describe, expect, it } from 'vitest'
import {
  applyChannelStateAsync,
  applyChannelState,
  areAllImageChannelsVisible,
  createChannelPreviewRgba,
  createDefaultChannelState,
} from './color-channels'
import type { LoadedRasterImage } from './raster-image'

describe('color channel rendering', () => {
  it('removes disabled RGB components without changing the source pixels', () => {
    const image = createImage({
      channels: ['red', 'green', 'blue'],
      rgba: [120, 80, 40, 255],
    })
    const state = {
      ...createDefaultChannelState(image.channels),
      green: false,
    }

    const output = applyChannelState(image, state)

    expect(Array.from(output)).toEqual([120, 0, 40, 255])
    expect(Array.from(image.rgba)).toEqual([120, 80, 40, 255])
  })

  it('shows alpha as a grayscale mask when alpha is the only enabled channel', () => {
    const image = createImage({
      channels: ['red', 'green', 'blue', 'alpha'],
      rgba: [20, 80, 160, 96],
    })
    const state = {
      alpha: true,
      blue: false,
      gray: false,
      green: false,
      red: false,
    }

    expect(Array.from(applyChannelState(image, state))).toEqual([
      96, 96, 96, 255,
    ])
  })

  it('shows a grayscale alpha mask for Gray + Alpha images', () => {
    const image = createImage({
      channels: ['gray', 'alpha'],
      rgba: [180, 180, 180, 64],
    })
    const state = {
      alpha: true,
      blue: false,
      gray: false,
      green: false,
      red: false,
    }

    expect(Array.from(applyChannelState(image, state))).toEqual([
      64, 64, 64, 255,
    ])
  })

  it('creates channel thumbnails at the requested size only', () => {
    const image = createImage({
      channels: ['red', 'green', 'blue'],
      height: 2,
      rgba: [
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
        255, 255, 255, 255,
      ],
      width: 2,
    })

    const output = createChannelPreviewRgba(image, 'red', 1, 1)

    expect(Array.from(output)).toEqual([255, 0, 0, 255])
  })

  it('detects when the source image can be rendered without filtering', () => {
    const channels = ['red', 'green', 'blue'] as const
    const state = createDefaultChannelState(channels)

    expect(areAllImageChannelsVisible(channels, state)).toBe(true)
    expect(areAllImageChannelsVisible(channels, { ...state, blue: false })).toBe(
      false,
    )
  })

  it('matches the synchronous channel output when rendered asynchronously', async () => {
    const image = createImage({
      channels: ['red', 'green', 'blue', 'alpha'],
      rgba: [
        120, 80, 40, 255,
        12, 128, 220, 48,
      ],
      width: 2,
    })
    const state = {
      ...createDefaultChannelState(image.channels),
      green: false,
    }

    await expect(applyChannelStateAsync(image, state)).resolves.toEqual(
      applyChannelState(image, state),
    )
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
