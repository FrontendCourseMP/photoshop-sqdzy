import { describe, expect, it } from 'vitest'
import {
  buildDownloadName,
  decodeGrayBit7,
  encodeGrayBit7,
  GRAYBIT7_MIME_TYPE,
} from './raster-image'

describe('GrayBit-7 codec', () => {
  it('encodes and decodes grayscale pixels with transparency mask', () => {
    const encoded = encodeGrayBit7({
      height: 2,
      rgba: new Uint8ClampedArray([
        255, 255, 255, 255,
        0, 0, 0, 255,
        255, 0, 0, 0,
        0, 0, 255, 255,
      ]),
      width: 2,
    })

    expect(Array.from(encoded.slice(0, 12))).toEqual([
      0x47, 0x42, 0x37, 0x1d, 0x01, 0x01, 0x00, 0x02, 0x00, 0x02, 0x00,
      0x00,
    ])

    const decoded = decodeGrayBit7(encoded)

    expect(decoded).toMatchObject({
      hasMask: true,
      height: 2,
      width: 2,
    })
    expect(Array.from(decoded.rgba)).toEqual([
      255, 255, 255, 255,
      0, 0, 0, 255,
      54, 54, 54, 0,
      18, 18, 18, 255,
    ])
  })

  it('rejects files with an invalid signature', () => {
    const bytes = new Uint8Array(12)

    expect(() => decodeGrayBit7(bytes)).toThrow('Некорректная сигнатура')
  })
})

describe('download names', () => {
  it('replaces the extension for supported formats', () => {
    expect(buildDownloadName('photo.demo.png', 'image/jpeg')).toBe(
      'photo.demo.jpg',
    )
    expect(buildDownloadName('mask', GRAYBIT7_MIME_TYPE)).toBe('mask.gb7')
  })
})
