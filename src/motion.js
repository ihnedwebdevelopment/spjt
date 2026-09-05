import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Progressive enhancement: the server-rendered site is fully visible and usable
 * without GSAP. Everything here only adds motion on top of working HTML.
 */
export function mountMotion(root) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  const removers = [];
  let disposed = false;
  let refreshFrame = 0;

  const select = (selector, scope = root) => Array.from(scope.querySelectorAll(selector));
  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    removers.push(() => target.removeEventListener(type, handler, options));
  };
  const refresh = () => {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => { if (!disposed) ScrollTrigger.refresh(); });
  };

  /* ---------------------------------------------------------------
     Rozdělení nadpisů na slova — běží jen na klientovi, SSR zůstává čisté.
  --------------------------------------------------------------- */
  function splitWords(element) {
    if (element.dataset.split) return Array.from(element.querySelectorAll('.word > span'));
    const inners = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          if (!child.textContent.trim()) return;
          const fragment = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (!part.trim()) { fragment.appendChild(document.createTextNode(part)); return; }
            const outer = document.createElement('span');
            outer.className = 'word';
            const inner = document.createElement('span');
            inner.textContent = part;
            outer.appendChild(inner);
            fragment.appendChild(outer);
            inners.push(inner);
          });
          node.replaceChild(fragment, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR' && !(child instanceof SVGElement)) {
          walk(child);
        }
      });
    };
    walk(element);
    element.dataset.split = '1';
    return inners;
  }

  /* Mobilní spodní lišta funguje i při omezeném pohybu — není to animace. */
  const mobileBar = document.querySelector('.mobile-bar');
  if (mobileBar) {
    const syncBar = () => mobileBar.classList.toggle('is-top', (window.scrollY || 0) < 300);
    syncBar();
    on(window, 'scroll', syncBar, { passive: true });
  }

  media.add({
    desktop: '(min-width: 900px)',
    mobile: '(max-width: 899px)',
    reduced: '(prefers-reduced-motion: reduce)',
  }, (context) => {
    if (context.conditions.reduced) return;
    const desktop = context.conditions.desktop;
    const distance = desktop ? 30 : 15;
    const duration = desktop ? 0.8 : 0.55;
    const animated = new Set();
    const focusTargets = [];
    const cleanups = [];

    /* --- základní odkrývání prvků --------------------------------- */
    function reveal(element, delay = 0) {
      if (animated.has(element) || element.classList.contains('split-text')) return;
      animated.add(element);
      if (element.getBoundingClientRect().bottom <= 0) return;
      const tween = gsap.fromTo(element,
        { y: distance, opacity: 0 },
        {
          y: 0, opacity: 1, duration, delay,
          ease: 'power3.out', clearProps: 'transform,opacity',
          scrollTrigger: { trigger: element, start: 'top 93%', once: true },
        });
      focusTargets.push([element, tween]);
    }

    /* --- nadpisy po slovech --------------------------------------- */
    select('.split-text').forEach((heading) => {
      const words = splitWords(heading);
      if (!words.length) return;
      if (heading.getBoundingClientRect().bottom <= 0) return;
      const tween = gsap.fromTo(words,
        { yPercent: 108, opacity: 0 },
        {
          yPercent: 0, opacity: 1, duration: desktop ? 0.85 : 0.6,
          ease: 'power4.out', stagger: desktop ? 0.045 : 0.03,
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: heading, start: 'top 92%', once: true },
        });
      focusTargets.push([heading, tween]);
    });

    select('.hero-copy > *, .page-intro > *, .detail-hero > div > *')
      .forEach((element, index) => reveal(element, Math.min(index * 0.08, 0.3)));

    select('.trust-row, .hero-mini, .services-grid, .project-grid, .craft-points, .process-grid, .related-services, .materials-grid, .promise-grid, .timeline-steps, .shade-swatches, .testimonial-row')
      .forEach((group) => {
        Array.from(group.children).forEach((element, index) => {
          reveal(element, desktop ? (index % 3) * 0.075 : 0);
        });
      });

    select('.section-heading, .craft-copy > .eyebrow, .craft-copy > p, .craft-copy > .btn, .craft-photo, .comparison, .comparison-copy, .faq-section > div:first-child, .faq-section details, .final-cta > .shell, .detail-media, .detail-inclusions > div:first-child, .inclusion, .detail-inclusions > div > p, .filters, .contact-card, .contact-form, .location-art, .locations-grid > div:last-child, .footer-top > div, .footer-bottom, .service-cta, .calc-panel, .shade-visual, .shade-detail, .pair-switch, .hscroll-hint, .timeline-side > *, .faq-aside')
      .forEach((element) => reveal(element));

    /* --- klávesový fokus nikdy nesmí skončit na skrytém prvku ------ */
    const showFocused = (event) => {
      for (const [element, tween] of focusTargets) {
        if (element.contains(event.target)) {
          tween.scrollTrigger?.kill(false);
          tween.progress(1);
        }
      }
    };
    on(root, 'focusin', showFocused);

    /* --- ukazatel průběhu stránky --------------------------------- */
    const progressBar = document.querySelector('.scroll-progress > span');
    if (progressBar) {
      gsap.fromTo(progressBar, { scaleX: 0 }, {
        scaleX: 1, ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: 0.25 },
      });
    }

    /* --- hlavička po odscrollování -------------------------------- */
    const header = document.querySelector('.header');
    if (header) {
      ScrollTrigger.create({
        start: 'top -40', end: 'max',
        onUpdate: (self) => header.classList.toggle('is-stuck', self.scroll() > 40),
        onRefresh: (self) => header.classList.toggle('is-stuck', self.scroll() > 40),
      });
    }

    /* --- podtržení v hero nadpisu (kreslení SVG) ------------------- */
    const underline = root.querySelector('.underline path');
    if (underline && typeof underline.getTotalLength === 'function') {
      const length = underline.getTotalLength() || 500;
      gsap.fromTo(underline,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 1.2, delay: 0.55, ease: 'power2.inOut' });
    }

    /* --- pohyblivé fotografie v hero ------------------------------ */
    const heroColumns = select('.hero-col');
    heroColumns.forEach((column) => {
      const originals = Array.from(column.children);
      if (!originals.length) return;
      const clones = originals.map((item) => item.cloneNode(true));
      clones.forEach((clone) => { clone.setAttribute('aria-hidden', 'true'); column.appendChild(clone); });
      const gap = parseFloat(getComputedStyle(column).rowGap || '0') || 0;
      const cycle = (column.scrollHeight + gap) / 2;
      if (!(cycle > 40)) { clones.forEach((clone) => clone.remove()); return; }
      const up = column.dataset.drift !== 'down';
      const speed = desktop ? 24 : 18;
      gsap.set(column, { y: up ? 0 : -cycle });
      const loop = gsap.to(column, {
        y: up ? -cycle : 0,
        duration: cycle / speed, ease: 'none', repeat: -1,
      });
      cleanups.push(() => {
        loop.kill();
        gsap.set(column, { clearProps: 'transform' });
        clones.forEach((clone) => clone.remove());
      });
    });

    const heroColumnsWrap = root.querySelector('.hero-columns');
    if (heroColumnsWrap && heroColumns.length) {
      if (desktop && window.matchMedia('(pointer: fine)').matches) {
        const hero = heroColumnsWrap.closest('.hero');
        const track = (event) => {
          const box = hero.getBoundingClientRect();
          const x = (event.clientX - box.left) / box.width - 0.5;
          gsap.to(heroColumns, { x: x * 16, duration: 1, ease: 'power3.out', overwrite: 'auto' });
          gsap.to(root.querySelectorAll('.hero-orb'), { x: x * -30, duration: 1.4, ease: 'power3.out', overwrite: 'auto' });
        };
        hero.addEventListener('pointermove', track);
        cleanups.push(() => {
          hero.removeEventListener('pointermove', track);
          gsap.set(heroColumns, { x: 0 });
        });
      }
    }

    /* --- parallax fotografií (desktop) ---------------------------- */
    if (desktop) {
      select('.showcase-tile > img, .craft-photo > img, .shade-visual > img, .detail-media > img').forEach((image) => {
        gsap.fromTo(image,
          { yPercent: -3.5, scale: 1.1 },
          {
            yPercent: 3.5, scale: 1.1, ease: 'none',
            scrollTrigger: {
              trigger: image.parentElement,
              start: 'top bottom', end: 'bottom top',
              scrub: 0.8, invalidateOnRefresh: true,
            },
          });
      });
    }

    /* --- horizontální galerie realizací --------------------------- */
    const hscrollSection = root.querySelector('.hscroll-section');
    const viewport = hscrollSection?.querySelector('.hscroll');
    const track = hscrollSection?.querySelector('.hscroll-track');
    const hintBar = hscrollSection?.querySelector('.hscroll-bar > i');
    if (desktop && viewport && track) {
      const travel = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
      const fits = () => hscrollSection.offsetHeight < window.innerHeight - 24;
      const setHint = (progress) => { if (hintBar) hintBar.style.marginLeft = `${gsap.utils.clamp(0, 82, progress * 82)}%`; };
      if (travel() > 40) {
        const previousOverflow = viewport.style.overflowX;
        viewport.style.overflowX = 'hidden';
        cleanups.push(() => { viewport.style.overflowX = previousOverflow; });
        const pinned = fits();
        gsap.to(track, {
          x: () => -travel(), ease: 'none',
          scrollTrigger: {
            trigger: pinned ? hscrollSection : viewport,
            start: pinned ? 'top top' : 'top 80%',
            end: pinned ? () => `+=${travel() + 120}` : () => `+=${travel() + window.innerHeight * 0.6}`,
            pin: pinned ? hscrollSection : false,
            anticipatePin: pinned ? 1 : 0,
            scrub: pinned ? 0.6 : 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => setHint(self.progress),
          },
        });
      } else {
        setHint(1);
      }
    } else if (viewport && hintBar) {
      const sync = () => {
        const max = viewport.scrollWidth - viewport.clientWidth;
        hintBar.style.marginLeft = `${max > 0 ? gsap.utils.clamp(0, 82, (viewport.scrollLeft / max) * 82) : 0}%`;
      };
      on(viewport, 'scroll', sync, { passive: true });
      sync();
    }

    /* --- postup: aktivní krok a průběh ---------------------------- */
    const timelineSection = root.querySelector('.timeline-section');
    if (timelineSection) {
      const steps = select('.tl-step', timelineSection);
      steps.forEach((step) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 68%', end: 'bottom 45%',
          onToggle: (self) => step.classList.toggle('is-active', self.isActive),
        });
      });
      const bar = timelineSection.querySelector('.timeline-progress > span');
      const list = timelineSection.querySelector('.timeline-steps');
      if (bar && list) {
        gsap.fromTo(bar, { scaleX: 0 }, {
          scaleX: 1, ease: 'none',
          scrollTrigger: { trigger: list, start: 'top 75%', end: 'bottom 75%', scrub: 0.4 },
        });
      }
    }

    /* --- magnetická tlačítka (jen myš) ---------------------------- */
    if (desktop && window.matchMedia('(pointer: fine)').matches) {
      select('.magnetic').forEach((button) => {
        const label = button.querySelector('span');
        const move = (event) => {
          const box = button.getBoundingClientRect();
          const x = event.clientX - box.left - box.width / 2;
          const y = event.clientY - box.top - box.height / 2;
          gsap.to(button, { x: x * 0.22, y: y * 0.3, duration: 0.5, ease: 'power3.out' });
          if (label) gsap.to(label, { x: x * 0.1, duration: 0.5, ease: 'power3.out' });
        };
        const leave = () => {
          gsap.to(button, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' });
          if (label) gsap.to(label, { x: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' });
        };
        button.addEventListener('pointermove', move);
        button.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          button.removeEventListener('pointermove', move);
          button.removeEventListener('pointerleave', leave);
          gsap.set(button, { clearProps: 'transform' });
          if (label) gsap.set(label, { clearProps: 'transform' });
        });
      });

      /* --- jemný náklon karet a světelný odlesk ------------------- */
      select('.tilt').forEach((card) => {
        const sheen = card.querySelector('.card-sheen');
        const move = (event) => {
          const box = card.getBoundingClientRect();
          const px = (event.clientX - box.left) / box.width;
          const py = (event.clientY - box.top) / box.height;
          gsap.to(card, {
            rotateX: (0.5 - py) * 5, rotateY: (px - 0.5) * 5,
            y: -6, scale: 1.012, transformPerspective: 900,
            duration: 0.5, ease: 'power3.out', overwrite: 'auto',
          });
          if (sheen) { card.style.setProperty('--mx', `${px * 100}%`); card.style.setProperty('--my', `${py * 100}%`); }
        };
        const leave = () => gsap.to(card, {
          rotateX: 0, rotateY: 0, y: 0, scale: 1,
          duration: 0.7, ease: 'power3.out', overwrite: 'auto',
          onComplete: () => gsap.set(card, { clearProps: 'transform' }),
        });
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          card.removeEventListener('pointermove', move);
          card.removeEventListener('pointerleave', leave);
          gsap.set(card, { clearProps: 'transform' });
        });
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, root);

  /* Lazy obrázky, rozbalovací otázky a filtry mohou posunout spouštěče. */
  const resizeObserver = new ResizeObserver(refresh);
  resizeObserver.observe(root);
  root.querySelectorAll('img').forEach((image) => {
    image.addEventListener('load', refresh);
    removers.push(() => image.removeEventListener('load', refresh));
  });
  document.fonts?.ready.then(() => { if (!disposed) refresh(); });
  refresh();

  return () => {
    disposed = true;
    cancelAnimationFrame(refreshFrame);
    resizeObserver.disconnect();
    removers.forEach((remove) => remove());
    media.revert();
  };
}
