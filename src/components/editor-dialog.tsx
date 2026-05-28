import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

export type DialogPosition = { x: number; y: number }
type DialogDragState = {
  height: number
  offsetX: number
  offsetY: number
  width: number
}

type EditorDialogProps = {
  children: ReactNode
  closeDisabled?: boolean
  defaultPosition?: DialogPosition
  description?: string
  footer?: ReactNode
  labelledById: string
  onClose: () => void
  onPositionChange?: (position: DialogPosition) => void
  open: boolean
  position?: DialogPosition | null
  title: string
  widthClassName?: string
}

export function EditorDialog({
  children,
  closeDisabled = false,
  defaultPosition,
  description,
  footer,
  labelledById,
  onClose,
  onPositionChange,
  open,
  position,
  title,
  widthClassName = 'w-[min(560px,calc(100vw-32px))]',
}: EditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dialogDragRef = useRef<DialogDragState | null>(null)
  const [dialogPosition, setDialogPosition] =
    useState<DialogPosition | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
      return
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function startDialogDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement | null

    if (target?.closest('button, input, select, textarea')) {
      return
    }

    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    const rect = dialog.getBoundingClientRect()

    dialogDragRef.current = {
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDialogPosition({ x: rect.left, y: rect.top })
  }

  function moveDialog(event: ReactPointerEvent<HTMLElement>) {
    const dragState = dialogDragRef.current

    if (!dragState || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return
    }

    const nextPosition = clampDialogPosition({
        height: dragState.height,
        width: dragState.width,
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      })

    setDialogPosition(nextPosition)
    onPositionChange?.(nextPosition)
  }

  function endDialogDrag(event: ReactPointerEvent<HTMLElement>) {
    dialogDragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const resolvedDialogPosition = dialogPosition ?? position ?? defaultPosition
  const dialogStyle: CSSProperties | undefined = resolvedDialogPosition
    ? {
        left: resolvedDialogPosition.x,
        right: 'auto',
        top: resolvedDialogPosition.y,
      }
    : undefined

  return (
    <dialog
      aria-labelledby={labelledById}
      className={`fixed left-auto right-4 top-20 m-0 max-w-none overflow-hidden border border-white/[0.14] bg-[#252831] p-0 text-zinc-100 outline-none backdrop:bg-transparent max-[760px]:right-2 max-[760px]:top-12 max-[760px]:w-[calc(100vw-16px)] ${widthClassName}`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      ref={dialogRef}
      style={dialogStyle}
    >
      <div className="grid overflow-hidden">
        <header
          className="flex cursor-move select-none items-start justify-between gap-4 border-b border-white/[0.08] px-3 py-2"
          onPointerCancel={endDialogDrag}
          onPointerDown={startDialogDrag}
          onPointerMove={moveDialog}
          onPointerUp={endDialogDrag}
          title="Перетащить окно"
        >
          <div>
            <h2
              className="text-sm font-semibold leading-5 text-zinc-50"
              id={labelledById}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
            ) : null}
          </div>

          <button
            aria-label="Закрыть окно"
            className="h-7 w-7 shrink-0 cursor-pointer border border-white/10 bg-white/[0.04] text-lg leading-none text-zinc-300 outline-none transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeDisabled}
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="grid min-h-0 gap-3 overflow-hidden p-3">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-3 py-2">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  )
}

function clampDialogPosition(input: {
  height: number
  width: number
  x: number
  y: number
}): DialogPosition {
  const padding = 8
  const maxX = Math.max(padding, window.innerWidth - input.width - padding)
  const maxY = Math.max(padding, window.innerHeight - input.height - padding)

  return {
    x: Math.min(maxX, Math.max(padding, input.x)),
    y: Math.min(maxY, Math.max(padding, input.y)),
  }
}
