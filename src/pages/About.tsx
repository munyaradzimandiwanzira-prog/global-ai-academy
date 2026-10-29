import { Link } from 'react-router-dom';
import { catalog } from '@/lib/catalog';
import { Photo } from '@/components/Photo';

export default function About() {
  const lessons = catalog.reduce((n, t) => n + t.lessons.length, 0);
  const principles = [
    { title: 'Built for real connections', text: 'Lessons are small and load fast. Python, JavaScript, HTML and SQL run on your own device, so practising uses very little data.' },
    { title: 'Phone-first', text: 'Every page works on a phone. Start a lesson on the kombi and finish it on a laptop — your progress follows you.' },
    { title: 'Free at the core', text: `All ${catalog.length} tracks and ${lessons} lessons are free to read. Paid plans fund the AI tutor, certificates, the professional tracks and teacher-led classes.` },
    { title: 'Local context, global standard', text: 'Examples use places, prices and problems you recognise, while the skills match what employers anywhere expect.' },
  ];
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white dark:bg-night-800">
        {/* The Zimbabwe Bird: carved at Great Zimbabwe, now on the flag. A faded emblem, not a picture to study. */}
        <Photo
          name="zimbabwe-bird"
          alt=""
          sizes="(min-width: 768px) 300px, 0px"
          className="pointer-events-none absolute -right-6 bottom-0 hidden h-[375px] w-[300px] opacity-80 mix-blend-multiply md:block lg:right-[8%] [mask-image:radial-gradient(ellipse_48%_52%_at_52%_46%,#000_45%,transparent_100%)]"
          imgClassName="object-contain object-bottom"
        />
        <div className="container relative py-16 md:py-24">
          <p className="eyebrow !text-gold">About the Academy</p>
          <h1 className="mt-3 max-w-[18ch] text-4xl font-extrabold md:text-5xl">A school for builders, made in Zimbabwe</h1>
          <p className="lede mt-6 max-w-2xl text-white/85">
            Global AI Academy exists so that any learner in Zimbabwe — in Harare or Hwange, on a laptop or a phone — can learn to code, build AI and ship real software. We teach by doing: every lesson has code you can run in the browser, and an AI coach that helps without giving the answer away.
          </p>
        </div>
        <div className="chevron-band" aria-hidden="true" />
      </section>

      <div className="container grid gap-12 py-16 md:py-20 lg:grid-cols-[0.8fr_1.4fr]">
        <div>
          <h2 className="display-md">How we teach</h2>
          <p className="mt-4 max-w-sm text-muted-fg">Four decisions shape every page on the site.</p>
        </div>
        <dl className="divide-y divide-border border-y border-border">
          {principles.map((p) => (
            <div key={p.title} className="grid gap-2 py-6 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8">
              <dt className="font-display text-lg font-bold">{p.title}</dt>
              <dd className="text-fg/80">{p.text}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="container flex flex-wrap gap-3 pb-20">
        <Link to="/learn/start-here" className="btn-primary btn-lg">Start learning</Link>
        <Link to="/contact" className="btn-outline btn-lg">Partner with us</Link>
      </div>
    </>
  );
}
