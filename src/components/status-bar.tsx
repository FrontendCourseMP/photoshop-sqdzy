import type { CanvasStageSize } from '../lib/canvas-preview'
import {
  MAX_DISPLAY_SCALE_PERCENT,
  MIN_DISPLAY_SCALE_PERCENT,
} from '../lib/image-scaling'
import type { LoadedRasterImage } from '../lib/raster-image'

type StatusBarProps = {
  displayScalePercent: number
  image: LoadedRasterImage | null
  message: string
  onDisplayScaleChange: (scalePercent: number) => void
  stageSize: CanvasStageSize
}

export function StatusBar({
  displayScalePercent,
  image,
  message,
  onDisplayScaleChange,
  stageSize,
}: StatusBarProps) {
  return (
    <footer className="border-t border-black/55 bg-[#282b31]">
      <div className="flex min-h-7 items-center gap-4 px-3 text-xs text-zinc-400">
        <span className="min-w-0 flex-1 truncate text-zinc-300">
          {message}
        </span>

        <label className="hidden min-w-[210px] items-center gap-2 lg:flex">
          <span className="whitespace-nowrap text-zinc-500">Масштаб</span>
          <input
            className="w-28 accent-[#d9e9ff] disabled:opacity-40"
            disabled={!image}
            max={MAX_DISPLAY_SCALE_PERCENT}
            min={MIN_DISPLAY_SCALE_PERCENT}
            onChange={(event) => onDisplayScaleChange(Number(event.target.value))}
            type="range"
            value={displayScalePercent}
          />
          <span className="w-10 text-right font-mono text-zinc-200">
            {displayScalePercent}%
          </span>
        </label>

        <div className="hidden items-center gap-4 md:flex">
          <span>{image ? `${image.width} × ${image.height}px` : '— × —'}</span>
          <span>
            {image ? `${image.bitDepth}-bit ${image.colorModel}` : 'Цвет: —'}
          </span>
          <span>{image ? image.format : 'Формат: —'}</span>
          <span>
            Canvas:{' '}
            {stageSize.width && stageSize.height
              ? `${stageSize.width} × ${stageSize.height}`
              : '—'}
          </span>
        </div>
      </div>
    </footer>
  )
}
