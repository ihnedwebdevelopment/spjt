import { Link } from 'react-router-dom'
import { type PostRow, fmtDate } from '../api'
import { Empty, ErrorBox, I, Loading, PageHead, useLoad } from '../ui'

export default function Posts() {
  const { data, error, loading, reload } = useLoad<PostRow[]>('admin/posts')
  return (
    <div className="adm-page">
      <PageHead title="Aktuality a rady" back="/admin/obsah" sub="Pravidelné články pomáhají být vidět na Googlu">
        <Link className="adm-btn" to="/admin/aktuality/novy"><I n="plus" s={18} />Napsat</Link>
      </PageHead>
      {loading && <Loading />}
      {error && <ErrorBox error={error} retry={reload} />}
      {data && !data.length && (
        <Empty icon="doc" title="Zatím žádný článek">
          <p>Tip na první článek: „Jak se připravit na malování bytu“ nebo „Kolik barvy potřebuji na pokoj“.</p>
          <Link className="adm-btn" to="/admin/aktuality/novy">Napsat první článek</Link>
        </Empty>
      )}
      <ul className="adm-rows card">
        {data?.map((p) => {
          const planned = !!p.published && !!p.published_at && p.published_at > Date.now() / 1000
          return (
            <li key={p.id}>
              <Link to={`/admin/aktuality/${p.id}`} className="adm-row">
                {p.cover ? <img className="adm-thumb" src={p.cover} alt="" /> : <span className="adm-thumb"><I n="doc" s={20} /></span>}
                <span className="adm-row-main"><b>{p.title}</b><small>{p.excerpt || '/aktuality/' + p.slug}</small></span>
                <span className="adm-row-side">
                  <small className={'adm-pill ' + (p.published ? (planned ? 'offer' : 'won') : 'archived')}>{p.published ? (planned ? 'Naplánováno' : 'Zveřejněno') : 'Koncept'}</small>
                  {p.published_at && <small>{fmtDate(p.published_at)}</small>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
