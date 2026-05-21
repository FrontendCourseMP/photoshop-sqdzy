import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { CanvasStage } from './components/canvas-stage'
import { SidePanel } from './components/side-panel'
import { StatusBar } from './components/status-bar'
import { TopBar } from './components/top-bar'
import { useCanvasRenderer } from './hooks/use-canvas-renderer'
import { useElementSize } from './hooks/use-element-size'
import {
  applyChannelStateAsync,
  areAllImageChannelsVisible,
  createDefaultChannelState,
  toggleChannelState,
  type ChannelState,
} from './lib/color-channels'
import { waitForNextPaint } from './lib/task-yield'
import {
  getImageCoordinatesFromCanvasPoint,
  sampleImagePixel,
  type PixelSample,
} from './lib/pixel-sampling'
import {
  buildDownloadName,
  exportRasterImage,
  loadRasterImage,
  type LoadedRasterImage,
  type RasterChannel,
  type SupportedRasterMimeType,
} from './lib/raster-image'
import type { EditorTool } from './lib/editor-tool'

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { elementRef: stageRef, size: stageSize } =
    useElementSize<HTMLDivElement>()

  const [image, setImage] = useState<LoadedRasterImage | null>(null)
  const [activeTool, setActiveTool] = useState<EditorTool>('cursor')
  const [channelState, setChannelState] = useState<ChannelState>(() =>
    createDefaultChannelState(),
  )
  const [isBusy, setIsBusy] = useState(false)
  const [busyMessage, setBusyMessage] = useState('')
  const [message, setMessage] = useState('Готов к загрузке PNG, JPG и GB7.')
  const [pixelSample, setPixelSample] = useState<PixelSample | null>(null)
  const displayRgbaRef = useRef<Uint8ClampedArray | null>(null)
  const [displayVersion, setDisplayVersion] = useState(0)
  const displayRgba = displayRgbaRef.current
  const allChannelsVisible = useMemo(
    () => (image ? areAllImageChannelsVisible(image.channels, channelState) : true),
    [channelState, image],
  )

  useCanvasRenderer({
    canvasRef,
    displayRgba,
    displayVersion,
    image,
    onError: setMessage,
    stageSize,
    onRenderComplete: () => {
      setIsBusy(false)
      setBusyMessage('')
    },
  })

  useEffect(() => {
    return () => {
      image?.bitmap.close()
    }
  }, [image])

  useEffect(() => {
    let isCancelled = false

    if (!image) {
      displayRgbaRef.current = null
      setDisplayVersion((version) => version + 1)
      return
    }

    if (allChannelsVisible) {
      displayRgbaRef.current = image.rgba
      setDisplayVersion((version) => version + 1)
      return
    }

    setIsBusy(true)
    setBusyMessage('Пересчитываю цветовые каналы.')

    void applyChannelStateAsync(image, channelState).then((nextRgba) => {
      if (!isCancelled) {
        displayRgbaRef.current = nextRgba
        setDisplayVersion((version) => version + 1)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [allChannelsVisible, channelState, image])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    setIsBusy(true)
    setBusyMessage('Декодирую файл и подготавливаю пиксели.')
    setMessage(`Открываю: ${file.name}`)
    await waitForNextPaint()

    try {
      const nextImage = await loadRasterImage(file)

      setImage(nextImage)
      setChannelState(createDefaultChannelState(nextImage.channels))
      setPixelSample(null)
      setMessage(`Загружено: ${file.name}`)
    } catch (error) {
      setMessage(getErrorMessage(error))
      setIsBusy(false)
      setBusyMessage('')
    }
  }

  async function handleExport(mimeType: SupportedRasterMimeType) {
    if (!image) {
      return
    }

    setIsBusy(true)
    setBusyMessage('Подготавливаю файл для сохранения.')
    setMessage('Сохранение изображения...')
    await waitForNextPaint()

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
      setBusyMessage('')
    }
  }

  function openFileDialog() {
    inputRef.current?.click()
  }

  function exportFromUi(mimeType: SupportedRasterMimeType) {
    void handleExport(mimeType)
  }

  async function toggleChannel(channel: RasterChannel) {
    if (!image || !image.channels.includes(channel)) {
      return
    }

    setIsBusy(true)
    setBusyMessage('Пересчитываю цветовые каналы.')
    await waitForNextPaint()

    setChannelState((currentState) =>
      toggleChannelState(currentState, image.channels, channel),
    )
  }

  function handleCanvasPointerDown(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (!image || activeTool !== 'eyedropper' || event.button !== 0) {
      return
    }

    const coordinates = getImageCoordinatesFromCanvasPoint({
      canvasRect: event.currentTarget.getBoundingClientRect(),
      clientX: event.clientX,
      clientY: event.clientY,
      imageHeight: image.height,
      imageWidth: image.width,
    })

    if (!coordinates) {
      setMessage('Пипетка: точка вне изображения.')
      return
    }

    const nextSample = sampleImagePixel(image, coordinates)

    setPixelSample(nextSample)
    setMessage(
      `Пипетка: X ${nextSample.x}, Y ${nextSample.y}, RGB ${nextSample.red}, ${nextSample.green}, ${nextSample.blue}`,
    )
  }

  return (
    <div className="min-h-[100svh] bg-[#1f2228] text-zinc-100">
      <div className="grid min-h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto]">
        <TopBar
          activeTool={activeTool}
          disabled={isBusy}
          image={image}
          onExport={exportFromUi}
          onOpen={openFileDialog}
          onToolChange={setActiveTool}
        />

        <main className="min-h-0 overflow-y-auto bg-[#1f2228] lg:overflow-hidden">
          <div className="flex min-h-full flex-col lg:h-full lg:flex-row">
            <SidePanel
              activeTool={activeTool}
              channelState={channelState}
              disabled={isBusy}
              image={image}
              onExport={exportFromUi}
              onToggleChannel={toggleChannel}
              onOpen={openFileDialog}
              pixelSample={pixelSample}
            />
            <CanvasStage
              activeTool={activeTool}
              busyMessage={busyMessage}
              canvasRef={canvasRef}
              image={image}
              isBusy={isBusy}
              onCanvasPointerDown={handleCanvasPointerDown}
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
