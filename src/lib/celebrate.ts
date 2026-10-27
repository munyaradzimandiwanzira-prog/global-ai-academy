const BRAND = ['#D4A64A', '#23807F', '#142B52', '#6B3A1E', '#F5F0E6'];

export async function celebrate(size: 'small' | 'big' = 'small') {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const confetti = (await import('canvas-confetti')).default;
  if (size === 'small') {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.75 }, colors: BRAND, scalar: 0.9 });
  } else {
    const end = Date.now() + 900;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors: BRAND });
      confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors: BRAND });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}
