import { formatLabValue } from '../lib/color-space'
import type { EditorTool } from '../lib/editor-tool'
import type { PixelSample } from '../lib/pixel-sampling'

type EyedropperPanelProps = {
  activeTool: EditorTool
  pixelSample: PixelSample | null
}

export function EyedropperPanel({
  activeTool,
  pixelSample,
}: EyedropperPanelProps) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Пипетка
        </h2>
        <span
          className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
            activeTool === 'eyedropper'
              ? 'border-sky-300/30 bg-sky-300 text-slate-950'
              : 'border-white/10 bg-white/[0.04] text-zinc-500'
          }`}
        >
          {activeTool === 'eyedropper' ? 'Активна' : 'Ожидает'}
        </span>
      </div>

      {pixelSample ? (
        <div className="mt-3 grid gap-3 rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <span
              aria-label={`Цвет ${pixelSample.hex}`}
              className="h-10 w-10 shrink-0 rounded border border-white/15"
              style={{ backgroundColor: pixelSample.hex }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-100">
                {pixelSample.hex}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                X {pixelSample.x}, Y {pixelSample.y}
              </p>
            </div>
          </div>

          <dl className="grid gap-2 text-xs">
            <InfoRow
              label="RGB"
              value={`${pixelSample.red}, ${pixelSample.green}, ${pixelSample.blue}`}
            />
            <InfoRow label="Alpha" value={String(pixelSample.alpha)} />
            <InfoRow label="L*" value={formatLabValue(pixelSample.lab.l)} />
            <InfoRow label="a*" value={formatLabValue(pixelSample.lab.a)} />
            <InfoRow label="b*" value={formatLabValue(pixelSample.lab.b)} />
          </dl>
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs leading-5 text-zinc-500">
          Выбери инструмент и кликни по изображению.
        </p>
      )}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 border-b border-white/[0.06] pb-2 last:border-b-0 last:pb-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="truncate font-mono text-zinc-200" title={value}>
        {value}
      </dd>
    </div>
  )
}
