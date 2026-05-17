/* ════════════════════════════════════════════════════════════════════
   IMAGE UPLOAD — client-side compression + data URL

   Pipeline:
     File → off-screen canvas downscale → JPEG @ ~0.85 quality → data URL

   Why: keeps payloads under ~500 KB each so we can stuff 3-4 images
   into a single /api/generate body without hitting Vercel's 4.5 MB
   request limit. Data URLs survive base64 + JSON, render inline in the
   exported HTML deck, and Sonnet vision accepts them directly.

   No external deps. Browser-only (uses HTMLCanvasElement). Server-side
   importers will tree-shake the function out — it's only called from
   the intake page on user file-pick.
═══════════════════════════════════════════════════════════════════ */

export interface UploadedImage {
  dataUrl:     string   // 'data:image/jpeg;base64,...'
  width:       number
  height:      number
  bytes:       number
  originalName: string
}

const MAX_DIM        = 1600        // longest side, px
const TARGET_QUALITY = 0.85        // JPEG quality
const MAX_BYTES      = 500 * 1024  // 500 KB target

/** Read a File, downscale to MAX_DIM longest side, compress to JPEG, return data URL. */
export async function compressToDataUrl(file: File): Promise<UploadedImage> {
  // Accept SVG as-is — it's already small and vector. Just read it.
  if (file.type === 'image/svg+xml') {
    const text = await file.text()
    const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`
    return { dataUrl, width: 0, height: 0, bytes: text.length, originalName: file.name }
  }

  const bmp = await readImage(file)
  const { canvas, w, h } = drawToCanvas(bmp, MAX_DIM)

  // Iteratively compress: lower quality until under MAX_BYTES, but don't
  // drop below 0.55 — that's where artifacts get visible on logos.
  let q = TARGET_QUALITY
  let dataUrl = canvas.toDataURL('image/jpeg', q)
  while (estimateBytes(dataUrl) > MAX_BYTES && q > 0.55) {
    q -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', q)
  }

  return { dataUrl, width: w, height: h, bytes: estimateBytes(dataUrl), originalName: file.name }
}

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload  = () => resolve(img)
      img.onerror = () => reject(new Error('Image decode failed'))
      img.src     = reader.result as string
    }
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

function drawToCanvas(img: HTMLImageElement, maxDim: number) {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth  * scale)
  const h = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'   // flatten transparency to white so JPEG doesn't get muddy
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return { canvas, w, h }
}

function estimateBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || ''
  return Math.ceil((base64.length * 3) / 4)
}

/** Convenience wrapper for FileList → UploadedImage[]. Silently skips non-image files. */
export async function compressMany(files: FileList | File[]): Promise<UploadedImage[]> {
  const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
  return Promise.all(arr.map(compressToDataUrl))
}
