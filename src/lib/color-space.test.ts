import { describe, expect, it } from 'vitest'
import { rgbToCielab } from './color-space'

describe('CIELAB conversion', () => {
  it('maps black to the LAB origin', () => {
    expect(rgbToCielab({ blue: 0, green: 0, red: 0 })).toMatchObject({
      a: 0,
      b: 0,
      l: 0,
    })
  })

  it('maps white close to L 100 with neutral chroma', () => {
    const lab = rgbToCielab({ blue: 255, green: 255, red: 255 })

    expect(lab.l).toBeCloseTo(100, 2)
    expect(lab.a).toBeCloseTo(0, 2)
    expect(lab.b).toBeCloseTo(0, 2)
  })

  it('converts sRGB red to a D65 CIELAB value', () => {
    const lab = rgbToCielab({ blue: 0, green: 0, red: 255 })

    expect(lab.l).toBeCloseTo(53.24, 2)
    expect(lab.a).toBeCloseTo(80.09, 2)
    expect(lab.b).toBeCloseTo(67.2, 2)
  })
})
