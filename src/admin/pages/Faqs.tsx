import { useState } from 'react'
import { ConfirmButton, Empty, ErrorBox, I, Loading, PageHead, Sheet, Text, Toggle } from '../ui'
import { useItems } from './useItems'

type Data = { q: string; a: string }

export default function Faqs() {
  const items = useItems<Data>('faqs')
  const [edit, setEdit] = useState<{ id?: string; data: Data; published: boolean } | null>(null)
  return (
    <div className="adm-page">
      <PageHead title="Časté dotazy" back="/admin/obsah" sub="Zobrazují se na úvodní stránce a u služeb, Google je umí ukázat přímo ve výsledcích">
        <button className="adm-btn" onClick={() => setEdit({ data: { q: '', a: '' }, published: true })}><I n="plus" s={18} />Přidat</button>
      </PageHead>
      {items.loading && !items.data && <Loading />}
      {items.error && <ErrorBox error={items.error} retry={items.reload} />}
      {items.data && !items.data.length && <Empty icon="help" title="Žádné dotazy" />}
      <ul className="adm-rows card">
        {items.data?.map((x, i) => (
          <li key={x.id} className="adm-row">
            <button className="adm-row-main as-btn" onClick={() => setEdit({ id: x.id, data: x.data, published: x.published })}>
              <b>{x.data.q}{!x.published && <span className="adm-tag muted inline">skryto</span>}</b>
              <small>{x.data.a.slice(0, 120)}</small>
            </button>
            <span className="adm-order">
              <button className="adm-icon-btn" aria-label="Výš" disabled={i === 0} onClick={() => items.move(x.id, -1)}><I n="up" s={18} /></button>
              <button className="adm-icon-btn" aria-label="Níž" disabled={i === items.data!.length - 1} onClick={() => items.move(x.id, 1)}><I n="down" s={18} /></button>
            </span>
          </li>
        ))}
      </ul>
      {edit && <Edit value={edit} onClose={() => setEdit(null)}
        onSave={async (v) => { if (await items.save(v)) setEdit(null) }}
        onDelete={edit.id ? async () => { if (await items.remove(edit.id!)) setEdit(null) } : undefined} />}
    </div>
  )
}

function Edit({ value, onClose, onSave, onDelete }: { value: { id?: string; data: Data; published: boolean }; onClose: () => void; onSave: (v: { id?: string; data: Data; published: boolean }) => Promise<void>; onDelete?: () => Promise<void> }) {
  const [d, setD] = useState(value.data)
  const [published, setPublished] = useState(value.published)
  const [busy, setBusy] = useState(false)
  return (
    <Sheet open onClose={onClose} title={value.id ? 'Upravit dotaz' : 'Nový dotaz'}
      footer={<>
        {onDelete && <ConfirmButton onConfirm={onDelete}><I n="trash" s={18} />Smazat</ConfirmButton>}
        <button className="adm-btn grow" disabled={!d.q.trim() || !d.a.trim() || busy} onClick={async () => { setBusy(true); await onSave({ id: value.id, data: d, published }); setBusy(false) }}>{busy ? 'Ukládám…' : 'Uložit'}</button>
      </>}>
      <Text label="Otázka" value={d.q} onChange={(q) => setD({ ...d, q })} max={300} />
      <Text label="Odpověď" value={d.a} onChange={(a) => setD({ ...d, a })} multiline rows={6} max={2000} />
      <Toggle label="Zobrazit na webu" checked={published} onChange={setPublished} />
    </Sheet>
  )
}
