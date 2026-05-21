type SupportedRasterMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/x-graybit7'

type RasterChannel = 'alpha' | 'blue' | 'gray' | 'green' | 'red'

type RasterWorkerRequest = {
  file: File
  id: number
  mimeType: SupportedRasterMimeType
}

type BrowserRasterWorkerRequest = RasterWorkerRequest & {
  mimeType: Exclude<SupportedRasterMimeType, typeof GRAYBIT7_MIME_TYPE>
}

type RasterWorkerResult = {
  bitmap: ImageBitmap
  bitDepth: number
  channels: RasterChannel[]
  colorModel: string
  format: 'GB7' | 'JPG' | 'PNG'
  height: number
  id: number
  rgba: Uint8ClampedArray
  status: 'loaded'
  width: number
}

const GRAYBIT7_MIME_TYPE = 'image/x-graybit7'
const GB7_SIGNATURE = new Uint8Array([0x47, 0x42, 0x37, 0x1d])
const GB7_HEADER_SIZE = 12
const GB7_VERSION = 0x01
const PIXEL_READ_CHUNK_SIZE = 180_000
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<RasterWorkerRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

workerScope.onmessage = (event: MessageEvent<RasterWorkerRequest>) => {
  void loadRasterInWorker(event.data)
}

async function loadRasterInWorker(request: RasterWorkerRequest): Promise<void> {
  try {
    const result =
      request.mimeType === GRAYBIT7_MIME_TYPE
        ? await loadGrayBit7InWorker(request)
        : await loadBrowserImageInWorker(request as BrowserRasterWorkerRequest)

    workerScope.postMessage(result, [
      result.bitmap,
      result.rgba.buffer,
    ] as Transferable[])
  } catch (error) {
    workerScope.postMessage({
      id: request.id,
      message:
        error instanceof Error
          ? error.message
          : 'Не удалось обработать изображение.',
      status: 'error',
    })
  }
}

async function loadBrowserImageInWorker(
  request: BrowserRasterWorkerRequest,
): Promise<RasterWorkerResult> {
  const bitmap = await createImageBitmap(request.file)
  const pixelData = await readBitmapPixels({
    bitmap,
    detectTransparency: request.mimeType === 'image/png',
    height: bitmap.height,
    width: bitmap.width,
  })
  const profile = getWorkingProfile(
    request.mimeType,
    pixelData.hasTransparentPixels,
  )

  return {
    bitmap,
    bitDepth: profile.bitDepth,
    channels: profile.channels,
    colorModel: profile.colorModel,
    format: request.mimeType === 'image/png' ? 'PNG' : 'JPG',
    height: bitmap.height,
    id: request.id,
    rgba: pixelData.rgba,
    status: 'loaded',
    width: bitmap.width,
  }
}

async function loadGrayBit7InWorker(
  request: RasterWorkerRequest,
): Promise<RasterWorkerResult> {
  const decoded = decodeGrayBit7(await request.file.arrayBuffer())
  const bitmapBytes = new Uint8ClampedArray(decoded.rgba.length)

  bitmapBytes.set(decoded.rgba)
  const bitmap = await createImageBitmap(
    new ImageData(bitmapBytes, decoded.width, decoded.height),
  )

  return {
    bitmap,
    bitDepth: decoded.hasMask ? 8 : 7,
    channels: decoded.hasMask ? ['gray', 'alpha'] : ['gray'],
    colorModel: decoded.hasMask ? 'Gray + Alpha' : 'Gray',
    format: 'GB7',
    height: decoded.height,
    id: request.id,
    rgba: decoded.rgba,
    status: 'loaded',
    width: decoded.width,
  }
}

async function readBitmapPixels(image: {
  bitmap: ImageBitmap
  detectTransparency: boolean
  height: number
  width: number
}): Promise<{
  hasTransparentPixels: boolean
  rgba: Uint8ClampedArray
}> {
  const chunkHeight = Math.max(
    1,
    Math.floor(PIXEL_READ_CHUNK_SIZE / image.width),
  )
  const canvas = new OffscreenCanvas(
    image.width,
    Math.min(chunkHeight, image.height),
  )
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('Не удалось создать фоновый canvas для чтения пикселей.')
  }

  const rgba = new Uint8ClampedArray(image.width * image.height * 4)
  let hasTransparentPixelsInImage = false

  for (let y = 0; y < image.height; y += chunkHeight) {
    const currentChunkHeight = Math.min(chunkHeight, image.height - y)

    if (canvas.height !== currentChunkHeight) {
      canvas.height = currentChunkHeight
    }

    context.clearRect(0, 0, image.width, currentChunkHeight)
    context.drawImage(
      image.bitmap,
      0,
      y,
      image.width,
      currentChunkHeight,
      0,
      0,
      image.width,
      currentChunkHeight,
    )

    const chunkData = context.getImageData(
      0,
      0,
      image.width,
      currentChunkHeight,
    )

    rgba.set(chunkData.data, y * image.width * 4)

    if (
      image.detectTransparency &&
      !hasTransparentPixelsInImage &&
      hasTransparentPixels(chunkData.data)
    ) {
      hasTransparentPixelsInImage = true
    }

    await yieldToWorker()
  }

  return {
    hasTransparentPixels: hasTransparentPixelsInImage,
    rgba,
  }
}

function decodeGrayBit7(source: ArrayBuffer): {
  hasMask: boolean
  height: number
  rgba: Uint8ClampedArray
  width: number
} {
  const bytes = new Uint8Array(source)

  if (bytes.length < GB7_HEADER_SIZE) {
    throw new Error('Файл GB7 слишком короткий: отсутствует полный заголовок.')
  }

  for (let index = 0; index < GB7_SIGNATURE.length; index += 1) {
    if (bytes[index] !== GB7_SIGNATURE[index]) {
      throw new Error('Некорректная сигнатура файла GB7.')
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const version = view.getUint8(4)

  if (version !== GB7_VERSION) {
    throw new Error(`Неподдерживаемая версия GB7: ${version}.`)
  }

  const flags = view.getUint8(5)

  if ((flags & 0b1111_1110) !== 0) {
    throw new Error('Некорректные флаги GB7: зарезервированные биты должны быть 0.')
  }

  const hasMask = (flags & 0x01) === 0x01
  const width = view.getUint16(6, false)
  const height = view.getUint16(8, false)

  if (width === 0 || height === 0) {
    throw new Error('Некорректный размер GB7: ширина и высота должны быть больше 0.')
  }

  const reserved = view.getUint16(10, false)

  if (reserved !== 0) {
    throw new Error('Некорректный заголовок GB7: зарезервированное поле должно быть 0x0000.')
  }

  const pixelCount = width * height
  const expectedLength = GB7_HEADER_SIZE + pixelCount

  if (bytes.length !== expectedLength) {
    throw new Error(
      `Некорректный размер GB7: ожидалось ${expectedLength} байт, получено ${bytes.length}.`,
    )
  }

  const rgba = new Uint8ClampedArray(pixelCount * 4)

  for (let index = 0; index < pixelCount; index += 1) {
    const packedPixel = bytes[GB7_HEADER_SIZE + index]

    if (!hasMask && (packedPixel & 0x80) !== 0) {
      throw new Error('Некорректные данные GB7: при отключенной маске старший бит должен быть 0.')
    }

    const gray7 = packedPixel & 0x7f
    const gray8 = Math.round((gray7 * 255) / 127)
    const rgbaOffset = index * 4

    rgba[rgbaOffset] = gray8
    rgba[rgbaOffset + 1] = gray8
    rgba[rgbaOffset + 2] = gray8
    rgba[rgbaOffset + 3] = hasMask
      ? (packedPixel & 0x80) === 0
        ? 0
        : 255
      : 255
  }

  return {
    hasMask,
    height,
    rgba,
    width,
  }
}

function getWorkingProfile(
  mimeType: Exclude<SupportedRasterMimeType, typeof GRAYBIT7_MIME_TYPE>,
  hasAlpha: boolean,
): {
  bitDepth: number
  channels: RasterChannel[]
  colorModel: string
} {
  if (mimeType === 'image/jpeg') {
    return {
      bitDepth: 24,
      channels: ['red', 'green', 'blue'],
      colorModel: 'RGB',
    }
  }

  return {
    bitDepth: hasAlpha ? 32 : 24,
    channels: hasAlpha
      ? ['red', 'green', 'blue', 'alpha']
      : ['red', 'green', 'blue'],
    colorModel: hasAlpha ? 'RGBA' : 'RGB',
  }
}

function hasTransparentPixels(rgba: Uint8ClampedArray): boolean {
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] < 255) {
      return true
    }
  }

  return false
}

function yieldToWorker(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}
