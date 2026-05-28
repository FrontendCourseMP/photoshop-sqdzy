import { describe, expect, it } from 'vitest'
import {
  calculateInitialDisplayScalePercent,
  getScaledDimensions,
  scaleRgbaImage,
} from './image-scaling'

describe('image scaling', () => {
  it('scales with nearest neighbor interpolation', () => {
    const source = new Uint8ClampedArray([
      10, 0, 0, 255,
      20, 0, 0, 255,
      30, 0, 0, 255,
      40, 0, 0, 255,
    ])

    const result = scaleRgbaImage({
      method: 'nearest',
      rgba: source,
      sourceHeight: 2,
      sourceWidth: 2,
      targetHeight: 4,
      targetWidth: 4,
    })

    const redValues = getRedValues(result.rgba)

    expect(redValues).toEqual([
      10, 10, 20, 20,
      10, 10, 20, 20,
      30, 30, 40, 40,
      30, 30, 40, 40,
    ])
  })

  it('scales with bilinear interpolation', () => {
    const source = new Uint8ClampedArray([
      0, 0, 0, 255,
      100, 0, 0, 255,
      100, 0, 0, 255,
      200, 0, 0, 255,
    ])

    const result = scaleRgbaImage({
      method: 'bilinear',
      rgba: source,
      sourceHeight: 2,
      sourceWidth: 2,
      targetHeight: 3,
      targetWidth: 3,
    })

    expect(getRedValues(result.rgba)).toEqual([
      0, 50, 100,
      50, 100, 150,
      100, 150, 200,
    ])
  })

  it('clamps initial display scale to the allowed range', () => {
    expect(
      calculateInitialDisplayScalePercent({
        imageHeight: 100,
        imageWidth: 100,
        stageHeight: 1000,
        stageWidth: 1000,
      }),
    ).toBe(300)

    expect(
      calculateInitialDisplayScalePercent({
        imageHeight: 10_000,
        imageWidth: 10_000,
        stageHeight: 200,
        stageWidth: 200,
      }),
    ).toBe(12)
  })

  it('returns scaled integer dimensions', () => {
    expect(getScaledDimensions({ height: 50, scalePercent: 125, width: 80 }))
      .toEqual({ height: 63, width: 100 })
  })
})

function getRedValues(rgba: Uint8ClampedArray): number[] {
  const values: number[] = []

  for (let offset = 0; offset < rgba.length; offset += 4) {
    values.push(rgba[offset])
  }

  return values
}
