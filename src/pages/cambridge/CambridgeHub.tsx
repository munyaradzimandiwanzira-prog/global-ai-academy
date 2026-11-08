import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ESL_BANDS } from '@shared/esl';
import { ArrowRight } from '@/components/icons';
import { Zuva } from '@/features/kids/Zuva';
import { TrackMark } from '@/components/ui';

/** The Cambridge tab: courses that follow Cambridge curricula and levels. */
export default function CambridgeHub() {
  useEffect(() => { document.title = 'Cambridge curriculum | Global AI Academy'; }, []);
  return (
    <div className="min-h-screen bg-granite text-ink dark:bg-night dark:text-white">
      <div className="container space-y-8 py-12">
        <header className="max-w-3xl space-y-3">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Cambridge courses, taught by Zuva</h1>
          <p className="text-lg text-ink dark:text-white/90">Courses that follow Cambridge stages and levels, so learners, parents and teachers can see exactly where they are. Our own mapping, not endorsed by Cambridge.</p>
        </header>
        <div className="grid gap-5 md:grid-cols-2">
          <Link to="/cambridge/esl" className="group flex flex-col rounded-[4px] bg-white p-6 transition-colors hover:bg-granite-100 dark:bg-night-700 dark:hover:bg-night-800">
            <Zuva size={64} />
            <h2 className="mt-4 font-display text-2xl font-bold">English as a Second Language, new this term</h2>
            <p className="mt-2 text-ink dark:text-white/90">Ages 2 to 20, from first words to Cambridge B2 First. 36 weeks of speaking, listening, phonics, reading and writing games. Zuva listens, sounds out words with you, makes new games as you grow and tells your teacher how you’re doing.</p>
            <p className="mt-3 text-[15px]">{ESL_BANDS.map((b) => `${b.name} (${b.ages})`).join(' · ')}</p>
            <span className="mt-5 inline-flex items-center gap-1 font-bold">Start English <ArrowRight className="transition-transform duration-[180ms] group-hover:translate-x-1 motion-reduce:transition-none" /></span>
          </Link>
          <Link to="/kids/curriculum" className="group flex flex-col rounded-[4px] bg-white p-6 transition-colors hover:bg-granite-100 dark:bg-night-700 dark:hover:bg-night-800">
            <TrackMark short="Kz" color="#1F7A6E" size={64} />
            <h2 className="mt-4 font-display text-2xl font-bold">Kids Zone by Cambridge stage</h2>
            <p className="mt-2 text-ink dark:text-white/90">87 levels of coding, science and maths games mapped to Cambridge Primary Stages 1–6 and Lower Secondary Stage 7 (Computing, Science and Mathematics).</p>
            <span className="mt-auto inline-flex items-center gap-1 pt-5 font-bold">See the stage map <ArrowRight className="transition-transform duration-[180ms] group-hover:translate-x-1 motion-reduce:transition-none" /></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
