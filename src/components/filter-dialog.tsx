import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { EditorDialog, type DialogPosition } from './editor-dialog'
import {
  CHANNEL_LABELS,
  CHANNEL_SHORT_LABELS,
} from '../lib/color-channels'
import {
  EDGE_HANDLING_LABELS,
  FILTER_OPERATION_LABELS,
  KERNEL_PRESETS,
  applyImageFilterAsync,
  createDefaultFilterChannelState,
  getIdentityKernel,
  getKernelPreset,
  isIdentityKernel,
  normalizeKernel,
  type FilterChannelState,
  type FilterEdgeHandling,
  type FilterOperation,
  type Kernel3x3,
  type KernelPresetId,
} from '../lib/image-filtering'
import type { LoadedRasterImage, RasterChannel } from '../lib/raster-image'

type FilterDialogProps = {
  defaultPosition?: DialogPosition
  image: LoadedRasterImage | null
  onApply: (rgba: Uint8ClampedArray) => Promise<void>
  onClose: () => void
  onPositionChange?: (position: DialogPosition) => void
  onPreviewChange: (rgba: Uint8ClampedArray | null) => void
  open: boolean
  position?: DialogPosition | null
}

type ParsedKernelResult =
  | { error: string; kernel: null }
  | { error: ''; kernel: Kernel3x3 }

export function FilterDialog({
  defaultPosition,
  image,
  onApply,
  onClose,
  onPositionChange,
  onPreviewChange,
  open,
  position,
}: FilterDialogProps) {
  const [operation, setOperation] = useState<FilterOperation>('convolution')
  const [selectedPresetId, setSelectedPresetId] =
    useState<KernelPresetId>('identity')
  const [kernelValues, setKernelValues] = useState<string[]>(() =>
    getIdentityKernel().map(formatKernelValue),
  )
  const [channelState, setChannelState] = useState<FilterChannelState>(() =>
    createDefaultFilterChannelState(image?.channels),
  )
  const [edgeHandling, setEdgeHandling] =
    useState<FilterEdgeHandling>('copy')
  const [isComparingOriginal, setIsComparingOriginal] = useState(false)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const parsedKernel = useMemo(
    () => parseKernelValues(kernelValues),
    [kernelValues],
  )
  const effectiveKernel = useMemo(
    () =>
      operation === 'median'
        ? getIdentityKernel()
        : parsedKernel.kernel ?? getIdentityKernel(),
    [operation, parsedKernel],
  )
  const validationError = getValidationError({
    channelState,
    image,
    operation,
    parsedKernel,
  })
  const availableChannels = image?.channels ?? []
  const isPreviewClear =
    operation === 'convolution' && isIdentityKernel(effectiveKernel)

  useEffect(() => {
    let isCancelled = false
    const timeoutId = window.setTimeout(() => {
      if (
        !open ||
        !image ||
        isComparingOriginal ||
        validationError ||
        isPreviewClear
      ) {
        onPreviewChange(null)
        setIsPreviewPending(false)
        return
      }

      setIsPreviewPending(true)

      void applyImageFilterAsync({
        channelState,
        edgeHandling,
        image,
        kernel: effectiveKernel,
        operation,
      })
        .then((nextRgba) => {
          if (!isCancelled) {
            onPreviewChange(nextRgba)
            setIsPreviewPending(false)
          }
        })
        .catch((error) => {
          if (!isCancelled) {
            onPreviewChange(null)
            setSubmitError(getErrorMessage(error))
            setIsPreviewPending(false)
          }
        })
    }, 120)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [
    channelState,
    edgeHandling,
    effectiveKernel,
    image,
    isComparingOriginal,
    isPreviewClear,
    onPreviewChange,
    open,
    operation,
    validationError,
  ])

  function changeOperation(event: ChangeEvent<HTMLSelectElement>) {
    setSubmitError('')
    setOperation(event.target.value as FilterOperation)
  }

  function changePreset(event: ChangeEvent<HTMLSelectElement>) {
    const presetId = event.target.value as KernelPresetId
    const preset = getKernelPreset(presetId)

    setSubmitError('')
    setOperation('convolution')
    setSelectedPresetId(presetId)
    setKernelValues(preset.kernel.map(formatKernelValue))
  }

  function changeKernelValue(index: number, value: string) {
    setSubmitError('')
    setKernelValues((currentValues) =>
      currentValues.map((currentValue, currentIndex) =>
        currentIndex === index ? value : currentValue,
      ),
    )
  }

  function toggleChannel(channel: RasterChannel) {
    setSubmitError('')
    setChannelState((currentState) => ({
      ...currentState,
      [channel]: !currentState[channel],
    }))
  }

  function resetSettings() {
    setSubmitError('')
    setOperation('convolution')
    setSelectedPresetId('identity')
    setKernelValues(getIdentityKernel().map(formatKernelValue))
    setChannelState(createDefaultFilterChannelState(image?.channels))
    setEdgeHandling('copy')
    setIsComparingOriginal(false)
  }

  function closeDialog() {
    setIsComparingOriginal(false)
    onPreviewChange(null)
    onClose()
  }

  async function applyDialog() {
    if (!image) {
      return
    }

    if (validationError) {
      setSubmitError(validationError)
      return
    }

    setIsApplying(true)

    try {
      const nextRgba = await applyImageFilterAsync({
        channelState,
        edgeHandling,
        image,
        kernel: effectiveKernel,
        operation,
      })

      onPreviewChange(null)
      await onApply(nextRgba)
      onClose()
    } catch (error) {
      setSubmitError(getErrorMessage(error))
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <EditorDialog
      description="Свёртка 3 × 3, медианная фильтрация и обработка края"
      defaultPosition={defaultPosition}
      footer={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={secondaryButtonClassName}
              disabled={isApplying}
              onClick={resetSettings}
              type="button"
            >
              Сброс
            </button>
            <button
              aria-pressed={isComparingOriginal}
              className="h-8 cursor-pointer border border-white/10 bg-[#2d3037] px-3 text-xs font-semibold text-zinc-200 outline-none transition hover:bg-[#383c44] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-[#d9e9ff] aria-pressed:text-[#101318]"
              disabled={!image || isApplying}
              onPointerCancel={() => setIsComparingOriginal(false)}
              onPointerDown={() => setIsComparingOriginal(true)}
              onPointerLeave={() => setIsComparingOriginal(false)}
              onPointerUp={() => setIsComparingOriginal(false)}
              title="Удерживать для сравнения с исходником"
              type="button"
            >
              {isComparingOriginal ? 'До' : 'После'}
              {isPreviewPending ? (
                <span className="ml-2 font-normal text-zinc-500">пересчёт</span>
              ) : null}
            </button>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              className={secondaryButtonClassName}
              disabled={isApplying}
              onClick={closeDialog}
              type="button"
            >
              Закрыть
            </button>
            <button
              className="h-8 cursor-pointer border border-[#8fbdf0]/45 bg-[#d9e9ff] px-3 text-xs font-semibold text-[#101318] outline-none transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!image || isApplying}
              onClick={() => void applyDialog()}
              type="button"
            >
              {isApplying ? 'Применяю...' : 'Применить'}
            </button>
          </div>
        </>
      }
      labelledById="filter-dialog-title"
      onPositionChange={onPositionChange}
      onClose={closeDialog}
      open={open}
      position={position}
      title="Фильтр"
      widthClassName="w-[min(720px,calc(100vw-32px))]"
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 max-[640px]:grid-cols-1">
          <FormField label="Метод">
            <select
              className={controlClassName}
              disabled={isApplying}
              onChange={changeOperation}
              value={operation}
            >
              <option value="convolution">
                {FILTER_OPERATION_LABELS.convolution}
              </option>
              <option value="median">{FILTER_OPERATION_LABELS.median}</option>
            </select>
          </FormField>

          <FormField label="Предустановка ядра">
            <select
              className={controlClassName}
              disabled={isApplying}
              onChange={changePreset}
              value={selectedPresetId}
            >
              {KERNEL_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_230px] gap-3 max-[760px]:grid-cols-1">
          <section className="grid gap-2">
            <div className="grid grid-cols-3 gap-1.5">
              {kernelValues.map((value, index) => (
                <input
                  aria-label={`Коэффициент ядра ${index + 1}`}
                  className="h-9 min-w-0 border border-white/10 bg-[#1d2026] px-2 text-center font-mono text-xs text-zinc-100 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:text-zinc-500"
                  disabled={isApplying || operation === 'median'}
                  key={index}
                  onChange={(event) =>
                    changeKernelValue(index, event.target.value)
                  }
                  step="0.0001"
                  type="number"
                  value={value}
                />
              ))}
            </div>
            <p className="min-h-4 text-xs text-zinc-500">
              {operation === 'median'
                ? 'Медианный фильтр использует окно 3 × 3 и не зависит от коэффициентов ядра.'
                : 'Коэффициенты применяются слева направо, сверху вниз.'}
            </p>
          </section>

          <aside className="grid content-start gap-3 border border-white/[0.08] bg-white/[0.035] p-3">
            <FormField label="Край изображения">
              <select
                className={controlClassName}
                disabled={isApplying}
                onChange={(event) =>
                  setEdgeHandling(event.target.value as FilterEdgeHandling)
                }
                value={edgeHandling}
              >
                {Object.entries(EDGE_HANDLING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-2">
              <p className="text-xs font-semibold text-zinc-400">Каналы</p>
              <div className="grid grid-cols-2 gap-1.5">
                {availableChannels.map((channel) => (
                  <label
                    className="flex min-h-8 cursor-pointer items-center gap-2 border border-white/[0.08] bg-[#202329] px-2 text-xs font-semibold text-zinc-300"
                    key={channel}
                  >
                    <input
                      checked={channelState[channel]}
                      className="h-4 w-4 accent-[#d9e9ff]"
                      disabled={isApplying}
                      onChange={() => toggleChannel(channel)}
                      type="checkbox"
                    />
                    <span className="min-w-0 truncate">
                      {CHANNEL_LABELS[channel]}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-zinc-500">
                      {CHANNEL_SHORT_LABELS[channel]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <p aria-live="polite" className="min-h-5 text-xs text-[#fca5a5]">
          {submitError || validationError || ''}
        </p>
      </div>
    </EditorDialog>
  )
}

const controlClassName =
  'h-8 w-full border border-white/10 bg-[#1d2026] px-2 text-xs text-zinc-100 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-55'

const secondaryButtonClassName =
  'h-8 cursor-pointer border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 outline-none transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50'

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

function parseKernelValues(values: string[]): ParsedKernelResult {
  try {
    const parsedValues = values.map((value) => {
      if (!value.trim()) {
        throw new Error('Все коэффициенты ядра должны быть заполнены.')
      }

      return Number(value)
    })

    return {
      error: '',
      kernel: normalizeKernel(parsedValues),
    }
  } catch (error) {
    return {
      error: getErrorMessage(error),
      kernel: null,
    }
  }
}

function getValidationError(input: {
  channelState: FilterChannelState
  image: LoadedRasterImage | null
  operation: FilterOperation
  parsedKernel: ParsedKernelResult
}): string {
  if (!input.image) {
    return 'Открой изображение перед фильтрацией.'
  }

  const hasSelectedChannel = input.image.channels.some(
    (channel) => input.channelState[channel],
  )

  if (!hasSelectedChannel) {
    return 'Выберите хотя бы один канал для фильтрации.'
  }

  if (input.operation === 'convolution' && input.parsedKernel.error) {
    return input.parsedKernel.error
  }

  return ''
}

function formatKernelValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return String(Number(value.toFixed(4)))
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Произошла неизвестная ошибка.'
}
