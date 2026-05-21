import type { LoadedRasterImage, RasterChannel } from './raster-image'
import { yieldToBrowser } from './task-yield'

export type ChannelState = Record<RasterChannel, boolean>

export const CHANNEL_LABELS: Record<RasterChannel, string> = {
  alpha: 'Альфа',
  blue: 'Синий',
  gray: 'Серый',
  green: 'Зелёный',
  red: 'Красный',
}

export const CHANNEL_SHORT_LABELS: Record<RasterChannel, string> = {
  alpha: 'A',
  blue: 'B',
  gray: 'Y',
  green: 'G',
  red: 'R',
}

const ALL_CHANNELS: RasterChannel[] = ['gray', 'red', 'green', 'blue', 'alpha']
const RGB_CHANNELS: RasterChannel[] = ['red', 'green', 'blue']
const CHANNEL_RENDER_CHUNK_PIXELS = 160_000

export function createDefaultChannelState(
  channels: readonly RasterChannel[] = [],
): ChannelState {
  const availableChannels = new Set(channels)

  return {
    alpha: availableChannels.has('alpha'),
    blue: availableChannels.has('blue'),
    gray: availableChannels.has('gray'),
    green: availableChannels.has('green'),
    red: availableChannels.has('red'),
  }
}

export function toggleChannelState(
  currentState: ChannelState,
  channels: readonly RasterChannel[],
  channel: RasterChannel,
): ChannelState {
  if (!channels.includes(channel)) {
    return currentState
  }

  return {
    ...currentState,
    [channel]: !currentState[channel],
  }
}

export function applyChannelState(
  image: LoadedRasterImage,
  channelState: ChannelState,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(image.rgba.length)

  writeChannelStateRange({
    channelState,
    endOffset: image.rgba.length,
    image,
    output,
    startOffset: 0,
  })

  return output
}

export async function applyChannelStateAsync(
  image: LoadedRasterImage,
  channelState: ChannelState,
): Promise<Uint8ClampedArray> {
  const output = new Uint8ClampedArray(image.rgba.length)
  const chunkByteLength = CHANNEL_RENDER_CHUNK_PIXELS * 4

  for (
    let startOffset = 0;
    startOffset < image.rgba.length;
    startOffset += chunkByteLength
  ) {
    writeChannelStateRange({
      channelState,
      endOffset: Math.min(image.rgba.length, startOffset + chunkByteLength),
      image,
      output,
      startOffset,
    })

    await yieldToBrowser()
  }

  return output
}

function writeChannelStateRange(input: {
  channelState: ChannelState
  endOffset: number
  image: LoadedRasterImage
  output: Uint8ClampedArray
  startOffset: number
}): void {
  const { channelState, endOffset, image, output, startOffset } = input
  const hasGray = image.channels.includes('gray')
  const hasAlpha = image.channels.includes('alpha')
  const showAlpha = hasAlpha && channelState.alpha

  for (let offset = startOffset; offset < endOffset; offset += 4) {
    const red = image.rgba[offset]
    const green = image.rgba[offset + 1]
    const blue = image.rgba[offset + 2]
    const alpha = image.rgba[offset + 3]

    if (hasGray) {
      const showGray = channelState.gray

      if (!showGray && showAlpha) {
        output[offset] = alpha
        output[offset + 1] = alpha
        output[offset + 2] = alpha
        output[offset + 3] = 255
        continue
      }

      const gray = showGray ? red : 0

      output[offset] = gray
      output[offset + 1] = gray
      output[offset + 2] = gray
      output[offset + 3] = showAlpha ? alpha : 255
      continue
    }

    const showRed = channelState.red
    const showGreen = channelState.green
    const showBlue = channelState.blue

    if (!showRed && !showGreen && !showBlue && showAlpha) {
      output[offset] = alpha
      output[offset + 1] = alpha
      output[offset + 2] = alpha
      output[offset + 3] = 255
      continue
    }

    output[offset] = showRed ? red : 0
    output[offset + 1] = showGreen ? green : 0
    output[offset + 2] = showBlue ? blue : 0
    output[offset + 3] = showAlpha ? alpha : 255
  }
}

export function areAllImageChannelsVisible(
  channels: readonly RasterChannel[],
  channelState: ChannelState,
): boolean {
  return channels.every((channel) => channelState[channel])
}

export function createChannelPreviewRgba(
  image: LoadedRasterImage,
  channel: RasterChannel,
  targetWidth = image.width,
  targetHeight = image.height,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4)

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(
      image.height - 1,
      Math.floor((y / targetHeight) * image.height),
    )

    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(
        image.width - 1,
        Math.floor((x / targetWidth) * image.width),
      )
      const sourceOffset = (sourceY * image.width + sourceX) * 4
      const outputOffset = (y * targetWidth + x) * 4
      const red = image.rgba[sourceOffset]
      const green = image.rgba[sourceOffset + 1]
      const blue = image.rgba[sourceOffset + 2]
      const alpha = image.rgba[sourceOffset + 3]

      if (channel === 'gray') {
        output[outputOffset] = red
        output[outputOffset + 1] = red
        output[outputOffset + 2] = red
      }

      if (channel === 'red') {
        output[outputOffset] = red
      }

      if (channel === 'green') {
        output[outputOffset + 1] = green
      }

      if (channel === 'blue') {
        output[outputOffset + 2] = blue
      }

      if (channel === 'alpha') {
        output[outputOffset] = alpha
        output[outputOffset + 1] = alpha
        output[outputOffset + 2] = alpha
      }

      output[outputOffset + 3] = 255
    }
  }

  return output
}

export function getChannelSummary(
  channels: readonly RasterChannel[],
): 'grayscale' | 'grayscale + alpha' | 'RGB' | 'RGB + alpha' {
  const channelSet = new Set(channels)

  if (channelSet.has('gray')) {
    return channelSet.has('alpha') ? 'grayscale + alpha' : 'grayscale'
  }

  return channelSet.has('alpha') ? 'RGB + alpha' : 'RGB'
}

export function hasVisibleColorChannels(
  channels: readonly RasterChannel[],
  channelState: ChannelState,
): boolean {
  if (channels.includes('gray')) {
    return channelState.gray
  }

  return RGB_CHANNELS.some((channel) => channelState[channel])
}

export function isKnownChannel(channel: string): channel is RasterChannel {
  return ALL_CHANNELS.includes(channel as RasterChannel)
}
