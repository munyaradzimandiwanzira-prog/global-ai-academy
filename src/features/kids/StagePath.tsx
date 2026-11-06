import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Star } from '@/components/icons';
import { cn } from '@/lib/utils';
import { KID_GAMES as SHARED_GAMES } from '@shared/kids-games';
import { STAGES, STRANDS, STRAND_ORDER, SUBJECTS, levelHref, levelsAt, type KidLevel, type StageId } from '@shared/kids-curriculum';
import { useKidsStage } from './stage';

type Art = ComponentType<{ size?: number; className?: string }>;
const ORDER = new Map(SHARED_GAMES.map((g, i) => [g.id, i]));

/** Big stage buttons: the child (or a grown-up) picks once and the Kids Zone remembers. */
export function StagePicker() {
  const [stage, setStage] = useKidsStage();
  return (
    <div role="radiogroup" aria-label="Choose your stage" className="flex flex-wrap gap-2">
      {STAGES.map((s) => {
        const on = stage === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setStage(on ? null : s.id)}
            className={cn('min-h-14 rounded-2xl border-4 px-4 py-1.5 text-left transition-transform active:scale-95', on ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white hover:border-ink/40')}
          >
            <span className="block text-lg font-bold leading-tight">{s.name}</span>
            <span className={cn('block text-[13px] font-semibold leading-tight', on ? 'text-white/80' : 'text-ink/60')}>Ages {s.ages}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The chosen stage's levels, grouped by subject, each opening the game on that level. */
export function StagePath({ art, stars }: { art: Record<string, Art>; stars: Record<string, number> }) {
  const [stage, setStage] = useKidsStage();
  const s = STAGES.find((x) => x.id === stage);
  if (!s) return null;
  const levels = levelsAt(s.id);
  const done = levels.filter((l) => (stars[l.key] ?? 0) > 0).length;
  const prev = STAGES.find((x) => x.id === s.id - 1);
  const next = STAGES.find((x) => x.id === s.id + 1);
  const firstStrand = (l: KidLevel) => STRAND_ORDER.indexOf(l.strands[0]!);

  return (
    <section aria-labelledby="stage-path" className="mx-auto mt-8 max-w-6xl">
      <div className="rounded-[28px] border-4 border-ink bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#23807F]">{s.programme} · {s.grade}</p>
            <h2 id="stage-path" className="mt-1 text-3xl font-bold sm:text-4xl">{s.name} path</h2>
            <p className="mt-1 max-w-xl text-[17px] text-ink/75">{s.blurb}</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-sm font-bold tabular"><span>{done} of {levels.length} levels done</span><span>{Math.round((done / levels.length) * 100)}%</span></div>
            <div className="mt-1.5 h-4 overflow-hidden rounded-full border-2 border-ink bg-[#EEF4F3]" role="progressbar" aria-valuemin={0} aria-valuemax={levels.length} aria-valuenow={done} aria-label={`${s.name} progress`}>
              <motion.div className="h-full bg-gold" initial={{ width: 0 }} animate={{ width: `${(done / levels.length) * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
            </div>
          </div>
        </div>

        {SUBJECTS.map((subject) => {
          const items = levels
            .filter((l) => STRANDS[l.strands[0]!].subject === subject.id)
            .sort((a, b) => firstStrand(a) - firstStrand(b) || (ORDER.get(a.game)! - ORDER.get(b.game)!));
          if (!items.length) return null;
          return (
            <div key={subject.id} className="mt-7">
              <h3 className="text-xl font-bold">{subject.name}</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((l) => {
                  const g = SHARED_GAMES.find((x) => x.id === l.game)!;
                  const A = art[l.game]!;
                  const earned = stars[l.key] ?? 0;
                  return (
                    <li key={l.key}>
                      <Link to={levelHref(l)} className="group flex h-full items-start gap-3 rounded-3xl border-[3px] border-ink/15 bg-[#F7FBFA] p-3.5 transition-colors hover:border-ink">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${g.color}1f` }}><A size={44} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold" style={{ color: g.color }}>{g.title}</span>
                          <span className="block text-[17px] font-bold leading-snug">{l.name}</span>
                          <span className="mt-0.5 block text-[15px] leading-snug text-ink/75">{l.goal}</span>
                          <span className="mt-1.5 flex" aria-label={`${earned} of 3 stars`}>{[1, 2, 3].map((n) => <Star key={n} className={cn('h-4 w-4', n <= earned ? 'fill-gold text-gold' : 'text-ink/25')} />)}</span>
                          <span className="mt-1 block text-[13px] font-semibold leading-snug text-ink/60">{l.strands.map((st) => STRANDS[st].name).join(' · ')}</span>
                        </span>
                        <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-ink/40 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <div className="mt-7 flex flex-wrap gap-3 border-t-2 border-ink/10 pt-5">
          {prev && <button type="button" onClick={() => setStage(prev.id as StageId)} className="min-h-12 rounded-2xl border-[3px] border-ink/20 bg-white px-4 font-bold hover:border-ink">Too tricky? Try {prev.name}</button>}
          {next && <button type="button" onClick={() => setStage(next.id as StageId)} className="min-h-12 rounded-2xl border-[3px] border-ink bg-gold px-4 font-bold">Ready for more? Try {next.name}</button>}
          <Link to="/kids/curriculum" className="ml-auto self-center text-[15px] font-semibold text-[#1F6F6E] underline underline-offset-4">How the stages work (for grown-ups)</Link>
        </div>
      </div>
    </section>
  );
}
