import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { STRAND_NAMES, mathsUnit, type MathsActivity, type MathsStage } from '@shared/maths';
import { ArrowLeft, ArrowRight, Check, Lock, MaterialIcon, Volume2 } from '@/components/icons';
import { buttonClass } from '@/components/ui/Button';
import { api, ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ZuvaChat } from '@/features/zuva/ZuvaChat';
import { focusRing } from '@/features/esl/ui';
import { HelpSwitch } from '@/features/esl/support';
import { say, sayMixed } from '@/features/esl/voice';
import { MuteSwitch } from './EslHome';
import { STRAND_SYMBOL } from './MathsHome';
import { useMaths } from '@/features/maths/store';
import { MathsPlayer, MathsIcon } from '@/features/maths/MathsPlayer';
import { MathsPlaceContext, type MathsPlace } from '@/features/maths/context';

interface Unit { unit: { id: string; stage: MathsStage; title: string; pt: string; objectives: string[]; words: [string, string][] }; round: number; activities: MathsActivity[]; done: string[] }

export default function MathsUnit() {
  const { unitId = '' } = useParams();
  const u = mathsUnit(unitId);
  const m = useMaths();
  const qc = useQueryClient();
  const [round, setRound] = useState(0);
  const [current, setCurrent] = useState<MathsActivity | null>(null);
  const [doneLocal, setDoneLocal] = useState<string[]>([]);
  const player = useRef<HTMLDivElement>(null);
  const support = m.settings?.support ?? 'off';
  const q = useQuery({ queryKey: ['maths-unit', unitId, round, m.user?.id], enabled: !!u, retry: false, queryFn: () => api.get<Unit>(`/api/maths/unit/${unitId}?round=${round}`) });
  useEffect(() => { if (u) document.title = `${u.title} (Stage ${u.stage}) | Cambridge Maths with Zuva`; }, [u]);
  useEffect(() => { setCurrent(null); }, [unitId, round]);

  const place: MathsPlace | null = useMemo(() => (u ? { stage: u.stage, unitId: u.id, signedIn: !!m.user, support } : null), [u, m.user, support]);
  const getContext = useCallback(() => ({
    page: { path: `/cambridge/maths/${unitId}`, title: u?.title },
    maths: { stage: u?.stage ?? 1, unitId, activityId: current?.id, kind: current?.kind, support, guest: m.user ? undefined : m.guest ? { name: m.guest.name, age: m.guest.age ?? undefined, trial: m.guest.trial } : { trial: true } },
  }), [unitId, u, current, support, m.user, m.guest]);
  const voice = useCallback((t: string, p?: 'word' | 'early' | 'primary' | 'secondary') => void sayMixed(t, 'gb', p ?? 'primary', support), [support]);

  if (!u) return <Navigate to="/cambridge/maths" replace />;
  const locked = q.error instanceof ApiError && q.error.status === 402;
  const acts = q.data?.activities ?? [];
  const done = new Set([...(q.data?.done ?? []), ...m.doneFor(u.id), ...doneLocal]);
  const open = (a: MathsActivity) => { setCurrent(a); requestAnimationFrame(() => player.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const nextOf = (a: MathsActivity) => acts[acts.findIndex((x) => x.id === a.id) + 1];
  const name = m.user?.name.split(/\s+/)[0] ?? m.guest?.name;
  const greeting = `Hi${name ? ` ${name}` : ''}! This unit: ${u.title}. Play the games, ask me for a hint, or say “make me more practice”.${support === 'pt-MZ' ? '\n\n(Podes pedir-me ajuda em português.)' : ''}`;

  return (
    <MathsPlaceContext.Provider value={place}>
      <div className="min-h-screen bg-granite text-fg dark:bg-night">
        <div className="container py-6">
          <nav aria-label="Course" className="mb-6 flex flex-wrap items-center gap-2">
            <Link to="/cambridge/maths" className={buttonClass({ variant: 'text' }, 'min-h-11 -ml-3')}><ArrowLeft /> Stage {u.stage} units</Link>
            <HelpSwitch value={support} onChange={(v) => void m.save({ support: v })} />
            <MuteSwitch />
            <a href="#zuva-chat" className={buttonClass({ variant: 'outlined', color: 'action' }, 'min-h-11 lg:hidden')}><MaterialIcon name="forum" /> Ask Zuva</a>
          </nav>
          <header className="mb-8 max-w-3xl">
            <p className="flex items-center gap-1.5 text-[15px] text-muted-fg"><MaterialIcon name={STRAND_SYMBOL[u.strand].symbol} className="text-[20px]" /> Stage {u.stage} · {STRAND_NAMES[u.strand].en} · Unit {u.order}</p>
            <h1 className="font-display text-[clamp(1.875rem,4vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.02em]">{u.title}</h1>
            {support === 'pt-MZ' && <p lang="pt-MZ" className="mt-1 text-[15px] text-muted-fg">{u.pt}</p>}
            <ul className="mt-3 list-disc pl-5">{u.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0 space-y-6">
              <section aria-labelledby="words" className="rounded-md bg-card p-4">
                <h2 id="words" className="font-display text-lg font-bold">Maths words{support === 'pt-MZ' && <span lang="pt-MZ" className="font-sans text-[15px] font-normal text-muted-fg"> · Palavras de matemática</span>}</h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {u.words.map(([en, pt]) => (
                    <li key={en} className="flex items-center gap-1 rounded-md bg-muted pl-3">
                      <span className="font-semibold">{en}</span>{support === 'pt-MZ' && <span lang="pt-MZ" className="text-muted-fg">· {pt}</span>}
                      <button type="button" aria-label={`Hear ${en}`} onClick={() => void (support === 'pt-MZ' ? say(en, 'gb', 'word').then(() => say(pt, 'gb', 'word', 'pt-MZ')) : say(en, 'gb', 'word'))} className={cn('grid h-11 w-11 place-items-center rounded-md text-teal-700 hover:bg-teal/10 dark:text-teal-300', focusRing)}><Volume2 /></button>
                    </li>
                  ))}
                </ul>
              </section>

              {locked ? (
                <section className="rounded-md bg-card p-6 text-center sm:p-10">
                  <Lock className="mx-auto text-[40px]" />
                  <h2 className="mt-2 font-display text-2xl font-bold">This unit is part of Plus</h2>
                  <p className="mx-auto mt-2 max-w-md">{errorMessage(q.error)}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {m.user ? <Link to="/pricing" className={buttonClass({ size: 'lg' })}>See Plus and the free trial</Link> : <Link to="/signup?next=/cambridge/maths" className={buttonClass({ size: 'lg' })}>Make a free account</Link>}
                    <Link to="/cambridge/maths" className={buttonClass({ variant: 'outlined', size: 'lg' })}>Back to the free units</Link>
                  </div>
                </section>
              ) : q.isLoading ? (
                <ol className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading games">{Array.from({ length: 4 }, (_, k) => <li key={k} className="h-16 animate-pulse rounded-md bg-card motion-reduce:animate-none" />)}</ol>
              ) : q.error ? <p role="alert" className="font-semibold text-red-700 dark:text-red-300">{errorMessage(q.error)}</p> : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold">{round ? `Practice set ${round}` : 'Games in this unit'}</h2>
                    <button type="button" onClick={() => setRound((r) => r + 1)} className={buttonClass({ variant: 'text', color: 'action' }, 'min-h-11')}><MaterialIcon name="refresh" /> New practice questions</button>
                  </div>
                  <ol className="grid gap-3 sm:grid-cols-2" aria-label="Games">
                    {acts.map((a, k) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => open(a)} aria-current={current?.id === a.id ? 'true' : undefined} className={cn('flex min-h-16 w-full items-center gap-3 rounded-md p-3 text-left transition-colors', focusRing, current?.id === a.id ? 'bg-ink text-white dark:bg-sand dark:text-ink-900' : 'bg-card hover:bg-muted')}>
                          <MathsIcon kind={a.kind} className={current?.id === a.id ? '' : 'text-teal-700 dark:text-teal-300'} />
                          <span className="min-w-0 flex-1"><span className={cn('block text-sm', current?.id === a.id ? 'opacity-80' : 'text-muted-fg')}>Game {k + 1}</span><span className="block font-bold">{a.title}</span></span>
                          {done.has(a.id) && <Check className={current?.id === a.id ? '' : 'text-teal-700 dark:text-teal-300'} label="Done" />}
                        </button>
                      </li>
                    ))}
                  </ol>
                  <div ref={player} className="scroll-mt-24">
                    {current ? (
                      <MathsPlayer key={current.id} activity={current} unitId={u.id} onFinished={(stars) => { setDoneLocal((d) => [...d, current.id]); if (!m.user) m.addLocalStars(u.id, stars); else void qc.invalidateQueries({ queryKey: ['maths-me'] }); }} onNext={nextOf(current) ? () => open(nextOf(current)!) : undefined} />
                    ) : acts[0] && (
                      <button type="button" onClick={() => open(acts.find((a) => !done.has(a.id)) ?? acts[0]!)} className={buttonClass({ color: 'accent', size: 'lg', fullWidth: true }, 'h-16 text-xl')}>{done.size ? 'Play the next game' : 'Start the first game'} <ArrowRight /></button>
                    )}
                  </div>
                </>
              )}
            </div>
            <aside id="zuva-chat" className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start" aria-label="Zuva, your maths teacher">
              <div className="flex h-[min(78vh,680px)] min-h-[420px] flex-col overflow-hidden rounded-md bg-card">
                <h2 className="bg-muted px-4 py-2.5 font-display font-bold">Zuva, your maths teacher</h2>
                <ZuvaChat mode="maths" skin="kids" greeting={greeting} starters={['Give me a hint', 'Make me more practice', 'Explain it another way', 'What should I do next?']} getContext={getContext}
                  threadKey={`maths:${u.id}`} signedIn={!!m.user} voice={voice} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </MathsPlaceContext.Provider>
  );
}
