import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  buildDownloadName,
  exportRasterImage,
  loadRasterImage,
  type LoadedRasterImage,
  type SupportedRasterMimeType,
} from './lib/raster-image'

type StageSize = {
  height: number
  width: number
}

const EMPTY_STAGE_SIZE: StageSize = { height: 0, width: 0 }

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const [image, setImage] = useState<LoadedRasterImage | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState('Готов к загрузке PNG, JPG и GB7.')
  const [stageSize, setStageSize] = useState<StageSize>(EMPTY_STAGE_SIZE)

  useEffect(() => {
    if (!stageRef.current) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      setStageSize({
        height: Math.max(0, Math.floor(entry.contentRect.height)),
        width: Math.max(0, Math.floor(entry.contentRect.width)),
      })
    })

    observer.observe(stageRef.current)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      image?.bitmap.close()
    }
  }, [image])

  useEffect(() => {
    if (!image || !canvasRef.current || !stageSize.width || !stageSize.height) {
      return
    }

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      setMessage('Не удалось получить 2D-контекст canvas.')
      return
    }

    const devicePixelRatio = window.devicePixelRatio || 1
    const width = stageSize.width
    const height = stageSize.height

    canvas.width = Math.max(1, Math.floor(width * devicePixelRatio))
    canvas.height = Math.max(1, Math.floor(height * devicePixelRatio))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    const framePadding = Math.max(20, Math.min(width, height) * 0.06)
    const fitScale = Math.min(
      (width - framePadding * 2) / image.width,
      (height - framePadding * 2) / image.height,
      1,
    )

    const drawWidth = Math.max(1, image.width * fitScale)
    const drawHeight = Math.max(1, image.height * fitScale)
    const drawX = (width - drawWidth) / 2
    const drawY = (height - drawHeight) / 2

    context.save()
    context.shadowBlur = 36
    context.shadowColor = 'rgba(0, 0, 0, 0.35)'
    context.shadowOffsetY = 12
    context.drawImage(image.bitmap, drawX, drawY, drawWidth, drawHeight)
    context.restore()
  }, [image, stageSize])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    setIsBusy(true)

    try {
      const nextImage = await loadRasterImage(file)

      setImage(nextImage)
      setMessage(`Загружено: ${file.name}`)
    } catch (error) {
      setMessage(getErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleExport(mimeType: SupportedRasterMimeType) {
    if (!image) {
      return
    }

    setIsBusy(true)

    try {
      const blob = await exportRasterImage(image, mimeType)
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = downloadUrl
      link.download = buildDownloadName(image.name, mimeType)
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)

      setMessage(`Сохранено: ${link.download}`)
    } catch (error) {
      setMessage(getErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="min-h-[100svh] bg-[#2a2b2f] text-zinc-100">
      <div className="grid min-h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="border-b border-black/30 bg-[#313238]">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-1.5 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isBusy}
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                {isBusy ? 'Обработка…' : 'Открыть'}
              </button>

              <button
                className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!image || isBusy}
                onClick={() => void handleExport('image/png')}
                type="button"
              >
                Скачать PNG
              </button>

              <button
                className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!image || isBusy}
                onClick={() => void handleExport('image/jpeg')}
                type="button"
              >
                Скачать JPG
              </button>

              <button
                className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!image || isBusy}
                onClick={() => void handleExport('image/x-graybit7')}
                type="button"
              >
                Скачать GB7
              </button>
            </div>

            <input
              accept=".png,.jpg,.jpeg,.gb7,image/png,image/jpeg,image/x-graybit7"
              className="hidden"
              onChange={handleFileChange}
              ref={inputRef}
              type="file"
            />
          </div>
        </header>

        <main className="min-h-0 overflow-x-hidden overflow-y-auto bg-[#2b2c31] p-3 sm:p-4">
          <section
            className="flex h-full min-h-0 rounded-[18px] border border-white/[0.08] bg-[#2f3035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
            ref={stageRef}
          >
            {image ? (
              <canvas
                className="block h-full w-full rounded-[14px]"
                ref={canvasRef}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[14px] border border-dashed border-white/10 bg-black/10">
                <div className="max-w-sm px-6 text-center">
                  <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
                    Canvas
                  </p>
                  <p className="mt-4 text-balance text-lg font-medium text-zinc-100">
                    Открой PNG, JPG или GB7, чтобы отобразить изображение
                  </p>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    Холст автоматически подстроится под размер рабочей области,
                    а внизу появятся размеры и рабочий цветовой профиль.
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>

        <footer className="border-t border-black/30 bg-[#303136]">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-1.5 text-xs text-zinc-400 sm:px-4">
            <span className="truncate">{message}</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>{image ? `${image.width} × ${image.height}px` : '— × —'}</span>
              <span>
                {image
                  ? `${image.bitDepth}-bit ${image.colorModel}`
                  : 'Профиль: —'}
              </span>
              <span>{image ? image.format : 'Формат: —'}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Произошла неизвестная ошибка.'
}

export default App
