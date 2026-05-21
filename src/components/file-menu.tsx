import { useEffect, useRef, useState } from 'react'
import {
  GRAYBIT7_MIME_TYPE,
  type SupportedRasterMimeType,
} from '../lib/raster-image'

const EXPORT_ITEMS: Array<{
  label: string
  mimeType: SupportedRasterMimeType
}> = [
  { label: 'Сохранить как PNG', mimeType: 'image/png' },
  { label: 'Сохранить как JPG', mimeType: 'image/jpeg' },
  { label: 'Сохранить как GB7', mimeType: GRAYBIT7_MIME_TYPE },
]

type FileMenuProps = {
  canExport: boolean
  disabled: boolean
  onExport: (mimeType: SupportedRasterMimeType) => void
  onOpen: () => void
}

export function FileMenu({
  canExport,
  disabled,
  onExport,
  onOpen,
}: FileMenuProps) {
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

  function selectOpen() {
    setIsOpen(false)
    onOpen()
  }

  function selectExport(mimeType: SupportedRasterMimeType) {
    setIsOpen(false)
    onExport(mimeType)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="h-8 rounded-md border border-white/10 bg-white/[0.08] px-3 text-sm font-medium text-zinc-100 outline-none transition hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        Файл
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-40 min-w-[230px] rounded-md border border-white/[0.12] bg-[#24262d] p-1 shadow-[0_18px_38px_rgba(0,0,0,0.42)]"
          role="menu"
        >
          <button
            className="flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-left text-sm text-zinc-100 outline-none transition hover:bg-white/[0.08] focus-visible:bg-white/[0.1] disabled:cursor-not-allowed disabled:text-zinc-500"
            disabled={disabled}
            onClick={selectOpen}
            role="menuitem"
            type="button"
          >
            Открыть...
          </button>

          <div className="my-1 h-px bg-white/[0.08]" />

          {EXPORT_ITEMS.map((item) => (
            <button
              className="flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-left text-sm text-zinc-100 outline-none transition hover:bg-white/[0.08] focus-visible:bg-white/[0.1] disabled:cursor-not-allowed disabled:text-zinc-500"
              disabled={!canExport || disabled}
              key={item.mimeType}
              onClick={() => selectExport(item.mimeType)}
              role="menuitem"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
