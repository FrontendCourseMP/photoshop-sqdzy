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
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Пипетка
        </h2>
        <span
          className={`border px-2 py-0.5 text-[10px] font-semibold ${
            activeTool === 'eyedropper'
              ? 'border-[#8fbdf0]/40 bg-[#d9e9ff] text-[#101318]'
              : 'border-white/10 bg-white/[0.04] text-zinc-500'
          }`}
        >
          {activeTool === 'eyedropper' ? 'Активна' : 'Ожидает'}
        </span>
      </div>

      {pixelSample ? (
        <div className="mt-2 grid gap-2 border border-white/[0.08] bg-[#2a2d34] p-2">
          <div className="flex items-center gap-3">
            <span
              aria-label={`Цвет ${pixelSample.hex}`}
              className="h-8 w-8 shrink-0 border border-white/15"
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

          <dl className="grid gap-1.5 text-xs">
            <InfoRow
              label="RGB"
              value={`${pixelSample.red}, ${pixelSample.green}, ${pixelSample.blue}`}
            />
            <InfoRow label="A" value={String(pixelSample.alpha)} />
            <InfoRow
              label="LAB"
              value={`${formatLabValue(pixelSample.lab.l)} / ${formatLabValue(
                pixelSample.lab.a,
              )} / ${formatLabValue(pixelSample.lab.b)}`}
            />
          </dl>
        </div>
      ) : (
        <p className="mt-2 border border-white/[0.08] bg-[#2a2d34] px-3 py-2 text-xs leading-5 text-zinc-500">
          Выбери инструмент и кликни по изображению.
        </p>
      )}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-2 border-b border-white/[0.06] pb-1.5 last:border-b-0 last:pb-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="truncate font-mono text-zinc-200" title={value}>
        {value}
      </dd>
    </div>
  )
}
