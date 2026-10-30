import { useEffect, useRef, useState } from 'react';
import { Play } from '@/components/icons';
import { cn } from '@/lib/utils';

/** Chapter start times (seconds) in /videos/tour-v1.mp4. Re-check them whenever the video is re-filmed. */
const CHAPTERS = [
  { t: 4, label: 'Run Python in a lesson', sub: 'Edit the code, press Run, check your understanding' },
  { t: 34, label: 'Play in the Kids Zone', sub: 'Launch Lab: aim, miss, adjust, score' },
  { t: 63, label: 'Ask Zuva for help', sub: 'A patient tutor that plans real experiments' },
] as const;

const stamp = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * The landing-page tour: a short silent screen recording with captions burnt in, so it works
 * muted on a phone. Nothing downloads until the visitor presses play (preload="none", ~2 MB).
 */
export function TourVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => {
      let i = -1;
      CHAPTERS.forEach((c, k) => { if (v.currentTime >= c.t - 0.25) i = k; });
      setActive(v.currentTime > 0 ? i : -1);
    };
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, []);

  const jump = (t: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t;
    void v.play().catch(() => {});
  };

  return (
    <section className="border-b border-border py-16 md:py-24" aria-labelledby="tour-heading">
      {/* Phones: heading, video, chapters. Desktop: heading and chapters on the left, video on the right. */}
      <div className="container grid [&>*]:min-w-0 gap-x-14 gap-y-8 lg:grid-cols-[0.8fr_1.2fr] lg:grid-rows-[auto_1fr]">
        <div data-reveal className="lg:self-end">
          <h2 id="tour-heading" className="display-lg">See how it works</h2>
          <p className="lede mt-5 max-w-md text-fg/85">A quick tour: write and run Python in a lesson, then watch a child play, learn and get help from Zuva.</p>
        </div>
        <figure data-reveal style={{ ['--i' as string]: 1 }} className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <div className="overflow-hidden rounded-2xl border border-border bg-ink shadow-[0_24px_60px_-24px_rgba(12,28,56,.45)]">
            <video
              ref={ref}
              className="block aspect-video w-full"
              controls
              playsInline
              muted
              preload="none"
              poster="/videos/tour-v1-poster.webp"
              aria-label="Tour of Global AI Academy: running Python in a lesson, playing Launch Lab in the Kids Zone, and asking Zuva for help"
              aria-describedby="tour-description"
            >
              <source src="/videos/tour-v1.mp4" type="video/mp4" />
            </video>
          </div>
          <figcaption className="mt-3 text-sm text-fg/70">
            1 min 24 s · no sound, captions on screen
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-teal-600 underline-offset-4 hover:underline">What the video shows</summary>
              <div id="tour-description" className="mt-2 space-y-2 text-fg/80">
                <p>A Python lesson opens its live editor. Two lines are added that store the name Rudo and print a welcome. Pressing Run shows the output under Output, straight away in the browser. Then a short quiz is answered and marked 2 of 2 correct.</p>
                <p>In the Kids Zone, a child opens Launch Lab and throws a mango at a basket. The first throw lands 15 m short, so the angle goes up to 45° and the power to 19. The next throw lands in the basket and earns three stars.</p>
                <p>The child asks Zuva, the tutor, “Can we build a bridge at home?” Zuva replies with a safe paper bridge experiment: materials found at home, steps, the science behind it, and a link to the Bridge Builder game.</p>
              </div>
            </details>
          </figcaption>
        </figure>
        <ol data-reveal className="space-y-2 lg:col-start-1 lg:row-start-2">
          {CHAPTERS.map((c, i) => (
            <li key={c.t}>
              <button
                type="button"
                onClick={() => jump(c.t)}
                aria-current={active === i ? 'step' : undefined}
                className={cn(
                  'group flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-colors',
                  active === i ? 'border-teal-600 bg-teal-600/10' : 'border-border hover:border-fg/30 hover:bg-fg/[.03]',
                )}
              >
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', active === i ? 'bg-teal-600 text-white' : 'bg-granite-100 text-fg dark:bg-night-800')}>
                  <Play className="h-4 w-4 fill-current" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-semibold">{c.label}</span>
                  <span className="block text-sm text-fg/70">{c.sub}</span>
                </span>
                <span className="text-sm tabular text-fg/60">{stamp(c.t)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
