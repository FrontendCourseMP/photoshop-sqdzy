import { FileMenu } from './file-menu'
import type {
  LoadedRasterImage,
  SupportedRasterMimeType,
} from '../lib/raster-image'

type TopBarProps = {
  disabled: boolean
  image: LoadedRasterImage | null
  onExport: (mimeType: SupportedRasterMimeType) => void
  onOpen: () => void
}

export function TopBar({ disabled, image, onExport, onOpen }: TopBarProps) {
  return (
    <header className="border-b border-black/40 bg-[#2c2f36]">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-3">
          <FileMenu
            canExport={Boolean(image)}
            disabled={disabled}
            onExport={onExport}
            onOpen={onOpen}
          />

          <div className="hidden h-5 w-px bg-white/10 sm:block" />

          <div>
            <p className="text-sm font-semibold leading-4 text-zinc-100">
              GrayBit-7 Editor
            </p>
            <p className="mt-0.5 hidden text-[11px] leading-3 text-zinc-500 sm:block">
              Загрузка, просмотр на canvas и экспорт
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="rounded border border-white/10 bg-white/[0.06] px-2 py-1">
            PNG
          </span>
          <span className="rounded border border-white/10 bg-white/[0.06] px-2 py-1">
            JPG
          </span>
          <span className="rounded border border-white/10 bg-white/[0.06] px-2 py-1">
            GB7
          </span>
        </div>
      </div>
    </header>
  )
}
