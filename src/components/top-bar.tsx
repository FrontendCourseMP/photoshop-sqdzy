import { useEffect, useRef, useState } from 'react'
import { FileMenu } from './file-menu'
import type { EditorTool } from '../lib/editor-tool'
import type {
  FilterOperation,
  KernelPresetId,
} from '../lib/image-filtering'
import type {
  LoadedRasterImage,
  SupportedRasterMimeType,
} from '../lib/raster-image'

export type TopBarFilterPresetAction = {
  operation: FilterOperation
  presetId?: KernelPresetId
}

type TopBarProps = {
  activeTool: EditorTool
  allChannelsVisible: boolean
  disabled: boolean
  image: LoadedRasterImage | null
  onApplyFilterPreset: (action: TopBarFilterPresetAction) => void
  onExport: (mimeType: SupportedRasterMimeType) => void
  onOpen: () => void
  onOpenFilter: () => void
  onOpenLevels: () => void
  onOpenResize: () => void
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
  onApplyFilterPreset,
  onExport,
  onOpen,
  onOpenFilter,
  onOpenLevels,
  onOpenResize,
  onResetChannels,
  onToolChange,
}: TopBarProps) {
  return (
    <header className="relative z-50 border-b border-black/55 bg-[#282b31]">
      <div className="flex min-h-8 items-center px-2 text-[13px]">
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
                disabled: !image || disabled,
                label: 'Размер изображения...',
                onSelect: onOpenResize,
              },
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
                disabled: !image || disabled,
                label: 'Повышение резкости',
                onSelect: () =>
                  onApplyFilterPreset({
                    operation: 'convolution',
                    presetId: 'sharpen',
                  }),
              },
              {
                disabled: !image || disabled,
                label: 'Размытие по Гауссу',
                onSelect: () =>
                  onApplyFilterPreset({
                    operation: 'convolution',
                    presetId: 'gaussian-3x3',
                  }),
              },
              {
                disabled: !image || disabled,
                label: 'Прямоугольное размытие',
                onSelect: () =>
                  onApplyFilterPreset({
                    operation: 'convolution',
                    presetId: 'box-blur',
                  }),
              },
              {
                disabled: !image || disabled,
                label: 'Медианный фильтр',
                onSelect: () =>
                  onApplyFilterPreset({
                    operation: 'median',
                  }),
              },
              {
                disabled: !image || disabled,
                label: 'Прюитт X',
                onSelect: () =>
                  onApplyFilterPreset({
                    operation: 'convolution',
                    presetId: 'prewitt-x',
                  }),
              },
              {
                disabled: !image || disabled,
                label: 'Прюитт Y',
                onSelect: () =>
                  onApplyFilterPreset({
                    operation: 'convolution',
                    presetId: 'prewitt-y',
                  }),
              },
              {
                disabled: !image || disabled,
                label: 'Custom...',
                onSelect: onOpenFilter,
              },
            ]}
            label="Фильтр"
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
