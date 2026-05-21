export type RgbColor = {
  blue: number
  green: number
  red: number
}

export type CielabColor = {
  a: number
  b: number
  l: number
}

const D65_WHITE_POINT = {
  x: 0.95047,
  y: 1,
  z: 1.08883,
}

export function rgbToCielab({ blue, green, red }: RgbColor): CielabColor {
  const linearRed = srgbToLinear(red / 255)
  const linearGreen = srgbToLinear(green / 255)
  const linearBlue = srgbToLinear(blue / 255)

  const x =
    linearRed * 0.4124564 +
    linearGreen * 0.3575761 +
    linearBlue * 0.1804375
  const y =
    linearRed * 0.2126729 +
    linearGreen * 0.7151522 +
    linearBlue * 0.072175
  const z =
    linearRed * 0.0193339 +
    linearGreen * 0.119192 +
    linearBlue * 0.9503041

  const fx = labPivot(x / D65_WHITE_POINT.x)
  const fy = labPivot(y / D65_WHITE_POINT.y)
  const fz = labPivot(z / D65_WHITE_POINT.z)

  return {
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
    l: 116 * fy - 16,
  }
}

export function formatLabValue(value: number): string {
  return value.toFixed(2)
}

function srgbToLinear(value: number): number {
  if (value <= 0.04045) {
    return value / 12.92
  }

  return ((value + 0.055) / 1.055) ** 2.4
}

function labPivot(value: number): number {
  const epsilon = 216 / 24389
  const kappa = 24389 / 27

  if (value > epsilon) {
    return Math.cbrt(value)
  }

  return (kappa * value + 16) / 116
}
