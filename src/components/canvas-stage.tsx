import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { EditorTool } from '../lib/editor-tool'
import type { LoadedRasterImage } from '../lib/raster-image'

type CanvasStageProps = {
  activeTool: EditorTool
  busyMessage: string
  canvasRef: RefObject<HTMLCanvasElement | null>
  image: LoadedRasterImage | null
  isBusy: boolean
  onCanvasPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void
  onOpen: () => void
  stageRef: RefObject<HTMLDivElement | null>
}

export function CanvasStage({
  activeTool,
  busyMessage,
  canvasRef,
  image,
  isBusy,
  onCanvasPointerDown,
  onOpen,
  stageRef,
}: CanvasStageProps) {
  return (
    <section className="flex min-h-0 flex-col bg-[#1f2228] lg:flex-1">
      <div className="flex min-h-0 p-3 sm:p-4 lg:h-full lg:flex-1">
        <div
          className="relative flex h-[min(70svh,560px)] min-h-[360px] flex-1 overflow-hidden rounded-lg border border-white/[0.08] bg-[#252932] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:h-auto lg:min-h-[420px]"
          ref={stageRef}
        >
          {image ? (
            <canvas
              aria-label={`Просмотр изображения ${image.name}`}
              className={`block h-full w-full ${
                activeTool === 'eyedropper' ? 'cursor-crosshair' : 'cursor-default'
              }`}
              onPointerDown={onCanvasPointerDown}
              ref={canvasRef}
            />
          ) : (
            <EmptyCanvasState disabled={isBusy} onOpen={onOpen} />
          )}
          {isBusy ? (
            <BusyOverlay
              label={busyMessage || 'Подготавливаю изображение.'}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}

function BusyOverlay({ label }: { label: string }) {
  return (
    <div
      aria-live="polite"
      className="absolute inset-0 z-20 flex items-center justify-center bg-[#1f2228]/82 px-6 backdrop-blur-sm"
      role="status"
    >
      <div className="w-full max-w-sm rounded-lg border border-white/[0.1] bg-[#2a2e36] p-5 text-center shadow-[0_22px_55px_rgba(0,0,0,0.38)]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-sky-300/25 border-t-sky-300" />
        <p className="mt-4 text-sm font-semibold text-zinc-100">{label}</p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          Для каналов и пипетки приложение читает данные каждого пикселя.
        </p>
      </div>
    </div>
  )
}

function EmptyCanvasState({
  disabled,
  onOpen,
}: {
  disabled: boolean
  onOpen: () => void
}) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(45deg,#2d333d_25%,transparent_25%),linear-gradient(-45deg,#2d333d_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#2d333d_75%),linear-gradient(-45deg,transparent_75%,#2d333d_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]">
      <div className="max-w-md px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-300/80">
          Canvas
        </p>
        <h1 className="mt-4 text-balance text-xl font-semibold text-zinc-100 sm:text-2xl">
          Открой PNG, JPG или GB7
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Изображение будет отрисовано на HTML5 canvas. Прозрачные области
          появятся поверх шахматной подложки, как в графических редакторах.
        </p>
        <button
          className="mt-5 h-9 cursor-pointer rounded-md border border-sky-300/30 bg-sky-400 px-4 text-sm font-semibold text-slate-950 outline-none transition hover:bg-sky-300 focus-visible:ring-2 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onOpen}
          type="button"
        >
          Выбрать файл
        </button>
      </div>
    </div>
  )
}
