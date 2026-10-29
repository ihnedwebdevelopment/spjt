import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type GoogleStatus } from '../api'
import { ConfirmButton, ErrorBox, I, Loading, PageHead, Text, toast, toastError, useLoad } from '../ui'

interface Site { siteUrl: string; permissionLevel: string }
interface Account { id: string; name: string; currency: string; manager: boolean }

const ERR: Record<string, string> = {
  access_denied: 'Přístup jste v Googlu nepovolili.',
  state: 'Přihlášení vypršelo, zkuste to prosím znovu.',
  token: 'Google nevrátil trvalý přístup. Zkuste to znovu (případně nejdřív odeberte aplikaci na myaccount.google.com/permissions).',
}

export default function GoogleHub() {
  const [params, setParams] = useSearchParams()
  const status = useLoad<GoogleStatus>('admin/google/status')
  const s = status.data
  useEffect(() => {
    if (params.get('pripojeno')) { toast('Google účet připojen'); setParams({}, { replace: true }) }
    const e = params.get('chyba')
    if (e) { toastError(new Error(ERR[e] ?? 'Připojení se nepovedlo: ' + e)); setParams({}, { replace: true }) }
  }, [params, setParams])

  return (
    <div className="adm-page">
      <PageHead title="Google" sub="Search Console a Google Ads na jednom místě" />
      {status.loading && !s && <Loading />}
      {status.error && <ErrorBox error={status.error} retry={status.reload} />}
      {s && (
        <>
          <div className="adm-biglinks">
            <Link to="/admin/search-console" className={'adm-big-link' + (s.connected && s.gscSite ? '' : ' off')}>
              <I n="search" s={28} /><b>Search Console</b><small>{s.gscSite ? s.gscSite.replace('sc-domain:', '') : 'nenastaveno'}</small>
            </Link>
            <Link to="/admin/reklamy" className={'adm-big-link' + (s.connected && s.adsCustomerId ? '' : ' off')}>
              <I n="megaphone" s={28} /><b>Google Ads</b><small>{s.adsCustomerId ? 'účet ' + s.adsCustomerId : 'nenastaveno'}</small>
            </Link>
          </div>
          <Connection s={s} reload={status.reload} />
          {s.connected && <Config s={s} onSaved={status.setData} />}
        </>
      )}
    </div>
  )
}

function Connection({ s, reload }: { s: GoogleStatus; reload: () => void }) {
  if (!s.oauthConfigured) {
    return (
      <section className="adm-card">
        <h2>1. Propojení s Googlem</h2>
        <div className="adm-note">
          <p>Na serveru chybí přihlašovací údaje aplikace Google (jednorázové nastavení – postup je v README.md):</p>
          <ol>
            <li>V <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console</a> vytvořte OAuth klienta typu „Webová aplikace“.</li>
            <li>Jako přesměrování přidejte <code>{location.origin}/api/google/callback</code></li>
            <li>Zapněte „Google Search Console API“ a „Google Ads API“.</li>
            <li>Uložte klíče: <code>npx wrangler secret put GOOGLE_CLIENT_ID</code> a <code>GOOGLE_CLIENT_SECRET</code>.</li>
          </ol>
        </div>
      </section>
    )
  }
  return (
    <section className="adm-card">
      <h2>Účet Google</h2>
      {s.connected ? (
        <>
          <p className="adm-ok"><I n="check" s={20} />Připojeno{s.email && <> jako <b>{s.email}</b></>}</p>
          {!s.hasAdsScope && <p className="adm-hint warn">Připojení nemá oprávnění pro Google Ads. Připojte účet znovu.</p>}
          <div className="adm-inline-actions">
            <a className="adm-btn ghost small" href="/api/admin/google/connect">Připojit znovu / jiný účet</a>
            <ConfirmButton className="adm-btn ghost small danger" label="Opravdu odpojit?" onConfirm={async () => {
              try { await api('admin/google/disconnect', { body: {} }); toast('Odpojeno'); reload() } catch (e) { toastError(e) }
            }}>Odpojit</ConfirmButton>
          </div>
        </>
      ) : (
        <>
          <p>Přihlaste se Google účtem, který má přístup k Search Console webu a k účtu Google Ads.</p>
          <a className="adm-btn" href="/api/admin/google/connect"><I n="globe" s={18} />Připojit Google účet</a>
        </>
      )}
    </section>
  )
}

function Config({ s, onSaved }: { s: GoogleStatus; onSaved: (v: GoogleStatus) => void }) {
  const sites = useLoad<Site[]>('admin/gsc/sites')
  const [loadAccounts, setLoadAccounts] = useState(false)
  const accounts = useLoad<Account[]>(loadAccounts ? 'admin/ads/accounts' : null, [loadAccounts])
  const [gscSite, setGscSite] = useState(s.gscSite ?? '')
  const [ads, setAds] = useState(s.adsCustomerId ?? '')
  const [mcc, setMcc] = useState(s.adsLoginCustomerId ?? '')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    // jediný web v Search Console vybereme rovnou
    if (!gscSite && sites.data?.length === 1) setGscSite(sites.data[0].siteUrl)
  }, [sites.data, gscSite])
  const save = async () => {
    setBusy(true)
    try { onSaved(await api<GoogleStatus>('admin/google/config', { method: 'PUT', body: { gscSite, adsCustomerId: ads, adsLoginCustomerId: mcc } })); toast('Uloženo') }
    catch (e) { toastError(e) } finally { setBusy(false) }
  }
  return (
    <section className="adm-card">
      <h2>Nastavení</h2>
      <div className="adm-field">
        <label className="adm-label" htmlFor="gsc-site">Web v Search Console</label>
        {sites.loading && <Loading />}
        {sites.error && <ErrorBox error={sites.error} retry={sites.reload} />}
        {sites.data && (sites.data.length ? (
          <select id="gsc-site" value={gscSite} onChange={(e) => setGscSite(e.target.value)}>
            <option value="">— vyberte —</option>
            {sites.data.map((x) => <option key={x.siteUrl} value={x.siteUrl}>{x.siteUrl.replace('sc-domain:', 'Doména: ')}</option>)}
          </select>
        ) : <p className="adm-hint warn">Tento Google účet nemá v Search Console žádný web. Přidejte ho na search.google.com/search-console.</p>)}
      </div>
      <Text label="ID účtu Google Ads" value={ads} onChange={setAds} placeholder="123-456-7890" inputMode="numeric"
        hint={<>Najdete vpravo nahoře v Google Ads. {s.adsDeveloperToken
          ? <button type="button" className="adm-linkbtn" onClick={() => setLoadAccounts(true)}>Najít moje účty</button>
          : <span className="warn">Na serveru chybí GOOGLE_ADS_DEVELOPER_TOKEN.</span>}</>} />
      {accounts.loading && <Loading label="Hledám účty…" />}
      {accounts.error && <ErrorBox error={accounts.error} />}
      {accounts.data && (
        <div className="adm-chips wrap">
          {accounts.data.map((a) => (
            <button key={a.id} type="button" aria-pressed={ads.replace(/\D/g, '') === a.id}
              onClick={() => (a.manager ? setMcc(a.id) : setAds(a.id))}>
              {a.name || a.id}{a.manager ? ' (MCC)' : ''}
            </button>
          ))}
        </div>
      )}
      <Text label="ID manažerského účtu MCC (nepovinné)" value={mcc} onChange={setMcc} inputMode="numeric" hint="Vyplňte jen pokud účet Ads spravujete přes manažerský účet." />
      <button className="adm-btn" disabled={busy} onClick={save}>{busy ? 'Ukládám…' : 'Uložit nastavení'}</button>
    </section>
  )
}
