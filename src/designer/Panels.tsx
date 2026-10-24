import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FINISHES, PAINTS, TEXTURES, type Paint } from '../data/paints'
import { PRESETS } from '../data/presets'
import { COMBOS } from '../data/combos'
import { FLOORS } from '../lib/textures'
import { SURFACE_LABEL, WALL_IDS, WALL_LABEL, estimate, fmt } from '../lib/geometry'
import { shareUrl } from '../lib/urlState'
import { PRICING, BUSINESS } from '../config'
import { FURNITURE_LABEL, allRooms, useDesigner } from '../store/designer'
import type { FurnitureType, SurfaceId } from '../store/types'
import Icon from '../components/Icon'

const GROUPS: Paint['group'][] = ['Neutrální', 'Teplé', 'Chladné', 'Zemité', 'Výrazné']
const SURFACE_ORDER: SurfaceId[] = ['wallN', 'wallE', 'wallS', 'wallW', 'ceiling', 'trim']
const SHORT: Record<SurfaceId, string> = { wallN: 'Sever', wallE: 'Východ', wallS: 'Jih', wallW: 'Západ', ceiling: 'Strop', trim: 'Sokl' }

const clock = (t: number) => `${Math.floor(t)}:${String(Math.round((t % 1) * 60)).padStart(2, '0')}`

export type Tab = 'barvy' | 'mistnost' | 'nabytek' | 'svetlo' | 'rozpis'
export const TABS: { id: Tab; label: string }[] = [
  { id: 'barvy', label: 'Barvy' },
  { id: 'mistnost', label: 'Místnost' },
  { id: 'nabytek', label: 'Nábytek' },
  { id: 'svetlo', label: 'Světlo' },
  { id: 'rozpis', label: 'Rozpis' },
]

/* ───────── barvy ───────── */
export function ColorTab() {
  const design = useDesigner((s) => s.design)
  const selected = useDesigner((s) => s.selected)
  const { select, selectWalls, selectAll, paint, paintBefore } = useDesigner.getState()
  const first = design.surfaces[selected[0] ?? 'wallN']
  const sameHex = selected.every((id) => design.surfaces[id].hex === first.hex)
  const sameFin = selected.every((id) => design.surfaces[id].finish === first.finish)
  const sameTex = selected.every((id) => design.surfaces[id].texture === first.texture)
  const current = sameHex ? PAINTS.find((p) => p.hex.toLowerCase() === first.hex.toLowerCase()) : undefined
  const tex = TEXTURES.find((t) => t.id === first.texture)!
  const fin = FINISHES.find((f) => f.id === first.finish)!

  const walls = (['wallN', 'wallE', 'wallS', 'wallW'] as SurfaceId[]).map((w) => design.surfaces[w])
  const same = (a: { hex: string; texture: string }, b: { hex: string; texture: string }) => a.hex.toLowerCase() === b.hex.toLowerCase() && a.texture === b.texture
  const combo = COMBOS.find((c) =>
    walls.every((w) => same(w, c.base) || same(w, c.accent)) &&
    walls.filter((w) => same(w, c.accent)).length === 1 &&
    same(design.surfaces.ceiling, c.ceiling))

  return (
    <>
      <div>
        <div className="group-title">Hotové kombinace</div>
        <div className="combos">
          {COMBOS.map((c) => (
            <button key={c.id} className="combo" aria-pressed={combo?.id === c.id} onClick={() => useDesigner.getState().applyCombo(c)} title={c.note}>
              <span className="combo-sw" aria-hidden>
                <i style={{ background: c.base.hex }} />
                <i style={{ background: c.accent.hex }} />
                <i style={{ background: c.trim.hex }} />
              </span>
              <span className="combo-name">{c.name}</span>
            </button>
          ))}
        </div>
        <p className="hint">{combo ? combo.note + '.' : 'Jedním klepnutím nastaví stěny, akcent, strop i lišty. Pak můžete cokoli doladit.'}</p>
      </div>

      <div>
        <div className="group-title">
          <span>Co natíráme</span>
          <span className="row">
            <button className="chip ghost" onClick={selectWalls}>Všechny stěny</button>
            <button className="chip ghost" onClick={selectAll}>Vše</button>
          </span>
        </div>
        <div className="chips">
          {SURFACE_ORDER.map((id) => (
            <button key={id} className="chip" aria-pressed={selected.includes(id)} onClick={() => select(id, true)}>
              <i style={{ background: design.surfaces[id].hex }} />
              {SHORT[id]}
            </button>
          ))}
        </div>
        <p className="hint">Plochy lze vybírat i kliknutím přímo na stěnu v 3D. Vybrané plochy se přebarvují najednou.</p>
      </div>

      <div>
        <div className="group-title">Odstín</div>
        {GROUPS.map((g) => (
          <div key={g} style={{ marginBottom: 12 }}>
            <div className="hint" style={{ margin: '0 0 6px' }}>{g}</div>
            <div className="palette">
              {PAINTS.filter((p) => p.group === g).map((p) => (
                <button
                  key={p.id}
                  className="sw"
                  title={p.name}
                  aria-label={p.name}
                  aria-pressed={sameHex && first.hex.toLowerCase() === p.hex.toLowerCase()}
                  style={{ background: p.hex }}
                  onClick={() => paint({ hex: p.hex })}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="pal-name">{current ? <b>{current.name}</b> : sameHex ? 'Vlastní odstín' : 'Vybrané plochy mají různé odstíny'}</div>
        <div className="colorpick" style={{ marginTop: 10 }}>
          <input type="color" aria-label="Vlastní barva" value={first.hex} onChange={(e) => paint({ hex: e.target.value })} />
          <input
            type="text"
            aria-label="Hex kód barvy"
            value={first.hex}
            maxLength={7}
            onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && paint({ hex: e.target.value })}
          />
        </div>
        <p className="hint">Odstíny na monitoru se liší od skutečné barvy na stěně. Finální tón vždy ověříme vzorníkem.</p>
      </div>

      <div>
        <div className="group-title">Povrch</div>
        <div className="seg" role="group" aria-label="Povrch stěny">
          {TEXTURES.map((t) => (
            <button key={t.id} aria-pressed={sameTex && first.texture === t.id} onClick={() => paint(t.id === 'gold' ? { texture: t.id, hex: '#cfa84e' } : { texture: t.id })}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="hint">{sameTex ? tex.hint : 'Vybrané plochy mají různý povrch.'}</p>
      </div>

      <div>
        <div className="group-title">Lesk</div>
        <div className="seg" role="group" aria-label="Lesk barvy">
          {FINISHES.map((f) => (
            <button key={f.id} aria-pressed={sameFin && first.finish === f.id} onClick={() => paint({ finish: f.id })}>{f.label}</button>
          ))}
        </div>
        <p className="hint">{sameFin ? fin.hint : 'Vybrané plochy mají různý lesk.'}</p>
      </div>

      <div>
        <div className="group-title">Stávající barva stěn (pro porovnání před/po)</div>
        <div className="colorpick">
          <input type="color" aria-label="Stávající barva" value={design.before.wallN.hex} onChange={(e) => paintBefore(e.target.value)} />
          <span className="hint" style={{ margin: 0 }}>Nastavte podle skutečného stavu místnosti.</span>
        </div>
      </div>
    </>
  )
}

/* ───────── místnost ───────── */
function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="slider">
      <label>{label}<output>{fmt(value, 1)} {unit}</output></label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  )
}

export function RoomTab() {
  const design = useDesigner((s) => s.design)
  const activePreset = useDesigner((s) => s.activePreset)
  const st = useDesigner.getState()
  return (
    <>
      <div>
        <div className="group-title">Typ místnosti</div>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.id} className="chip" aria-pressed={activePreset === p.id} onClick={() => st.loadPreset(p.id)}>{p.label}</button>
          ))}
        </div>
        <p className="hint">Výběr nahradí aktuální návrh. Své varianty si můžete uložit v záložce Rozpis.</p>
      </div>
      <div className="stack">
        <div className="group-title">Rozměry</div>
        <Slider label="Šířka" unit="m" value={design.room.w} min={2.5} max={9} step={0.1} onChange={(w) => st.setRoom({ w })} />
        <Slider label="Hloubka" unit="m" value={design.room.d} min={2.5} max={9} step={0.1} onChange={(d) => st.setRoom({ d })} />
        <Slider label="Výška stropu" unit="m" value={design.room.h} min={2.2} max={3.6} step={0.05} onChange={(h) => st.setRoom({ h })} />
        <p className="hint">Podlahová plocha {fmt(design.room.w * design.room.d)} m².</p>
      </div>
      <div>
        <div className="group-title">Okno na stěně</div>
        <div className="seg">
          {WALL_IDS.map((w) => <button key={w} aria-pressed={design.windowWall === w} onClick={() => st.setWindowWall(w)}>{WALL_LABEL[w]}</button>)}
        </div>
      </div>
      <div>
        <div className="group-title">Dveře na stěně</div>
        <div className="seg">
          {WALL_IDS.map((w) => <button key={w} aria-pressed={design.doorWall === w} onClick={() => st.setDoorWall(w)}>{WALL_LABEL[w]}</button>)}
        </div>
      </div>
      <div>
        <div className="group-title">Podlaha</div>
        <div className="chips">
          {FLOORS.map((f) => (
            <button key={f.id} className="chip" aria-pressed={design.floor === f.id} onClick={() => st.setFloor(f.id)}>
              <i style={{ background: f.swatch }} />{f.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/* ───────── nábytek ───────── */
const ICON: Record<Exclude<FurnitureType, 'custom'>, string> = {
  sofa: 'sofa', armchair: 'armchair', bed: 'bed', table: 'table', desk: 'desk', shelf: 'shelf', wardrobe: 'wardrobe', tv: 'tv', plant: 'plant', lamp: 'lamp', rug: 'rug',
}

export function FurnitureTab() {
  const design = useDesigner((s) => s.design)
  const sel = useDesigner((s) => s.selectedFurniture)
  const st = useDesigner.getState()
  const item = design.furniture.find((f) => f.id === sel)
  return (
    <>
      <div>
        <div className="group-title">Přidat do místnosti</div>
        <div className="furn-grid">
          {(Object.keys(ICON) as (keyof typeof ICON)[]).map((t) => (
            <button key={t} className="furn-btn" onClick={() => st.addFurniture(t)}>
              <Icon name={ICON[t]} size={26} stroke={1.4} />{FURNITURE_LABEL[t]}
            </button>
          ))}
        </div>
        <p className="hint">Kus nábytku chyťte myší (nebo prstem) a přesuňte po podlaze.</p>
      </div>

      <div>
        <div className="group-title">Vlastní místnost</div>
        <button className="upload" onClick={() => st.openWizard(true)}>
          <Icon name="walls" size={22} />
          Postavit místnost podle sebe
          <small>Rozměry, okno, dveře a podlaha – volitelně podle fotky vaší místnosti.</small>
        </button>
      </div>

      {item && (
        <div className="stack">
          <div className="group-title">Vybráno: {item.name ?? FURNITURE_LABEL[item.type]}</div>
          {item.type !== 'custom' && (
            <div className="colorpick">
              <input type="color" aria-label="Barva nábytku" value={item.color} onChange={(e) => st.recolorFurniture(item.id, e.target.value)} />
              <span className="hint" style={{ margin: 0 }}>Barva čalounění / dřeva</span>
            </div>
          )}
          <div className="row">
            <button className="chip" onClick={() => st.rotateFurniture(item.id)}><Icon name="rotate" size={16} />Otočit o 90°</button>
            <button className="chip" onClick={() => st.removeFurniture(item.id)}><Icon name="trash" size={16} />Odebrat</button>
          </div>
        </div>
      )}

      <div>
        <div className="group-title">V místnosti ({design.furniture.length})</div>
        <div className="list">
          {design.furniture.map((f) => (
            <button key={f.id} aria-pressed={sel === f.id} onClick={() => st.selectFurniture(f.id)}>
              <span>{f.name ?? FURNITURE_LABEL[f.type]}</span>
              <span style={{ color: 'var(--ink-3)' }}>{fmt(f.x, 1)} / {fmt(f.z, 1)} m</span>
            </button>
          ))}
          {design.furniture.length === 0 && <p className="hint">Místnost je prázdná. Přidejte nábytek nahoře.</p>}
        </div>
      </div>
    </>
  )
}

/* ───────── světlo ───────── */
export function LightTab() {
  const design = useDesigner((s) => s.design)
  const st = useDesigner.getState()
  return (
    <>
      <div className="stack">
        <div className="group-title">Denní doba</div>
        <div className="slider">
          <label>Čas<output>{clock(design.time)}</output></label>
          <input type="range" min={6} max={21} step={0.25} value={design.time} onChange={(e) => st.setTime(+e.target.value)} />
        </div>
        <div className="chips">
          {[['Ráno', 7.5], ['Poledne', 13], ['Odpoledne', 16.5], ['Soumrak', 19.7]].map(([l, t]) => (
            <button key={l} className="chip" onClick={() => st.setTime(t as number)}>{l}</button>
          ))}
        </div>
        <p className="hint">Slunce svítí oknem a mění odstín stěn. Stejná barva vypadá ráno jinak než večer. Stěna s oknem je jiná než ta protější.</p>
      </div>
      <div>
        <div className="group-title">Umělé světlo</div>
        <button className="chip" aria-pressed={design.lampsOn} onClick={() => st.setLamps(!design.lampsOn)}><Icon name="bulb" size={16} />Světla v místnosti</button>
        <p className="hint">Rozsviťte lustr a lampy a podívejte se, jak barva vypadá večer při žárovce. Nejlépe to ukáže soumrak.</p>
      </div>
    </>
  )
}

/* ───────── rozpis ───────── */
export function SummaryTab() {
  const design = useDesigner((s) => s.design)
  const roomList = useDesigner((s) => s.rooms)
  const activeRoom = useDesigner((s) => s.activeRoom)
  const rooms = useMemo(() => allRooms({ rooms: roomList, activeRoom, design }), [roomList, activeRoom, design])
  const variants = useDesigner((s) => s.variants)
  const st = useDesigner.getState()
  const nav = useNavigate()
  const [copied, setCopied] = useState(false)
  const { lines, totalArea } = estimate(design)
  const litres = lines.reduce((s, l) => s + l.litres, 0)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(design))
      setCopied(true)
      st.say('Odkaz na návrh je zkopírovaný')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      st.say('Odkaz se nepodařilo zkopírovat')
    }
  }

  return (
    <>
      <div>
        <div className="group-title">Co a kolik natřít</div>
        <table className="est">
          <thead><tr><th>Odstín</th><th>Plocha</th><th>Barva</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td><span className="dot" style={{ background: l.hex }} /><b>{l.label}</b><br /><span className="hint" style={{ margin: 0 }}>{l.surfaces.map((s) => SURFACE_LABEL[s].split(' (')[0]).join(', ')} · {l.finish}{l.texture !== 'Hladká' ? ' · ' + l.texture : ''}</span></td>
                <td>{fmt(l.area)} m²</td>
                <td>{fmt(l.litres)} l</td>
              </tr>
            ))}
            <tr><td><b>Celkem</b></td><td><b>{fmt(totalArea)} m²</b></td><td><b>{fmt(litres)} l</b></td></tr>
          </tbody>
        </table>
        <p className="hint">Orientační údaj: odečtena okna a dveře, 2 nátěry, výdatnost 10 m²/l. Přesný rozsah a cenu upřesníme po prohlídce.</p>
        {PRICING.showEstimate && <p className="hint">Orientační cena: {PRICING.pricePerM2Czk.from * Math.round(totalArea)}–{PRICING.pricePerM2Czk.to * Math.round(totalArea)} Kč</p>}
      </div>

      {rooms.length > 1 && (
        <div>
          <div className="group-title">Všechny místnosti</div>
          <table className="est">
            <thead><tr><th>Místnost</th><th>K natření</th><th>Barva</th></tr></thead>
            <tbody>
              {rooms.map((r) => {
                const e = estimate(r.design)
                return <tr key={r.id}><td><b>{r.name}</b><br /><span className="hint" style={{ margin: 0 }}>{fmt(r.design.room.w)} × {fmt(r.design.room.d)} m</span></td><td>{fmt(e.totalArea)} m²</td><td>{fmt(e.lines.reduce((s, l) => s + l.litres, 0))} l</td></tr>
              })}
              <tr><td><b>Celkem</b></td><td><b>{fmt(rooms.reduce((s, r) => s + estimate(r.design).totalArea, 0))} m²</b></td><td><b>{fmt(rooms.reduce((s, r) => s + estimate(r.design).lines.reduce((a, l) => a + l.litres, 0), 0))} l</b></td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div>
        <div className="group-title">Moje varianty</div>
        <div className="variants">
          {[0, 1, 2].map((i) => (
            <div key={i} className="variant">
              <span>{'ABC'[i]}</span>
              <div className="row" style={{ justifyContent: 'center', gap: 3 }}>
                {variants[i] ? ['wallN', 'wallE', 'ceiling'].map((k) => <span key={k} className="dot" style={{ background: variants[i]!.design.surfaces[k as SurfaceId].hex, margin: 0 }} />) : <span className="hint" style={{ margin: 0 }}>prázdné</span>}
              </div>
              <div className="row">
                <button onClick={() => st.saveVariant(i)}>Uložit</button>
                <button disabled={!variants[i]} onClick={() => st.loadVariant(i)}>Načíst</button>
              </div>
            </div>
          ))}
        </div>
        <p className="hint">Uloží se do tohoto prohlížeče. Vlastní .glb modely se do variant neukládají.</p>
      </div>

      <div className="stack">
        <button className="btn" onClick={() => nav('/kontakt?navrh=1')}>Poslat návrh a poptat výmalbu</button>
        <button className="btn ghost" onClick={copy}>{copied ? 'Zkopírováno' : 'Kopírovat odkaz na návrh'}</button>
        <a className="btn ghost" href={`tel:${BUSINESS.phoneTel}`}>Zavolat {BUSINESS.phoneDisplay}</a>
      </div>
    </>
  )
}
