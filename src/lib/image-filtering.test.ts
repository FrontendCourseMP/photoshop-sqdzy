import { describe, expect, it } from 'vitest'
import {
  applyImageFilter,
  createDefaultFilterChannelState,
  getKernelPreset,
  type FilterChannelState,
  type Kernel3x3,
} from './image-filtering'
import type { LoadedRasterImage, RasterChannel } from './raster-image'

describe('image filtering', () => {
  it('keeps identity convolution byte-accurate', () => {
    const image = createImage({
      channels: ['red', 'green', 'blue', 'alpha'],
      rgba: [
        10, 20, 30, 255,
        40, 50, 60, 128,
      ],
      width: 2,
    })
    const output = applyImageFilter({
      channelState: createDefaultFilterChannelState(image.channels),
      edgeHandling: 'copy',
      image,
      kernel: getKernelPreset('identity').kernel,
      operation: 'convolution',
    })

    expect(Array.from(output)).toEqual(Array.from(image.rgba))
  })

  it('applies a box blur to selected channels', () => {
    const image = createImage({
      channels: ['red', 'green', 'blue'],
      rgba: [
        0, 10, 20, 255,
        10, 10, 20, 255,
        20, 10, 20, 255,
        30, 10, 20, 255,
        40, 10, 20, 255,
        50, 10, 20, 255,
        60, 10, 20, 255,
        70, 10, 20, 255,
        80, 10, 20, 255,
      ],
      width: 3,
    })
    const channelState = createChannelState(['red'])
    const output = applyImageFilter({
      channelState,
      edgeHandling: 'copy',
      image,
      kernel: getKernelPreset('box-blur').kernel,
      operation: 'convolution',
    })

    expect(getPixel(output, 3, 1, 1)).toEqual([40, 10, 20, 255])
  })

  it('uses selected edge handling before convolution', () => {
    const image = createImage({
      channels: ['red'],
      rgba: [10, 0, 0, 255],
    })
    const allOnes: Kernel3x3 = [1, 1, 1, 1, 1, 1, 1, 1, 1]
    const channelState = createChannelState(['red'])

    const black = applyImageFilter({
      channelState,
      edgeHandling: 'black',
      image,
      kernel: allOnes,
      operation: 'convolution',
    })
    const copy = applyImageFilter({
      channelState,
      edgeHandling: 'copy',
      image,
      kernel: allOnes,
      operation: 'convolution',
    })

    expect(black[0]).toBe(10)
    expect(copy[0]).toBe(90)
  })

  it('applies median filtering', () => {
    const image = createImage({
      channels: ['red'],
      rgba: [
        1, 0, 0, 255,
        2, 0, 0, 255,
        3, 0, 0, 255,
        4, 0, 0, 255,
        255, 0, 0, 255,
        6, 0, 0, 255,
        7, 0, 0, 255,
        8, 0, 0, 255,
        9, 0, 0, 255,
      ],
      width: 3,
    })
    const output = applyImageFilter({
      channelState: createChannelState(['red']),
      edgeHandling: 'copy',
      image,
      kernel: getKernelPreset('identity').kernel,
      operation: 'median',
    })

    expect(getPixel(output, 3, 1, 1)[0]).toBe(6)
  })

  it('writes gray filtering back to all visible color components', () => {
    const image = createImage({
      channels: ['gray', 'alpha'],
      rgba: [
        10, 10, 10, 255,
        20, 20, 20, 255,
        30, 30, 30, 255,
      ],
      width: 3,
    })
    const output = applyImageFilter({
      channelState: createChannelState(['gray']),
      edgeHandling: 'copy',
      image,
      kernel: [0, 0, 0, 0, 2, 0, 0, 0, 0],
      operation: 'convolution',
    })

    expect(getPixel(output, 3, 1, 0)).toEqual([40, 40, 40, 255])
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
    height: input.height ?? input.rgba.length / 4 / (input.width ?? 1),
    mimeType: 'image/png',
    name: 'test.png',
    rgba: new Uint8ClampedArray(input.rgba),
    width: input.width ?? 1,
  }
}

function createChannelState(channels: RasterChannel[]): FilterChannelState {
  return {
    alpha: channels.includes('alpha'),
    blue: channels.includes('blue'),
    gray: channels.includes('gray'),
    green: channels.includes('green'),
    red: channels.includes('red'),
  }
}

function getPixel(
  rgba: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): number[] {
  const offset = (y * width + x) * 4

  return Array.from(rgba.slice(offset, offset + 4))
}
