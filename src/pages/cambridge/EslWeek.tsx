import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eslBand, eslWeek, type Activity } from '@shared/esl';
import { ArrowLeft, ArrowRight, Check, Lock, Sparkles } from '@/components/icons';
import { PageLoader } from '@/components/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ZuvaChat } from '@/features/zuva/ZuvaChat';
import { useEsl } from '@/features/esl/store';
import { GamePlayer } from '@/features/esl/GamePlayer';
import { EslPlaceContext, type EslPlace } from '@/features/esl/EslContext';
import { sayMixed } from '@/features/esl/voice';
import { AccentSwitch, MuteSwitch } from './EslHome';
import { HelpSwitch } from '@/features/esl/support';
import { PT_WEEKS } from '@shared/esl';
import { GameIcon, focusRing } from '@/features/esl/ui';
import { buttonClass } from '@/components/ui/Button';
import { MaterialIcon } from '@/components/icons';

interface Unit { week: number; band: string; accent: string; activities: Activity[]; done: string[]; zuvaGames: Activity[] }

const STARTERS = {
  early: ['Sing me a song!', 'Tell me a story', 'Let’s play a game'],
  primary: ['Help me say a word', 'Tell me a story', 'Make me a new game', 'Fun facts quiz!'],
  secondary: ['Let’s have a conversation', 'Explain this week’s grammar', 'Check my writing', 'Give me a harder challenge'],
};

export default function EslWeek() {
  const { week: weekParam } = useParams();
  const weekNo = Number(weekParam);
  const w = eslWeek(weekNo);
  const esl = useEsl();
  const qc = useQueryClient();
  const { user, settings, guest } = esl;
  const band = eslBand(settings?.band);
  const accent = settings?.accent ?? 'gb';
  const support = settings?.support ?? 'off';
  const [current, setCurrent] = useState<Activity | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [doneLocal, setDoneLocal] = useState<string[]>([]);
  const player = useRef<HTMLDivElement>(null);

  const unit = useQuery({
    queryKey: ['esl-unit', weekNo, settings?.band, accent, support, user?.id ?? guest?.name],
    enabled: !!w && !!settings,
    retry: false,
    queryFn: () => api.get<Unit>(`/api/esl/unit/${weekNo}?band=${settings!.band}&accent=${accent}&support=${support}${!user && guest?.name ? `&name=${encodeURIComponent(guest.name)}` : ''}`),
  });

  useEffect(() => { if (w) document.title = `Week ${w.week}: ${w.title} | English with Zuva`; }, [w]);
  useEffect(() => { setCurrent(null); setDoneLocal([]); }, [weekNo, settings?.band]);

  // One sitting = one session (episodic memory); it is summarised when the learner leaves.
  useEffect(() => {
    if (!user || !settings || !w) return;
    let id: string | null = null;
    void api.post<{ id: string }>('/api/esl/sessions', { week: weekNo, band: settings.band }).then((r) => { id = r.id; setSessionId(r.id); }).catch(() => {});
    const end = () => { if (id) void fetch(`/api/esl/sessions/${id}/end`, { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'content-type': 'application/json' }, body: '{}' }); id = null; };
    window.addEventListener('pagehide', end);
    return () => { window.removeEventListener('pagehide', end); end(); };
  }, [user, settings?.band, weekNo]); // eslint-disable-line react-hooks/exhaustive-deps

  const place: EslPlace | null = useMemo(() => (settings ? { week: weekNo, band: settings.band, accent, signedIn: !!user, guest, sessionId, support } : null), [settings, weekNo, accent, user, guest, sessionId, support]);
  const getContext = useCallback(() => ({
    page: { path: `/cambridge/esl/week/${weekNo}`, title: w ? `Week ${weekNo}: ${w.title}` : undefined },
    esl: { week: weekNo, band: settings?.band ?? 'starters', accent, support, activityId: current?.id, kind: current?.kind, guest: user ? undefined : guest ? { name: guest.name, age: guest.age ?? undefined, trial: guest.trial } : { trial: true } },
  }), [weekNo, w, settings?.band, accent, support, current, user, guest]);
  const voice = useCallback((t: string, p?: 'word' | 'early' | 'primary' | 'secondary') => void sayMixed(t, accent, p ?? band?.tier ?? 'primary', support), [accent, band?.tier, support]);
  const onTool = useCallback((name: string) => { if (name === 'esl_set_preferences') void qc.invalidateQueries({ queryKey: ['esl-me'] }); }, [qc]);

  if (!w) return <Navigate to="/cambridge/esl" replace />;
  if (esl.loading) return <PageLoader />;
  if (!settings || (!user && !guest)) return <Navigate to="/cambridge/esl" replace />;

  const locked = unit.error instanceof ApiError && unit.error.status === 402;
  const acts = unit.data?.activities ?? [];
  const done = new Set([...(unit.data?.done ?? []), ...doneLocal]);
  const tier = band!.tier;
  const nextOf = (a: Activity) => acts[acts.findIndex((x) => x.id === a.id) + 1];
  const open = (a: Activity) => { setCurrent(a); requestAnimationFrame(() => player.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const name = user?.name.split(/\s+/)[0] ?? guest?.name;
  const theme = w.theme.replace(/[.!?]+$/, '');
  const greeting = tier === 'early'
    ? `Hello${name ? `, ${name}` : ''}! It’s “${theme}” week! Let’s play and talk together.`
    : tier === 'primary'
      ? `Hi${name ? ` ${name}` : ''}! This week: ${theme}. Play the games, and ask me for help, a story or a brand-new game.`
      : `Hi${name ? ` ${name}` : ''}. Week ${w.week}: ${w.title}. Grammar focus: ${w.grammar}. Ask me anything, practise a conversation, or send me your writing.`;
  const greetingFull = support === 'pt-MZ' ? `${greeting}\n\n(Podes pedir-me ajuda em português. Praticamos em inglês.)` : greeting;

  return (
    <EslPlaceContext.Provider value={place}>
      <div className={cn('min-h-screen bg-granite text-fg dark:bg-night', tier === 'early' && 'font-kids')}>
        <div className="container py-6">
          <nav aria-label="Course" className="mb-6 flex flex-wrap items-center gap-2">
            <Link to="/cambridge/esl" className={buttonClass({ variant: 'text' }, 'min-h-11 -ml-3')}><ArrowLeft /> All 36 weeks</Link>
            <AccentSwitch value={accent} onChange={(a) => void esl.save({ accent: a })} />
            <HelpSwitch value={support} onChange={(v) => void esl.save({ support: v })} />
            <MuteSwitch />
            <a href="#zuva-chat" className={buttonClass({ variant: 'outlined', color: 'action' }, 'min-h-11 lg:hidden')}><MaterialIcon name="forum" /> Talk to Zuva</a>
          </nav>
          <header className="mb-8 flex items-center gap-4">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-card text-5xl" aria-hidden="true">{w.words[0]![1]}</span>
            <div className="min-w-0">
              <p className="text-[15px] text-muted-fg">Week {w.week} of 36, {band!.name} (ages {band!.ages})</p>
              <h1 className="font-display text-[clamp(1.875rem,4vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.02em]">{tier === 'secondary' ? w.title : w.theme}</h1>
              {tier !== 'early' && <p className="mt-1">{tier === 'secondary' ? `Grammar: ${w.grammar}` : w.title}</p>}
              {support === 'pt-MZ' && <p lang="pt-MZ" className="mt-1 text-[15px] text-muted-fg">{tier === 'secondary' ? PT_WEEKS[weekNo]?.title : PT_WEEKS[weekNo]?.theme}</p>}
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0 space-y-5">
              {locked ? (
                <section className="rounded-md bg-card p-6 text-center sm:p-10">
                  <Lock className="mx-auto text-[40px]" />
                  <h2 className="mt-2 font-display text-2xl font-bold">This week is part of Plus</h2>
                  <p className="mx-auto mt-2 max-w-md">{errorMessage(unit.error)}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {user ? <Link to="/pricing" className={buttonClass({ size: 'lg' })}>See Plus and the free trial</Link> : <Link to="/signup?next=/cambridge/esl" className={buttonClass({ size: 'lg' })}>Make a free account</Link>}
                    <Link to="/cambridge/esl/week/1" className={buttonClass({ variant: 'outlined', size: 'lg' })}>Back to the free weeks</Link>
                  </div>
                </section>
              ) : unit.isLoading ? (
                <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading this week’s games">
                  {Array.from({ length: 6 }, (_, k) => <li key={k} className="h-16 animate-pulse rounded-md bg-card motion-reduce:animate-none" />)}
                </ol>
              ) : unit.error ? <p role="alert" className="font-semibold text-red-700 dark:text-red-300">{errorMessage(unit.error)}</p> : (
                <>
                  <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Games this week">
                    {acts.map((a, k) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => open(a)} aria-current={current?.id === a.id ? 'true' : undefined} className={cn('flex min-h-16 w-full items-center gap-3 rounded-md p-3 text-left transition-colors', focusRing, current?.id === a.id ? 'bg-ink text-white dark:bg-sand dark:text-ink-900' : 'bg-card hover:bg-muted')}>
                          <GameIcon kind={a.kind} className={current?.id === a.id ? '' : 'text-teal-700 dark:text-teal-300'} />
                          <span className="min-w-0 flex-1">
                            <span className={cn('block text-sm', current?.id === a.id ? 'opacity-80' : 'text-muted-fg')}>Game {k + 1}</span>
                            <span className="block font-bold">{a.title}</span>
                          </span>
                          {done.has(a.id) && <Check className={current?.id === a.id ? '' : 'text-teal-700 dark:text-teal-300'} label="Done" />}
                        </button>
                      </li>
                    ))}
                  </ol>
                  {(unit.data?.zuvaGames.length ?? 0) > 0 && (
                    <div>
                      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold"><Sparkles className="text-gold-700 dark:text-gold" /> Games Zuva made for you</h2>
                      <div className="flex flex-wrap gap-2">{unit.data!.zuvaGames.map((g) => <button key={g.id} type="button" onClick={() => open(g)} className={buttonClass({ variant: 'outlined' }, 'min-h-11')}><GameIcon kind={g.kind} /> {g.title}</button>)}</div>
                    </div>
                  )}
                  <div ref={player} className="scroll-mt-24">
                    {current ? (
                      <GamePlayer key={current.id} activity={current} week={weekNo} band={settings.band} accent={accent} signedIn={!!user} guest={guest} sessionId={sessionId}
                        onFinished={(stars) => { setDoneLocal((d) => [...d, current.id]); if (!user) esl.addLocalStars(weekNo, settings.band, stars); else void qc.invalidateQueries({ queryKey: ['esl-me'] }); }}
                        onNext={nextOf(current) ? () => open(nextOf(current)!) : weekNo < 36 ? undefined : undefined} />
                    ) : acts[0] && (
                      <button type="button" onClick={() => open(acts.find((a) => !done.has(a.id)) ?? acts[0]!)} className={buttonClass({ color: 'accent', size: 'lg', fullWidth: true }, 'h-16 text-xl')}>
                        {done.size ? 'Play the next game' : 'Start the first game'} <ArrowRight />
                      </button>
                    )}
                  </div>
                  {acts.length > 0 && acts.every((a) => done.has(a.id)) && weekNo < 36 && (
                    <Link to={`/cambridge/esl/week/${weekNo + 1}`} className={buttonClass({ size: 'lg', fullWidth: true })}>You finished this week. Start week {weekNo + 1} <ArrowRight /></Link>
                  )}
                </>
              )}
            </div>

            <aside id="zuva-chat" className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start" aria-label="Zuva, your English teacher">
              <div className="flex h-[min(78vh,680px)] min-h-[420px] flex-col overflow-hidden rounded-md bg-card">
                <h2 className="bg-muted px-4 py-2.5 font-display font-bold">Zuva, your English teacher</h2>
                <ZuvaChat mode="esl" skin={tier === 'secondary' ? 'grown' : 'kids'} greeting={greetingFull} starters={STARTERS[tier]} getContext={getContext}
                  threadKey={`esl:${weekNo}:${settings.band}`} signedIn={!!user} autoSpeak={tier === 'early'} voice={voice} onTool={onTool} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </EslPlaceContext.Provider>
  );
}
