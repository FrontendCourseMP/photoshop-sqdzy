import type { LoadedRasterImage, RasterChannel } from './raster-image'
import { yieldToBrowser } from './task-yield'

export type FilterEdgeHandling = 'black' | 'copy' | 'white'
export type FilterOperation = 'convolution' | 'median'
export type FilterChannelState = Record<RasterChannel, boolean>
export type Kernel3x3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export type KernelPresetId =
  | 'box-blur'
  | 'gaussian-3x3'
  | 'identity'
  | 'prewitt-x'
  | 'prewitt-y'
  | 'sharpen'

export type KernelPreset = {
  id: KernelPresetId
  kernel: Kernel3x3
  label: string
}

const FILTER_CHUNK_PIXELS = 90_000
const IDENTITY_KERNEL: Kernel3x3 = [0, 0, 0, 0, 1, 0, 0, 0, 0]

export const EDGE_HANDLING_LABELS: Record<FilterEdgeHandling, string> = {
  black: 'Заполнение чёрным',
  copy: 'Копирование края',
  white: 'Заполнение белым',
}

export const FILTER_OPERATION_LABELS: Record<FilterOperation, string> = {
  convolution: 'Свёртка 3 × 3',
  median: 'Медианный 3 × 3',
}

export const KERNEL_PRESETS: KernelPreset[] = [
  {
    id: 'identity',
    kernel: IDENTITY_KERNEL,
    label: 'Тождественное отображение',
  },
  {
    id: 'sharpen',
    kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    label: 'Повышение резкости',
  },
  {
    id: 'gaussian-3x3',
    kernel: [
      1 / 16,
      2 / 16,
      1 / 16,
      2 / 16,
      4 / 16,
      2 / 16,
      1 / 16,
      2 / 16,
      1 / 16,
    ],
    label: 'Фильтр Гаусса 3 × 3',
  },
  {
    id: 'box-blur',
    kernel: [
      1 / 9,
      1 / 9,
      1 / 9,
      1 / 9,
      1 / 9,
      1 / 9,
      1 / 9,
      1 / 9,
      1 / 9,
    ],
    label: 'Прямоугольное размытие',
  },
  {
    id: 'prewitt-x',
    kernel: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
    label: 'Оператор Прюитта X',
  },
  {
    id: 'prewitt-y',
    kernel: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
    label: 'Оператор Прюитта Y',
  },
]

export function createDefaultFilterChannelState(
  channels: readonly RasterChannel[] = [],
): FilterChannelState {
  const availableChannels = new Set(channels)

  return {
    alpha: availableChannels.has('alpha'),
    blue: availableChannels.has('blue'),
    gray: availableChannels.has('gray'),
    green: availableChannels.has('green'),
    red: availableChannels.has('red'),
  }
}

export function getKernelPreset(id: KernelPresetId): KernelPreset {
  return KERNEL_PRESETS.find((preset) => preset.id === id) ?? KERNEL_PRESETS[0]
}

export function getIdentityKernel(): Kernel3x3 {
  return [...IDENTITY_KERNEL]
}

export function normalizeKernel(values: readonly number[]): Kernel3x3 {
  if (values.length !== 9) {
    throw new Error('Ядро фильтра должно содержать 9 коэффициентов.')
  }

  const kernel = values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error('Все коэффициенты ядра должны быть числами.')
    }

    return value
  })

  return kernel as Kernel3x3
}

export function isIdentityKernel(kernel: Kernel3x3): boolean {
  return kernel.every((value, index) => value === IDENTITY_KERNEL[index])
}

export function applyImageFilter(input: {
  channelState: FilterChannelState
  edgeHandling: FilterEdgeHandling
  image: LoadedRasterImage
  kernel: Kernel3x3
  operation: FilterOperation
}): Uint8ClampedArray {
  validateFilterInput(input)

  const output = new Uint8ClampedArray(input.image.rgba)

  writeFilteredRows({
    ...input,
    output,
    yEnd: input.image.height,
    yStart: 0,
  })

  return output
}

export async function applyImageFilterAsync(input: {
  channelState: FilterChannelState
  edgeHandling: FilterEdgeHandling
  image: LoadedRasterImage
  kernel: Kernel3x3
  operation: FilterOperation
}): Promise<Uint8ClampedArray> {
  validateFilterInput(input)

  const output = new Uint8ClampedArray(input.image.rgba)
  const chunkRows = Math.max(
    1,
    Math.floor(FILTER_CHUNK_PIXELS / input.image.width),
  )

  for (let yStart = 0; yStart < input.image.height; yStart += chunkRows) {
    writeFilteredRows({
      ...input,
      output,
      yEnd: Math.min(input.image.height, yStart + chunkRows),
      yStart,
    })

    await yieldToBrowser()
  }

  return output
}

function validateFilterInput(input: {
  channelState: FilterChannelState
  image: LoadedRasterImage
  kernel: Kernel3x3
}): void {
  const { image, kernel } = input

  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    throw new Error('Размеры изображения должны быть целыми положительными.')
  }

  if (image.rgba.length !== image.width * image.height * 4) {
    throw new Error('Некорректный RGBA-буфер для фильтрации.')
  }

  normalizeKernel(kernel)
}

function writeFilteredRows(input: {
  channelState: FilterChannelState
  edgeHandling: FilterEdgeHandling
  image: LoadedRasterImage
  kernel: Kernel3x3
  operation: FilterOperation
  output: Uint8ClampedArray
  yEnd: number
  yStart: number
}): void {
  const selectedTargets = getSelectedFilterTargets(
    input.image.channels,
    input.channelState,
  )

  if (!selectedTargets.length) {
    return
  }

  for (let y = input.yStart; y < input.yEnd; y += 1) {
    for (let x = 0; x < input.image.width; x += 1) {
      for (const target of selectedTargets) {
        const nextValue =
          input.operation === 'median'
            ? getMedianValue(input.image, target, x, y, input.edgeHandling)
            : getConvolvedValue(input.image, target, x, y, input)

        writeTargetValue(input.output, input.image.width, target, x, y, nextValue)
      }
    }
  }
}

function getSelectedFilterTargets(
  channels: readonly RasterChannel[],
  channelState: FilterChannelState,
): RasterChannel[] {
  if (channels.includes('gray')) {
    return (['gray', 'alpha'] as RasterChannel[]).filter(
      (channel) => channels.includes(channel) && channelState[channel],
    )
  }

  return (['red', 'green', 'blue', 'alpha'] as RasterChannel[]).filter(
    (channel) => channels.includes(channel) && channelState[channel],
  )
}

function getConvolvedValue(
  image: LoadedRasterImage,
  target: RasterChannel,
  x: number,
  y: number,
  input: {
    edgeHandling: FilterEdgeHandling
    kernel: Kernel3x3
  },
): number {
  let value = 0
  let kernelIndex = 0

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      value +=
        input.kernel[kernelIndex] *
        readSourceValue(image, target, x + offsetX, y + offsetY, input.edgeHandling)
      kernelIndex += 1
    }
  }

  return clampByte(Math.round(value))
}

function getMedianValue(
  image: LoadedRasterImage,
  target: RasterChannel,
  x: number,
  y: number,
  edgeHandling: FilterEdgeHandling,
): number {
  const values: number[] = []

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      values.push(readSourceValue(image, target, x + offsetX, y + offsetY, edgeHandling))
    }
  }

  values.sort((left, right) => left - right)

  return values[4]
}

function readSourceValue(
  image: LoadedRasterImage,
  target: RasterChannel,
  x: number,
  y: number,
  edgeHandling: FilterEdgeHandling,
): number {
  const isOutside = x < 0 || y < 0 || x >= image.width || y >= image.height

  if (isOutside) {
    if (edgeHandling === 'black') {
      return 0
    }

    if (edgeHandling === 'white') {
      return 255
    }
  }

  const sourceX = edgeHandling === 'copy' ? clampCoordinate(x, image.width) : x
  const sourceY = edgeHandling === 'copy' ? clampCoordinate(y, image.height) : y
  const sourceOffset = (sourceY * image.width + sourceX) * 4

  if (target === 'alpha') {
    return image.rgba[sourceOffset + 3]
  }

  if (target === 'green') {
    return image.rgba[sourceOffset + 1]
  }

  if (target === 'blue') {
    return image.rgba[sourceOffset + 2]
  }

  return image.rgba[sourceOffset]
}

function writeTargetValue(
  output: Uint8ClampedArray,
  width: number,
  target: RasterChannel,
  x: number,
  y: number,
  value: number,
): void {
  const outputOffset = (y * width + x) * 4

  if (target === 'gray') {
    output[outputOffset] = value
    output[outputOffset + 1] = value
    output[outputOffset + 2] = value
    return
  }

  if (target === 'red') {
    output[outputOffset] = value
    return
  }

  if (target === 'green') {
    output[outputOffset + 1] = value
    return
  }

  if (target === 'blue') {
    output[outputOffset + 2] = value
    return
  }

  if (target === 'alpha') {
    output[outputOffset + 3] = value
  }
}

function clampCoordinate(value: number, size: number): number {
  return Math.min(size - 1, Math.max(0, value))
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, value))
}
