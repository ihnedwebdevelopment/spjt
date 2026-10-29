/** Sdílené prvky administrace – stavěné nejdřív pro telefon (dotykové cíle ≥ 44 px, písmo ≥ 16 px). */
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { api, ApiError } from './api'
import { compressImage } from '../lib/image'

/* ───────── ikony ───────── */
const P: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
  close: 'M6 6l12 12M18 6L6 18',
  photo: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5a1.5 1.5 0 1 0 0-.01',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  doc: 'M6 3h9l5 5v13H6zM14 3v6h6M9 13h8M9 17h6',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1zM17 8a5 5 0 0 1 0 8M7 14l1 6h3l-1-5',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18',
  phone: 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  check: 'M5 12.5l4.5 4.5L19 7',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4l13 8-13 8z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5v.01',
  more: 'M5 12v.01M12 12v.01M19 12v.01',
  sms: 'M4 5h16v11H8l-4 4zM8 10h.01M12 10h.01M16 10h.01',
}

export function I({ n, s = 22, className }: { n: keyof typeof P | string; s?: number; className?: string }) {
  return (
    <svg className={'ai' + (className ? ' ' + className : '')} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[n] ?? ''} />
    </svg>
  )
}

/* ───────── oznámení ───────── */
interface ToastMsg { id: number; text: string; kind: 'ok' | 'err' }
const useToasts = create<{ list: ToastMsg[] }>(() => ({ list: [] }))
let tid = 0
export function toast(text: string, kind: 'ok' | 'err' = 'ok') {
  const id = ++tid
  useToasts.setState((s) => ({ list: [...s.list, { id, text, kind }] }))
  setTimeout(() => useToasts.setState((s) => ({ list: s.list.filter((t) => t.id !== id) })), kind === 'err' ? 6000 : 3000)
}
export const toastError = (e: unknown) => toast(e instanceof Error ? e.message : 'Něco se nepovedlo.', 'err')

export function Toasts() {
  const list = useToasts((s) => s.list)
  return (
    <div className="adm-toasts" aria-live="polite">
      {list.map((t) => <div key={t.id} className={'adm-toast ' + t.kind}>{t.kind === 'ok' && <I n="check" s={18} />}{t.text}</div>)}
    </div>
  )
}

/* ───────── načítání dat ───────── */
export function useLoad<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [loading, setLoading] = useState(!!path)
  const seq = useRef(0)
  const reload = useCallback(async () => {
    if (!path) return
    const n = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const d = await api<T>(path)
      if (n === seq.current) setData(d)
    } catch (e) {
      if (n === seq.current) setError(e as Error)
    } finally {
      if (n === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])
  useEffect(() => { reload() }, [reload])
  return { data, setData, error, loading, reload }
}

/* ───────── rozvržení stránky ───────── */
export function PageHead({ title, back, children, sub }: { title: string; back?: string; children?: ReactNode; sub?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="adm-head">
      {back && <button className="adm-icon-btn" aria-label="Zpět" onClick={() => (history.length > 1 ? nav(-1) : nav(back))}><I n="back" /></button>}
      <div className="adm-head-title">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="adm-head-actions">{children}</div>}
    </header>
  )
}

export function Loading({ label = 'Načítám…' }: { label?: string }) {
  return <div className="adm-loading" role="status"><span className="adm-spin" />{label}</div>
}

export function ErrorBox({ error, retry, children }: { error: Error; retry?: () => void; children?: ReactNode }) {
  return (
    <div className="adm-error" role="alert">
      <p>{error.message}</p>
      {children}
      {retry && <button className="adm-btn ghost small" onClick={retry}><I n="refresh" s={18} />Zkusit znovu</button>}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="adm-empty">
      <I n={icon} s={36} />
      <h3>{title}</h3>
      {children}
    </div>
  )
}

/* ───────── formulářové prvky ───────── */
export function Field({ label, hint, children, count, max }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode; count?: number; max?: number }) {
  const id = useId()
  return (
    <div className="adm-field">
      <div className="adm-label-row">
        <label htmlFor={id}>{label}</label>
        {max !== undefined && count !== undefined && <span className={'adm-count' + (count > max ? ' over' : '')}>{count}/{max}</span>}
      </div>
      {children(id)}
      {hint && <p className="adm-hint">{hint}</p>}
    </div>
  )
}

export function Text({ label, value, onChange, hint, max, multiline, rows, placeholder, type = 'text', inputMode, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; max?: number; multiline?: boolean; rows?: number
  placeholder?: string; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoComplete?: string
}) {
  return (
    <Field label={label} hint={hint} count={max ? value.length : undefined} max={max}>
      {(id) => multiline
        ? <textarea id={id} value={value} rows={rows ?? 4} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input id={id} type={type} value={value} placeholder={placeholder} inputMode={inputMode} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="adm-toggle">
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  )
}

/** Seznam textových řádků (např. body služby) s přidáním a odebráním. */
export function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="adm-field">
      <span className="adm-label">{label}</span>
      <div className="adm-list-edit">
        {items.map((x, i) => (
          <div key={i} className="adm-list-row">
            <input value={x} aria-label={`${label} ${i + 1}`} onChange={(e) => onChange(items.map((y, n) => (n === i ? e.target.value : y)))} />
            <button type="button" className="adm-icon-btn" aria-label="Odebrat" onClick={() => onChange(items.filter((_, n) => n !== i))}><I n="close" s={18} /></button>
          </div>
        ))}
        <button type="button" className="adm-btn ghost small" onClick={() => onChange([...items, ''])}><I n="plus" s={18} />{placeholder ?? 'Přidat řádek'}</button>
      </div>
    </div>
  )
}

/* ───────── panel (na mobilu přes celou obrazovku, na počítači vpravo) ───────── */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('adm-lock')
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('adm-lock') }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="adm-sheet-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className={'adm-sheet' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <button className="adm-icon-btn" aria-label="Zavřít" onClick={onClose}><I n="close" /></button>
          <h2>{title}</h2>
        </header>
        <div className="adm-sheet-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  )
}

/** Tlačítko, které se zeptá dvakrát (bez blokujícího window.confirm). */
export function ConfirmButton({ onConfirm, children, className = 'adm-btn danger ghost', label = 'Opravdu smazat?' }: { onConfirm: () => void | Promise<void>; children: ReactNode; className?: string; label?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t) }, [armed])
  return (
    <button type="button" className={className + (armed ? ' armed' : '')} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? label : children}
    </button>
  )
}

/* ───────── fotky ───────── */
export async function uploadImage(file: Blob, name = 'foto'): Promise<string> {
  const c = await compressImage(file, 2200, 0.84)
  const q = new URLSearchParams({ name, w: String(c.width), h: String(c.height) })
  const r = await api<{ url: string }>('admin/media?' + q, { raw: c.blob, type: c.type })
  return r.url
}

interface MediaFile { key: string; url: string; size: number; uploaded: string }

export function ImageField({ label, value, onChange, hint, name }: { label: string; value: string; onChange: (url: string) => void; hint?: string; name?: string }) {
  const [busy, setBusy] = useState(false)
  const [lib, setLib] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const pick = async (f?: File) => {
    if (!f) return
    setBusy(true)
    try { onChange(await uploadImage(f, name)); toast('Fotka nahrána') } catch (e) { toastError(e) } finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  return (
    <div className="adm-field">
      <span className="adm-label">{label}</span>
      <div className={'adm-image' + (value ? ' has' : '')}>
        {value ? <img src={value} alt="" /> : <span className="adm-image-ph"><I n="photo" s={30} /></span>}
        {busy && <span className="adm-image-busy"><span className="adm-spin" />Nahrávám…</span>}
      </div>
      <div className="adm-image-actions">
        <label className="adm-btn small">
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <I n="camera" s={18} />{value ? 'Vyměnit' : 'Vyfotit / nahrát'}
        </label>
        <button type="button" className="adm-btn ghost small" onClick={() => setLib(true)}><I n="photo" s={18} />Z galerie</button>
        {value && <button type="button" className="adm-btn ghost small" onClick={() => onChange('')}>Odebrat</button>}
      </div>
      {hint && <p className="adm-hint">{hint}</p>}
      {lib && <MediaLibrary onClose={() => setLib(false)} onPick={(u) => { onChange(u); setLib(false) }} />}
    </div>
  )
}

export function MediaLibrary({ onClose, onPick }: { onClose: () => void; onPick?: (url: string) => void }) {
  const { data, error, loading, reload, setData } = useLoad<MediaFile[]>('admin/media')
  const del = async (key: string) => {
    try { await api('admin/media?key=' + encodeURIComponent(key), { method: 'DELETE' }); setData((d) => d?.filter((x) => x.key !== key) ?? null); toast('Smazáno') } catch (e) { toastError(e) }
  }
  return (
    <Sheet open onClose={onClose} title="Nahrané fotky" wide>
      {loading && <Loading />}
      {error && <ErrorBox error={error} retry={reload} />}
      {data && !data.length && <Empty icon="photo" title="Zatím žádné fotky">Fotky nahrané u realizací a článků se objeví tady.</Empty>}
      {data && data.length > 0 && (
        <ul className="adm-media-grid">
          {data.map((m) => (
            <li key={m.key}>
              <button type="button" onClick={() => onPick?.(m.url)} disabled={!onPick} aria-label="Vybrat fotku"><img src={m.url} alt="" loading="lazy" /></button>
              <ConfirmButton className="adm-media-del" label="Smazat?" onConfirm={() => del(m.key)}><I n="trash" s={16} /></ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

/* ───────── čísla a graf ───────── */
export function Delta({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  if (!prev) return null
  const d = (cur - prev) / prev
  if (!isFinite(d) || Math.abs(d) < 0.005) return <span className="adm-delta flat">beze změny</span>
  const good = invert ? d < 0 : d > 0
  return <span className={'adm-delta ' + (good ? 'up' : 'down')}>{d > 0 ? '▲' : '▼'} {Math.abs(d * 100).toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} %</span>
}

export function Stat({ label, value, children, onClick, active }: { label: string; value: ReactNode; children?: ReactNode; onClick?: () => void; active?: boolean }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={'adm-stat' + (active ? ' active' : '')} onClick={onClick} {...(onClick ? { type: 'button', 'aria-pressed': !!active } : {})}>
      <span className="adm-stat-label">{label}</span>
      <b>{value}</b>
      {children}
    </Tag>
  )
}

/**
 * Jednoduchý spojnicový graf jedné řady (jedna osa, tenká 2px linka, nevtíravá mřížka)
 * s křížovým kurzorem a popiskem při dotyku/najetí. Metriku přepíná uživatel nad grafem.
 */
export function LineChart({ points, format, label, height = 180 }: { points: { key: string; value: number }[]; format: (n: number) => string; label: string; height?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const [w, setW] = useState(600)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const el = ref.current?.parentElement
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  if (!points.length) return <p className="adm-hint">Za zvolené období nejsou data.</p>
  const pad = { l: 8, r: 8, t: 14, b: 26 }
  const max = Math.max(...points.map((p) => p.value)) || 1
  const nice = niceMax(max)
  const x = (i: number) => pad.l + (points.length === 1 ? (w - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (w - pad.l - pad.r))
  const y = (v: number) => pad.t + (1 - v / nice) * (height - pad.t - pad.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
  const area = `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`
  const ticks = [0, 0.5, 1].map((f) => nice * f)
  const labelEvery = Math.ceil(points.length / Math.max(2, Math.floor(w / 80)))
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const rel = (e.clientX - r.left - pad.l) / (r.width - pad.l - pad.r)
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))))
  }
  const h = hover !== null ? points[hover] : null
  const day = (k: string) => { const d = new Date(k); return isNaN(+d) ? k : d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) }
  return (
    <figure className="adm-chart">
      <svg ref={ref} width={w} height={height} role="img" aria-label={`${label}: ${points.length} dní, nejvýše ${format(max)}`}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            {t > 0 && <text x={w - pad.r} y={y(t) - 4} textAnchor="end" className="tick">{format(t)}</text>}
          </g>
        ))}
        <path d={area} className="area" />
        <path d={line} className="line" />
        {points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1) && i !== hover && (
          <text key={p.key} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="tick">{day(p.key)}</text>
        ))}
        {h && (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1={pad.t} y2={height - pad.b} className="cross" />
            <circle cx={x(hover!)} cy={y(h.value)} r={5} className="dot" />
          </g>
        )}
      </svg>
      {h && (
        <figcaption className="adm-tip" style={{ left: Math.min(Math.max(x(hover!), 60), w - 60) }}>
          <span>{day(h.key)}</span><b>{format(h.value)}</b>
        </figcaption>
      )}
    </figure>
  )
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const m = v / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

export function RangePicker({ value, onChange, options = [7, 28, 90] }: { value: number; onChange: (d: number) => void; options?: number[] }) {
  return (
    <div className="adm-seg" role="group" aria-label="Období">
      {options.map((d) => <button key={d} type="button" aria-pressed={value === d} onClick={() => onChange(d)}>{d} dní</button>)}
    </div>
  )
}
