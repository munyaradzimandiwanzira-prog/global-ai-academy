import { Link } from 'react-router-dom';
import { Wifi, Smartphone, HandHeart, Globe2 } from 'lucide-react';
import { catalog } from '@/lib/catalog';

export default function About() {
  const lessons = catalog.reduce((n, t) => n + t.lessons.length, 0);
  return (
    <>
      <section className="bg-ink text-white dark:bg-night-800">
        <div className="container max-w-4xl py-16">
          <h1 className="text-4xl font-bold md:text-5xl">A school for builders, made in Zimbabwe</h1>
          <p className="mt-5 text-lg leading-relaxed text-white/75">
            Global AI Academy exists so that any learner in Zimbabwe — in Harare or Hwange, on a laptop or a phone — can learn to code, build AI and ship real software. We teach by doing: every lesson has code you can run right in the browser, and an AI coach that helps without giving the answer away.
          </p>
        </div>
        <div className="chevron-band" />
      </section>
      <div className="container max-w-4xl py-14">
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            { icon: Wifi, title: 'Built for real connections', text: 'Lessons are small and load fast. Python, JavaScript, HTML and SQL run on your own device, so practising uses very little data.' },
            { icon: Smartphone, title: 'Phone-first', text: 'Every page works on a phone. Start a lesson on the kombi and finish it on a laptop — your progress follows you.' },
            { icon: HandHeart, title: 'Free at the core', text: `All ${catalog.length} tracks and ${lessons} lessons are free. Paid plans fund the AI tutor, certificates and teacher-led classes.` },
            { icon: Globe2, title: 'Local context, global standard', text: 'Examples use places, prices and problems you recognise, while the skills match what employers anywhere expect.' },
          ].map((b) => (
            <div key={b.title} className="card p-6">
              <b.icon className="h-6 w-6 text-teal" />
              <h2 className="mt-3 font-display text-xl font-semibold">{b.title}</h2>
              <p className="mt-2 text-sm text-muted-fg">{b.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/learn/start-here" className="btn-primary btn-lg">Start learning</Link>
          <Link to="/contact" className="btn-outline btn-lg">Partner with us</Link>
        </div>
      </div>
    </>
  );
}
