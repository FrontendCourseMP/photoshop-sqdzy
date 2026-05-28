import { describe, expect, it } from 'vitest'
import { getCenteredImageRect } from './canvas-preview'

describe('canvas preview geometry', () => {
  it('applies pan offset on top of centered image placement', () => {
    expect(
      getCenteredImageRect({
        imageHeight: 40,
        imageWidth: 80,
        panOffset: { x: 12, y: -6 },
        stageHeight: 100,
        stageWidth: 200,
      }),
    ).toEqual({
      height: 40,
      width: 80,
      x: 72,
      y: 24,
    })
  })
})
