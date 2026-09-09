import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  RESUME_PDF,
  RESUME_PDF_SHA256,
  RESUME_PREVIEW,
  RESUME_PREVIEW_HEIGHT,
  RESUME_PREVIEW_WIDTH,
  // .js extension because this file is typechecked as a nodenext program
  // (see tsconfig.node.json); the resolver maps it to resumePreview.ts.
} from './resumePreview.js'

const publicDir = resolve(__dirname, '../../../public')
const read = (webPath: string) =>
  readFileSync(resolve(publicDir, webPath.slice(1)))

describe('the resume preview image', () => {
  // The preview is a picture of the PDF, so replacing the PDF without
  // regenerating it would leave an outdated resume on display while the
  // download link served the current one. Nothing else would catch that.
  it('was built from the PDF that is currently published', () => {
    const actual = createHash('sha256').update(read(RESUME_PDF)).digest('hex')

    expect(
      actual,
      'public/Blake_Grudzien_Resume.pdf has changed since the preview image was generated. Run: npm run resume:preview',
    ).toBe(RESUME_PDF_SHA256)
  })

  it('ships both files that /resume references', () => {
    expect(read(RESUME_PDF).subarray(0, 5).toString()).toBe('%PDF-')
    expect(read(RESUME_PREVIEW).subarray(8, 12).toString()).toBe('WEBP')
  })

  // Set on the <img> so the space is reserved before the image arrives.
  // Wrong numbers here would reintroduce layout shift on the page.
  it('records the real dimensions of the image', () => {
    const webp = read(RESUME_PREVIEW)
    // VP8L lossless header: 14 bits of width-1, then 14 bits of height-1.
    const bits = webp.readUInt32LE(21)
    const isLossless = webp.subarray(12, 16).toString() === 'VP8L'
    if (isLossless) {
      expect(RESUME_PREVIEW_WIDTH).toBe((bits & 0x3fff) + 1)
      expect(RESUME_PREVIEW_HEIGHT).toBe(((bits >> 14) & 0x3fff) + 1)
    } else {
      // Lossy VP8: dimensions live in the frame header after the sync code.
      expect(RESUME_PREVIEW_WIDTH).toBe(webp.readUInt16LE(26) & 0x3fff)
      expect(RESUME_PREVIEW_HEIGHT).toBe(webp.readUInt16LE(28) & 0x3fff)
    }
  })
})
