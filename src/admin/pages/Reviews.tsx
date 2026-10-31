import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { type AdminReview, type ReviewStatus, REVIEW_STATUS, api, fmtAgo, fmtDate } from '../api'
import { ConfirmButton, Empty, ErrorBox, I, Loading, PageHead, Sheet, toast, toastError, useLoad } from '../ui'

const FILTERS: { key: ReviewStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Ke schválení' },
  { key: 'approved', label: 'Na webu' },
  { key: 'hidden', label: 'Skryté' },
  { key: 'all', label: 'Vše' },
]

const SITE = 'https://malirstvi-spejtek.net'
const SHARE_URL = SITE + '/recenze'

function Stars({ n, s = 16 }: { n: number; s?: number }) {
  return (
    <span className="adm-stars" aria-label={`${n} z 5 hvězdiček`}>
      {[1, 2, 3, 4, 5].map((i) => <I key={i} n="star" s={s} className={i <= n ? 'on' : ''} />)}
    </span>
  )
}

export default function Reviews() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, error, loading, reload, setData } = useLoad<AdminReview[]>('admin/reviews')
  const pending = (data ?? []).filter((r) => r.status === 'pending').length
  const [filter, setFilter] = useState<ReviewStatus | 'all' | null>(null)
  const active = filter ?? (pending ? 'pending' : 'approved')
  const list = useMemo(() => (data ?? []).filter((r) => active === 'all' || r.status === active), [data, active])
  const published = (data ?? []).filter((r) => r.status === 'approved')
  const avg = published.length ? published.reduce((s, r) => s + r.rating, 0) / published.length : 0
  const current = data?.find((r) => String(r.id) === id) ?? null
  const update = (x: AdminReview) => setData((d) => d?.map((y) => (y.id === x.id ? x : y)) ?? null)

  const share = async () => {
    const text = `Dobrý den, děkuji za zakázku. Pokud jste byli spokojeni, budu moc rád za krátkou recenzi: ${SHARE_URL}`
    try {
      if (navigator.share) await navigator.share({ title: 'Recenze – Malířství Špejtek', text })
      else { await navigator.clipboard.writeText(text); toast('Text s odkazem je zkopírovaný') }
    } catch { /* zrušeno */ }
  }

  return (
    <div className="adm-page">
      <PageHead title="Recenze" back="/admin/obsah"
        sub={data ? (published.length ? `Na webu ${published.length} · průměr ${avg.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} ★` : 'Zatím žádná zveřejněná') : undefined}>
        <button className="adm-icon-btn" aria-label="Obnovit" onClick={reload}><I n="refresh" /></button>
      </PageHead>

      <section className="adm-card">
        <div className="adm-card-head"><h2>Požádejte zákazníka o recenzi</h2></div>
        <p className="adm-hint">Po dokončené zakázce pošlete zákazníkovi odkaz – otevře se mu rovnou formulář. Recenze se na webu objeví, až ji tady schválíte.</p>
        <div className="adm-contact-actions">
          <button className="adm-btn" onClick={share}><I n="sms" s={18} />Poslat odkaz</button>
          <a className="adm-btn ghost" href="/recenze" target="_blank" rel="noopener"><I n="external" s={18} />Otevřít</a>
        </div>
        <p className="adm-hint"><code>{SHARE_URL}</code></p>
      </section>

      <div className="adm-toolbar">
        <div className="adm-chips" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.key} role="tab" aria-selected={active === f.key} onClick={() => setFilter(f.key)}>
              {f.label}<span>{(data ?? []).filter((r) => f.key === 'all' || r.status === f.key).length}</span>
            </button>
          ))}
        </div>
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} retry={reload} />}
      {data && !list.length && (
        <Empty icon="star" title={active === 'pending' ? 'Nic nečeká na schválení' : 'Žádné recenze'}>
          Recenze, které lidé napíšou na webu, se objeví tady. Přijde vám o nich i e-mail.
        </Empty>
      )}
      <ul className="adm-rows card">
        {list.map((r) => (
          <li key={r.id}>
            <Link to={`/admin/recenze/${r.id}`} className="adm-row">
              <span className={'adm-dot rv-' + r.status} aria-hidden />
              <span className="adm-row-main">
                <b>{r.name} <Stars n={r.rating} s={14} /></b>
                <small>{r.text.slice(0, 120)}</small>
              </span>
              <span className="adm-row-side">
                <small>{fmtAgo(r.createdAt)}</small>
                <small className={'adm-pill rv-' + r.status}>{REVIEW_STATUS[r.status]}</small>
                {r.reply && <small>s odpovědí</small>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {id && data && (current
        ? <Detail key={current.id} r={current} onClose={() => nav('/admin/recenze')} onChange={update}
            onDelete={() => { setData((d) => d?.filter((y) => y.id !== current.id) ?? null); nav('/admin/recenze') }} />
        : <Sheet open title="Recenze" onClose={() => nav('/admin/recenze')}><p>Recenze nenalezena.</p></Sheet>)}
    </div>
  )
}

function Detail({ r, onClose, onChange, onDelete }: { r: AdminReview; onClose: () => void; onChange: (x: AdminReview) => void; onDelete: () => void }) {
  const [reply, setReply] = useState(r.reply)
  const [name, setName] = useState(r.name)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setReply(r.reply); setName(r.name) }, [r.reply, r.name])
  const patch = async (body: Partial<Pick<AdminReview, 'status' | 'reply' | 'name'>>, msg = 'Uloženo') => {
    setBusy(true)
    try { onChange(await api<AdminReview>(`admin/reviews/${r.id}`, { method: 'PATCH', body })); toast(msg) } catch (e) { toastError(e) } finally { setBusy(false) }
  }
  const dirty = reply.trim() !== r.reply || (name.trim() !== r.name && name.trim().length >= 2)
  const save = () => patch({ reply: reply.trim(), ...(name.trim() !== r.name ? { name: name.trim() } : {}) })

  return (
    <Sheet open title={r.name} onClose={onClose}
      footer={<ConfirmButton onConfirm={async () => { try { await api(`admin/reviews/${r.id}`, { method: 'DELETE' }); toast('Recenze smazána'); onDelete() } catch (e) { toastError(e) } }}><I n="trash" s={18} />Smazat</ConfirmButton>}>
      <p className="adm-hint">
        Přijato {fmtDate(r.createdAt)} ({fmtAgo(r.createdAt)}){r.approvedAt && r.status === 'approved' && <> · na webu od {fmtDate(r.approvedAt)}</>}
      </p>
      <p className="adm-review-rating"><Stars n={r.rating} s={24} /><b>{r.rating}/5</b></p>
      <p className="adm-msg">{r.text}</p>
      <dl className="adm-dl">
        {r.place && <div><dt>Obec</dt><dd>{r.place}</dd></div>}
        {r.service && <div><dt>Služba</dt><dd>{r.service}</dd></div>}
        {r.email && <div><dt>E-mail (neveřejný)</dt><dd><a href={`mailto:${r.email}`}>{r.email}</a></dd></div>}
      </dl>

      <div className="adm-contact-actions">
        {r.status !== 'approved' && <button className="adm-btn" disabled={busy} onClick={() => patch({ status: 'approved' }, 'Recenze je na webu')}><I n="check" s={18} />Zveřejnit</button>}
        {r.status !== 'hidden' && <button className="adm-btn ghost" disabled={busy} onClick={() => patch({ status: 'hidden' }, 'Recenze je skrytá')}><I n="eye" s={18} />{r.status === 'approved' ? 'Stáhnout z webu' : 'Nezveřejňovat'}</button>}
        {r.status === 'hidden' && <button className="adm-btn ghost" disabled={busy} onClick={() => patch({ status: 'pending' }, 'Vráceno ke schválení')}><I n="refresh" s={18} />Vrátit ke schválení</button>}
      </div>

      <div className="adm-field">
        <label className="adm-label" htmlFor="rv-reply">Veřejná odpověď <small>(nepovinné)</small></label>
        <textarea id="rv-reply" rows={3} maxLength={2000} value={reply} placeholder="Např. Děkuji za milá slova, rád jsem u vás maloval." onChange={(e) => setReply(e.target.value)} />
        <p className="adm-hint">Zobrazí se pod recenzí na webu.</p>
      </div>
      <div className="adm-field">
        <label className="adm-label" htmlFor="rv-name">Jméno na webu</label>
        <input id="rv-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <p className="adm-hint">Když zákazník napíše celé příjmení, můžete ho zkrátit (např. „Jana N.“).</p>
      </div>
      {dirty && <button className="adm-btn" disabled={busy} onClick={save}><I n="check" s={18} />Uložit</button>}
    </Sheet>
  )
}
