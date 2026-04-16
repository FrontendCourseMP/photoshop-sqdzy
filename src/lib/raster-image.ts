export const GRAYBIT7_MIME_TYPE = 'image/x-graybit7'

const GB7_SIGNATURE = new Uint8Array([0x47, 0x42, 0x37, 0x1d])
const GB7_HEADER_SIZE = 12
const GB7_VERSION = 0x01

export type SupportedRasterMimeType =
  | 'image/jpeg'
  | 'image/png'
  | typeof GRAYBIT7_MIME_TYPE

export interface LoadedRasterImage {
  bitmap: ImageBitmap
  bitDepth: number
  colorModel: string
  format: 'GB7' | 'JPG' | 'PNG'
  height: number
  mimeType: SupportedRasterMimeType
  name: string
  width: number
}

export interface DecodedGrayBit7Image {
  hasMask: boolean
  height: number
  rgba: Uint8ClampedArray
  width: number
}

export async function loadRasterImage(file: File): Promise<LoadedRasterImage> {
  const mimeType = resolveMimeType(file)

  if (mimeType === GRAYBIT7_MIME_TYPE) {
    return loadGrayBit7Image(file, mimeType)
  }

  const bitmap = await createImageBitmap(file)
  const workingProfile = getWorkingProfile(mimeType)

  return {
    bitmap,
    bitDepth: workingProfile.bitDepth,
    colorModel: workingProfile.colorModel,
    format: mimeType === 'image/png' ? 'PNG' : 'JPG',
    height: bitmap.height,
    mimeType,
    name: file.name,
    width: bitmap.width,
  }
}

export async function exportRasterImage(
  image: LoadedRasterImage,
  mimeType: SupportedRasterMimeType,
): Promise<Blob> {
  if (mimeType === GRAYBIT7_MIME_TYPE) {
    const rgba = readBitmapPixels(image)
    const encoded = encodeGrayBit7({
      height: image.height,
      rgba,
      width: image.width,
    })
    const blobBytes = new Uint8Array(encoded.length)

    blobBytes.set(encoded)

    return new Blob([blobBytes], { type: GRAYBIT7_MIME_TYPE })
  }

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Не удалось создать контекст canvas для сохранения.')
  }

  if (mimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  context.drawImage(image.bitmap, 0, 0, image.width, image.height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Браузер не смог подготовить файл для скачивания.'))
          return
        }

        resolve(blob)
      },
      mimeType,
      mimeType === 'image/jpeg' ? 0.92 : undefined,
    )
  })
}

export function buildDownloadName(
  originalName: string,
  mimeType: SupportedRasterMimeType,
): string {
  const extension =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/jpeg'
        ? 'jpg'
        : 'gb7'
  const baseName = originalName.replace(/\.[^.]+$/, '')

  return `${baseName || 'image'}.${extension}`
}

export function decodeGrayBit7(
  source: ArrayBuffer | Uint8Array,
): DecodedGrayBit7Image {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)

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

export function encodeGrayBit7(input: {
  height: number
  rgba: Uint8ClampedArray
  width: number
}): Uint8Array {
  const { height, rgba, width } = input

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Для GB7 требуются целые положительные ширина и высота.')
  }

  if (width > 0xffff || height > 0xffff) {
    throw new Error('Размер GB7 ограничен значениями до 65535 по каждой оси.')
  }

  const pixelCount = width * height

  if (rgba.length !== pixelCount * 4) {
    throw new Error('Некорректный RGBA-буфер для кодирования GB7.')
  }

  const hasMask = hasTransparentPixels(rgba)
  const output = new Uint8Array(GB7_HEADER_SIZE + pixelCount)

  output.set(GB7_SIGNATURE, 0)
  output[4] = GB7_VERSION
  output[5] = hasMask ? 0x01 : 0x00
  output[6] = (width >>> 8) & 0xff
  output[7] = width & 0xff
  output[8] = (height >>> 8) & 0xff
  output[9] = height & 0xff
  output[10] = 0
  output[11] = 0

  for (let index = 0; index < pixelCount; index += 1) {
    const rgbaOffset = index * 4
    const red = rgba[rgbaOffset]
    const green = rgba[rgbaOffset + 1]
    const blue = rgba[rgbaOffset + 2]
    const alpha = rgba[rgbaOffset + 3]
    const gray7 = mapRgbToGray7(red, green, blue)
    const maskBit = hasMask && alpha > 0 ? 0x80 : 0x00

    output[GB7_HEADER_SIZE + index] = gray7 | maskBit
  }

  return output
}

function resolveMimeType(file: File): SupportedRasterMimeType {
  if (
    file.type === GRAYBIT7_MIME_TYPE ||
    file.name.toLowerCase().endsWith('.gb7')
  ) {
    return GRAYBIT7_MIME_TYPE
  }

  if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
    return 'image/png'
  }

  if (
    file.type === 'image/jpeg' ||
    file.name.toLowerCase().endsWith('.jpg') ||
    file.name.toLowerCase().endsWith('.jpeg')
  ) {
    return 'image/jpeg'
  }

  throw new Error('Поддерживаются только файлы PNG, JPG и GB7.')
}

function getWorkingProfile(mimeType: 'image/jpeg' | 'image/png'): {
  bitDepth: number
  colorModel: string
} {
  if (mimeType === 'image/jpeg') {
    return {
      bitDepth: 24,
      colorModel: 'RGB',
    }
  }

  return {
    bitDepth: 32,
    colorModel: 'RGBA',
  }
}

async function loadGrayBit7Image(
  file: File,
  mimeType: typeof GRAYBIT7_MIME_TYPE,
): Promise<LoadedRasterImage> {
  const decoded = decodeGrayBit7(await file.arrayBuffer())
  const imageBytes = new Uint8ClampedArray(decoded.rgba.length)

  imageBytes.set(decoded.rgba)
  const bitmap = await createImageBitmap(
    new ImageData(imageBytes, decoded.width, decoded.height),
  )

  return {
    bitDepth: decoded.hasMask ? 8 : 7,
    bitmap,
    colorModel: decoded.hasMask ? 'Gray + Mask' : 'Gray',
    format: 'GB7',
    height: decoded.height,
    mimeType,
    name: file.name,
    width: decoded.width,
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

function mapRgbToGray7(red: number, green: number, blue: number): number {
  const gray8 = Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue)
  const gray7 = Math.round((gray8 * 127) / 255)

  return Math.min(127, Math.max(0, gray7))
}

function readBitmapPixels(image: LoadedRasterImage): Uint8ClampedArray {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Не удалось создать контекст canvas для кодирования GB7.')
  }

  context.clearRect(0, 0, image.width, image.height)
  context.drawImage(image.bitmap, 0, 0, image.width, image.height)

  return context.getImageData(0, 0, image.width, image.height).data
}
