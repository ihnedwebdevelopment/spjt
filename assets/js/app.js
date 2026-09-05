(() => {
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('load', () => setTimeout(() => $('.preloader')?.classList.add('is-hidden'), 350));
  setTimeout(() => $('.preloader')?.classList.add('is-hidden'), 1800);

  const header = $('.site-header');
  const onScroll = () => header?.classList.toggle('is-scrolled', scrollY > 24);
  const mobileCta=$('.mobile-cta'); const onCta=()=>mobileCta?.classList.toggle('is-visible',scrollY>360); onScroll(); onCta(); addEventListener('scroll', onScroll, {passive:true}); addEventListener('scroll', onCta, {passive:true});

  const toggle = $('.menu-toggle'), menu = $('.mobile-menu');
  const setMenu = open => {
    toggle?.classList.toggle('is-active', open); toggle?.setAttribute('aria-expanded', String(open));
    menu?.classList.toggle('is-open', open); document.body.classList.toggle('menu-open', open);
  };
  toggle?.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('.mobile-menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if(e.key === 'Escape') { setMenu(false); closeModal(); closeLightbox(); } });

  if(!reduced) {
    const reveals = $$('.reveal, .process-step');
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if(e.isIntersecting){e.target.classList.add('is-visible'); io.unobserve(e.target);}
    }), {threshold:.04, rootMargin:'0px 0px 100px'});
    reveals.forEach(el => io.observe(el));
    const revealVisible = () => reveals.forEach(el => { if(!el.classList.contains('is-visible') && el.getBoundingClientRect().top < innerHeight * 1.08) el.classList.add('is-visible'); });
    revealVisible(); addEventListener('scroll', revealVisible, {passive:true});

    const parallax = $$('[data-parallax]');
    let ticking = false;
    const updateParallax = () => {
      const y = scrollY;
      parallax.forEach(el => {
        const speed = parseFloat(el.dataset.parallax || '0');
        const rect = el.parentElement?.getBoundingClientRect();
        if(rect && rect.bottom > -200 && rect.top < innerHeight + 200) el.style.setProperty('--parallax-y', `${(y - Number(el.dataset.start || 0))*speed}px`);
      });
      ticking = false;
    };
    parallax.forEach(el => el.dataset.start = String(scrollY));
    addEventListener('scroll', () => { if(!ticking){requestAnimationFrame(updateParallax);ticking=true;} }, {passive:true});

    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        if(innerWidth < 900) return;
        const r=card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        card.style.transform=`perspective(900px) rotateX(${-y*4}deg) rotateY(${x*5}deg) translateY(-5px)`;
      });
      card.addEventListener('pointerleave', () => card.style.transform='');
    });
  } else $$('.reveal,.process-step').forEach(el=>el.classList.add('is-visible'));

  $$('[data-count]').forEach(el => {
    const target = Number(el.dataset.count), suffix = el.dataset.suffix || ''; el.textContent='0'+suffix;
    const io = new IntersectionObserver(([entry]) => {
      if(!entry.isIntersecting) return; io.disconnect();
      const start=performance.now(), duration=1100;
      const tick=now=>{const p=Math.min(1,(now-start)/duration), value=Math.round(target*(1-Math.pow(1-p,3)));el.textContent=value+suffix;if(p<1)requestAnimationFrame(tick)};
      requestAnimationFrame(tick);
    },{threshold:.5}); io.observe(el);
  });

  $$('.comparison').forEach(c => {
    const range=$('input[type=range]',c); if(!range)return;
    range.addEventListener('input',()=>c.style.setProperty('--position',range.value+'%'));
  });

  $$('.faq-item').forEach(item => item.addEventListener('toggle', () => {
    if(item.open) $$('.faq-item').forEach(other => { if(other!==item) other.removeAttribute('open'); });
  }));

  const modal=$('.quote-modal');
  function openModal(){modal?.classList.add('is-open');document.body.classList.add('modal-open');setTimeout(()=>$('input',modal)?.focus(),200)}
  function closeModal(){modal?.classList.remove('is-open');document.body.classList.remove('modal-open')}
  $$('[data-open-quote]').forEach(b=>b.addEventListener('click',openModal));
  $$('[data-close-quote]').forEach(b=>b.addEventListener('click',closeModal));
  modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});

  const sendSms = form => {
    const data = new FormData(form);
    const rows = ['Dobrý den, mám zájem o nezávaznou nabídku.', `Jméno: ${data.get('name')||'-'}`, `Lokalita: ${data.get('location')||'-'}`, `Typ práce: ${data.get('service')||'-'}`, `Termín: ${data.get('term')||'-'}`, `Popis: ${data.get('message')||'-'}`];
    location.href = `sms:+420602581542?&body=${encodeURIComponent(rows.join('\n'))}`;
  };
  $$('form[data-sms-form]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();sendSms(form)}));

  const projects = $$('.project-card');
  $$('.gallery-filter').forEach(btn => btn.addEventListener('click', () => {
    $$('.gallery-filter').forEach(b=>b.classList.remove('is-active'));btn.classList.add('is-active');
    const f=btn.dataset.filter;projects.forEach(p=>p.classList.toggle('is-hidden',f!=='all'&&p.dataset.category!==f));
  }));

  const lightbox=$('.lightbox'), lightImg=$('.lightbox img'); let current=0; let images=[];
  function showLightbox(i){if(!lightbox||!lightImg)return;images=$$('[data-lightbox]:not(.is-hidden) img');current=(i+images.length)%images.length;lightImg.src=images[current].src;lightImg.alt=images[current].alt;lightbox.classList.add('is-open');document.body.classList.add('modal-open')}
  function closeLightbox(){lightbox?.classList.remove('is-open');if(!modal?.classList.contains('is-open'))document.body.classList.remove('modal-open')}
  $$('[data-lightbox]').forEach(card=>card.addEventListener('click',()=>{images=$$('[data-lightbox]:not(.is-hidden) img');showLightbox(images.indexOf($('img',card))) }));
  $('.lightbox-close')?.addEventListener('click',closeLightbox);$('.lightbox-prev')?.addEventListener('click',()=>showLightbox(current-1));$('.lightbox-next')?.addEventListener('click',()=>showLightbox(current+1));
  lightbox?.addEventListener('click',e=>{if(e.target===lightbox)closeLightbox()});

  $$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
})();