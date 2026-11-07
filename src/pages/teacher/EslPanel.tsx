import type { EslTeacherView } from '@shared/teaching';
import { ProgressBar } from '@/components/ui';
import { Sparkles } from '@/components/icons';
import { shortDate } from './shared';

const AREA: Record<string, string> = { speaking: 'Speaking', listening: 'Listening', phonics: 'Phonics', vocabulary: 'Vocabulary', reading: 'Reading', grammar: 'Grammar', writing: 'Writing' };
const areaName = (a: string) => AREA[a.split(':')[0]!] ?? a;
const pct = (n: number | null) => (n == null ? '–' : `${Math.round(n * 100)}%`);

/** English as a Second Language: the learner model Zuva keeps, without the learner's chats. */
export function EslPanel({ v, name }: { v: EslTeacherView; name: string }) {
  // Several skills share an area (speaking:w1, speaking:w2…): show one bar per area.
  const byArea = new Map<string, { sum: number; n: number; attempts: number }>();
  for (const s of v.skills) {
    const k = areaName(s.area);
    const cur = byArea.get(k) ?? { sum: 0, n: 0, attempts: 0 };
    byArea.set(k, { sum: cur.sum + s.mastery, n: cur.n + 1, attempts: cur.attempts + s.attempts });
  }
  const areas = [...byArea].map(([area, x]) => ({ area, mastery: x.sum / x.n, attempts: x.attempts })).sort((a, b) => a.mastery - b.mastery);
  const chips = (xs: string[], tone: string) => <ul className="mt-1 flex flex-wrap gap-1.5">{xs.map((x) => <li key={x} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{x}</li>)}</ul>;

  return (
    <section className="card p-5" aria-labelledby="esl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="esl" className="font-display text-lg font-semibold">English with Zuva</h2>
        <span className="text-sm text-muted-fg">{v.bandName} · week {v.week} of 36 · {v.accent === 'us' ? 'American' : 'British'} English</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-muted-fg">Weeks done</dt><dd className="text-lg font-semibold tabular">{v.unitsDone}</dd></div>
        <div><dt className="text-muted-fg">Stars</dt><dd className="text-lg font-semibold tabular">{v.stars}</dd></div>
        <div><dt className="text-muted-fg">Accuracy</dt><dd className="text-lg font-semibold tabular">{pct(v.accuracy)}</dd></div>
        <div><dt className="text-muted-fg">Trend</dt><dd className="text-lg font-semibold">{{ up: 'Improving', down: 'Slipping', steady: 'Steady', new: 'Just started' }[v.trend]}</dd></div>
      </dl>
      {areas.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Mastery by skill">
          {areas.map((a) => <li key={a.area}><div className="flex justify-between text-sm"><span>{a.area}</span><span className="tabular text-muted-fg">{pct(a.mastery)} · {a.attempts} answers</span></div><ProgressBar value={a.mastery * 100} label={`${a.area} mastery`} className="mt-1" /></li>)}
        </ul>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {v.struggles.length > 0 && <div><h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Finding hard</h3>{chips(v.struggles.map((s) => s.what), 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200')}</div>}
        {v.strengths.length > 0 && <div><h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300">Strong at</h3>{chips(v.strengths.map((s) => s.what), 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200')}</div>}
        {v.slow.length > 0 && <div><h3 className="text-sm font-semibold">Takes longer on</h3>{chips(v.slow.map((s) => `${s.title} (~${s.avgSeconds}s)`), 'bg-muted')}</div>}
        {v.fast.length > 0 && <div><h3 className="text-sm font-semibold">Quick at</h3>{chips(v.fast.map((s) => `${s.title} (~${s.avgSeconds}s)`), 'bg-muted')}</div>}
        {v.enjoys.length > 0 && <div><h3 className="text-sm font-semibold">Enjoys</h3>{chips(v.enjoys.map((s) => s.title), 'bg-gold-100 text-gold-700')}</div>}
        {v.trickyWords.length > 0 && <div><h3 className="text-sm font-semibold">Tricky words</h3>{chips(v.trickyWords, 'bg-muted')}</div>}
      </div>
      {v.notes.length > 0 ? (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-4 w-4" /> Notes from Zuva</h3>
          <ul className="mt-2 space-y-2">
            {v.notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="text-xs text-muted-fg">{shortDate(n.at)} · {n.source === 'weekly' ? 'Weekly summary' : 'During a lesson'} · {areaName(n.area)}</div>
                <p className="mt-1">{n.note}</p>
                {n.suggestion && <p className="mt-1 text-fg/80"><strong>Try:</strong> {n.suggestion}</p>}
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="mt-4 text-sm text-muted-fg">Zuva writes a note here when {name} keeps finding something hard, and a short summary each week they practise.</p>}
      <p className="mt-4 text-xs text-muted-fg">What {name} says to Zuva stays private. You see learning patterns and Zuva’s notes only.{v.lastActive ? ` Last practised ${shortDate(v.lastActive)}.` : ''}</p>
    </section>
  );
}
