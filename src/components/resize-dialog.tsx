import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { EditorDialog } from './editor-dialog'
import {
  INTERPOLATION_METHODS,
  getInterpolationMethodInfo,
  type InterpolationMethod,
} from '../lib/image-scaling'
import type { LoadedRasterImage } from '../lib/raster-image'

const MAX_RESIZE_DIMENSION = 8192
const MAX_RESIZE_PIXELS = 64_000_000
const MIN_RESIZE_PERCENT = 1
const MAX_RESIZE_PERCENT = 1000

type ResizeUnit = 'percent' | 'pixels'

type ResizeDialogProps = {
  defaultMethod: InterpolationMethod
  image: LoadedRasterImage | null
  onApply: (input: {
    height: number
    method: InterpolationMethod
    width: number
  }) => void
  onClose: () => void
  open: boolean
}

export function ResizeDialog({
  defaultMethod,
  image,
  onApply,
  onClose,
  open,
}: ResizeDialogProps) {
  const [unit, setUnit] = useState<ResizeUnit>('percent')
  const [widthValue, setWidthValue] = useState('100')
  const [heightValue, setHeightValue] = useState('100')
  const [isAspectLocked, setIsAspectLocked] = useState(true)
  const [method, setMethod] = useState<InterpolationMethod>(defaultMethod)
  const [submitError, setSubmitError] = useState('')
  const aspectRatio = image ? image.width / image.height : 1
  const targetSize = useMemo(
    () =>
      image
        ? getTargetSize({
            heightValue,
            image,
            unit,
            widthValue,
          })
        : null,
    [heightValue, image, unit, widthValue],
  )
  const validationError = image && targetSize
    ? getValidationError({ image, targetSize, unit, widthValue, heightValue })
    : 'Открой изображение перед изменением размера.'
  const methodInfo = getInterpolationMethodInfo(method)

  function changeUnit(nextUnit: ResizeUnit) {
    if (!image) {
      return
    }

    setSubmitError('')
    setUnit(nextUnit)

    if (nextUnit === 'percent') {
      setWidthValue('100')
      setHeightValue('100')
      return
    }

    setWidthValue(String(image.width))
    setHeightValue(String(image.height))
  }

  function changeWidth(nextValue: string) {
    setSubmitError('')
    setWidthValue(nextValue)

    if (!image || !isAspectLocked) {
      return
    }

    const parsedValue = Number(nextValue)

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return
    }

    if (unit === 'percent') {
      setHeightValue(nextValue)
      return
    }

    setHeightValue(String(Math.max(1, Math.round(parsedValue / aspectRatio))))
  }

  function changeHeight(nextValue: string) {
    setSubmitError('')
    setHeightValue(nextValue)

    if (!image || !isAspectLocked) {
      return
    }

    const parsedValue = Number(nextValue)

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return
    }

    if (unit === 'percent') {
      setWidthValue(nextValue)
      return
    }

    setWidthValue(String(Math.max(1, Math.round(parsedValue * aspectRatio))))
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!image || !targetSize) {
      return
    }

    if (validationError) {
      setSubmitError(validationError)
      return
    }

    onApply({
      height: targetSize.height,
      method,
      width: targetSize.width,
    })
  }

  const beforePixels = image ? image.width * image.height : 0
  const afterPixels = targetSize ? targetSize.width * targetSize.height : 0
  const valueLabel = unit === 'percent' ? 'Проценты' : 'Пиксели'

  return (
    <EditorDialog
      description="Создание изображения в новом размере"
      labelledById="resize-dialog-title"
      onClose={onClose}
      open={open}
      title="Размер изображения"
      widthClassName="w-[min(620px,calc(100vw-32px))]"
    >
      <form className="grid gap-3" onSubmit={submitForm}>
        <dl className="grid grid-cols-2 gap-2 text-xs max-[560px]:grid-cols-1">
          <Metric label="До" value={formatPixels(beforePixels)} />
          <Metric label="После" value={formatPixels(afterPixels)} />
        </dl>

        <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-3 max-[560px]:grid-cols-1">
          <FormField label="Единицы">
            <select
              className={controlClassName}
              name="resize-unit"
              onChange={(event) => changeUnit(event.target.value as ResizeUnit)}
              value={unit}
            >
              <option value="percent">Проценты</option>
              <option value="pixels">Пиксели</option>
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={`Ширина, ${valueLabel.toLowerCase()}`}>
              <input
                className={controlClassName}
                inputMode="decimal"
                max={unit === 'percent' ? MAX_RESIZE_PERCENT : MAX_RESIZE_DIMENSION}
                min={unit === 'percent' ? MIN_RESIZE_PERCENT : 1}
                name="resize-width"
                onChange={(event) => changeWidth(event.target.value)}
                step={unit === 'percent' ? '0.1' : '1'}
                type="number"
                value={widthValue}
              />
            </FormField>

            <FormField label={`Высота, ${valueLabel.toLowerCase()}`}>
              <input
                className={controlClassName}
                inputMode="decimal"
                max={unit === 'percent' ? MAX_RESIZE_PERCENT : MAX_RESIZE_DIMENSION}
                min={unit === 'percent' ? MIN_RESIZE_PERCENT : 1}
                name="resize-height"
                onChange={(event) => changeHeight(event.target.value)}
                step={unit === 'percent' ? '0.1' : '1'}
                type="number"
                value={heightValue}
              />
            </FormField>
          </div>
        </div>

        <label className="flex min-h-8 cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-300">
          <input
            checked={isAspectLocked}
            className="h-4 w-4 accent-[#d9e9ff]"
            name="resize-lock-aspect"
            onChange={(event) => setIsAspectLocked(event.target.checked)}
            type="checkbox"
          />
          Сохранять пропорции
        </label>

        <div className="grid grid-cols-[minmax(0,1fr)_32px] gap-2">
          <FormField label="Интерполяция">
            <select
              className={controlClassName}
              name="resize-method"
              onChange={(event) =>
                setMethod(event.target.value as InterpolationMethod)
              }
              value={method}
            >
              {INTERPOLATION_METHODS.map((candidate) => (
                <option key={candidate.value} value={candidate.value}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="group relative self-end">
            <button
              aria-describedby="resize-interpolation-tooltip"
              className="h-8 w-8 cursor-help border border-white/10 bg-[#2d3037] text-xs font-semibold text-zinc-200 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              title={methodInfo.description}
              type="button"
            >
              ?
            </button>
            <p
              className="pointer-events-none absolute bottom-10 right-0 z-20 w-72 border border-white/[0.12] bg-[#1f2228] p-2 text-xs leading-5 text-zinc-300 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100"
              id="resize-interpolation-tooltip"
              role="tooltip"
            >
              {methodInfo.description}
            </p>
          </div>
        </div>

        <p
          aria-live="polite"
          className="min-h-5 text-xs text-[#fca5a5]"
        >
          {submitError || validationError || ''}
        </p>

        <div className="flex justify-between gap-2 border-t border-white/[0.08] pt-3">
          <button
            className="h-8 cursor-pointer border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-zinc-200 outline-none transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            onClick={onClose}
            type="button"
          >
            Отмена
          </button>
          <button
            className="h-8 cursor-pointer border border-[#8fbdf0]/45 bg-[#d9e9ff] px-3 text-xs font-semibold text-[#101318] outline-none transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            type="submit"
          >
            Применить
          </button>
        </div>
      </form>
    </EditorDialog>
  )
}

const controlClassName =
  'h-8 w-full border border-white/10 bg-[#1d2026] px-2 text-xs text-zinc-100 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300'

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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.035] px-3 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-1 font-mono text-zinc-100">{value}</dd>
    </div>
  )
}

function getTargetSize(input: {
  heightValue: string
  image: LoadedRasterImage
  unit: ResizeUnit
  widthValue: string
}): { height: number; width: number } {
  const width = Number(input.widthValue)
  const height = Number(input.heightValue)

  if (input.unit === 'percent') {
    return {
      height: Math.max(1, Math.round((input.image.height * height) / 100)),
      width: Math.max(1, Math.round((input.image.width * width) / 100)),
    }
  }

  return {
    height: Math.round(height),
    width: Math.round(width),
  }
}

function getValidationError(input: {
  heightValue: string
  image: LoadedRasterImage
  targetSize: { height: number; width: number }
  unit: ResizeUnit
  widthValue: string
}): string {
  const width = Number(input.widthValue)
  const height = Number(input.heightValue)

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return 'Ширина и высота должны быть числами.'
  }

  if (input.unit === 'pixels') {
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      return 'Размер в пикселях должен быть целым числом.'
    }

    if (width < 1 || height < 1) {
      return 'Размер в пикселях должен быть больше нуля.'
    }
  }

  if (input.unit === 'percent') {
    if (width < MIN_RESIZE_PERCENT || height < MIN_RESIZE_PERCENT) {
      return `Процент должен быть не меньше ${MIN_RESIZE_PERCENT}%.`
    }

    if (width > MAX_RESIZE_PERCENT || height > MAX_RESIZE_PERCENT) {
      return `Процент должен быть не больше ${MAX_RESIZE_PERCENT}%.`
    }
  }

  if (
    input.targetSize.width > MAX_RESIZE_DIMENSION ||
    input.targetSize.height > MAX_RESIZE_DIMENSION
  ) {
    return `Максимальный размер по стороне: ${MAX_RESIZE_DIMENSION}px.`
  }

  if (input.targetSize.width * input.targetSize.height > MAX_RESIZE_PIXELS) {
    return 'Итоговый размер ограничен 64 мегапикселями.'
  }

  return ''
}

function formatPixels(pixelCount: number): string {
  const megapixels = pixelCount / 1_000_000
  const fractionDigits =
    megapixels < 0.001 ? 6 : megapixels < 0.01 ? 3 : 2

  return `${megapixels.toFixed(fractionDigits)} Мп`
}
