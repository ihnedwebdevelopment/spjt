import { BUSINESS } from '../config'
import { fmt } from './geometry'

export interface CaptureLine { label: string; hex: string; area: number; detail: string }

/** K 3D snímku přidá pruh s rozpisem barev a firmou a stáhne ho jako JPG. */
export async function downloadDesignImage(dataUrl: string, lines: CaptureLine[]) {
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  const W = img.width
  const pad = Math.round(W * 0.025)
  const fs = Math.max(14, Math.round(W * 0.0125))
  const rowH = Math.round(fs * 2.1)
  const cols = W > 1400 ? 3 : 2
  const rows = Math.ceil(lines.length / cols)
  const bar = pad * 2 + fs * 2.4 + rows * rowH
  const c = document.createElement('canvas')
  c.width = W
  c.height = img.height + bar
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  ctx.fillStyle = '#161513'
  ctx.fillRect(0, img.height, W, bar)
  ctx.textBaseline = 'middle'
  const top = img.height + pad
  ctx.fillStyle = '#f4f1ea'
  ctx.font = `600 ${Math.round(fs * 1.25)}px "Inter Variable", system-ui, sans-serif`
  ctx.fillText(`${BUSINESS.name} · návrh výmalby`, pad, top + fs * 0.7)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#93aaff'
  ctx.fillText(BUSINESS.phoneDisplay, W - pad, top + fs * 0.7)
  ctx.textAlign = 'left'
  const colW = (W - pad * 2) / cols
  lines.forEach((l, i) => {
    const x = pad + (i % cols) * colW
    const y = top + fs * 2.4 + Math.floor(i / cols) * rowH + rowH / 2
    ctx.fillStyle = l.hex
    ctx.beginPath()
    ctx.arc(x + fs * 0.6, y, fs * 0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(244,241,234,.25)'
    ctx.stroke()
    ctx.fillStyle = '#f4f1ea'
    ctx.font = `600 ${fs}px "Inter Variable", system-ui, sans-serif`
    ctx.fillText(l.label, x + fs * 1.6, y - fs * 0.45)
    ctx.fillStyle = 'rgba(244,241,234,.6)'
    ctx.font = `400 ${Math.round(fs * 0.85)}px "Inter Variable", system-ui, sans-serif`
    ctx.fillText(`${fmt(l.area)} m² · ${l.detail}`, x + fs * 1.6, y + fs * 0.6)
  })
  const a = document.createElement('a')
  a.href = c.toDataURL('image/jpeg', 0.93)
  a.download = 'navrh-vymalby-spejtek.jpg'
  a.click()
}
