import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type PostRow } from '../api'
import { ConfirmButton, ErrorBox, I, ImageField, Loading, PageHead, Text, Toggle, toast, toastError, uploadImage } from '../ui'
import { markdownToHtml } from '../../lib/markdown'
import { SerpPreview } from './Seo'

interface Draft {
  title: string; slug: string; excerpt: string; body: string; cover: string; published: boolean
  publishedAt: string; seoTitle: string; seoDescription: string
}
const EMPTY: Draft = { title: '', slug: '', excerpt: '', body: '', cover: '', published: false, publishedAt: '', seoTitle: '', seoDescription: '' }
const DRAFT_KEY = 'adm-post-draft'

const toLocal = (unix: number | null) => {
  if (!unix) return ''
  const d = new Date(unix * 1000)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

export default function PostEditor() {
  const { id = 'novy' } = useParams()
  const isNew = id === 'novy'
  const nav = useNavigate()
  const [d, setD] = useState<Draft | null>(isNew ? null : null)
  const [orig, setOrig] = useState<string>('')
  const [err, setErr] = useState<Error | null>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [busy, setBusy] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isNew) {
      let draft = EMPTY
      try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) draft = { ...EMPTY, ...JSON.parse(raw) } } catch { /* nic */ }
      setD(draft); setOrig(JSON.stringify(EMPTY))
      return
    }
    api<PostRow>(`admin/posts/${id}`).then((p) => {
      const v: Draft = {
        title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body ?? '', cover: p.cover ?? '', published: !!p.published,
        publishedAt: toLocal(p.published_at), seoTitle: p.seo_title ?? '', seoDescription: p.seo_description ?? '',
      }
      setD(v); setOrig(JSON.stringify(v))
    }).catch(setErr)
  }, [id, isNew])

  // rozepsaný nový článek se průběžně ukládá v telefonu, aby se neztratil
  useEffect(() => { if (isNew && d) try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* nic */ } }, [d, isNew])
  const dirty = !!d && JSON.stringify(d) !== orig
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const html = useMemo(() => (d ? markdownToHtml(d.body) : ''), [d])
  if (err) return <div className="adm-page"><PageHead title="Článek" back="/admin/aktuality" /><ErrorBox error={err} /></div>
  if (!d) return <Loading />
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => (x ? { ...x, [k]: v } : x))

  const insert = (before: string, after = '', placeholder = '') => {
    const el = bodyRef.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b, value } = el
    const sel = value.slice(a, b) || placeholder
    const next = value.slice(0, a) + before + sel + after + value.slice(b)
    set('body', next)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + before.length, a + before.length + sel.length) })
  }
  const insertImage = async (f?: File) => {
    if (!f) return
    try {
      toast('Nahrávám fotku…')
      const url = await uploadImage(f, d.slug || 'clanek')
      insert(`\n\n![${d.title || 'Fotka'}](${url})\n\n`)
    } catch (e) { toastError(e) }
  }

  const save = async (publish?: boolean) => {
    setBusy(true)
    const v = { ...d, published: publish ?? d.published }
    const body = { ...v, slug: v.slug || slugify(v.title), publishedAt: v.publishedAt ? Math.floor(new Date(v.publishedAt).getTime() / 1000) : null }
    try {
      if (isNew) {
        const r = await api<{ id: number }>('admin/posts', { body })
        localStorage.removeItem(DRAFT_KEY)
        toast(v.published ? 'Článek je na webu' : 'Koncept uložen')
        setOrig(JSON.stringify(v))
        nav(`/admin/aktuality/${r.id}`, { replace: true })
      } else {
        const r = await api<{ slug: string }>(`admin/posts/${id}`, { method: 'PUT', body })
        const nv = { ...v, slug: r.slug }
        setD(nv); setOrig(JSON.stringify(nv))
        toast(publish === true ? 'Článek je na webu' : publish === false ? 'Článek stažen z webu' : 'Uloženo')
      }
    } catch (e) { toastError(e) } finally { setBusy(false) }
  }

  return (
    <div className="adm-page adm-editor">
      <PageHead title={isNew ? 'Nový článek' : 'Upravit článek'} back="/admin/aktuality">
        {!isNew && d.published && <a className="adm-icon-btn" href={'/aktuality/' + d.slug} target="_blank" rel="noopener" aria-label="Zobrazit na webu"><I n="external" /></a>}
      </PageHead>

      <Text label="Nadpis" value={d.title} max={160} placeholder="Např. Jak se připravit na malování bytu"
        onChange={(v) => setD((x) => x && ({ ...x, title: v, slug: slugTouched ? x.slug : slugify(v) }))} />
      <Text label="Perex (krátké shrnutí)" value={d.excerpt} onChange={(v) => set('excerpt', v)} multiline rows={2} max={300} hint="Zobrazí se v seznamu článků a použije se jako popis pro Google." />
      <ImageField label="Úvodní fotka" value={d.cover} onChange={(u) => set('cover', u)} name={d.slug || 'clanek'} />

      <div className="adm-field">
        <div className="adm-seg" role="tablist">
          <button role="tab" aria-pressed={tab === 'write'} onClick={() => setTab('write')}>Psát</button>
          <button role="tab" aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>Náhled</button>
        </div>
        {tab === 'write' ? (
          <>
            <div className="adm-md-bar" role="toolbar" aria-label="Formátování">
              <button type="button" onClick={() => insert('\n## ', '\n', 'Mezititulek')}>Nadpis</button>
              <button type="button" onClick={() => insert('**', '**', 'tučně')}><b>B</b></button>
              <button type="button" onClick={() => insert('*', '*', 'kurzíva')}><i>I</i></button>
              <button type="button" onClick={() => insert('\n- ', '', 'bod seznamu')}>• Seznam</button>
              <button type="button" onClick={() => insert('[', '](https://)', 'text odkazu')}>Odkaz</button>
              <label className="adm-md-img"><input type="file" accept="image/*" hidden onChange={(e) => { insertImage(e.target.files?.[0]); e.target.value = '' }} /><I n="camera" s={18} />Fotka</label>
            </div>
            <textarea ref={bodyRef} className="adm-md" rows={16} value={d.body} onChange={(e) => set('body', e.target.value)}
              placeholder={'Pište normálně. Prázdný řádek = nový odstavec.\n\n## Mezititulek\n- bod seznamu\n**tučně**, *kurzíva*'} />
          </>
        ) : (
          <div className="adm-preview prose" dangerouslySetInnerHTML={{ __html: html || '<p><em>Zatím prázdné.</em></p>' }} />
        )}
      </div>

      <details className="adm-card adm-details">
        <summary>Adresa, plánování a vyhledávače</summary>
        <Text label="Adresa článku" value={d.slug} onChange={(v) => { setSlugTouched(true); set('slug', slugify(v)) }} hint={'malirstvi-spejtek.net/aktuality/' + (d.slug || '…')} />
        <Text label="Datum zveřejnění" type="datetime-local" value={d.publishedAt} onChange={(v) => set('publishedAt', v)} hint="Nechte prázdné = hned. Budoucí datum článek naplánuje." />
        <Text label="Titulek pro Google (nepovinné)" value={d.seoTitle} onChange={(v) => set('seoTitle', v)} max={60} />
        <Text label="Popis pro Google (nepovinné)" value={d.seoDescription} onChange={(v) => set('seoDescription', v)} multiline rows={3} max={160} />
        <SerpPreview title={d.seoTitle || `${d.title} | Malířství Špejtek`} description={d.seoDescription || d.excerpt} path={'/aktuality/' + d.slug} />
      </details>

      <Toggle label="Zveřejněno na webu" checked={d.published} onChange={(v) => set('published', v)} />

      <div className="adm-savebar">
        {!isNew && <ConfirmButton onConfirm={async () => { try { await api(`admin/posts/${id}`, { method: 'DELETE' }); toast('Článek smazán'); nav('/admin/aktuality') } catch (e) { toastError(e) } }}><I n="trash" s={18} /></ConfirmButton>}
        {!d.published && <button className="adm-btn ghost" disabled={busy || !d.title.trim()} onClick={() => save()}>Uložit koncept</button>}
        <button className="adm-btn grow" disabled={busy || !d.title.trim()} onClick={() => save(d.published ? undefined : true)}>
          {busy ? 'Ukládám…' : d.published ? (dirty ? 'Uložit změny' : 'Uloženo') : 'Zveřejnit'}
        </button>
      </div>
    </div>
  )
}
