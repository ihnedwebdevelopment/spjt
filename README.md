# Malířství Špejtek — nový design

Web v Svelte 5, Vite a Tailwind CSS 4. Modrobílá identita, lokálně uložené písmo Manrope, pohyblivé hero s velkými fotografiemi, vrstvené sekce a rozsáhlé scroll animace na GSAP. Obsah je rozdělený do podstránek, aby žádná z nich nebyla nekonečně dlouhá.

## Spuštění

```sh
npm install
npm run dev
```

## Ověření a sestavení

```sh
npm run check
npm run build
npm run preview
```

Build vytvoří 12 předrenderovaných HTML stránek ve složce `dist`. Původní adresy `.html` zůstávají funkční. Svelte následně hydratuje interaktivní prvky. Celý obsah je dostupný i před načtením JavaScriptu.

## Struktura

- `src/App.svelte`: sdílené rozložení, všechny stránky a interakce.
- `src/data.js`: služby, realizace, časté dotazy, kroky postupu, sliby, materiály, odstíny.
- `src/style.css`: vlastní design a responzivní pravidla nad Tailwind CSS.
- `src/motion.js`: GSAP a ScrollTrigger, načítané až na klientovi.
- `public/assets/img`: fotografie firmy; `public/assets/img/sm` jsou zmenšené varianty pro mobil (`srcset`).
- `original`: původní HTML pro zálohu a zachování strukturovaných dat.
- `scripts/prerender.mjs`: předrenderování všech stránek a zachování SEO metadat.

## Stránky

- `/` — hero s pohyblivými fotografiemi, služby, představení řemeslníka, pás realizací, přístup, časté dotazy.
- `/nas-pristup.html` — řemeslo a materiály, postup krok za krokem, sliby, porovnání před a po.
- `/realizace.html` — filtrovatelná galerie, porovnání před a po, výběr odstínu.
- `/kontakt.html` — kontakt, poptávkový formulář, postup.
- `/lokality-jihlava-vysocina.html` — oblast působnosti.
- Šest stránek jednotlivých služeb.

## Animace

Scroll animace zajišťuje GSAP a ScrollTrigger v `src/motion.js`, načítané až na klientovi:

- pohyblivé sloupce fotografií v hero (nekonečný drift, parallax myší),
- odkrývání nadpisů po slovech, kreslení podtržení v hero,
- parallax vrstev (`.par`) a fotografií na desktopu,
- připnutý horizontální pás realizací s ukazatelem průběhu (na mobilu běžné swipování),
- zvýrazňování aktivního kroku postupu a jeho ukazatel průběhu,
- magnetická tlačítka, jemný náklon karet a světelný odlesk (jen myš),
- ukazatel průběhu čtení stránky a zmenšení hlavičky.

`prefers-reduced-motion` animace vypíná, mobil používá kratší a menší pohyb. Při odpojení komponenty se animace a posluchače uklidí.

## Mobil

- Spodní lišta s tlačítky Zavolat a Nezávazná poptávka (objeví se po odscrollování).
- Zmenšené varianty fotografií přes `srcset` a `sizes`.
- Vodorovně posuvné filtry galerie, snap u pásu realizací, dotykové cíle nejméně 46 px.

Poptávkový formulář připraví text ke kontrole a otevření SMS na +420 602 581 542; nic se automaticky neodesílá a údaje se neukládají na server. Uživatel může text také zkopírovat. Odeslání i fotografie dokončí ve své aplikaci pro zprávy.

Produkční doména v kanonických odkazech zůstává `https://malirstvi-spejtek.net`.

## Adresy stránek

Stránky běží na adresách **bez přípony `.html`** (`/realizace`, `/kontakt`, …), protože Cloudflare Pages soubor `realizace.html` sám servíruje na `/realizace`. Staré adresy s `.html` jsou v `public/_redirects` přesměrované trvale (301), takže odkazy z Googlu i vizitek dál fungují. `vite dev` i `vite preview` se díky pluginu v `vite.config.js` chovají stejně.

## Nahrání na GitHub

Repozitář je připravený, stačí:

```sh
git add .
git commit -m "Nový design: pohyblivé hero, GSAP animace, rozdělení obsahu"
git remote add origin git@github.com:UZIVATEL/malirstvi-spejtek.git   # jen poprvé
git push -u origin main
```

Do gitu se neukládá `node_modules/`, `dist/` ani vnořená složka `spejtek/` (viz `.gitignore`). Build si Cloudflare udělá sám.

## Hostování na Cloudflare Pages

1. V Cloudflare dashboardu: **Workers & Pages → Create → Pages → Connect to Git** a vyberte tento repozitář.
2. Nastavení buildu:

   | Položka | Hodnota |
   | --- | --- |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | (prázdné) |

3. Verze Node se bere ze souboru `.node-version` (22.12.0). Kdyby build hlásil starou verzi, přidejte v **Settings → Variables** proměnnou `NODE_VERSION` = `22.12.0`.
4. **Save and Deploy.** Každý další `git push` do větve `main` nasadí web automaticky; pushe do jiných větví vytvoří náhled.
5. Vlastní doména: **Custom domains → Set up a domain** a zadejte `malirstvi-spejtek.net` i `www.malirstvi-spejtek.net`. Pokud je doména v Cloudflare, DNS se doplní samo.

Co se nasazuje: obsah složky `dist`, včetně `_headers` (bezpečnostní hlavičky a cache) a `_redirects` (přesměrování starých `.html` adres). Soubor `dist/404.html` Cloudflare použije jako chybovou stránku.

## Poznámka k původním souborům

V kořeni repozitáře zůstávají soubory původního webu (`assets/`, `robots.txt`, `sitemap.xml`, `_headers`, `_redirects`, `humans.txt`, `README.txt`). Nenasazuje se z nich nic — živé verze jsou v `public/`. Můžete je smazat, pokud už zálohu nepotřebujete. Složku `original/` ale nechte, build z ní bere strukturovaná data pro SEO.
