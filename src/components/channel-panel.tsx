import { useEffect, useRef } from 'react'
import {
  CHANNEL_LABELS,
  CHANNEL_SHORT_LABELS,
  createChannelPreviewRgba,
  getChannelSummary,
  hasVisibleColorChannels,
  type ChannelState,
} from '../lib/color-channels'
import {
  drawTransparencyGrid,
  type DrawRect,
} from '../lib/canvas-preview'
import type { LoadedRasterImage, RasterChannel } from '../lib/raster-image'

const PREVIEW_SIZE = {
  height: 48,
  width: 72,
}

type ChannelPanelProps = {
  channelState: ChannelState
  disabled: boolean
  image: LoadedRasterImage | null
  onToggleChannel: (channel: RasterChannel) => void
}

export function ChannelPanel({
  channelState,
  disabled,
  image,
  onToggleChannel,
}: ChannelPanelProps) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Каналы
        </h2>
        <span className="text-[11px] text-zinc-500">
          {image ? getChannelSummary(image.channels) : '—'}
        </span>
      </div>

      {image ? (
        <div className="mt-3 grid gap-2">
          {image.channels.map((channel) => (
            <ChannelToggle
              active={channelState[channel]}
              channel={channel}
              disabled={disabled}
              image={image}
              key={channel}
              onToggle={() => onToggleChannel(channel)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs leading-5 text-zinc-500">
          Каналы появятся после загрузки файла.
        </p>
      )}

      {image && !hasVisibleColorChannels(image.channels, channelState) ? (
        <p className="mt-2 text-xs leading-5 text-amber-200/80">
          Цветовые каналы отключены.
        </p>
      ) : null}
    </section>
  )
}

function ChannelToggle({
  active,
  channel,
  disabled,
  image,
  onToggle,
}: {
  active: boolean
  channel: RasterChannel
  disabled: boolean
  image: LoadedRasterImage
  onToggle: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={`grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-sky-300/35 bg-sky-300/[0.08]'
          : 'border-white/[0.08] bg-white/[0.035] opacity-60 hover:opacity-80'
      }`}
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <ChannelPreview channel={channel} image={image} />

      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-zinc-100">
          {CHANNEL_LABELS[channel]}
        </span>
        <span className="mt-0.5 block text-[11px] text-zinc-500">
          {CHANNEL_SHORT_LABELS[channel]}
        </span>
      </span>

      <span
        className={`rounded border px-2 py-1 text-[11px] font-semibold ${
          active
            ? 'border-sky-300/30 bg-sky-300 text-slate-950'
            : 'border-white/10 bg-black/20 text-zinc-500'
        }`}
      >
        {active ? 'Вкл' : 'Выкл'}
      </span>
    </button>
  )
}

function ChannelPreview({
  channel,
  image,
}: {
  channel: RasterChannel
  image: LoadedRasterImage
}) {
  const previewRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = previewRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const timeoutId = setTimeout(() => {
      const devicePixelRatio = window.devicePixelRatio || 1

      canvas.width = Math.floor(PREVIEW_SIZE.width * devicePixelRatio)
      canvas.height = Math.floor(PREVIEW_SIZE.height * devicePixelRatio)
      canvas.style.width = `${PREVIEW_SIZE.width}px`
      canvas.style.height = `${PREVIEW_SIZE.height}px`

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      context.clearRect(0, 0, PREVIEW_SIZE.width, PREVIEW_SIZE.height)

      const rect = getPreviewFitRect({
        imageHeight: image.height,
        imageWidth: image.width,
        previewHeight: PREVIEW_SIZE.height,
        previewWidth: PREVIEW_SIZE.width,
      })
      const previewWidth = Math.max(1, Math.round(rect.width * devicePixelRatio))
      const previewHeight = Math.max(
        1,
        Math.round(rect.height * devicePixelRatio),
      )
      const previewCanvas = document.createElement('canvas')
      const previewContext = previewCanvas.getContext('2d')

      if (!previewContext) {
        return
      }

      previewCanvas.width = previewWidth
      previewCanvas.height = previewHeight
      previewContext.putImageData(
        new ImageData(
          createChannelPreviewRgba(
            image,
            channel,
            previewWidth,
            previewHeight,
          ) as ImageDataArray,
          previewWidth,
          previewHeight,
        ),
        0,
        0,
      )

      drawTransparencyGrid(context, rect, 6)
      context.drawImage(previewCanvas, rect.x, rect.y, rect.width, rect.height)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [channel, image])

  return (
    <canvas
      aria-hidden="true"
      className="block h-12 w-[72px] rounded border border-black/30 bg-black/20"
      ref={previewRef}
    />
  )
}

function getPreviewFitRect(input: {
  imageHeight: number
  imageWidth: number
  previewHeight: number
  previewWidth: number
}): DrawRect {
  const padding = 3
  const availableWidth = input.previewWidth - padding * 2
  const availableHeight = input.previewHeight - padding * 2
  const scale = Math.min(
    availableWidth / input.imageWidth,
    availableHeight / input.imageHeight,
    1,
  )
  const width = Math.max(1, input.imageWidth * scale)
  const height = Math.max(1, input.imageHeight * scale)

  return {
    height,
    width,
    x: (input.previewWidth - width) / 2,
    y: (input.previewHeight - height) / 2,
  }
}
