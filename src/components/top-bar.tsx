import { useEffect, useRef, useState } from 'react'
import { FileMenu } from './file-menu'
import type { EditorTool } from '../lib/editor-tool'
import type {
  LoadedRasterImage,
  SupportedRasterMimeType,
} from '../lib/raster-image'

type TopBarProps = {
  activeTool: EditorTool
  allChannelsVisible: boolean
  disabled: boolean
  image: LoadedRasterImage | null
  onExport: (mimeType: SupportedRasterMimeType) => void
  onOpen: () => void
  onOpenLevels: () => void
  onResetChannels: () => void
  onToolChange: (tool: EditorTool) => void
}

type MenuItem = {
  checked?: boolean
  disabled?: boolean
  label: string
  onSelect: () => void
}

export function TopBar({
  activeTool,
  allChannelsVisible,
  disabled,
  image,
  onExport,
  onOpen,
  onOpenLevels,
  onResetChannels,
  onToolChange,
}: TopBarProps) {
  return (
    <header className="relative z-50 border-b border-black/55 bg-[#282b31]">
      <div className="grid min-h-8 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-2 text-[13px] max-[640px]:grid-cols-1 max-[640px]:gap-0">
        <nav className="flex min-w-0 items-center overflow-visible">
          <FileMenu
            canExport={Boolean(image)}
            disabled={disabled}
            onExport={onExport}
            onOpen={onOpen}
          />

          <MenuDropdown
            items={[
              {
                checked: Boolean(image && allChannelsVisible),
                disabled: !image || disabled,
                label: 'Показать все каналы',
                onSelect: onResetChannels,
              },
            ]}
            label="Изображение"
          />

          <MenuDropdown
            items={[
              {
                disabled: !image || disabled,
                label: 'Уровни...',
                onSelect: onOpenLevels,
              },
            ]}
            label="Коррекция"
          />

          <MenuDropdown
            items={[
              {
                checked: activeTool === 'cursor',
                disabled,
                label: 'Курсор',
                onSelect: () => onToolChange('cursor'),
              },
              {
                checked: activeTool === 'eyedropper',
                disabled: !image || disabled,
                label: 'Пипетка',
                onSelect: () => onToolChange('eyedropper'),
              },
            ]}
            label="Вид"
          />
        </nav>

        <div className="min-w-0 justify-self-center max-[640px]:hidden">
          <div className="max-w-[52vw] truncate border border-white/[0.1] bg-[#1f2228] px-3 py-1 text-center text-xs text-zinc-300">
            {image ? image.name : 'Без документа'}
          </div>
        </div>
      </div>
    </header>
  )
}

function MenuDropdown({
  disabled = false,
  items,
  label,
}: {
  disabled?: boolean
  items: MenuItem[]
  label: string
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node | null

      if (targetNode && !menuRef.current?.contains(targetNode)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function selectItem(item: MenuItem) {
    setIsOpen(false)
    item.onSelect()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="h-8 cursor-pointer px-3 text-zinc-200 outline-none transition hover:bg-[#363a42] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:text-zinc-600 disabled:hover:bg-transparent"
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        {label}
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-full z-40 min-w-[200px] border border-black/60 bg-[#292c33] p-1"
          role="menu"
        >
          {items.map((item) => (
            <button
              className="grid w-full cursor-pointer grid-cols-[18px_minmax(0,1fr)] items-center gap-2 px-2.5 py-1.5 text-left text-sm text-zinc-100 outline-none transition hover:bg-[#3a3e46] focus-visible:bg-[#3a3e46] disabled:cursor-not-allowed disabled:text-zinc-500 disabled:hover:bg-transparent"
              disabled={item.disabled}
              key={item.label}
              onClick={() => selectItem(item)}
              role="menuitem"
              type="button"
            >
              <span aria-hidden="true" className="text-xs text-zinc-400">
                {item.checked ? '✓' : ''}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
