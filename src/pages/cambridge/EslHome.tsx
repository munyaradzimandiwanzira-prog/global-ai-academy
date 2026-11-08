import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ESL_BANDS, ESL_FREE_WEEKS, ESL_WEEKS, bandForAge, eslBand, eslWeekOpen, type Accent, type EslBandId } from '@shared/esl';
import { can } from '@shared/rbac';
import { ArrowRight, Lock, Star, Volume2, VolumeX } from '@/components/icons';
import { PageLoader } from '@/components/ui';
import { Zuva } from '@/features/kids/Zuva';
import { cn } from '@/lib/utils';
import { buttonClass } from '@/components/ui/Button';
import { focusRing, surface } from '@/features/esl/ui';
import { useEsl } from '@/features/esl/store';
import { say, useMutedEsl } from '@/features/esl/voice';

const AGES = Array.from({ length: 19 }, (_, i) => i + 2);

export function AccentSwitch({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) {
  return (
    <div role="radiogroup" aria-label="Accent and spelling" className="inline-flex rounded-full bg-card p-1">
      {(['gb', 'us'] as const).map((a) => (
        <button key={a} type="button" role="radio" aria-checked={value === a} onClick={() => onChange(a)}
          className={cn('min-h-10 rounded-full px-4 text-[15px] font-semibold transition-colors', focusRing, value === a ? 'bg-ink text-white dark:bg-sand dark:text-ink-900' : 'text-fg hover:bg-muted')}>
          {a === 'gb' ? 'British English' : 'American English'}
        </button>
      ))}
    </div>
  );
}

export function MuteSwitch() {
  const { muted, toggle } = useMutedEsl();
  return (
    <button type="button" onClick={toggle} aria-pressed={!muted} className={buttonClass({ variant: 'text' }, 'min-h-11')}>
      {muted ? <VolumeX /> : <Volume2 />} Zuva’s voice {muted ? 'off' : 'on'}
    </button>
  );
}

/** First visit: who is learning (guests: name too), age and accent. */
function Welcome({ signedIn, firstName, onSave, onGuest }: { signedIn: boolean; firstName?: string; onSave: (age: number, accent: Accent) => Promise<void>; onGuest?: (name: string, trial: boolean, age: number) => void }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [accent, setAccent] = useState<Accent>('gb');
  const [busy, setBusy] = useState(false);
  const greeting = signedIn ? `Hello ${firstName}! I’m Zuva, your English teacher. How old are you?` : 'Hello! I’m Zuva, your English teacher. What’s your name?';
  useEffect(() => { const t = setTimeout(() => void say(greeting, 'gb', 'primary'), 500); return () => clearTimeout(t); }, [greeting]);
  const ready = age != null && (signedIn || name.trim().length >= 2);
  const save = async (trial: boolean) => {
    if (!ready) return;
    setBusy(true);
    if (!signedIn) onGuest?.(name.trim().split(/\s+/)[0]!.slice(0, 20), trial, age!);
    await onSave(age!, accent);
    setBusy(false);
  };
  return (
    <section className={cn(surface, 'p-5 sm:p-8')} aria-labelledby="welcome">
      <div className="flex items-start gap-4">
        <Zuva size={72} />
        <div className="min-w-0 flex-1 space-y-4">
          <h2 id="welcome" className="max-w-2xl font-display text-2xl font-bold leading-tight">{greeting}</h2>
          {!signedIn && (
            <label className="block max-w-xs"><span className="label text-[15px]">First name</span>
              <input value={name} onChange={(e) => setName(e.target.value.replace(/[^A-Za-zÀ-ÿ' -]/g, ''))} maxLength={20} className="input text-lg" autoComplete="given-name" placeholder="e.g. Tari" />
            </label>
          )}
          <div>
            <p className="label text-[15px]">{signedIn ? 'Your age' : 'How old are you?'}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Age">
              {AGES.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={age === a} onClick={() => setAge(a)} className={cn('grid h-11 w-11 place-items-center rounded-md text-[17px] font-bold transition-colors', focusRing, age === a ? 'bg-gold text-ink-900' : 'bg-muted hover:bg-gold-100 dark:hover:bg-night-700')}>{a === 20 ? '20+' : a}</button>
              ))}
            </div>
            {age != null && <p className="mt-2 text-[15px]">Zuva will start you in <strong>{bandForAge(age).name}</strong> ({bandForAge(age).cambridge}). You can change it any time.</p>}
          </div>
          <div><p className="label text-[15px]">Which English?</p><AccentSwitch value={accent} onChange={setAccent} /></div>
          {signedIn ? (
            <button type="button" disabled={!ready || busy} onClick={() => void save(false)} className={buttonClass({ size: 'lg' })}>Start learning English <ArrowRight /></button>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Link to="/signup?next=/cambridge/esl" className={buttonClass({ size: 'lg' }, !ready ? 'pointer-events-none' : undefined)} aria-disabled={!ready} onClick={() => void save(false)}>Make my free account</Link>
                <button type="button" disabled={!ready || busy} onClick={() => void save(true)} className={buttonClass({ variant: 'outlined', size: 'lg' })}>Just try it today</button>
              </div>
              <p className="max-w-prose text-[15px] text-muted-fg">With a free account Zuva remembers you, learns how you like to learn and tells your teacher how you’re doing. Under 13? Ask a grown-up to help. A test session saves nothing and Zuva forgets you when you close the page.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function EslHome() {
  const esl = useEsl();
  const navigate = useNavigate();
  const { user, settings, guest } = esl;
  useEffect(() => { document.title = 'English with Zuva (ESL, ages 2–20) | Global AI Academy'; }, []);
  // Just signed up after trying as a guest: carry the age band and accent over to the account.
  useEffect(() => { if (user && esl.me.data && !esl.me.data.settings && esl.local) void esl.save(esl.local); }, [user, esl.me.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (esl.loading) return <PageLoader />;
  const pro = !!user && can({ role: user.role, plan: user.plan }, 'content.pro');
  const band = eslBand(settings?.band) ?? null;
  const needsWelcome = user ? !settings : !settings || !guest;
  const p = esl.me.data?.patterns;
  const week = settings?.week ?? 1;
  const firstName = user?.name.split(/\s+/)[0] ?? guest?.name;

  return (
    <div className="min-h-screen bg-granite text-fg dark:bg-night">
      <div className="container space-y-10 py-10">
        <header className="max-w-3xl space-y-3">
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.02em]">Learn English with Zuva</h1>
          <p className="text-lg">36 weeks of games, stories and conversations for ages 2 to 20, from first words to Cambridge B2 First and beyond. Zuva talks with you, helps you sound out words, makes new games as you improve, and remembers how you learn. Choose British or American English.</p>
        </header>

        {needsWelcome ? (
          <Welcome signedIn={!!user} firstName={firstName} onGuest={(name, trial, age) => esl.setGuest({ name, age, trial })} onSave={async (age, accent) => { await esl.save({ age, accent, band: bandForAge(age).id, week: 1, voice: true }); }} />
        ) : (
          <section className={cn(surface, 'flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-8')} aria-labelledby="hello">
            <Zuva size={80} />
            <div className="min-w-0 flex-1">
              <h2 id="hello" className="font-display text-2xl font-bold">{firstName ? `Welcome back, ${firstName}!` : 'Welcome back!'}</h2>
              <p className="mt-1">You’re in <strong>{band?.name}</strong> ({band?.ages}, {band?.cambridge}). Next up: <strong>Week {week}: {ESL_WEEKS[week - 1]?.theme}</strong>.</p>
              {!user && guest?.trial && <p className="mt-2 text-[15px] text-muted-fg">Test session: nothing is saved. <Link to="/signup?next=/cambridge/esl" className="underline">Make a free account</Link> so Zuva can remember you.</p>}
            </div>
            <button type="button" onClick={() => navigate(`/cambridge/esl/week/${eslWeekOpen(week, pro) ? week : ESL_FREE_WEEKS}`)} className={buttonClass({ size: 'lg' }, 'shrink-0')}>Continue week {eslWeekOpen(week, pro) ? week : ESL_FREE_WEEKS} <ArrowRight /></button>
          </section>
        )}

        {settings && (
          <section className="flex flex-wrap items-center gap-3" aria-label="Settings">
            <label className="flex items-center gap-2 text-[15px] font-semibold">Level
              <select value={settings.band} onChange={(e) => void esl.save({ band: e.target.value as EslBandId })} className="input w-auto">
                {ESL_BANDS.map((b) => <option key={b.id} value={b.id}>{b.name} (ages {b.ages})</option>)}
              </select>
            </label>
            <AccentSwitch value={settings.accent} onChange={(a) => void esl.save({ accent: a })} />
            <MuteSwitch />
          </section>
        )}

        {p && p.overall.attempts > 0 && (
          <section className={cn(surface, 'p-5 sm:p-8')} aria-labelledby="noticed">
            <h2 id="noticed" className="font-display text-2xl font-bold">What Zuva has noticed</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div><h3 className="font-bold text-teal-700 dark:text-teal-300">Getting good at</h3><p>{p.strengths.map((s) => s.what).join(', ') || 'Keep playing and Zuva will tell you!'}</p></div>
              <div><h3 className="font-bold">Practising</h3><p>{p.struggles.map((s) => s.what).slice(0, 2).join(', ') || 'Nothing tricky yet'}</p></div>
              <div><h3 className="font-bold">Favourite games</h3><p>{p.enjoys.map((e) => e.title).join(', ') || 'Tell Zuva with the thumbs up!'}</p></div>
              <div><h3 className="font-bold">Words to review today</h3><p>{p.dueWords.slice(0, 6).join(', ') || 'All caught up'}</p></div>
            </div>
            {(esl.me.data?.notesToTeacher.length ?? 0) > 0 && <p className="mt-4 text-[15px] text-muted-fg">Zuva shares notes about your learning with your teacher. Latest: “{esl.me.data!.notesToTeacher[0]!.note}”</p>}
          </section>
        )}

        <section aria-labelledby="map" className="space-y-6">
          <h2 id="map" className="font-display text-2xl font-bold">The year at a glance</h2>
          {[1, 2, 3].map((term) => (
            <div key={term}>
              <h3 className="mb-3 font-display text-lg font-bold">Term {term}</h3>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ESL_WEEKS.filter((w) => w.term === term).map((w) => {
                  const open = eslWeekOpen(w.week, pro);
                  const stars = band ? esl.starsFor(w.week, band.id) : 0;
                  return (
                    <li key={w.week}>
                      <Link to={`/cambridge/esl/week/${w.week}`} aria-current={w.week === week ? 'step' : undefined} className={cn('flex h-full items-center gap-3 rounded-md p-3 transition-colors', focusRing, w.week === week ? 'bg-gold-100 ring-2 ring-gold dark:bg-night-700' : 'bg-card hover:bg-muted')}>
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-gold-100 text-3xl dark:bg-night-700" aria-hidden="true">{w.words[0]![1]}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-muted-fg">Week {w.week}{w.review ? ', review' : ''}{w.week === week ? ', you are here' : ''}</span>
                          <span className="block font-bold leading-tight">{band?.tier === 'secondary' ? w.title : w.theme}</span>
                          {stars > 0 && <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold"><Star className="text-[18px] text-gold-700 dark:text-gold" /> {stars} {stars === 1 ? 'star' : 'stars'}</span>}
                        </span>
                        {!open && <Lock className="shrink-0 text-muted-fg" label="Needs Plus" />}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <p className="max-w-3xl text-[15px] text-muted-fg">Weeks 1–{ESL_FREE_WEEKS} are free for everyone. The rest of the year comes with <Link to="/pricing" className="underline">Plus</Link> (7-day free trial). The levels follow Cambridge English (Pre A1 Starters to B2 First and C1 Advanced); this is our own mapping, not endorsed by Cambridge.</p>
        </section>
      </div>
    </div>
  );
}
