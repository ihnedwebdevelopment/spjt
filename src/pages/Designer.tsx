import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDesigner } from '../store/designer'
import { SURFACE_LABEL, estimate, skyGradient } from '../lib/geometry'
import { downloadDesignImage } from '../lib/capture'
import { shareUrl } from '../lib/urlState'
import { webglSupported } from '../lib/webgl'
import { ColorTab, FurnitureTab, LightTab, RoomTab, SummaryTab, TABS, type Tab } from '../designer/Panels'
import RoomWizard from '../designer/RoomWizard'
import { BUSINESS } from '../config'
import Icon from '../components/Icon'
import { usePageMeta } from '../lib/seo'

const DesignerScene = lazy(() => import('../designer/DesignerScene'))
const PhotoMode = lazy(() => import('../photo/PhotoMode'))

type Mode = '3d' | 'foto'

function RoomsBar() {
  const rooms = useDesigner((s) => s.rooms)
  const active = useDesigner((s) => s.activeRoom)
  const { switchRoom, deleteRoom, openWizard } = useDesigner.getState()
  return (
    <div className="rooms-bar" role="tablist" aria-label="Místnosti">
      {rooms.map((r) => (
        <span key={r.id} className={'room-chip' + (r.id === active ? ' on' : '')}>
          <button role="tab" aria-selected={r.id === active} onClick={() => switchRoom(r.id)}>{r.name}</button>
          <button className="room-x" aria-label={`Smazat místnost ${r.name}`} title="Smazat místnost" onClick={() => deleteRoom(r.id)}>✕</button>
        </span>
      ))}
      <button className="room-add" onClick={() => openWizard(true)}>+ Místnost</button>
    </div>
  )
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="mode-switch" role="tablist" aria-label="Režim vizualizátoru">
      <button role="tab" aria-selected={mode === 'foto'} onClick={() => onChange('foto')}>
        <Icon name="camera" size={18} /><span>Vaše fotka<small>Přebarvit vlastní pokoj</small></span>
      </button>
      <button role="tab" aria-selected={mode === '3d'} onClick={() => onChange('3d')}>
        <Icon name="cube" size={18} /><span>3D místnost<small>Návrh od nuly</small></span>
      </button>
    </div>
  )
}

export default function Designer() {
  usePageMeta('Vyzkoušejte barvy na fotce i ve 3D | Malířství Špejtek', 'Vyfoťte svůj pokoj a přebarvěte stěny, nebo si postavte místnost ve 3D. Spočítá plochu i spotřebu barvy. Návrh pošlete s poptávkou.', '/vizualizator')
  const [params, setParams] = useSearchParams()
  const mode: Mode = params.get('rezim') === 'foto' ? 'foto' : '3d'
  const setMode = (m: Mode) => {
    const next = new URLSearchParams(params)
    if (m === 'foto') next.set('rezim', 'foto')
    else next.delete('rezim')
    setParams(next, { replace: true })
  }
  const [tab, setTab] = useState<Tab>('barvy')
  const capture = useRef<(() => Promise<string>) | null>(null)
  const register = useCallback((fn: (() => Promise<string>) | null) => { capture.current = fn }, [])
  const stageRef = useRef<HTMLDivElement>(null)

  const time = useDesigner((s) => s.design.time)
  const view = useDesigner((s) => s.view)
  const compare = useDesigner((s) => s.compare)
  const split = useDesigner((s) => s.split)
  const toast = useDesigner((s) => s.toast)
  const selectedFurniture = useDesigner((s) => s.selectedFurniture)
  const st = useDesigner.getState()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return
      const s = useDesigner.getState()
      if (!s.selectedFurniture) return
      if (e.key === 'Delete' || e.key === 'Backspace') s.removeFurniture(s.selectedFurniture)
      if (e.key.toLowerCase() === 'r') s.rotateFurniture(s.selectedFurniture)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const shot = async () => {
    const url = await capture.current?.()
    if (!url) return
    const { lines } = estimate(useDesigner.getState().design)
    await downloadDesignImage(url, lines.map((l) => ({
      label: l.label, hex: l.hex, area: l.area,
      detail: [l.surfaces.map((x) => SURFACE_LABEL[x].split(' (')[0]).join(', '), l.finish.toLowerCase(), l.texture !== 'Hladká' ? l.texture.toLowerCase() : ''].filter(Boolean).join(' · '),
    })))
    st.say('Snímek je stažený')
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(useDesigner.getState().design))
      st.say('Odkaz na návrh je zkopírovaný')
    } catch {
      st.say('Odkaz se nepodařilo zkopírovat')
    }
  }

  const startSplit = (e: React.PointerEvent) => {
    const el = stageRef.current
    if (!el) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect()
      st.setSplit((ev.clientX - r.left) / r.width)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const hasGL = webglSupported()
  const switcher = <ModeSwitch mode={mode} onChange={setMode} />

  if (mode === 'foto') {
    return (
      <main className="designer">
        <Suspense fallback={<div className="nowebgl">Načítám…</div>}>
          <PhotoMode modeSwitch={switcher} />
        </Suspense>
      </main>
    )
  }

  return (
    <main className="designer">
      <aside className="dpanel" aria-label="Nastavení vizualizátoru">
        {switcher}
        <RoomsBar />
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="tabbody" role="tabpanel">
          {tab === 'barvy' && <ColorTab />}
          {tab === 'mistnost' && <RoomTab />}
          {tab === 'nabytek' && <FurnitureTab />}
          {tab === 'svetlo' && <LightTab />}
          {tab === 'rozpis' && <SummaryTab />}
        </div>
      </aside>

      <section
        ref={stageRef}
        className="stage"
        style={{ background: skyGradient(time) }}
      >
        {hasGL ? (
          <Suspense fallback={<div className="nowebgl">Načítám 3D scénu…</div>}>
            <DesignerScene register={register} />
          </Suspense>
        ) : (
          <div className="nowebgl">
            <h2 style={{ fontSize: '2rem' }}>3D se v tomto prohlížeči nespustilo</h2>
            <p>Zkuste prosím jiný prohlížeč nebo zapněte hardwarovou akceleraci. Návrh barev vám rádi připravíme i po telefonu: {BUSINESS.phoneDisplay}.</p>
          </div>
        )}

        <div className="stage-top">
          <div className="floating" role="group" aria-label="Pohled">
            <button aria-pressed={view === 'model'} onClick={() => st.setView('model')}>Model</button>
            <button aria-pressed={view === 'inside'} onClick={() => st.setView('inside')}>Z místnosti</button>
            <button aria-pressed={view === 'top'} onClick={() => st.setView('top')}>Shora</button>
          </div>
          <div className="floating">
            <button aria-pressed={compare} onClick={() => st.setCompare(!compare)}><Icon name="compare" size={17} /><span>Před / po</span></button>
            <button onClick={shot} title="Stáhnout obrázek"><Icon name="download" size={17} /><span>Obrázek</span></button>
            <button onClick={share} title="Zkopírovat odkaz"><Icon name="link" size={17} /><span>Odkaz</span></button>
          </div>
        </div>

        {compare && (
          <>
            <span className="compare-label" style={{ left: 14 }}>PŘED</span>
            <span className="compare-label" style={{ right: 14 }}>PO</span>
            <div className="compare-bar" style={{ left: `${split * 100}%` }}>
              <button aria-label="Posunout dělicí linku" onPointerDown={startSplit}><Icon name="compare" size={20} /></button>
            </div>
          </>
        )}

        <div className="stage-bottom">
          {selectedFurniture ? (
            <div className="floating">
              <button onClick={() => st.rotateFurniture(selectedFurniture)}><Icon name="rotate" size={17} />Otočit</button>
              <button onClick={() => st.removeFurniture(selectedFurniture)}><Icon name="trash" size={17} />Odebrat</button>
              <button onClick={() => st.selectFurniture(null)}>Hotovo</button>
            </div>
          ) : (
            <div className="tip">Klikněte na stěnu a vyberte barvu. Točte myší, kolečkem přibližujte, nábytek přetahujte.</div>
          )}
        </div>

        {toast && <div className="toast" role="status">{toast}</div>}
      </section>
      <RoomWizard />
    </main>
  )
}
