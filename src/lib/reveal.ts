import { useEffect, useRef } from 'react';

/**
 * Entrances that never hide content: the page renders fully visible; only once this hook runs does
 * it add `reveal-ready` to the container, which arms [data-reveal] children to rise in once as they
 * enter the viewport. Reduced-motion users and browsers without IntersectionObserver see no motion.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    // Anything already on screen stays put (no flash); only content below the fold animates.
    const below = items.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);
    if (!below.length) return;
    root.classList.add('reveal-ready');
    items.filter((el) => !below.includes(el)).forEach((el) => el.classList.add('is-in'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    below.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}
