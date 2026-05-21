import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CanvasStage } from './components/canvas-stage'
import { SidePanel } from './components/side-panel'
import { StatusBar } from './components/status-bar'
import { TopBar } from './components/top-bar'
import { useCanvasRenderer } from './hooks/use-canvas-renderer'
import { useElementSize } from './hooks/use-element-size'
import {
  buildDownloadName,
  exportRasterImage,
  loadRasterImage,
  type LoadedRasterImage,
  type SupportedRasterMimeType,
} from './lib/raster-image'

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { elementRef: stageRef, size: stageSize } =
    useElementSize<HTMLDivElement>()

  const [image, setImage] = useState<LoadedRasterImage | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState('Готов к загрузке PNG, JPG и GB7.')

  useCanvasRenderer({
    canvasRef,
    image,
    onError: setMessage,
    stageSize,
  })

  useEffect(() => {
    return () => {
      image?.bitmap.close()
    }
  }, [image])

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

  function openFileDialog() {
    inputRef.current?.click()
  }

  function exportFromUi(mimeType: SupportedRasterMimeType) {
    void handleExport(mimeType)
  }

  return (
    <div className="min-h-[100svh] bg-[#1f2228] text-zinc-100">
      <div className="grid min-h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto]">
        <TopBar
          disabled={isBusy}
          image={image}
          onExport={exportFromUi}
          onOpen={openFileDialog}
        />

        <main className="min-h-0 overflow-y-auto bg-[#1f2228] lg:overflow-hidden">
          <div className="flex min-h-full flex-col lg:h-full lg:flex-row">
            <SidePanel
              disabled={isBusy}
              image={image}
              onExport={exportFromUi}
              onOpen={openFileDialog}
            />
            <CanvasStage
              canvasRef={canvasRef}
              image={image}
              isBusy={isBusy}
              onOpen={openFileDialog}
              stageRef={stageRef}
            />
          </div>
        </main>

        <StatusBar image={image} message={message} stageSize={stageSize} />

        <input
          accept=".png,.jpg,.jpeg,.gb7,image/png,image/jpeg,image/x-graybit7"
          aria-label="Выбрать изображение PNG, JPG или GB7"
          className="hidden"
          onChange={handleFileChange}
          ref={inputRef}
          type="file"
        />
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
