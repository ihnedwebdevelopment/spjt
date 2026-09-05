# Malířství Špejtek — nový design

Web v Svelte 5, Vite a Tailwind CSS 4. Modrobílý design s lokálně uloženým písmem Manrope, centrálním úvodem, fotografickým pásem a službami v kartách. Dekorativní číslování není použito. Používá původní fotografie firmy.

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

Build vytvoří 11 předrenderovaných HTML stránek ve složce `dist`. Původní adresy `.html` zůstávají funkční. Svelte následně hydratuje interaktivní prvky. Celý obsah je dostupný i před načtením JavaScriptu.

- `src/App.svelte`: sdílené rozložení, stránky a interakce.
- `src/data.js`: služby, realizace a časté dotazy.
- `src/style.css`: vlastní design a responzivní pravidla nad Tailwind CSS.
- `public/assets/img`: fotografie původního webu.
- `original`: původní HTML pro zálohu a zachování strukturovaných dat.
- `scripts/prerender.mjs`: předrenderování všech stránek a zachování SEO metadat.

Poptávkový formulář připraví text ke kontrole a otevření SMS na +420 602 581 542; nic se automaticky neodesílá a údaje se neukládají na server. Uživatel může text také zkopírovat. Odeslání i fotografie dokončí ve své aplikaci pro zprávy.

Produkční doména v kanonických odkazech zůstává `https://malirstvi-spejtek.net`. Soukromý Sites náhled nepřepojuje původní doménu.

Scroll animace zajišťuje GSAP a ScrollTrigger v `src/motion.js`, načítané až na klientovi. Karty a sekce se odkrývají jednou; fotografie mají na desktopu jemný parallax. `prefers-reduced-motion` vypíná animace, mobil používá kratší a menší pohyb. Při odpojení komponenty se animace a posluchače uklidí.
