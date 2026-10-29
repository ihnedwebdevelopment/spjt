import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Item } from '../api'
import { ConfirmButton, Empty, ErrorBox, I, ImageField, Loading, PageHead, Sheet, Text, Toggle, useLoad } from '../ui'
import type { Realizace as R } from '../../data/realizace'
import type { Service } from '../../data/services'
import { useItems } from './useItems'

type Data = Omit<R, 'id'>
const EMPTY: Data = { title: '', kind: '', image: '', before: '', focus: '', wide: false, place: '', text: '' }
const FOCUS = [['', 'Střed'], ['50% 25%', 'Horní část'], ['50% 75%', 'Dolní část'], ['25% 50%', 'Vlevo'], ['75% 50%', 'Vpravo']]

export default function Realizace() {
  const items = useItems<Data>('realizace')
  const services = useLoad<Item<Service>[]>('admin/items/services')
  const kinds = useMemo(() => {
    const s = new Set<string>()
    services.data?.forEach((x) => x.data.kinds?.forEach((k) => s.add(k)))
    items.data?.forEach((x) => x.data.kind && s.add(x.data.kind))
    return [...s]
  }, [services.data, items.data])
  const [params, setParams] = useSearchParams()
  const [edit, setEdit] = useState<{ id?: string; data: Data; published: boolean } | null>(null)
  useEffect(() => {
    if (params.get('nova')) { setEdit({ data: { ...EMPTY }, published: true }); setParams({}, { replace: true }) }
  }, [params, setParams])

  return (
    <div className="adm-page">
      <PageHead title="Realizace" back="/admin/obsah" sub="Galerie „Před a po“ na úvodní stránce a u služeb">
        <button className="adm-btn" onClick={() => setEdit({ data: { ...EMPTY }, published: true })}><I n="plus" s={18} />Přidat</button>
      </PageHead>
      {items.loading && !items.data && <Loading />}
      {items.error && <ErrorBox error={items.error} retry={items.reload} />}
      {items.data && !items.data.length && <Empty icon="photo" title="Zatím žádné realizace"><button className="adm-btn" onClick={() => setEdit({ data: { ...EMPTY }, published: true })}>Přidat první</button></Empty>}
      <ul className="adm-gallery">
        {items.data?.map((x, i) => (
          <li key={x.id} className={x.published ? '' : 'hidden'}>
            <button className="adm-gallery-img" onClick={() => setEdit({ id: x.id, data: { ...EMPTY, ...x.data }, published: x.published })}>
              {x.data.image ? <img src={x.data.image} alt="" loading="lazy" style={{ objectPosition: x.data.focus || undefined }} /> : <span className="adm-image-ph"><I n="photo" /></span>}
              {x.data.before && <span className="adm-tag">před / po</span>}
              {!x.published && <span className="adm-tag muted">skryto</span>}
            </button>
            <div className="adm-gallery-meta">
              <span><b>{x.data.title || 'Bez názvu'}</b><small>{x.data.kind}</small></span>
              <span className="adm-order">
                <button className="adm-icon-btn" aria-label="Posunout dopředu" disabled={i === 0} onClick={() => items.move(x.id, -1)}><I n="up" s={18} /></button>
                <button className="adm-icon-btn" aria-label="Posunout dozadu" disabled={i === items.data!.length - 1} onClick={() => items.move(x.id, 1)}><I n="down" s={18} /></button>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {edit && (
        <Editor
          value={edit} kinds={kinds}
          onClose={() => setEdit(null)}
          onSave={async (v) => { if (await items.save(v)) setEdit(null) }}
          onDelete={edit.id ? async () => { if (await items.remove(edit.id!)) setEdit(null) } : undefined}
        />
      )}
    </div>
  )
}

function Editor({ value, kinds, onClose, onSave, onDelete }: {
  value: { id?: string; data: Data; published: boolean }; kinds: string[]
  onClose: () => void; onSave: (v: { id?: string; data: Data; published: boolean }) => Promise<void>; onDelete?: () => Promise<void>
}) {
  const [d, setD] = useState<Data>(value.data)
  const [published, setPublished] = useState(value.published)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Data>(k: K, v: Data[K]) => setD((x) => ({ ...x, [k]: v }))
  const valid = !!d.image && !!d.title.trim()
  return (
    <Sheet open onClose={onClose} title={value.id ? 'Upravit realizaci' : 'Nová realizace'}
      footer={<>
        {onDelete && <ConfirmButton onConfirm={onDelete}><I n="trash" s={18} />Smazat</ConfirmButton>}
        <button className="adm-btn grow" disabled={!valid || busy} onClick={async () => { setBusy(true); await onSave({ id: value.id, data: d, published }); setBusy(false) }}>
          {busy ? 'Ukládám…' : value.id ? 'Uložit' : 'Přidat na web'}
        </button>
      </>}>
      <ImageField label="Fotka (hotová práce)" value={d.image} onChange={(u) => set('image', u)} name={d.title || 'realizace'} hint="Fotka se před nahráním sama zmenší, stačí fotit telefonem." />
      <ImageField label="Fotka „před“ (nepovinné)" value={d.before ?? ''} onChange={(u) => set('before', u)} name={(d.title || 'realizace') + '-pred'} hint="Když přidáte i stav před, na webu se objeví posuvník před / po." />
      <Text label="Název" value={d.title} onChange={(v) => set('title', v)} placeholder="Např. Výmalba obývacího pokoje" max={120} />
      <div className="adm-field">
        <label className="adm-label" htmlFor="r-kind">Druh práce</label>
        <input id="r-kind" list="r-kinds" value={d.kind} onChange={(e) => set('kind', e.target.value)} placeholder="Vyberte nebo napište" />
        <datalist id="r-kinds">{kinds.map((k) => <option key={k} value={k} />)}</datalist>
        <p className="adm-hint">Podle druhu se realizace zobrazí i na stránce odpovídající služby.</p>
      </div>
      <Text label="Místo (nepovinné)" value={d.place ?? ''} onChange={(v) => set('place', v)} placeholder="Např. Jihlava – Bedřichov" max={80} />
      <div className="adm-field">
        <span className="adm-label">Výřez fotky v náhledu</span>
        <div className="adm-chips wrap">
          {FOCUS.map(([v, l]) => <button key={l} type="button" aria-pressed={(d.focus ?? '') === v} onClick={() => set('focus', v)}>{l}</button>)}
        </div>
      </div>
      <Toggle label="Široká karta" hint="Zabere v galerii dva sloupce – hodí se na fotky na šířku a před / po." checked={!!d.wide} onChange={(v) => set('wide', v)} />
      <Toggle label="Zobrazit na webu" checked={published} onChange={setPublished} />
    </Sheet>
  )
}
