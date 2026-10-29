import { useState } from 'react'
import type { Service } from '../../data/services'
import { ConfirmButton, Empty, ErrorBox, I, ImageField, ListEditor, Loading, PageHead, Sheet, Text, Toggle } from '../ui'
import { SerpPreview } from './Seo'
import { useItems } from './useItems'

type Data = Omit<Service, 'id'>
const EMPTY: Data = { slug: '', title: '', text: '', short: '', description: '', details: [], image: '', kinds: [], seoTitle: '', seoDescription: '' }

export default function Services() {
  const items = useItems<Data>('services')
  const [edit, setEdit] = useState<{ id?: string; data: Data; published: boolean } | null>(null)
  return (
    <div className="adm-page">
      <PageHead title="Služby" back="/admin/obsah" sub="Každá služba má na webu vlastní stránku">
        <button className="adm-btn" onClick={() => setEdit({ data: { ...EMPTY }, published: true })}><I n="plus" s={18} />Přidat</button>
      </PageHead>
      {items.loading && !items.data && <Loading />}
      {items.error && <ErrorBox error={items.error} retry={items.reload} />}
      {items.data && !items.data.length && <Empty icon="wrench" title="Žádné služby" />}
      <ul className="adm-rows card">
        {items.data?.map((x, i) => (
          <li key={x.id} className="adm-row">
            {x.data.image ? <img className="adm-thumb" src={x.data.image} alt="" /> : <span className="adm-thumb" />}
            <button className="adm-row-main as-btn" onClick={() => setEdit({ id: x.id, data: { ...EMPTY, ...x.data }, published: x.published })}>
              <b>{x.data.title}{!x.published && <span className="adm-tag muted inline">skryto</span>}</b>
              <small>/{x.data.slug}</small>
            </button>
            <span className="adm-order">
              <button className="adm-icon-btn" aria-label="Výš" disabled={i === 0} onClick={() => items.move(x.id, -1)}><I n="up" s={18} /></button>
              <button className="adm-icon-btn" aria-label="Níž" disabled={i === items.data!.length - 1} onClick={() => items.move(x.id, 1)}><I n="down" s={18} /></button>
            </span>
          </li>
        ))}
      </ul>
      {edit && <Editor value={edit} onClose={() => setEdit(null)}
        onSave={async (v) => { if (await items.save(v)) setEdit(null) }}
        onDelete={edit.id ? async () => { if (await items.remove(edit.id!)) setEdit(null) } : undefined} />}
    </div>
  )
}

function Editor({ value, onClose, onSave, onDelete }: {
  value: { id?: string; data: Data; published: boolean }; onClose: () => void
  onSave: (v: { id?: string; data: Data; published: boolean }) => Promise<void>; onDelete?: () => Promise<void>
}) {
  const [d, setD] = useState<Data>(value.data)
  const [published, setPublished] = useState(value.published)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Data>(k: K, v: Data[K]) => setD((x) => ({ ...x, [k]: v }))
  const slugChanged = !!value.id && value.data.slug !== d.slug
  return (
    <Sheet open onClose={onClose} title={value.id ? d.title || 'Služba' : 'Nová služba'} wide
      footer={<>
        {onDelete && <ConfirmButton onConfirm={onDelete}><I n="trash" s={18} />Smazat</ConfirmButton>}
        <button className="adm-btn grow" disabled={!d.title.trim() || !d.slug.trim() || busy} onClick={async () => { setBusy(true); await onSave({ id: value.id, data: d, published }); setBusy(false) }}>{busy ? 'Ukládám…' : 'Uložit'}</button>
      </>}>
      <Text label="Název služby" value={d.title} onChange={(v) => set('title', v)} max={120} />
      <Text label="Adresa stránky" value={d.slug} onChange={(v) => set('slug', v)} placeholder="napr. malovani-bytu-jihlava"
        hint={slugChanged ? <b className="warn">Pozor: změna adresy může zhoršit pozice ve vyhledávání. Starou adresu pak přesměrujte.</b> : 'Jen malá písmena bez diakritiky a pomlčky.'} />
      <ImageField label="Hlavní fotka" value={d.image} onChange={(u) => set('image', u)} name={d.slug} />
      <Text label="Krátký slogan" value={d.short} onChange={(v) => set('short', v)} max={120} hint="Zobrazí se v „Dalších službách“." />
      <Text label="Text v přehledu služeb" value={d.text} onChange={(v) => set('text', v)} multiline rows={3} max={400} />
      <Text label="Úvodní text na stránce služby" value={d.description} onChange={(v) => set('description', v)} multiline rows={5} max={1500} />
      <ListEditor label="Co služba zahrnuje (odrážky)" items={d.details} onChange={(v) => set('details', v)} placeholder="Přidat bod" />
      <ListEditor label="Druhy realizací ke službě" items={d.kinds} onChange={(v) => set('kinds', v)} placeholder="Přidat druh" />
      <h3 className="adm-h3">Vyhledávače</h3>
      <Text label="Titulek pro Google" value={d.seoTitle} onChange={(v) => set('seoTitle', v)} max={60} />
      <Text label="Popis pro Google" value={d.seoDescription} onChange={(v) => set('seoDescription', v)} multiline rows={3} max={160} />
      <SerpPreview title={d.seoTitle || d.title} description={d.seoDescription || d.description} path={'/' + d.slug} />
      <Toggle label="Zobrazit na webu" checked={published} onChange={setPublished} />
    </Sheet>
  )
}
