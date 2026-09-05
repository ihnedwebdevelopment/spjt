import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Progressive enhancement: the server-rendered site is visible without GSAP. */
export function mountMotion(root) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  const removers = [];
  let disposed = false;
  let refreshFrame = 0;
  const refresh = () => {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => {
      if (!disposed) ScrollTrigger.refresh();
    });
  };

  media.add({
    desktop: '(min-width: 900px)',
    mobile: '(max-width: 899px)',
    reduced: '(prefers-reduced-motion: reduce)',
  }, (context) => {
    if (context.conditions.reduced) return;
    const desktop = context.conditions.desktop;
    const distance = desktop ? 28 : 14;
    const duration = desktop ? 0.8 : 0.55;
    const animated = new Set();
    const focusTargets = [];
    const select = (selector) => Array.from(root.querySelectorAll(selector));

    function reveal(element, delay = 0) {
      if (animated.has(element)) return;
      animated.add(element);
      // Never re-hide content that the visitor has already scrolled past.
      if (element.getBoundingClientRect().bottom <= 0) return;
      const tween = gsap.fromTo(element,
        { y: distance, opacity: 0 },
        {
          y: 0, opacity: 1, duration, delay,
          ease: 'power3.out', clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: element, start: 'top 93%', once: true,
          },
        });
      focusTargets.push([element, tween]);
    }

    select('.hero-heading > *, .page-intro > *, .detail-hero > div > *')
      .forEach((element, index) => reveal(element, Math.min(index * 0.085, 0.32)));

    select('.hero-showcase, .trust-row, .services-grid, .project-grid, .craft-points, .process-grid, .related-services')
      .forEach((group) => {
        Array.from(group.children).forEach((element, index) => {
          // On mobile each card enters independently, without desktop row delays.
          reveal(element, desktop ? (index % 3) * 0.075 : 0);
        });
      });

    select('.section-heading, .craft-copy > .eyebrow, .craft-copy > h2, .craft-copy > p, .craft-copy > .btn, .craft-photo, .comparison, .comparison-copy, .faq-section > div:first-child, .faq-section details, .final-cta > .shell, .detail-hero > img, .detail-inclusions > div:first-child, .inclusion, .detail-inclusions > div > p, .filters, .contact-card, .contact-form, .location-art, .locations-grid > div:last-child, .footer-top > div, .footer-bottom')
      .forEach((element) => reveal(element));

    // Keyboard focus must never land on an element still waiting to be revealed.
    const showFocused = (event) => {
      for (const [element, tween] of focusTargets) {
        if (element.contains(event.target)) {
          tween.scrollTrigger?.kill(false);
          tween.progress(1);
        }
      }
    };
    root.addEventListener('focusin', showFocused);

    if (desktop) {
      select('.showcase-tile > img, .craft-photo > img').forEach((image) => {
        gsap.fromTo(image,
          { yPercent: -3, scale: 1.09 },
          {
            yPercent: 3, scale: 1.09, ease: 'none',
            scrollTrigger: {
              trigger: image.parentElement,
              start: 'top bottom', end: 'bottom top',
              scrub: 0.8, invalidateOnRefresh: true,
            },
          });
      });
    }
    return () => root.removeEventListener('focusin', showFocused);
  }, root);

  // Lazy images, accordions and gallery filters can move downstream triggers.
  const resizeObserver = new ResizeObserver(refresh);
  resizeObserver.observe(root);
  root.querySelectorAll('img').forEach((image) => {
    image.addEventListener('load', refresh);
    removers.push(() => image.removeEventListener('load', refresh));
  });
  document.fonts.ready.then(() => { if (!disposed) refresh(); });
  refresh();

  return () => {
    disposed = true;
    cancelAnimationFrame(refreshFrame);
    resizeObserver.disconnect();
    removers.forEach((remove) => remove());
    media.revert();
  };
}
