import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ConfirmButton, ErrorBox, I, Loading, MediaLibrary, PageHead, Text, toast, toastError, useLoad } from '../ui'
import { BUSINESS } from '../../config'

interface S {
  business: Partial<typeof BUSINESS>; notify: { email?: string }; account: { email: string }; mailConfigured: boolean
}

export default function Settings({ onLogout, email }: { onLogout: () => void; email: string }) {
  const s = useLoad<S>('admin/settings')
  const [b, setB] = useState({ name: '', tagline: '', phoneDisplay: '', phoneTel: '', area: '', email: '' })
  const [notify, setNotify] = useState('')
  const [busy, setBusy] = useState(false)
  const [lib, setLib] = useState(false)
  useEffect(() => {
    if (!s.data) return
    const x = s.data.business
    setB({
      name: x.name || BUSINESS.name, tagline: x.tagline || BUSINESS.tagline, phoneDisplay: x.phoneDisplay || BUSINESS.phoneDisplay,
      phoneTel: x.phoneTel || BUSINESS.phoneTel, area: x.area || BUSINESS.area, email: x.email || '',
    })
    setNotify(s.data.notify.email ?? '')
  }, [s.data])
  const save = async () => {
    setBusy(true)
    try { await api('admin/settings', { method: 'PUT', body: { business: b, notify: { email: notify } } }); toast('Uloženo – na webu se projeví do minuty') } catch (e) { toastError(e) } finally { setBusy(false) }
  }
  const set = (k: keyof typeof b) => (v: string) => setB((x) => ({ ...x, [k]: v }))

  return (
    <div className="adm-page">
      <PageHead title="Nastavení" />
      {s.loading && <Loading />}
      {s.error && <ErrorBox error={s.error} retry={s.reload} />}
      {s.data && (
        <>
          <section className="adm-card">
            <h2>Firemní údaje na webu</h2>
            <Text label="Název" value={b.name} onChange={set('name')} />
            <Text label="Telefon (jak se zobrazí)" value={b.phoneDisplay} onChange={(v) => setB((x) => ({ ...x, phoneDisplay: v, phoneTel: '+420' + v.replace(/\D/g, '').replace(/^420/, '') }))} inputMode="tel" hint={`Odkaz pro volání: ${b.phoneTel}`} />
            <Text label="Oblast působení" value={b.area} onChange={set('area')} />
            <Text label="Veřejný e-mail (nepovinné)" value={b.email} onChange={set('email')} type="email" inputMode="email" />
          </section>
          <section className="adm-card">
            <h2>Upozornění na poptávky</h2>
            <Text label="Posílat nové poptávky na e-mail" value={notify} onChange={setNotify} type="email" inputMode="email" />
            {!s.data.mailConfigured && <p className="adm-hint warn">E-maily se zatím neodesílají – na serveru chybí RESEND_API_KEY (viz README). Poptávky se i tak ukládají sem.</p>}
          </section>
          <div className="adm-savebar static"><button className="adm-btn grow" disabled={busy} onClick={save}>{busy ? 'Ukládám…' : 'Uložit údaje'}</button></div>

          <section className="adm-card">
            <h2>Další</h2>
            <ul className="adm-hub flat">
              <li><Link to="/admin/google"><span className="adm-hub-icon"><I n="chart" /></span><span><b>Google účet</b><small>Search Console, Google Ads</small></span><I n="next" s={20} /></Link></li>
              <li><button onClick={() => setLib(true)}><span className="adm-hub-icon"><I n="photo" /></span><span><b>Nahrané fotky</b><small>Prohlížet a mazat</small></span><I n="next" s={20} /></button></li>
            </ul>
          </section>
          <Account email={s.data.account.email || email} />
          <section className="adm-card">
            <h2>Odhlášení</h2>
            <div className="adm-inline-actions">
              <button className="adm-btn ghost" onClick={onLogout}><I n="logout" s={18} />Odhlásit se</button>
              <ConfirmButton className="adm-btn ghost danger" label="Odhlásit všude?" onConfirm={async () => { try { await api('admin/logout-all', { body: {} }); onLogout() } catch (e) { toastError(e) } }}>
                Odhlásit všechna zařízení
              </ConfirmButton>
            </div>
          </section>
          <p className="adm-hint center">Tip: v telefonu otevřete menu prohlížeče a zvolte „Přidat na plochu“ – administrace se pak otevírá jako aplikace.</p>
        </>
      )}
      {lib && <MediaLibrary onClose={() => setLib(false)} />}
    </div>
  )
}

function Account({ email }: { email: string }) {
  const [mail, setMail] = useState(email)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try { await api('admin/password', { body: { current, next, email: mail } }); toast(next ? 'Heslo změněno' : 'Uloženo'); setCurrent(''); setNext('') } catch (e) { toastError(e) } finally { setBusy(false) }
  }
  return (
    <section className="adm-card">
      <h2>Přihlašovací údaje</h2>
      <Text label="Přihlašovací jméno" value={mail} onChange={setMail} autoComplete="username" />
      <Text label="Nové heslo (nepovinné)" value={next} onChange={setNext} type="password" autoComplete="new-password" hint="Aspoň 10 znaků. Ostatní zařízení se odhlásí." />
      <Text label="Současné heslo (pro potvrzení)" value={current} onChange={setCurrent} type="password" autoComplete="current-password" />
      <button className="adm-btn ghost" disabled={busy || !current} onClick={save}>Uložit přihlašovací údaje</button>
    </section>
  )
}
