# Malířství Špejtek – web s 3D vizualizátorem

React 19 + TypeScript + Vite · Three.js (react-three-fiber, drei) · framer-motion · zustand

## Spuštění

```bash
npm install
npm run dev        # vývoj na http://localhost:5173
npm run build      # kontrola typů + produkční build do dist/
npm run preview    # náhled produkčního buildu
```

Web je SPA (React Router) a běží na **Cloudflare Workers**: statické soubory z `dist/` + Worker (`worker/`)
s API pro administraci, databází D1 a úložištěm fotek R2. Administrace je na **/admin** – viz níže.
(`vercel.json` zůstává jen pro přesměrování starých adres; administrace a formulář na Vercelu nefungují.)

## Co kde je

| Soubor / složka | K čemu |
| --- | --- |
| `src/config.ts` | telefon, oblast, **přepínač orientační ceny** (výchozí: vypnuto) |
| `src/data/paints.ts` | paleta odstínů, lesky, povrchy (stěrky) |
| `src/data/services.ts` | služby a kroky „Náš přístup“ |
| `src/data/realizace.ts` | realizace – fotky z `src/images/`, volitelně dvojice před/po |
| `src/data/presets.ts` | předvolené místnosti (rozměry, nábytek, barvy) |
| `src/designer/` | 3D vizualizátor (místnost, nábytek, světlo, kamera, panely) |
| `src/components/HeroScene.tsx` | 3D hero s parallaxem |
| `src/components/FinishCanvas.tsx` | interaktivní 3D ukázka stěrek |
| `src/lib/textures.ts` | procedurální textury (beton, štuk, zlatá, podlahy) |
| `src/lib/urlState.ts` | sdílení návrhu odkazem (`/vizualizator?n=...`) |

## Vizualizátor – funkce

**Režim „Vaše fotka“** (`src/photo/`)
- Zákazník nahraje nebo vyfotí svůj pokoj, klepne na stěnu a ta se přebarví – chytrý výběr plochy (CIELAB + hrany), zachovají se stíny, světlo i struktura.
- Více ploch s různými odstíny, štětec a guma na doladění, citlivost výběru, zpět (Ctrl+Z), posuvník před/po, stažení obrázku s rozpisem barev, předání do poptávky.
- Vše běží v prohlížeči, fotka se nikam neodesílá.

**Režim „3D místnost“** (`src/designer/`)
- Více místností (lišta nad záložkami), smazání poslední otevře **průvodce novou místností**: typ, rozměry, okno a dveře v půdorysu, podlaha, vybavení, volitelně fotka (z ní se odhadne stávající barva stěn pro před/po). Místnosti se ukládají v prohlížeči.
- Hotové barevné kombinace, barva/lesk/povrch zvlášť pro každou stěnu, strop a sokl.
- Fotorealistické vykreslení: ambientní okluze (N8AO), měkké stíny, denní světlo oknem, výhled z okna, záře lamp, tónování Khronos Neutral (věrné barvy); kvalita se automaticky přizpůsobí výkonu zařízení.
- Čas dne 6–21 h, večerní světla, 5 podlah včetně rybí kosti, nábytek přetahovatelný po podlaze.
- Rozpis ploch a spotřeby za místnost i za všechny místnosti, export JPG v 2× rozlišení s rozpisem, odkaz na návrh, poptávka se všemi místnostmi.

## Poznámky

- Odstíny na monitoru nejsou přesné – ve vizualizátoru je to uvedeno, finální odstín se ověřuje vzorníkem.
- Kontaktní formulář ukládá poptávku (i s fotkami) do administrace; SMS a zkopírování zprávy zůstávají jako záloha.
- Nábytek je procedurální (nízký počet polygonů).
- Fotky realizací jsou v `src/images/`, seznam v `src/data/realizace.ts`.

---

# Administrace (/admin)

Mobilní administrace pro majitele: na telefonu spodní lišta, na počítači boční panel. Dá se přidat na plochu jako aplikace.

| Sekce | Co umí |
| --- | --- |
| **Přehled** | nové poptávky, kliknutí z Googlu, útrata za reklamy, rychlé akce (vyfotit realizaci, napsat článek) |
| **Poptávky** | formulář na webu ukládá poptávky i s fotkami (max. 6, zmenšené už v telefonu), stavy Nová → Kontaktováno → Nabídka → Zakázka, poznámky, tlačítka Zavolat / SMS / E-mail, e-mail o nové poptávce |
| **Obsah → Realizace** | přidání fotky přímo z foťáku, dvojice před/po, druh práce, místo, výřez, pořadí, skrytí |
| **Obsah → Aktuality** | články (jednoduchý Markdown s panelem nástrojů), vkládání fotek, koncept / zveřejnit / naplánovat, SEO a náhled v Googlu; stránky `/aktuality` a `/aktuality/<adresa>` s meta tagy pro Google i sociální sítě |
| **Obsah → Služby, Časté dotazy** | texty, odrážky, fotky, SEO titulky a popisy, pořadí |
| **Obsah → SEO stránek** | titulky a popisy stránek s náhledem výsledku v Googlu, kontrola indexace |
| **Google → Search Console** | kliknutí, zobrazení, CTR a pozice po dnech s porovnáním s předchozím obdobím, hledané výrazy, stránky, zařízení, odeslání sitemapy, kontrola indexace |
| **Google → Google Ads** | útrata, kliky, konverze, cena za klik a konverzi, graf po dnech, zapnutí / pozastavení kampaní, změna denního rozpočtu, „Mám plno – pozastavit vše“, hledané výrazy z reklam |
| **Obsah → Recenze** | recenze od zákazníků z webu čekají na schválení (Zveřejnit / Nezveřejňovat / Smazat), veřejná odpověď pod recenzí, zkrácení jména, tlačítko „Poslat odkaz“ na `/recenze` pro zákazníka po zakázce, e-mail o nové recenzi |
| **Nastavení** | telefon a údaje na webu, e-mail pro upozornění, změna hesla, odhlášení všech zařízení, nahrané fotky |

Obsah, který se v administraci nezmění, zůstává ze `src/data/*.ts`. Při prvním přihlášení se současné realizace,
služby a FAQ přenesou do databáze a od té chvíle se upravují v administraci. Když API neodpoví, web ukáže výchozí
obsah, takže nikdy nezůstane prázdný. `sitemap.xml` se generuje automaticky (služby + články).

| Soubor / složka | K čemu |
| --- | --- |
| `worker/index.ts` | API: obsah, poptávky, přihlášení, fotky, sitemapa, meta tagy článků |
| `worker/google.ts` | OAuth, Search Console API, Google Ads API (REST, verze v `GOOGLE_ADS_API_VERSION`) |
| `worker/lib.ts` | relace (HttpOnly cookie, 30 dní), PBKDF2 hesla, ochrana proti CSRF, e-mail přes Resend |
| `migrations/` | schéma databáze D1 |
| `src/admin/` | administrace (načítá se zvlášť, návštěvníkům webu nic nepřidává) |
| `src/content/store.ts` | načtení obsahu z `/api/content` s náhradou za statická data |

## Zprovoznění (jednorázově)

1. V Cloudflare dashboardu zapněte **R2** (zdarma do 10 GB).
2. Databáze a úložiště:
   ```bash
   npx wrangler login
   npx wrangler d1 create spejtek          # vypíše database_id → doplňte ho do wrangler.jsonc k "DB"
   npx wrangler r2 bucket create spejtek-media
   ```
3. Nasazení: `npm run deploy` (build → migrace databáze → nasazení). Migrace `0002_admin_ucet.sql` založí účet majitele
   (přihlašovací jméno `admin268`, heslo předané mimo repozitář – v kódu je jen jeho otisk). Pak se přihlaste na **/admin**
   a doporučeně si heslo změňte v Nastavení → Přihlašovací údaje.
4. E-mail o nových poptávkách (volitelné): účet na resend.com s ověřenou doménou, pak
   `npx wrangler secret put RESEND_API_KEY` a `npx wrangler secret put MAIL_FROM` (např. `Web Špejtek <web@malirstvi-spejtek.net>`).

### Google Search Console + Google Ads

1. [Google Cloud Console](https://console.cloud.google.com/) → nový projekt → **APIs & Services → Library**: zapnout **Google Search Console API** a **Google Ads API**.
2. **OAuth consent screen**: typ External, název a e-mail, v sekci Audience **Publish app** (v testovacím režimu přístup po 7 dnech vyprší).
3. **Credentials → OAuth client ID → Web application**, Authorized redirect URIs:
   `https://malirstvi-spejtek.net/api/google/callback` (pro vývoj i `http://localhost:8787/api/google/callback`).
4. `npx wrangler secret put GOOGLE_CLIENT_ID` a `npx wrangler secret put GOOGLE_CLIENT_SECRET`.
5. **Google Ads developer token**: manažerský účet Google Ads (MCC, zdarma) → Nástroje → **API Center**. Nový token má stav *Test*
   (jen testovací účty), proto požádejte o **Basic access**. Pak `npx wrangler secret put GOOGLE_ADS_DEVELOPER_TOKEN`.
6. V administraci **Google → Připojit Google účet** (účet s přístupem k Search Console i Google Ads), vyberte web v Search Console
   a zadejte ID účtu Ads (případně ID MCC).

Google Ads API vydává nové hlavní verze několikrát ročně a starší po zhruba roce vypíná. Verzi stačí zvýšit ve `wrangler.jsonc` (`GOOGLE_ADS_API_VERSION`).

## Vývoj

```bash
cp .dev.vars.example .dev.vars     # volitelné – klíče Google apod.
npm run db:migrate:local           # lokální databáze
npm run preview:cf                 # build + web s API na http://localhost:8787 (admin na /admin)
# s rychlým obnovováním: terminál 1 `npm run dev:api`, terminál 2 `npm run dev` (Vite přeposílá /api)
```

**Zapomenuté heslo:** v Cloudflare dashboardu → D1 → `spejtek` → Console smažte řádek v tabulce `admin`, nastavte
`npx wrangler secret put ADMIN_SETUP_CODE` a na /admin založte účet znovu (obsah zůstane).
