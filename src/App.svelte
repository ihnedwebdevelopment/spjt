<script>
 import { onMount } from 'svelte';
 onMount(() => {
   let stopped = false;
   let dispose;
   import('./motion.js').then(({ mountMotion }) => {
     if (!stopped) dispose = mountMotion(document.getElementById('app'));
   }).catch((error) => console.warn('Animace se nepodařilo načíst.', error));
   return () => { stopped = true; dispose?.(); };
 });
 import { ArrowUpRight, ArrowRight, ArrowDown, MessageSquare, CalendarCheck, House, Brush, Layers, Wrench, Phone, Menu, X, Check, MapPin, PaintRoller, ShieldCheck, MoveHorizontal, ChevronLeft, ChevronRight, Sparkles, Clock, Ruler, Palette, Quote } from 'lucide-svelte';
 import { services, projects, faqs, shades, timeline, promises, materials, testimonials } from './data.js';
 let { path = '/' } = $props();
 const route = $derived(path.split('/').pop()?.replace('.html','') || 'index');
 const home = $derived(route === 'index');
 const service = $derived(services.find(s => s.slug === route));
 const isGallery = $derived(route === 'realizace');
 const isContact = $derived(route === 'kontakt');
 const isLocations = $derived(route === 'lokality-jihlava-vysocina');
 const isApproach = $derived(route === 'nas-pristup');
 const isKnownPage = $derived(home || !!service || isGallery || isContact || isLocations || isApproach);
 let menuOpen = $state(false);
 let quoteDialog;
 let photoDialog;
 let filter = $state('Vše');
 let photoIndex = $state(0);
 let comparison = $state(50);
 let pairIndex = $state(0);
 let shadeIndex = $state(0);
 let smsText = $state('');
 let copied = $state(false);
 const heroShots = [
  ['hero-malir-na-leseni.webp','Výmalba komerčního prostoru'],
  ['spejtek-remeslnik.webp','Malířství Špejtek'],
  ['zlata-dekorativni-sterka.webp','Zlatá dekorativní stěrka'],
  ['nater-atiky-vyhled.webp','Nátěr atiky s výhledem'],
  ['jemna-struktura-strop.webp','Dekorativní struktura stropu'],
  ['pred-po-interier-rostlina.webp','Interiér po výmalbě'],
  ['natery-konstrukci.webp','Nátěry kovových konstrukcí'],
  ['betonova-sterka-seda.webp','Šedá betonová stěrka'],
  ['kolaz-realizaci-malovani.webp','Realizace malování interiéru']
 ];
 const heroColumns = [heroShots.filter((_,i)=>i%2===0), heroShots.filter((_,i)=>i%2===1)];
 const pairs = [
  {before:'interier-pred.webp',after:'interier-po.webp',label:'Obývací pokoj',note:'Výmalba a sjednocení stěn'},
  {before:'pokoj-pred.webp',after:'pokoj-po.webp',label:'Dětský pokoj',note:'Nový odstín a čisté hrany'},
  {before:'fasada-pred.webp',after:'fasada-po.webp',label:'Fasáda domu',note:'Obnova venkovního pláště'}
 ];
 const pair = $derived(pairs[pairIndex]);
 const shade = $derived(shades[shadeIndex]);
 const filteredProjects = $derived(filter === 'Vše' ? projects : projects.filter(p=>p.category===filter));
 const pageTitle = $derived(home ? 'Špejtek — Malířství & natěračství Jihlava'
   : `${service?.title || (isGallery ? 'Realizace' : isContact ? 'Kontakt' : isLocations ? 'Jihlava a Vysočina' : isApproach ? 'Náš přístup' : 'Stránka nenalezena')} | Malířství Špejtek`);
 const pageDescription = $derived(service?.description
   || (isApproach ? 'Jak pracujeme: příprava podkladu, ochrana prostoru, materiál podle povrchu a pečlivé dokončení. Malířství Špejtek, Jihlava a Vysočina.'
   : 'Poctivé malířství a natěračství v Jihlavě a na Vysočině. Výmalby, dekorativní stěrky, fasády a nátěry. Nezávazná nabídka zdarma.'));
 const srcset = (file) => `/assets/img/sm/${file} 680w, /assets/img/${file} 1200w`;
 function openQuote(){ menuOpen=false; smsText=''; quoteDialog.showModal(); }
 function openPhoto(p){photoIndex=filteredProjects.indexOf(p); photoDialog.showModal();}
 function stepPhoto(n){photoIndex=(photoIndex+n+filteredProjects.length)%filteredProjects.length;}
 function prepareSms(event){event.preventDefault();const d=new FormData(event.currentTarget);smsText=`Dobrý den, mám zájem o nezávaznou nabídku.\nJméno: ${d.get('name')}\nLokalita: ${d.get('location')}\nTyp práce: ${d.get('service')}\nTermín: ${d.get('term')||'Dle domluvy'}\nPopis: ${d.get('message')||'Upřesním při domluvě.'}`;copied=false;}
 async function copyText(){try{await navigator.clipboard.writeText(smsText);copied=true;}catch{copied=false;}}
</script>

<svelte:head>
 <title>{pageTitle}</title>
 <meta name="description" content={pageDescription}/>
 {#if isKnownPage}<link rel="canonical" href={`https://malirstvi-spejtek.net/${home ? '' : route}`}/>{/if}
</svelte:head>
<svelte:window onkeydown={(e)=>{if(e.key==='Escape')menuOpen=false;if(photoDialog?.open){if(e.key==='ArrowRight')stepPhoto(1);if(e.key==='ArrowLeft')stepPhoto(-1);}}}/>

{#snippet brand(light=false)}
 <a class:light class="brand" href="/" aria-label="Špejtek — úvodní stránka"><img class="brand-symbol" src="/assets/img/spejtek-roller.svg" alt=""/><span class="brand-name">ŠPEJTEK<span>Malířství & natěračství</span></span></a>
{/snippet}
{#snippet quoteButton(text='Nezávazná poptávka',extra='')}
 <button class={`btn magnetic ${extra}`} onclick={openQuote}><span>{text}</span><ArrowUpRight size={19}/></button>
{/snippet}

<div class="scroll-progress" aria-hidden="true"><span></span></div>
<a class="skip-link" href="#obsah">Přejít na obsah</a>
<header class="header">
 <div class="shell header-inner">{@render brand()}<nav class="desktop-nav" aria-label="Hlavní navigace"><a class:active={home} href="/">Úvod</a><a class:active={!!service} href="/#sluzby">Služby</a><a class:active={isGallery} href="/realizace">Realizace</a><a class:active={isApproach} href="/nas-pristup">Náš přístup</a><a class:active={isContact} href="/kontakt">Kontakt</a></nav><div class="header-actions"><a class="header-phone" href="tel:+420602581542"><Phone size={16}/>602 581 542</a>{@render quoteButton('Poptat práci','small')}<button class="menu-toggle" aria-label={menuOpen?'Zavřít menu':'Otevřít menu'} aria-expanded={menuOpen} aria-controls="mobile-nav" onclick={()=>menuOpen=!menuOpen}>{#if menuOpen}<X/>{:else}<Menu/>{/if}</button></div></div>
 {#if menuOpen}<nav id="mobile-nav" class="mobile-nav" aria-label="Mobilní navigace">{#each [['/','Úvod'],['/#sluzby','Služby'],['/realizace','Realizace'],['/nas-pristup','Náš přístup'],['/kontakt','Kontakt']] as [url,label]}<a href={url} onclick={()=>menuOpen=false}>{label}<ArrowUpRight size={20}/></a>{/each}{@render quoteButton()}</nav>{/if}
</header>
<main id="obsah">
 {#if home}
 <section class="hero">
  <div class="hero-bg" aria-hidden="true"><span class="hero-grid"></span><span class="hero-orb orb-1 par" data-speed="0.14"></span><span class="hero-orb orb-2 par" data-speed="-0.1"></span></div>
  <div class="hero-main">
   <div class="hero-copy-wrap"><div class="hero-copy">
    <div class="eyebrow hero-badge"><span class="pulse-dot"></span> Malířství Jihlava &amp; Vysočina</div>
    <h1 class="split-text">Čerstvá barva.<br/><em>Úplně nový pocit.<svg class="underline" viewBox="0 0 420 22" preserveAspectRatio="none" aria-hidden="true"><path d="M4 15C70 6 150 4 214 8c62 4 132 8 202 3" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg></em></h1>
    <p>Malování, stěrky a nátěry, se kterými váš prostor ožije. Poctivě od první domluvy až po poslední detail.</p>
    <div class="hero-actions">{@render quoteButton('Chci nezávaznou nabídku')}<a class="btn secondary magnetic" href="/realizace"><span>Prohlédnout realizace</span> <ArrowRight size={18}/></a></div>
    <div class="hero-mini">{#each [[Clock,'Odpověď do dvou dnů'],[ShieldCheck,'Nabídka zdarma a nezávazně'],[MapPin,'Jihlava a celá Vysočina']] as [Icon,label]}<span><Icon size={16}/>{label}</span>{/each}</div>
   </div></div>
   <div class="hero-columns" aria-hidden="true">
    {#each heroColumns as column,index}<div class="hero-col" data-drift={index%2===0?'up':'down'}>{#each column as [file,caption]}<figure class="hero-shot"><img src={`/assets/img/${file}`} srcset={srcset(file)} sizes="(max-width:900px) 46vw, 24vw" alt="" loading={index===0?'eager':'lazy'} fetchpriority={index===0?'high':'auto'}/><figcaption>{caption}</figcaption></figure>{/each}</div>{/each}
   </div>
  </div>
  <div class="shell trust-row"><span><ShieldCheck size={20}/> Pečlivá příprava i úklid</span><span><MessageSquare size={20}/> Přímá domluva s řemeslníkem</span><span><Check size={20}/> Nezávazná nabídka zdarma</span><span><Sparkles size={20}/> Materiál podle povrchu</span></div>
  <a class="scroll-cue" href="#sluzby" aria-label="Přejít na služby"><span></span><ArrowDown size={16}/></a>
 </section>
 <section class="section shell services-section" id="sluzby">
  <div class="section-heading centered"><div class="eyebrow"><span class="eyebrow-line"></span>Co pro vás uděláme</div><h2 class="split-text">Od jedné stěny<br/>po celý dům.</h2><p>Vyberte, s čím vám pomůžeme. O zbytek se společně postaráme.</p></div>
  <div class="services-grid">{#each services as s,i}<a class="service-card tilt" href={`/${s.slug}`}><span class="service-icon">{#if i===0}<PaintRoller/>{:else if i===1}<House/>{:else if i===2}<Layers/>{:else if i===3}<ShieldCheck/>{:else if i===4}<Brush/>{:else}<Wrench/>{/if}</span><div><h3>{s.title}</h3><p>{s.description}</p><span class="service-more">Zjistit více <ArrowRight size={15}/></span></div><ArrowUpRight class="service-arrow" size={22}/><span class="card-sheen" aria-hidden="true"></span></a>{/each}
  <div class="service-cta"><span class="showcase-icon"><PaintRoller size={28}/></span><div><div class="eyebrow light">Vaše představa. Naše řemeslo.</div><h3>Nevíte si rady? Popište nám, co potřebujete — zbytek vymyslíme za vás.</h3></div>{@render quoteButton('Nezávazně poptat','light-btn')}</div></div>
 </section>
 {@render personSection()}
 <section class="hscroll-section" id="realizace">
  <div class="shell section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span>Naše realizace</div><h2 class="split-text">Tady za nás<br/>mluví výsledek.</h2></div><div class="hscroll-head-side"><p>Povrchy, prostory a detaily z dokončených zakázek na Vysočině.</p><a class="btn secondary magnetic" href="/realizace"><span>Všechny realizace</span> <ArrowUpRight size={20}/></a></div></div>
  <div class="hscroll"><div class="hscroll-track">{#each projects as project}<button class="hcard" onclick={()=>openPhoto(project)} aria-label={`Zvětšit: ${project.caption}`}><div class="hcard-image"><img src={`/assets/img/${project.image}`} srcset={srcset(project.image)} sizes="(max-width:580px) 250px, (max-width:850px) 280px, 340px" alt={project.caption} loading="lazy"/><span class="project-tag">{project.category}</span><span class="project-open"><ArrowUpRight size={22}/></span></div><div class="hcard-caption"><span>{project.caption}</span><h3>{project.title}</h3></div></button>{/each}<a class="hcard hcard-cta" href="/realizace"><span class="hcard-cta-icon"><ArrowUpRight size={28}/></span><h3>Celá galerie realizací</h3><p>Filtrujte podle interiérů, stěrek, fasád a nátěrů.</p></a></div></div>
  <div class="shell hscroll-hint"><span class="hscroll-bar"><i></i></span><span class="hscroll-label">Posouvejte a projděte si zakázky</span></div>
 </section>
 <section class="section shell craft-section">
  <div class="craft-grid">
   <div class="craft-copy">
    <div class="eyebrow"><span class="eyebrow-line"></span>Řemeslo s osobním přístupem</div>
    <h2 class="split-text">Dobře vymalováno.<br/><em>Bez zbytečných starostí.</em></h2>
    <p>Záleží nám na výsledku i na tom, jak se k němu dostaneme. Proto si všechno domluvíme předem a k vašemu prostoru přistupujeme jako k vlastnímu.</p>
    <div class="craft-points">{#each [['Domluva, která platí','Rozsah, postup i termín si ujasníme předem.'],['Váš domov v dobrých rukou','Zakryjeme vybavení a připravíme každý povrch.'],['Záleží na každém detailu','Zkontrolujeme hrany, přechody a sjednocení odstínu.']] as [title,desc]}<div><span><Check size={18}/></span><div><h3>{title}</h3><p>{desc}</p></div></div>{/each}</div>
    <a class="btn secondary magnetic" href="/nas-pristup"><span>Jak pracujeme krok za krokem</span><ArrowRight size={18}/></a>
   </div>
   <div class="craft-media">
    <div class="craft-photo"><img src="/assets/img/dekorativni-sterka-detail.webp" srcset={srcset('dekorativni-sterka-detail.webp')} sizes="(max-width:850px) 92vw, 46vw" alt="Pečlivé ruční nanášení dekorativní stěrky" loading="lazy"/><div class="photo-label"><ShieldCheck size={26}/><span>Poctivá práce.<strong>Od podkladu až po povrch.</strong></span></div></div>
    <div class="float-card float-a par" data-speed="0.09"><span><Ruler size={18}/></span><div><strong>Změříme skutečný stav</strong><p>Nabídka podle plochy, ne podle odhadu.</p></div></div>
    <div class="float-card float-b par" data-speed="-0.07"><span><Palette size={18}/></span><div><strong>Odstín vybereme s vámi</strong><p>Vzorek zkusíme přímo na vaší stěně.</p></div></div>
   </div>
  </div>
 </section>
 <section class="section shell faq-section"><div><div class="eyebrow"><span class="eyebrow-line"></span>Časté otázky</div><h2>Co vás zajímá?</h2><p>Nenašli jste odpověď?<br/>Zavolejte, rádi to s vámi probereme.</p><a class="text-link" href="tel:+420602581542"><Phone size={19}/>602 581 542</a><div class="faq-aside"><ShieldCheck size={22}/><p>Nezávazná nabídka je vždy zdarma a nic vás k ničemu nezavazuje.</p></div></div><div>{#each faqs as [question,answer]}<details><summary>{question}<span>+</span></summary><p>{answer}</p></details>{/each}</div></section>
 {:else if service}
 <section class="shell detail-hero"><div><a class="breadcrumb" href="/#sluzby">Služby / {service.title}</a><div class="eyebrow"><span class="eyebrow-line"></span>MALÍŘSTVÍ ŠPEJTEK · JIHLAVA A VYSOČINA</div><h1 class="split-text">{service.title}<em>{service.short}</em></h1><p class="lead">{service.description}</p><div class="detail-actions">{@render quoteButton('Poptat tuto službu')}<a class="btn secondary magnetic" href="tel:+420602581542"><span>602 581 542</span><Phone size={17}/></a></div></div><div class="detail-media"><img src={`/assets/img/${service.image}`} srcset={srcset(service.image)} sizes="(max-width:850px) 92vw, 50vw" alt={service.title} fetchpriority="high"/><div class="float-card float-b par" data-speed="-0.06"><span><ShieldCheck size={18}/></span><div><strong>Nabídka zdarma</strong><p>Bez závazku a bez skrytých položek.</p></div></div></div></section>
 <section class="shell section detail-inclusions"><div><div class="eyebrow"><span class="eyebrow-line"></span>OD PŘÍPRAVY PO DOKONČENÍ</div><h2 class="split-text">Co pro vás<br/><em>zajistíme.</em></h2><p class="detail-side-note">Konkrétní rozsah domluvíme podle stavu povrchu. Pro první nabídku stačí fotografie, lokalita a přibližná velikost plochy.</p></div><div>{#each service.details as detail}<div class="inclusion"><Check size={21}/><h3>{detail}</h3></div>{/each}</div></section>
 {@render timelineSection()}
 <section class="section shell promise-section compact"><div class="section-heading centered"><div class="eyebrow"><span class="eyebrow-line"></span>Na co se můžete spolehnout</div><h2>Jak pracujeme.</h2></div><div class="promise-grid">{#each promises.slice(0,3) as p}<div class="promise-card"><span class="promise-mark"><Check size={16}/></span><h3>{p.title}</h3><p>{p.text}</p></div>{/each}</div><a class="btn secondary magnetic promise-more" href="/nas-pristup"><span>Celý náš přístup</span><ArrowRight size={18}/></a></section>
 <section class="shell section"><div class="section-heading"><h2 class="split-text">Všechno pro<br/><em>váš prostor.</em></h2><a href="/#sluzby" class="text-link">Přehled služeb <ArrowRight size={18}/></a></div><div class="related-services">{#each services.filter(s=>s!==service).slice(0,3) as s}<a href={`/${s.slug}`}>{s.title}<ArrowUpRight size={22}/></a>{/each}</div></section>
 {:else if isApproach}
 <section class="shell page-intro"><div class="eyebrow"><span class="eyebrow-line"></span>Náš přístup</div><h1 class="split-text">Poctivé řemeslo<br/><em>bez překvapení.</em></h1><p class="lead">Jak u nás vypadá zakázka od prvního telefonu po předání.<br/>Co připravíme, co použijeme a na čem si dáme záležet.</p></section>
 <section class="section shell craft-section">
  <div class="craft-grid">
   <div class="craft-copy">
    <div class="eyebrow"><span class="eyebrow-line"></span>Řemeslo s osobním přístupem</div>
    <h2 class="split-text">Dobře vymalováno.<br/><em>Bez zbytečných starostí.</em></h2>
    <p>Záleží nám na výsledku i na tom, jak se k němu dostaneme. Proto si všechno domluvíme předem a k vašemu prostoru přistupujeme jako k vlastnímu.</p>
    <div class="craft-points">{#each [['Domluva, která platí','Rozsah, postup i termín si ujasníme předem.'],['Váš domov v dobrých rukou','Zakryjeme vybavení a připravíme každý povrch.'],['Záleží na každém detailu','Zkontrolujeme hrany, přechody a sjednocení odstínu.']] as [title,desc]}<div><span><Check size={18}/></span><div><h3>{title}</h3><p>{desc}</p></div></div>{/each}</div>
    {@render quoteButton('Domluvit svou zakázku')}
   </div>
   <div class="craft-media">
    <div class="craft-photo"><img src="/assets/img/dekorativni-sterka-detail.webp" srcset={srcset('dekorativni-sterka-detail.webp')} sizes="(max-width:850px) 92vw, 46vw" alt="Pečlivé ruční nanášení dekorativní stěrky" loading="lazy"/><div class="photo-label"><ShieldCheck size={26}/><span>Poctivá práce.<strong>Od podkladu až po povrch.</strong></span></div></div>
    <div class="float-card float-a par" data-speed="0.09"><span><Ruler size={18}/></span><div><strong>Změříme skutečný stav</strong><p>Nabídka podle plochy, ne podle odhadu.</p></div></div>
    <div class="float-card float-b par" data-speed="-0.07"><span><Palette size={18}/></span><div><strong>Odstín vybereme s vámi</strong><p>Vzorek zkusíme přímo na vaší stěně.</p></div></div>
   </div>
  </div>
  <div class="materials-grid">{#each materials as m}<div class="material-card"><span class="material-mark"><Sparkles size={16}/></span><h3>{m.title}</h3><p>{m.text}</p></div>{/each}</div>
 </section>
 {@render personSection()}
 {@render timelineSection()}
 <section class="section shell promise-section">
  <div class="section-heading centered"><div class="eyebrow"><span class="eyebrow-line"></span>Na co se můžete spolehnout</div><h2 class="split-text">Šest věcí, které<br/>u nás platí vždy.</h2></div>
  <div class="promise-grid">{#each promises as p}<div class="promise-card"><span class="promise-mark"><Check size={16}/></span><h3>{p.title}</h3><p>{p.text}</p></div>{/each}</div>
  {#if testimonials.length}<div class="testimonial-row">{#each testimonials as t}<figure class="testimonial"><Quote size={26}/><blockquote>{t.text}</blockquote><figcaption>{t.author}{#if t.place} — {t.place}{/if}</figcaption></figure>{/each}</div>{/if}
 </section>
 {@render compareSection()}
 {:else if isGallery}
 <section class="shell page-intro"><div class="eyebrow"><span class="eyebrow-line"></span>Naše práce</div><h1 class="split-text">Řemeslo, které<br/><em>mluví za sebe.</em></h1><p class="lead">Povrchy, prostory a detaily z našich zakázek.<br/>Od první přípravy až po hotový výsledek.</p></section>
 <section class="shell gallery-section"><div class="filters" aria-label="Filtrovat realizace">{#each ['Vše','Interiéry','Stěrky','Exteriéry','Nátěry'] as category}<button class:selected={filter===category} aria-pressed={filter===category} onclick={()=>filter=category}>{category}<span>{category==='Vše'?projects.length:projects.filter(p=>p.category===category).length}</span></button>{/each}</div><div class="project-grid">{#each filteredProjects as project}<button class="project-card tilt" onclick={()=>openPhoto(project)} aria-label={`Zvětšit: ${project.caption}`}><div class="project-image"><img src={`/assets/img/${project.image}`} srcset={srcset(project.image)} sizes="(max-width:580px) 92vw, (max-width:850px) 46vw, 400px" alt={project.caption} loading="lazy"/><span class="project-tag">{project.category}</span><span class="project-open"><ArrowUpRight size={24}/></span></div><div class="project-caption"><div><span>{project.caption}</span><h3>{project.title}</h3></div></div></button>{/each}</div></section>
 {@render compareSection()}
 {@render shadeSection()}
 {:else if isContact}
 <section class="shell page-intro"><div class="eyebrow"><span class="eyebrow-line"></span>Jsme tu pro vás</div><h1 class="split-text">Váš prostor.<br/><em>Náš další projekt.</em></h1><p class="lead">Řekněte nám, co chcete proměnit.<br/>Společně najdeme vhodný postup i termín.</p></section>
 <section class="shell contact-grid"><div class="contact-card"><span class="eyebrow light">ZAVOLEJTE PŘÍMO ŘEMESLNÍKOVI</span><a class="big-phone" href="tel:+420602581542">602 581 542 <ArrowUpRight/></a><p>Nejjednodušší cesta k první domluvě.<br/>Nebo pošlete popis zakázky ve zprávě.</p><div class="contact-location"><MapPin size={22}/><div><strong>Jihlava a okolí</strong><p>Po dohodě celá Vysočina.</p></div></div><div class="contact-location"><Clock size={22}/><div><strong>Kdy se ozveme</strong><p>Obvykle do dvou pracovních dnů.</p></div></div><a class="text-link" href="/lokality-jihlava-vysocina">Kde pracujeme <ArrowRight size={18}/></a></div><div class="contact-form"><div class="eyebrow"><span class="eyebrow-line"></span>NEZÁVAZNÁ NABÍDKA ZDARMA</div><h2>Máte představu?<br/><em>Napište nám.</em></h2>{@render quoteForm('contact')}</div></section>
 {@render timelineSection()}
 {:else if isLocations}
 <section class="shell page-intro"><div class="eyebrow"><span class="eyebrow-line"></span>Kde pracujeme</div><h1 class="split-text">Doma v Jihlavě.<br/><em>Po celé Vysočině.</em></h1><p class="lead">Pracujeme v Jihlavě a okolních obcích.<br/>Za většími zakázkami přijedeme i do dalších částí kraje.</p></section>
 <section class="shell locations-grid"><div class="location-art"><MapPin size={70} strokeWidth={1}/><h2>Jihlava</h2><span>VYSOČINA · ČESKÁ REPUBLIKA</span><div class="location-rings"></div></div><div><div class="eyebrow"><span class="eyebrow-line"></span>OBLAST PŮSOBNOSTI</div>{#each ['Jihlava a okolní obce','Třešť a Telč','Polná a Velké Meziříčí','Pelhřimov a Humpolec'] as city}<div class="city-row">{city}<ArrowUpRight size={20}/></div>{/each}<p>Vaše obec tu není? Ozvěte se. Dostupnost domluvíme podle místa a rozsahu práce.</p>{@render quoteButton('Domluvit zakázku')}</div></section>
 {:else}
 <section class="shell page-intro"><div class="eyebrow"><span class="eyebrow-line"></span>404 / TADY JE ZATÍM BÍLÁ STĚNA</div><h1 class="split-text">Tahle stránka<br/><em>tu není.</em></h1><p class="lead">Vraťte se na úvod nebo nám zavolejte.</p><a class="btn magnetic" href="/"><span>Zpět na úvod</span> <ArrowRight size={18}/></a></section>
 {/if}
 {#if !isContact}<section class="final-cta"><div class="shell"><div class="cta-bg" aria-hidden="true"><span class="par" data-speed="0.1"></span><span class="par" data-speed="-0.08"></span></div><div class="eyebrow light">Pojďme do toho společně</div><div class="cta-row"><h2 class="split-text">Je čas na změnu?<br/><em>Začneme u vás.</em></h2><div>{@render quoteButton('Pojďme to proměnit','light-btn')}<a class="cta-phone" href="tel:+420602581542"><Phone size={17}/> +420 602 581 542</a></div></div><div class="cta-bottom"><span>Nabídka zdarma a bez závazků</span><span>Odpověď obvykle do dvou dnů</span><span><MapPin size={15}/> Jihlava &amp; Vysočina</span></div></div></section>{/if}
</main>
<footer>
 <div class="footer-wordmark" aria-hidden="true"><span>ŠPEJTEK</span></div>
 <div class="shell"><div class="footer-top"><div>{@render brand(true)}<p>Poctivé řemeslo.<br/>Pro místa, na kterých vám záleží.</p><a class="btn secondary magnetic footer-cta" href="/kontakt"><span>Nezávazná poptávka</span><ArrowUpRight size={17}/></a></div><div><span class="footer-label">CO DĚLÁME</span>{#each services.slice(0,3) as s}<a href={`/${s.slug}`}>{s.title}</a>{/each}</div><div><span class="footer-label">A TAKÉ</span>{#each services.slice(3) as s}<a href={`/${s.slug}`}>{s.title}</a>{/each}</div><div><span class="footer-label">ZŮSTAŇME V KONTAKTU</span><a href="tel:+420602581542">+420 602 581 542 <ArrowUpRight size={15}/></a><a href="/nas-pristup">Náš přístup</a><a href="/lokality-jihlava-vysocina">Jihlava &amp; Vysočina</a><a href="/kontakt">Nezávazná poptávka <ArrowUpRight size={15}/></a></div></div><div class="footer-bottom"><span>© {new Date().getFullYear()} Malířství Špejtek</span><span>Od přípravy podkladu po poslední detail.</span><a href="#obsah">Zpět nahoru <ArrowUpRight size={15}/></a></div></div>
</footer>
<div class="mobile-bar">
 <a class="mobile-bar-call" href="tel:+420602581542"><Phone size={18}/> Zavolat</a>
 <button class="mobile-bar-cta" onclick={openQuote}>Nezávazná poptávka <ArrowUpRight size={17}/></button>
</div>

 {#snippet personSection()}
 <section class="person-section">
  <div class="shell person-grid">
   <div class="person-media">
    <div class="person-photo"><img src="/assets/img/spejtek-remeslnik.webp" srcset={srcset('spejtek-remeslnik.webp')} sizes="(max-width:850px) 92vw, 36vw" alt="Malířství Špejtek — řemeslník, který zakázku odvede osobně" loading="lazy"/></div>
    <div class="float-card person-float par" data-speed="-0.07"><span><Phone size={18}/></span><div><strong>602 581 542</strong><p>Volejte přímo, bez dispečinku.</p></div></div>
   </div>
   <div class="person-copy">
    <div class="eyebrow"><span class="eyebrow-line"></span>Kdo u vás bude pracovat</div>
    <h2 class="split-text">Žádná velká firma.<br/><em>Řemeslník, který za prací stojí.</em></h2>
    <p>Domlouváte se přímo s tím, kdo bude u vás doma pracovat. Beru si na starost celou zakázku — od přípravy podkladu až po úklid po dokončení.</p>
    <div class="person-tags">{#each ['Interiéry','Fasády','Opravy zdí','Dekorativní stěrky a benátský štuk'] as tag}<span><Check size={15}/>{tag}</span>{/each}</div>
    <div class="person-facts">{#each [[MapPin,'Jihlava a okolí'],[ShieldCheck,'Nezávazná cenová nabídka zdarma'],[Clock,'Rychlé termíny']] as [Icon,label]}<span><Icon size={17}/>{label}</span>{/each}</div>
    <div class="person-actions">{@render quoteButton('Domluvit zakázku')}<a class="btn secondary magnetic" href="tel:+420602581542"><span>602 581 542</span><Phone size={17}/></a></div>
   </div>
  </div>
 </section>
{/snippet}

{#snippet timelineSection()}
 <section class="timeline-section" id="postup">
  <div class="timeline-bg" aria-hidden="true"><span class="par" data-speed="0.12"></span><span class="par" data-speed="-0.09"></span></div>
  <div class="shell timeline-grid">
   <div class="timeline-side">
    <div class="eyebrow light"><span class="eyebrow-line"></span>Od domluvy k hotovému prostoru</div>
    <h2 class="split-text">S námi to jde<br/>jednoduše.</h2>
    <p>Čtyři kroky, které projdeme spolu. Víte předem, co se bude dít a kdy.</p>
    <div class="timeline-progress" aria-hidden="true"><span></span></div>
    <a class="btn light-btn magnetic" href="/kontakt"><span>Začít u prvního kroku</span><ArrowUpRight size={18}/></a>
   </div>
   <ol class="timeline-steps">{#each timeline as step,i}<li class="tl-step"><span class="tl-icon">{#if i===0}<MessageSquare size={20}/>{:else if i===1}<CalendarCheck size={20}/>{:else if i===2}<ShieldCheck size={20}/>{:else}<PaintRoller size={20}/>{/if}</span><h3>{step.title}</h3><p>{step.text}</p><ul>{#each step.points as point}<li><Check size={15}/>{point}</li>{/each}</ul></li>{/each}</ol>
  </div>
 </section>
{/snippet}

{#snippet compareSection()}
 <section class="compare-section">
  <div class="shell compare-grid">
   <div class="comparison" style={`--position:${comparison}%`}><img src={`/assets/img/${pair.before}`} srcset={srcset(pair.before)} sizes="(max-width:850px) 92vw, 55vw" alt={`${pair.label} před prací`} loading="lazy"/><img class="after-photo" src={`/assets/img/${pair.after}`} srcset={srcset(pair.after)} sizes="(max-width:850px) 92vw, 55vw" alt={`${pair.label} po dokončení`} loading="lazy"/><span class="before-label">Před</span><span class="after-label">Po</span><div class="compare-divider"><span><MoveHorizontal size={22}/></span></div><input type="range" min="0" max="100" bind:value={comparison} aria-label={`Porovnání: ${pair.label} před a po`}/></div>
   <div class="comparison-copy">
    <div class="eyebrow"><span class="eyebrow-line"></span>Rozdíl je vidět</div>
    <h2 class="split-text">Váš domov.<br/><em>V novém světle.</em></h2>
    <p>Opravené stěny, svěží barva a čisté detaily. Přetáhněte posuvník a podívejte se, co dokáže poctivá příprava a výmalba.</p>
    <div class="pair-switch" role="group" aria-label="Vyberte proměnu">{#each pairs as p,i}<button class:selected={i===pairIndex} aria-pressed={i===pairIndex} onclick={()=>{pairIndex=i;comparison=50;}}>{p.label}</button>{/each}</div>
    <p class="pair-note">{pair.note}</p>
    <span class="compare-hint"><MoveHorizontal size={20}/> Posuňte a porovnejte proměnu</span>
   </div>
  </div>
 </section>
{/snippet}

{#snippet shadeSection()}
 <section class="shade-section" id="odstiny">
  <div class="shell shade-grid">
   <div class="shade-copy">
    <div class="eyebrow"><span class="eyebrow-line"></span>Vyberte odstín</div>
    <h2 class="split-text">Barva mění<br/><em>celou místnost.</em></h2>
    <p>Vyzkoušejte si, jak se prostor promění s jiným odstínem. Při zakázce vám vzorek naneseme přímo na vaši stěnu, abyste ho viděli ve vlastním světle.</p>
    <div class="shade-swatches" role="group" aria-label="Vyberte odstín stěny">{#each shades as s,i}<button class:selected={i===shadeIndex} aria-pressed={i===shadeIndex} onclick={()=>shadeIndex=i} style={`--swatch:${s.hex}`}><span></span>{s.name}</button>{/each}</div>
    <div class="shade-detail"><strong>{shade.name}</strong><p>{shade.note}</p></div>
    {@render quoteButton('Poradíme s výběrem')}
   </div>
   <div class="shade-visual"><img src="/assets/img/interier-po.webp" srcset={srcset('interier-po.webp')} sizes="(max-width:850px) 92vw, 52vw" alt="Interiér po výmalbě" loading="lazy"/><span class="shade-overlay" class:dark={shade.tone==='dark'} class:mid={shade.tone==='mid'} style={`background:${shade.hex}`}></span><span class="shade-chip" style={`--swatch:${shade.hex}`}><i></i>{shade.name}</span></div>
  </div>
 </section>
{/snippet}

{#snippet quoteForm(prefix)}
 <p class="form-help">Vyplňte pár údajů. Připravíme text SMS, který si před odesláním můžete zkontrolovat a doplnit o fotografie.</p><form onsubmit={prepareSms}><div class="form-grid"><label for={`${prefix}-name`}>Vaše jméno<input id={`${prefix}-name`} name="name" autocomplete="name" placeholder="Jan Novák" required/></label><label for={`${prefix}-location`}>Lokalita<input id={`${prefix}-location`} name="location" autocomplete="address-level2" placeholder="Např. Jihlava" required/></label><label for={`${prefix}-service`}>S čím pomůžeme<select id={`${prefix}-service`} name="service">{#each services as s}<option selected={s===service}>{s.title}</option>{/each}<option>Jiná práce</option></select></label><label for={`${prefix}-term`}>Přibližný termín<input id={`${prefix}-term`} name="term" placeholder="Dle domluvy"/></label><label class="full" for={`${prefix}-message`}>Vaše představa<textarea id={`${prefix}-message`} name="message" rows="3" placeholder="Počet místností, stav stěn, přibližný rozsah…"></textarea></label></div><button type="submit" class="btn">Připravit poptávku <ArrowRight size={18}/></button><p class="form-footnote">Zprávu odešlete až po potvrzení ve své SMS aplikaci.</p></form>{#if smsText}<div class="sms-preview" aria-live="polite"><h3>Vaše zpráva je připravená</h3><p>Otevřete SMS a potvrďte odeslání v telefonu. Na počítači můžete text zkopírovat.</p><pre>{smsText}</pre><div class="sms-actions"><a class="btn" href={`sms:+420602581542?&body=${encodeURIComponent(smsText)}`}>Otevřít SMS <ArrowUpRight size={17}/></a><button class="text-link" onclick={copyText}>{copied?'Zkopírováno ✓':'Kopírovat text'}</button></div></div>{/if}
{/snippet}
<dialog bind:this={quoteDialog} class="quote-dialog" aria-labelledby="quote-title"><button class="dialog-close" aria-label="Zavřít poptávku" onclick={()=>quoteDialog.close()}><X/></button><div class="eyebrow">NEZÁVAZNÁ NABÍDKA</div><h2 id="quote-title">Začněme vaší<br/><em>představou.</em></h2>{@render quoteForm('modal')}</dialog>
<dialog bind:this={photoDialog} class="photo-dialog" aria-label="Detail realizace"><button class="dialog-close" aria-label="Zavřít fotografii" onclick={()=>photoDialog.close()}><X/></button>{#if filteredProjects[photoIndex]}<img src={`/assets/img/${filteredProjects[photoIndex].image}`} alt={filteredProjects[photoIndex].caption}/><div class="photo-controls"><button aria-label="Předchozí fotografie" onclick={()=>stepPhoto(-1)}><ChevronLeft/></button><p>{filteredProjects[photoIndex].caption}<span>{photoIndex+1} / {filteredProjects.length}</span></p><button aria-label="Další fotografie" onclick={()=>stepPhoto(1)}><ChevronRight/></button></div>{/if}</dialog>
