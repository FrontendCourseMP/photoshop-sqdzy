import type { CanvasStageSize } from '../lib/canvas-preview'
import type { LoadedRasterImage } from '../lib/raster-image'

type StatusBarProps = {
  image: LoadedRasterImage | null
  message: string
  stageSize: CanvasStageSize
}

export function StatusBar({ image, message, stageSize }: StatusBarProps) {
  return (
    <footer className="border-t border-black/55 bg-[#282b31]">
      <div className="flex min-h-7 items-center gap-4 px-3 text-xs text-zinc-400">
        <span className="min-w-0 flex-1 truncate text-zinc-300">
          {message}
        </span>

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
