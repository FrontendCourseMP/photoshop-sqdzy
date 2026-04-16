export type SupportedRasterMimeType = 'image/jpeg' | 'image/png'

export interface LoadedRasterImage {
  bitmap: ImageBitmap
  bitDepth: number
  colorModel: string
  format: 'JPG' | 'PNG'
  height: number
  mimeType: SupportedRasterMimeType
  name: string
  width: number
}

export async function loadRasterImage(file: File): Promise<LoadedRasterImage> {
  const mimeType = resolveMimeType(file)
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
  const extension = mimeType === 'image/png' ? 'png' : 'jpg'
  const baseName = originalName.replace(/\.[^.]+$/, '')

  return `${baseName || 'image'}.${extension}`
}

function resolveMimeType(file: File): SupportedRasterMimeType {
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

  throw new Error('Поддерживаются только файлы PNG и JPG.')
}

function getWorkingProfile(mimeType: SupportedRasterMimeType): {
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
