import { FileMenu } from './file-menu'
import type { EditorTool } from '../lib/editor-tool'
import type {
  LoadedRasterImage,
  SupportedRasterMimeType,
} from '../lib/raster-image'

type TopBarProps = {
  activeTool: EditorTool
  disabled: boolean
  image: LoadedRasterImage | null
  onExport: (mimeType: SupportedRasterMimeType) => void
  onOpen: () => void
  onOpenLevels: () => void
  onToolChange: (tool: EditorTool) => void
}

export function TopBar({
  activeTool,
  disabled,
  image,
  onExport,
  onOpen,
  onOpenLevels,
  onToolChange,
}: TopBarProps) {
  return (
    <header className="border-b border-black/40 bg-[#2c2f36]">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <FileMenu
            canExport={Boolean(image)}
            disabled={disabled}
            onExport={onExport}
            onOpen={onOpen}
          />

          <div className="hidden h-5 w-px bg-white/10 sm:block" />

          <div
            aria-label="Инструменты"
            className="flex rounded-md border border-white/10 bg-black/20 p-0.5"
            role="toolbar"
          >
            <ToolButton
              active={activeTool === 'cursor'}
              disabled={disabled}
              label="Курсор"
              onClick={() => onToolChange('cursor')}
            />
            <ToolButton
              active={activeTool === 'eyedropper'}
              disabled={disabled || !image}
              label="Пипетка"
              onClick={() => onToolChange('eyedropper')}
            />
            <ToolButton
              active={false}
              disabled={disabled || !image}
              label="Уровни"
              onClick={onOpenLevels}
            />
          </div>

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

function ToolButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={`h-7 cursor-pointer rounded px-2.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:text-zinc-500 ${
        active
          ? 'bg-sky-300 text-slate-950'
          : 'text-zinc-300 hover:bg-white/[0.08]'
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}
