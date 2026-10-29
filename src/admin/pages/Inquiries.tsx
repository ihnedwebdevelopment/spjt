import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type Inquiry, type InquiryStatus, STATUS, fmtAgo, fmtDate } from '../api'
import { ConfirmButton, Empty, ErrorBox, I, Loading, PageHead, Sheet, toast, toastError, useLoad } from '../ui'

const FILTERS: { key: string; label: string; match: (s: InquiryStatus) => boolean }[] = [
  { key: 'open', label: 'Rozpracované', match: (s) => s === 'new' || s === 'contacted' || s === 'offer' },
  { key: 'new', label: 'Nové', match: (s) => s === 'new' },
  { key: 'won', label: 'Zakázky', match: (s) => s === 'won' },
  { key: 'all', label: 'Vše', match: (s) => s !== 'archived' },
  { key: 'archived', label: 'Archiv', match: (s) => s === 'archived' },
]

export default function Inquiries() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, error, loading, reload, setData } = useLoad<Inquiry[]>('admin/inquiries')
  const [filter, setFilter] = useState('open')
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!
    const needle = q.trim().toLowerCase()
    return (data ?? []).filter((x) => f.match(x.status) && (!needle || [x.name, x.phone, x.email, x.message].join(' ').toLowerCase().includes(needle)))
  }, [data, filter, q])
  const current = data?.find((x) => String(x.id) === id) ?? null
  const update = (x: Inquiry) => setData((d) => d?.map((y) => (y.id === x.id ? x : y)) ?? null)

  return (
    <div className="adm-page">
      <PageHead title="Poptávky" sub={data ? `${data.filter((x) => x.status === 'new').length} nových` : undefined}>
        <button className="adm-icon-btn" aria-label="Obnovit" onClick={reload}><I n="refresh" /></button>
      </PageHead>
      <div className="adm-toolbar">
        <div className="adm-chips" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}<span>{(data ?? []).filter((x) => f.match(x.status)).length}</span>
            </button>
          ))}
        </div>
        <label className="adm-search"><I n="search" s={18} /><input type="search" placeholder="Hledat jméno, telefon, text…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} retry={reload} />}
      {data && !list.length && <Empty icon="inbox" title={data.length ? 'Nic neodpovídá filtru' : 'Zatím žádné poptávky'}>Poptávky z formuláře na webu se ukládají sem a přijde vám o nich e-mail.</Empty>}
      <ul className="adm-rows card">
        {list.map((x) => (
          <li key={x.id}>
            <Link to={`/admin/poptavky/${x.id}`} className="adm-row">
              <span className={'adm-dot ' + x.status} aria-hidden />
              <span className="adm-row-main">
                <b>{x.name || x.phone || x.email || 'Bez jména'}</b>
                <small>{x.message.slice(0, 110) || (x.design ? 'Návrh z vizualizátoru' : '')}</small>
              </span>
              <span className="adm-row-side">
                <small>{fmtAgo(x.createdAt)}</small>
                <small className={'adm-pill ' + x.status}>{STATUS[x.status]}</small>
                {x.photos.length > 0 && <small><I n="photo" s={14} /> {x.photos.length}</small>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {id && data && (current
        ? <Detail key={current.id} inq={current} onClose={() => nav('/admin/poptavky')} onChange={update}
            onDelete={() => { setData((d) => d?.filter((y) => y.id !== current.id) ?? null); nav('/admin/poptavky') }} />
        : <Sheet open title="Poptávka" onClose={() => nav('/admin/poptavky')}><p>Poptávka nenalezena.</p></Sheet>)}
    </div>
  )
}

function Detail({ inq, onClose, onChange, onDelete }: { inq: Inquiry; onClose: () => void; onChange: (x: Inquiry) => void; onDelete: () => void }) {
  const [note, setNote] = useState(inq.note)
  const [zoom, setZoom] = useState<string | null>(null)
  const patch = async (body: Partial<Pick<Inquiry, 'status' | 'note'>>) => {
    try { await api(`admin/inquiries/${inq.id}`, { method: 'PATCH', body }); onChange({ ...inq, ...body }); toast('Uloženo') } catch (e) { toastError(e) }
  }
  // otevřením se nová poptávka nepřepne – stav mění majitel vědomě; jen zvýrazníme volbu
  useEffect(() => { setNote(inq.note) }, [inq.note])
  const photoUrl = (k: string) => '/api/admin/inquiry-photo?key=' + encodeURIComponent(k)
  const tel = inq.phone.replace(/[^\d+]/g, '')
  const greeting = `Dobrý den${inq.name ? ', ' + inq.name.split(' ')[0] : ''}, děkuji za poptávku. `

  return (
    <Sheet open title={inq.name || 'Poptávka'} onClose={onClose}
      footer={<ConfirmButton onConfirm={async () => { try { await api(`admin/inquiries/${inq.id}`, { method: 'DELETE' }); toast('Poptávka smazána'); onDelete() } catch (e) { toastError(e) } }}><I n="trash" s={18} />Smazat</ConfirmButton>}>
      <p className="adm-hint">Přijato {fmtDate(inq.createdAt)} ({fmtAgo(inq.createdAt)}){inq.page && <> ze stránky <code>{inq.page}</code></>}</p>
      <div className="adm-contact-actions">
        {tel && <a className="adm-btn" href={`tel:${tel}`}><I n="phone" s={18} />Zavolat</a>}
        {tel && <a className="adm-btn ghost" href={`sms:${tel}?&body=${encodeURIComponent(greeting)}`}><I n="sms" s={18} />SMS</a>}
        {inq.email && <a className="adm-btn ghost" href={`mailto:${inq.email}?subject=${encodeURIComponent('Malířství Špejtek – vaše poptávka')}&body=${encodeURIComponent(greeting)}`}><I n="mail" s={18} />E-mail</a>}
      </div>
      <dl className="adm-dl">
        {inq.phone && <div><dt>Telefon</dt><dd>{inq.phone}</dd></div>}
        {inq.email && <div><dt>E-mail</dt><dd>{inq.email}</dd></div>}
      </dl>
      {inq.message && <><h3 className="adm-h3">Zpráva</h3><p className="adm-msg">{inq.message}</p></>}
      {inq.design && <><h3 className="adm-h3">Návrh z vizualizátoru</h3><p className="adm-msg small">{inq.design}</p></>}
      {inq.photos.length > 0 && (
        <>
          <h3 className="adm-h3">Fotky ({inq.photos.length})</h3>
          <ul className="adm-photos">
            {inq.photos.map((k) => <li key={k}><button type="button" onClick={() => setZoom(photoUrl(k))}><img src={photoUrl(k)} alt="" loading="lazy" /></button></li>)}
          </ul>
        </>
      )}
      <h3 className="adm-h3">Stav</h3>
      <div className="adm-chips wrap">
        {(Object.keys(STATUS) as InquiryStatus[]).map((s) => (
          <button key={s} aria-pressed={inq.status === s} className={'st-' + s} onClick={() => patch({ status: s })}>{STATUS[s]}</button>
        ))}
      </div>
      <div className="adm-field">
        <label className="adm-label" htmlFor="inq-note">Poznámka pro mě</label>
        <textarea id="inq-note" rows={3} value={note} placeholder="Např. prohlídka v úterý 16:00, cena 18 000 Kč…" onChange={(e) => setNote(e.target.value)} onBlur={() => note !== inq.note && patch({ note })} />
      </div>
      {zoom && <div className="adm-zoom" onClick={() => setZoom(null)} role="dialog" aria-label="Fotka"><img src={zoom} alt="" /><button className="adm-icon-btn" aria-label="Zavřít"><I n="close" /></button></div>}
    </Sheet>
  )
}
