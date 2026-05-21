import {
  GRAYBIT7_MIME_TYPE,
  type LoadedRasterImage,
  type SupportedRasterMimeType,
} from '../lib/raster-image'

type SidePanelProps = {
  disabled: boolean
  image: LoadedRasterImage | null
  onExport: (mimeType: SupportedRasterMimeType) => void
  onOpen: () => void
}

export function SidePanel({
  disabled,
  image,
  onExport,
  onOpen,
}: SidePanelProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-black/30 bg-[#282b31] lg:w-72">
      <div className="border-b border-white/[0.08] p-3">
        <button
          className="h-9 w-full cursor-pointer rounded-md bg-sky-400 px-3 text-sm font-semibold text-slate-950 outline-none transition hover:bg-sky-300 focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onOpen}
          type="button"
        >
          Открыть изображение
        </button>
      </div>

      <div className="grid gap-4 overflow-y-auto p-3 text-sm">
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Текущее изображение
          </h2>

          <dl className="mt-3 grid gap-2 text-xs">
            <InfoRow label="Файл" value={image?.name ?? 'Не выбран'} />
            <InfoRow
              label="Размер"
              value={image ? `${image.width} × ${image.height}px` : '—'}
            />
            <InfoRow
              label="Цвет"
              value={
                image ? `${image.bitDepth}-bit ${image.colorModel}` : '—'
              }
            />
            <InfoRow label="Формат" value={image?.format ?? '—'} />
          </dl>
        </section>

        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Экспорт
          </h2>

          <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-1">
            <ExportButton
              disabled={!image || disabled}
              label="PNG"
              onClick={() => onExport('image/png')}
            />
            <ExportButton
              disabled={!image || disabled}
              label="JPG"
              onClick={() => onExport('image/jpeg')}
            />
            <ExportButton
              disabled={!image || disabled}
              label="GB7"
              onClick={() => onExport(GRAYBIT7_MIME_TYPE)}
            />
          </div>
        </section>

      </div>
    </aside>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 border-b border-white/[0.06] pb-2 last:border-b-0 last:pb-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="truncate text-zinc-200" title={value}>
        {value}
      </dd>
    </div>
  )
}

function ExportButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      className="h-8 cursor-pointer rounded-md border border-white/10 bg-white/[0.06] px-2 text-xs font-semibold text-zinc-100 outline-none transition hover:border-sky-300/40 hover:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:hover:border-white/10 disabled:hover:bg-white/[0.06]"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}
