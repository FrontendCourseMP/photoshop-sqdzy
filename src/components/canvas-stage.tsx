import type { RefObject } from 'react'
import type { LoadedRasterImage } from '../lib/raster-image'

type CanvasStageProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  image: LoadedRasterImage | null
  isBusy: boolean
  onOpen: () => void
  stageRef: RefObject<HTMLDivElement | null>
}

export function CanvasStage({
  canvasRef,
  image,
  isBusy,
  onOpen,
  stageRef,
}: CanvasStageProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#1f2228]">
      <div className="flex min-h-0 flex-1 p-3 sm:p-4">
        <div
          className="relative flex min-h-[420px] flex-1 overflow-hidden rounded-lg border border-white/[0.08] bg-[#252932] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          ref={stageRef}
        >
          {image ? (
            <canvas
              aria-label={`Просмотр изображения ${image.name}`}
              className="block h-full w-full"
              ref={canvasRef}
            />
          ) : (
            <EmptyCanvasState disabled={isBusy} onOpen={onOpen} />
          )}
        </div>
      </div>
    </section>
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
