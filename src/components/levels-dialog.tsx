import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  LEVEL_TARGET_LABELS,
  applyLevelsToRgbaAsync,
  areLevelsSettingsDefault,
  buildHistogramAsync,
  clampLevelsAdjustment,
  createDefaultLevelsSettings,
  getAvailableLevelsTargets,
  getGammaFromMarkerPosition,
  getGammaMarkerPosition,
  getLevelsMaxValue,
  scaleHistogram,
  type HistogramScale,
  type LevelsAdjustment,
  type LevelsSettings,
  type LevelsTarget,
} from '../lib/levels'
import type { LoadedRasterImage } from '../lib/raster-image'

type LevelsDialogProps = {
  image: LoadedRasterImage | null
  onApply: (rgba: Uint8ClampedArray) => Promise<void>
  onClose: () => void
  onPreviewChange: (rgba: Uint8ClampedArray | null) => void
  open: boolean
}

type ActiveMarker = 'black' | 'gamma' | 'white'

export function LevelsDialog({
  image,
  onApply,
  onClose,
  onPreviewChange,
  open,
}: LevelsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [histogramScale, setHistogramScale] =
    useState<HistogramScale>('linear')
  const [histogram, setHistogram] = useState<Uint32Array | null>(null)
  const [isHistogramPending, setIsHistogramPending] = useState(false)
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true)
  const [isComparingOriginal, setIsComparingOriginal] = useState(false)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<LevelsTarget>('master')
  const maxValue = image ? getLevelsMaxValue(image) : 255
  const [settings, setSettings] = useState<LevelsSettings>(() =>
    createDefaultLevelsSettings(maxValue),
  )
  const availableTargets = useMemo<LevelsTarget[]>(
    () => (image ? getAvailableLevelsTargets(image.channels) : ['master']),
    [image],
  )
  const selectedAdjustment = settings[selectedTarget]

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

  useEffect(() => {
    if (!open || !image) {
      return
    }

    const nextMaxValue = getLevelsMaxValue(image)
    const nextTargets = getAvailableLevelsTargets(image.channels)

    setSettings(createDefaultLevelsSettings(nextMaxValue))
    setSelectedTarget(nextTargets[0] ?? 'master')
    setHistogramScale('linear')
    setIsPreviewEnabled(true)
    setIsComparingOriginal(false)
  }, [image, open])

  useEffect(() => {
    if (!availableTargets.includes(selectedTarget)) {
      setSelectedTarget(availableTargets[0] ?? 'master')
    }
  }, [availableTargets, selectedTarget])

  useEffect(() => {
    let isCancelled = false

    if (!open || !image) {
      setHistogram(null)
      return
    }

    setIsHistogramPending(true)

    void buildHistogramAsync(image, selectedTarget, maxValue)
      .then((nextHistogram) => {
        if (!isCancelled) {
          setHistogram(nextHistogram)
          setIsHistogramPending(false)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsHistogramPending(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [image, maxValue, open, selectedTarget])

  useEffect(() => {
    let isCancelled = false
    const timeoutId = window.setTimeout(() => {
      if (
        !open ||
        !image ||
        !isPreviewEnabled ||
        isComparingOriginal ||
        areLevelsSettingsDefault(settings, maxValue)
      ) {
        onPreviewChange(null)
        setIsPreviewPending(false)
        return
      }

      setIsPreviewPending(true)

      void applyLevelsToRgbaAsync({
        image,
        maxValue,
        settings,
      })
        .then((nextRgba) => {
          if (!isCancelled) {
            onPreviewChange(nextRgba)
            setIsPreviewPending(false)
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setIsPreviewPending(false)
          }
        })
    }, 80)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [
    image,
    isComparingOriginal,
    isPreviewEnabled,
    maxValue,
    onPreviewChange,
    open,
    settings,
  ])

  function updateAdjustment(nextAdjustment: Partial<LevelsAdjustment>) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [selectedTarget]: clampLevelsAdjustment(
        {
          ...currentSettings[selectedTarget],
          ...nextAdjustment,
        },
        maxValue,
      ),
    }))
  }

  function resetSettings() {
    setSettings(createDefaultLevelsSettings(maxValue))
    setIsComparingOriginal(false)
  }

  function cancelDialog() {
    setIsComparingOriginal(false)
    onPreviewChange(null)
    onClose()
  }

  async function applyDialog() {
    if (!image) {
      return
    }

    setIsApplying(true)

    try {
      const nextRgba = await applyLevelsToRgbaAsync({
        image,
        maxValue,
        settings,
      })

      onPreviewChange(null)
      await onApply(nextRgba)
      onClose()
    } finally {
      setIsApplying(false)
    }
  }

  function selectTarget(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedTarget(event.target.value as LevelsTarget)
  }

  function selectHistogramScale(event: ChangeEvent<HTMLSelectElement>) {
    setHistogramScale(event.target.value as HistogramScale)
  }

  return (
    <dialog
      aria-labelledby="levels-dialog-title"
      className="fixed bottom-3 left-3 right-3 top-3 m-0 h-[calc(100svh-24px)] w-auto max-w-none overflow-hidden rounded-lg border border-white/[0.14] bg-[#252831]/95 p-0 text-zinc-100 shadow-[0_28px_90px_rgba(0,0,0,0.54)] outline-none backdrop:bg-transparent sm:bottom-12 sm:left-auto sm:right-4 sm:top-16 sm:h-auto sm:max-h-[calc(100svh-112px)] sm:w-[420px]"
      onCancel={(event) => {
        event.preventDefault()
        cancelDialog()
      }}
      ref={dialogRef}
    >
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-3 py-3 sm:px-4">
          <div>
            <h2
              className="text-sm font-semibold leading-5 text-zinc-50"
              id="levels-dialog-title"
            >
              Уровни
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Градационная коррекция входного тонового диапазона
            </p>
          </div>

          <button
            aria-label="Закрыть уровни"
            className="h-8 w-8 shrink-0 cursor-pointer rounded border border-white/10 bg-white/[0.04] text-lg leading-none text-zinc-300 outline-none transition hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isApplying}
            onClick={cancelDialog}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="grid min-h-0 content-start gap-4 overflow-y-auto p-3 sm:p-4">
          <section className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <FormField label="Канал">
                <select
                  className="h-8 min-w-40 rounded border border-white/10 bg-[#1d2026] px-2 text-xs text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
                  onChange={selectTarget}
                  value={selectedTarget}
                >
                  {availableTargets.map((target) => (
                    <option key={target} value={target}>
                      {LEVEL_TARGET_LABELS[target]}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Шкала">
                <select
                  className="h-8 min-w-36 rounded border border-white/10 bg-[#1d2026] px-2 text-xs text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
                  onChange={selectHistogramScale}
                  value={histogramScale}
                >
                  <option value="linear">Линейная</option>
                  <option value="logarithmic">Логарифмическая</option>
                </select>
              </FormField>
            </div>

            <div className="relative mt-4 rounded-md border border-white/[0.08] bg-[#1b1e24] p-2">
              <HistogramCanvas
                histogram={histogram}
                scale={histogramScale}
                target={selectedTarget}
              />
              {isHistogramPending ? (
                <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded bg-[#1b1e24]/70 text-xs font-semibold text-zinc-400">
                  Считаю гистограмму...
                </div>
              ) : null}
            </div>

            <MarkerRail
              adjustment={selectedAdjustment}
              maxValue={maxValue}
              onChange={updateAdjustment}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <LevelInput
                label="Чёрная точка"
                max={selectedAdjustment.white - 1}
                min={0}
                onChange={(black) => updateAdjustment({ black })}
                value={selectedAdjustment.black}
              />
              <GammaInput
                onChange={(gamma) => updateAdjustment({ gamma })}
                value={selectedAdjustment.gamma}
              />
              <LevelInput
                label="Белая точка"
                max={maxValue}
                min={selectedAdjustment.black + 1}
                onChange={(white) => updateAdjustment({ white })}
                value={selectedAdjustment.white}
              />
            </div>
          </section>

          <aside className="grid content-start gap-3 rounded-md border border-white/[0.08] bg-white/[0.035] p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-white/[0.08] bg-black/15 px-3 py-2 text-xs font-semibold text-zinc-100">
                <span>Предпросмотр</span>
                <input
                  checked={isPreviewEnabled}
                  className="h-4 w-4 accent-sky-300"
                  onChange={(event) => {
                    setIsPreviewEnabled(event.target.checked)
                    setIsComparingOriginal(false)
                  }}
                  type="checkbox"
                />
              </label>

              <button
                aria-pressed={isComparingOriginal}
                className="h-9 cursor-pointer rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 outline-none transition hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-zinc-100 aria-pressed:text-slate-950"
                disabled={!isPreviewEnabled}
                onPointerCancel={() => setIsComparingOriginal(false)}
                onPointerDown={() => setIsComparingOriginal(true)}
                onPointerLeave={() => setIsComparingOriginal(false)}
                onPointerUp={() => setIsComparingOriginal(false)}
                type="button"
              >
                До
              </button>
            </div>

            <dl className="grid gap-2 text-xs">
              <SummaryRow label="Диапазон" value={`0-${maxValue}`} />
              <SummaryRow
                label="Канал"
                value={LEVEL_TARGET_LABELS[selectedTarget]}
              />
              <SummaryRow
                label="Preview"
                value={
                  isComparingOriginal
                    ? 'до'
                    : isPreviewPending
                    ? 'пересчёт'
                    : isPreviewEnabled
                      ? 'включён'
                      : 'выключен'
                }
              />
            </dl>

            <p className="rounded-md border border-white/[0.08] bg-[#1d2026] px-3 py-2 text-xs leading-5 text-zinc-400">
              Master меняет RGB/Gray вместе. Отдельные каналы применяются
              поверх Master; Alpha меняет только прозрачность.
            </p>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-3 py-3 sm:px-4">
          <button
            className="h-8 cursor-pointer rounded border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 outline-none transition hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isApplying}
            onClick={resetSettings}
            type="button"
          >
            Сброс
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              className="h-8 cursor-pointer rounded border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 outline-none transition hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isApplying}
              onClick={cancelDialog}
              type="button"
            >
              Отмена
            </button>
            <button
              className="h-8 cursor-pointer rounded bg-sky-300 px-3 text-xs font-semibold text-slate-950 outline-none transition hover:bg-sky-200 focus-visible:ring-2 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!image || isApplying}
              onClick={() => void applyDialog()}
              type="button"
            >
              {isApplying ? 'Применяю...' : 'Применить'}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  )
}

function HistogramCanvas({
  histogram,
  scale,
  target,
}: {
  histogram: Uint32Array | null
  scale: HistogramScale
  target: LevelsTarget
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const devicePixelRatio = window.devicePixelRatio || 1
    const width = 360
    const height = 150

    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    canvas.style.width = '100%'
    canvas.style.height = `${height}px`
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)
    context.fillStyle = '#151820'
    context.fillRect(0, 0, width, height)
    context.strokeStyle = 'rgba(255,255,255,0.06)'
    context.lineWidth = 1

    for (let y = 30; y < height; y += 30) {
      context.beginPath()
      context.moveTo(0, y + 0.5)
      context.lineTo(width, y + 0.5)
      context.stroke()
    }

    if (!histogram) {
      return
    }

    const values = scaleHistogram(histogram, scale)
    const peak = Math.max(...values, 1)
    const barWidth = width / values.length
    const color = getTargetColor(target)

    context.fillStyle = color
    values.forEach((value, index) => {
      const barHeight = Math.max(1, (value / peak) * (height - 14))
      const x = index * barWidth

      context.fillRect(
        x,
        height - barHeight,
        Math.max(1, Math.ceil(barWidth)),
        barHeight,
      )
    })
  }, [histogram, scale, target])

  return (
    <canvas
      aria-label="Гистограмма уровней"
      className="block w-full rounded bg-[#151820]"
      ref={canvasRef}
    />
  )
}

function MarkerRail({
  adjustment,
  maxValue,
  onChange,
}: {
  adjustment: LevelsAdjustment
  maxValue: number
  onChange: (nextAdjustment: Partial<LevelsAdjustment>) => void
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const blackPercent = (adjustment.black / maxValue) * 100
  const whitePercent = (adjustment.white / maxValue) * 100
  const gammaPercent = (getGammaMarkerPosition(adjustment) / maxValue) * 100

  function updateFromPointer(
    event: ReactPointerEvent,
    marker: ActiveMarker,
  ) {
    const rect = railRef.current?.getBoundingClientRect()

    if (!rect) {
      return
    }

    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    )
    const value = Math.round(ratio * maxValue)

    if (marker === 'black') {
      onChange({ black: Math.min(value, adjustment.white - 1) })
      return
    }

    if (marker === 'white') {
      onChange({ white: Math.max(value, adjustment.black + 1) })
      return
    }

    onChange({ gamma: getGammaFromMarkerPosition(value, adjustment) })
  }

  function startDrag(marker: ActiveMarker) {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      updateFromPointer(event, marker)
    }
  }

  function moveMarker(marker: ActiveMarker) {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        updateFromPointer(event, marker)
      }
    }
  }

  return (
    <div className="mt-3 px-1">
      <div
        className="relative h-8 rounded border border-white/[0.08] bg-gradient-to-r from-black via-zinc-500 to-white"
        ref={railRef}
      >
        <MarkerButton
          label="Чёрная точка"
          left={blackPercent}
          marker="black"
          onPointerDown={startDrag('black')}
          onPointerMove={moveMarker('black')}
        />
        <MarkerButton
          label="Гамма"
          left={gammaPercent}
          marker="gamma"
          onPointerDown={startDrag('gamma')}
          onPointerMove={moveMarker('gamma')}
        />
        <MarkerButton
          label="Белая точка"
          left={whitePercent}
          marker="white"
          onPointerDown={startDrag('white')}
          onPointerMove={moveMarker('white')}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
        <span>0</span>
        <span>{maxValue}</span>
      </div>
    </div>
  )
}

function MarkerButton({
  label,
  left,
  marker,
  onPointerDown,
  onPointerMove,
}: {
  label: string
  left: number
  marker: ActiveMarker
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  const color =
    marker === 'black'
      ? 'border-zinc-200 bg-zinc-950'
      : marker === 'white'
        ? 'border-zinc-950 bg-zinc-100'
        : 'border-sky-100 bg-sky-300'

  return (
    <button
      aria-label={label}
      className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm border shadow-[0_0_0_2px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 ${color}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      style={{ left: `${left}%` }}
      title={label}
      type="button"
    />
  )
}

function LevelInput({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  value: number
}) {
  return (
    <FormField label={label}>
      <input
        className="w-full accent-sky-300"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
      <input
        className="mt-1 h-8 w-full rounded border border-white/10 bg-[#1d2026] px-2 text-xs text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </FormField>
  )
}

function GammaInput({
  onChange,
  value,
}: {
  onChange: (value: number) => void
  value: number
}) {
  return (
    <FormField label="Гамма">
      <input
        className="w-full accent-sky-300"
        max="9.9"
        min="0.1"
        onChange={(event) => onChange(Number(event.target.value))}
        step="0.01"
        type="range"
        value={value}
      />
      <input
        className="mt-1 h-8 w-full rounded border border-white/10 bg-[#1d2026] px-2 text-xs text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
        max="9.9"
        min="0.1"
        onChange={(event) => onChange(Number(event.target.value))}
        step="0.01"
        type="number"
        value={value.toFixed(2)}
      />
    </FormField>
  )
}

function FormField({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-zinc-400">
      <span>{label}</span>
      {children}
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-2 last:border-b-0 last:pb-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-semibold text-zinc-200">{value}</dd>
    </div>
  )
}

function getTargetColor(target: LevelsTarget): string {
  if (target === 'red') {
    return 'rgba(248, 113, 113, 0.78)'
  }

  if (target === 'green') {
    return 'rgba(74, 222, 128, 0.78)'
  }

  if (target === 'blue') {
    return 'rgba(96, 165, 250, 0.78)'
  }

  if (target === 'alpha') {
    return 'rgba(244, 244, 245, 0.74)'
  }

  return 'rgba(125, 211, 252, 0.78)'
}
