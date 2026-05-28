import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { CanvasStage } from './components/canvas-stage'
import { LevelsDialog } from './components/levels-dialog'
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
  createRasterImageWithPixels,
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
  const [message, setMessage] = useState('Готов к загрузке изображения.')
  const [pixelSample, setPixelSample] = useState<PixelSample | null>(null)
  const [isLevelsOpen, setIsLevelsOpen] = useState(false)
  const displayRgbaRef = useRef<Uint8ClampedArray | null>(null)
  const [displayVersion, setDisplayVersion] = useState(0)
  const levelsPreviewRgbaRef = useRef<Uint8ClampedArray | null>(null)
  const [levelsPreviewVersion, setLevelsPreviewVersion] = useState(0)
  const displayRgba = displayRgbaRef.current
  const allChannelsVisible = useMemo(
    () => (image ? areAllImageChannelsVisible(image.channels, channelState) : true),
    [channelState, image],
  )

  const handleLevelsPreviewChange = useCallback(
    (nextRgba: Uint8ClampedArray | null) => {
      if (levelsPreviewRgbaRef.current === nextRgba) {
        return
      }

      levelsPreviewRgbaRef.current = nextRgba
      setLevelsPreviewVersion((version) => version + 1)
    },
    [],
  )

  const closeLevelsDialog = useCallback(() => {
    setIsLevelsOpen(false)
    handleLevelsPreviewChange(null)
  }, [handleLevelsPreviewChange])

  const openLevelsDialog = useCallback(() => {
    if (image) {
      setIsLevelsOpen(true)
    }
  }, [image])

  const applyLevels = useCallback(
    async (nextRgba: Uint8ClampedArray) => {
      if (!image) {
        return
      }

      setIsBusy(true)
      setBusyMessage('Применяю уровни.')
      setMessage('Применяю градационную коррекцию...')
      await waitForNextPaint()

      try {
        const nextImage = await createRasterImageWithPixels(image, nextRgba)

        handleLevelsPreviewChange(null)
        setImage(nextImage)
        setPixelSample(null)
        setMessage('Уровни применены.')
      } catch (error) {
        setMessage(getErrorMessage(error))
        setIsBusy(false)
        setBusyMessage('')
        throw error
      }
    },
    [handleLevelsPreviewChange, image],
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
      handleLevelsPreviewChange(null)
      setDisplayVersion((version) => version + 1)
      return
    }

    const baseRgba = levelsPreviewRgbaRef.current ?? image.rgba

    if (allChannelsVisible) {
      displayRgbaRef.current = baseRgba
      setDisplayVersion((version) => version + 1)
      return
    }

    const displayImage: LoadedRasterImage =
      baseRgba === image.rgba
        ? image
        : {
            ...image,
            bitmap: image.bitmap,
            rgba: baseRgba,
          }

    setIsBusy(true)
    setBusyMessage('Пересчитываю цветовые каналы.')

    void applyChannelStateAsync(displayImage, channelState).then((nextRgba) => {
      if (!isCancelled) {
        displayRgbaRef.current = nextRgba
        setDisplayVersion((version) => version + 1)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [
    allChannelsVisible,
    channelState,
    handleLevelsPreviewChange,
    image,
    levelsPreviewVersion,
  ])

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

      handleLevelsPreviewChange(null)
      setIsLevelsOpen(false)
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

  function resetChannels() {
    if (!image) {
      return
    }

    setChannelState(createDefaultChannelState(image.channels))
    setMessage('Все каналы включены.')
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
    <div className="h-dvh overflow-hidden bg-[#181a1f] text-zinc-100">
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
        <TopBar
          activeTool={activeTool}
          allChannelsVisible={allChannelsVisible}
          disabled={isBusy}
          image={image}
          onExport={exportFromUi}
          onOpenLevels={openLevelsDialog}
          onOpen={openFileDialog}
          onResetChannels={resetChannels}
          onToolChange={setActiveTool}
        />

        <main className="grid min-h-0 grid-cols-[48px_minmax(0,1fr)_286px] bg-[#181a1f] max-[980px]:grid-cols-[44px_minmax(0,1fr)_252px] max-[760px]:grid-cols-1 max-[760px]:grid-rows-[44px_minmax(0,1fr)_168px]">
          <ToolRail
            activeTool={activeTool}
            disabled={isBusy}
            image={image}
            onOpenLevels={openLevelsDialog}
            onToolChange={setActiveTool}
          />

          <CanvasStage
            activeTool={activeTool}
            busyMessage={busyMessage}
            canvasRef={canvasRef}
            image={image}
            isBusy={isBusy}
            onCanvasPointerDown={handleCanvasPointerDown}
            stageRef={stageRef}
          />

          <SidePanel
            activeTool={activeTool}
            channelState={channelState}
            disabled={isBusy}
            image={image}
            onToggleChannel={toggleChannel}
            pixelSample={pixelSample}
          />
        </main>

        <StatusBar image={image} message={message} stageSize={stageSize} />

        <input
          accept=".png,.jpg,.jpeg,.gb7,image/png,image/jpeg,image/x-graybit7"
          aria-label="Выбрать изображение"
          className="hidden"
          onChange={handleFileChange}
          ref={inputRef}
          type="file"
        />

        <LevelsDialog
          image={image}
          onApply={applyLevels}
          onClose={closeLevelsDialog}
          onPreviewChange={handleLevelsPreviewChange}
          open={isLevelsOpen}
        />
      </div>
    </div>
  )
}

function ToolRail({
  activeTool,
  disabled,
  image,
  onOpenLevels,
  onToolChange,
}: {
  activeTool: EditorTool
  disabled: boolean
  image: LoadedRasterImage | null
  onOpenLevels: () => void
  onToolChange: (tool: EditorTool) => void
}) {
  return (
    <nav
      aria-label="Панель инструментов"
      className="flex min-h-0 flex-col items-center gap-1 border-r border-black/50 bg-[#24262c] px-1.5 py-2 max-[760px]:flex-row max-[760px]:border-b max-[760px]:border-r-0 max-[760px]:px-2 max-[760px]:py-1"
    >
      <RailButton
        active={activeTool === 'cursor'}
        disabled={disabled}
        icon={<CursorIcon />}
        label="Курсор"
        onClick={() => onToolChange('cursor')}
      />
      <RailButton
        active={activeTool === 'eyedropper'}
        disabled={disabled || !image}
        icon={<EyedropperIcon />}
        label="Пипетка"
        onClick={() => onToolChange('eyedropper')}
      />
      <div className="my-1 h-px w-7 bg-white/[0.08] max-[760px]:mx-1 max-[760px]:my-0 max-[760px]:h-7 max-[760px]:w-px" />
      <RailButton
        disabled={disabled || !image}
        icon={<LevelsIcon />}
        label="Уровни"
        onClick={onOpenLevels}
      />
    </nav>
  )
}

function RailButton({
  active = false,
  disabled,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  disabled: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active || undefined}
      className={`grid h-8 w-8 shrink-0 cursor-pointer place-items-center border text-[11px] font-semibold outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? 'border-[#8fbdf0] bg-[#d9e9ff] text-[#101318]'
          : 'border-white/[0.1] bg-[#2d3037] text-zinc-300 hover:bg-[#343841]'
      }`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  )
}

function CursorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M3.5 2.5 12 8l-4.3 1.1L5.5 14 3.5 2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function EyedropperIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m10.9 2.7 2.4 2.4m-8 7.2 6.9-6.9-1.6-1.6-6.9 6.9-.8 2.4 2.4-.8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function LevelsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M3 13V5m5 8V3m5 10V7M1.8 5h2.4m2.6-2h2.4m2.6 4h2.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Произошла неизвестная ошибка.'
}

export default App
