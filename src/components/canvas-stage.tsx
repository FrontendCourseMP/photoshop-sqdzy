import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'
import type { EditorTool } from '../lib/editor-tool'
import type { LoadedRasterImage } from '../lib/raster-image'

type CanvasStageProps = {
  activeTool: EditorTool
  busyMessage: string
  canvasRef: RefObject<HTMLCanvasElement | null>
  image: LoadedRasterImage | null
  isBusy: boolean
  isPanning: boolean
  onCanvasContextMenu: (event: ReactMouseEvent<HTMLCanvasElement>) => void
  onCanvasPointerCancel: (event: ReactPointerEvent<HTMLCanvasElement>) => void
  onCanvasPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void
  onCanvasPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void
  onCanvasPointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void
  stageRef: RefObject<HTMLDivElement | null>
}

export function CanvasStage({
  activeTool,
  busyMessage,
  canvasRef,
  image,
  isBusy,
  isPanning,
  onCanvasContextMenu,
  onCanvasPointerCancel,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  stageRef,
}: CanvasStageProps) {
  const cursorClassName = isPanning
    ? 'cursor-grabbing'
    : activeTool === 'eyedropper'
      ? 'cursor-crosshair'
      : image
        ? 'cursor-grab'
        : 'cursor-default'

  return (
    <section className="flex min-h-0 flex-col bg-[#181a1f]">
      <div className="flex min-h-0 flex-1 p-2">
        <div
          className="relative flex min-h-0 flex-1 overflow-hidden border border-black/60 bg-[#202329]"
          ref={stageRef}
        >
          {image ? (
            <canvas
              aria-label={`Просмотр изображения ${image.name}`}
              className={`block h-full w-full touch-none select-none ${cursorClassName}`}
              onContextMenu={onCanvasContextMenu}
              onPointerCancel={onCanvasPointerCancel}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              ref={canvasRef}
            />
          ) : (
            <EmptyCanvasState />
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
      className="absolute inset-0 z-20 flex items-center justify-center bg-[#181a1f]/88 px-6"
      role="status"
    >
      <div className="w-full max-w-xs border border-white/[0.12] bg-[#292c33] p-4 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#d9e9ff]" />
        <p className="mt-4 text-sm font-semibold text-zinc-100">{label}</p>
      </div>
    </div>
  )
}

function EmptyCanvasState() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(45deg,#2d333d_25%,transparent_25%),linear-gradient(-45deg,#2d333d_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#2d333d_75%),linear-gradient(-45deg,transparent_75%,#2d333d_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]">
      <div className="border border-white/[0.12] bg-[#24262c] px-6 py-5 text-center">
        <h1 className="text-lg font-semibold text-zinc-100">
          Нет открытого изображения
        </h1>
        <p className="mt-2 text-xs text-zinc-500">Открой файл через меню Файл</p>
      </div>
    </div>
  )
}
