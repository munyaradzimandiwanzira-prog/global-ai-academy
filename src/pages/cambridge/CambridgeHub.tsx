import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ESL_BANDS } from '@shared/esl';
import { ArrowRight } from '@/components/icons';
import { Zuva } from '@/features/kids/Zuva';

/** The Cambridge tab: courses that follow Cambridge curricula and levels. */
export default function CambridgeHub() {
  useEffect(() => { document.title = 'Cambridge curriculum | Global AI Academy'; }, []);
  return (
    <div className="min-h-screen bg-[#EEF4F3] text-ink">
      <div className="container max-w-6xl space-y-8 py-10">
        <header className="max-w-3xl space-y-3">
          <p className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-bold">Cambridge curriculum</p>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Learn the Cambridge way, with Zuva</h1>
          <p className="text-lg text-ink/80">Courses that follow Cambridge stages and levels, so learners, parents and teachers can see exactly where they are. Our own mapping, not endorsed by Cambridge.</p>
        </header>
        <div className="grid gap-5 md:grid-cols-2">
          <Link to="/cambridge/esl" className="group flex flex-col rounded-3xl border-4 border-ink bg-white p-6 shadow-[0_6px_0_#0C1C38] transition hover:-translate-y-1">
            <div className="flex items-center gap-4"><Zuva size={64} /><span className="chip bg-gold-100 text-gold-700">New</span></div>
            <h2 className="mt-4 font-display text-2xl font-bold">English as a Second Language</h2>
            <p className="mt-2 text-ink/80">Ages 2 to 20, from first words to Cambridge B2 First. 36 weeks of speaking, listening, phonics, reading and writing games. Zuva listens, sounds out words with you, makes new games as you grow and tells your teacher how you’re doing.</p>
            <ul className="mt-4 flex flex-wrap gap-1.5 text-xs font-bold">{ESL_BANDS.map((b) => <li key={b.id} className="rounded-full bg-[#EEF4F3] px-2.5 py-1">{b.name} · {b.ages}</li>)}</ul>
            <span className="mt-5 inline-flex items-center gap-1 font-bold">Start English <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </Link>
          <Link to="/kids/curriculum" className="group flex flex-col rounded-3xl border-4 border-ink bg-white p-6 shadow-[0_6px_0_#0C1C38] transition hover:-translate-y-1">
            <span className="text-5xl" aria-hidden="true">🧮</span>
            <h2 className="mt-4 font-display text-2xl font-bold">Kids Zone by Cambridge stage</h2>
            <p className="mt-2 text-ink/80">87 levels of coding, science and maths games mapped to Cambridge Primary Stages 1–6 and Lower Secondary Stage 7 (Computing, Science and Mathematics).</p>
            <span className="mt-auto inline-flex items-center gap-1 pt-5 font-bold">See the stage map <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
