/**
 * Zmenšení fotky v prohlížeči před odesláním (fotky z mobilu mívají 4–12 MB).
 * Respektuje orientaci z EXIF a vrací WebP (nebo JPEG, kde WebP nejde zakódovat).
 */
export interface Compressed { blob: Blob; width: number; height: number; type: string }

export async function compressImage(file: Blob, maxSide = 2000, quality = 0.82): Promise<Compressed> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const width = Math.round(bmp.width * scale)
  const height = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, width, height)
  bmp.close()
  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality))
  let blob = await toBlob('image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg')
  if (!blob) throw new Error('Obrázek se nepodařilo zpracovat.')
  return { blob, width, height, type: blob.type }
}
