# Malířství Špejtek – web s 3D vizualizátorem

React 19 + TypeScript + Vite · Three.js (react-three-fiber, drei) · framer-motion · zustand

## Spuštění

```bash
npm install
npm run dev        # vývoj na http://localhost:5173
npm run build      # kontrola typů + produkční build do dist/
npm run preview    # náhled produkčního buildu
```

Web je SPA (React Router). Hosting musí přesměrovat všechny cesty na `index.html`:
`vercel.json` (Vercel) a `public/_redirects` (Netlify/Cloudflare) jsou přiloženy.

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
- Kontaktní formulář nic neposílá na server: otevře SMS na 602 581 542 (nebo zkopíruje zprávu). Pro e-mail/backend je potřeba doplnit adresu nebo službu.
- Nábytek je procedurální (nízký počet polygonů).
- Fotky realizací jsou v `src/images/`, seznam v `src/data/realizace.ts`.
