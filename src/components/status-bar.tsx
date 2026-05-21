import type { CanvasStageSize } from '../lib/canvas-preview'
import type { LoadedRasterImage } from '../lib/raster-image'

type StatusBarProps = {
  image: LoadedRasterImage | null
  message: string
  stageSize: CanvasStageSize
}

export function StatusBar({ image, message, stageSize }: StatusBarProps) {
  return (
    <footer className="border-t border-black/40 bg-[#2b2e35]">
      <div className="flex min-h-8 flex-col gap-1 px-3 py-1.5 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4 sm:px-4">
        <span className="min-w-0 truncate text-zinc-300 sm:flex-1">
          {message}
        </span>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap sm:items-center">
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
