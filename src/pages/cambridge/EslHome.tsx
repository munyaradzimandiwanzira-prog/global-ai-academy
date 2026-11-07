import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ESL_BANDS, ESL_FREE_WEEKS, ESL_WEEKS, bandForAge, eslBand, eslWeekOpen, type Accent, type EslBandId } from '@shared/esl';
import { can } from '@shared/rbac';
import { ArrowRight, Lock, Star, Volume2, VolumeX } from '@/components/icons';
import { PageLoader } from '@/components/ui';
import { Zuva } from '@/features/kids/Zuva';
import { cn } from '@/lib/utils';
import { useEsl } from '@/features/esl/store';
import { say, useMutedEsl } from '@/features/esl/voice';

const AGES = Array.from({ length: 19 }, (_, i) => i + 2);

export function AccentSwitch({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) {
  return (
    <div role="radiogroup" aria-label="Accent and spelling" className="inline-flex rounded-full border-2 border-ink bg-white p-1">
      {(['gb', 'us'] as const).map((a) => (
        <button key={a} type="button" role="radio" aria-checked={value === a} onClick={() => onChange(a)} className={cn('min-h-10 rounded-full px-4 text-sm font-bold', value === a ? 'bg-ink text-white' : 'text-ink')}>
          <span aria-hidden="true">{a === 'gb' ? '🇬🇧' : '🇺🇸'}</span> {a === 'gb' ? 'British' : 'American'}
        </button>
      ))}
    </div>
  );
}

export function MuteSwitch() {
  const { muted, toggle } = useMutedEsl();
  return (
    <button type="button" onClick={toggle} aria-pressed={!muted} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 text-sm font-bold">
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} Zuva’s voice {muted ? 'off' : 'on'}
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
    <section className="rounded-3xl border-4 border-ink bg-white p-5 text-ink sm:p-7" aria-labelledby="welcome">
      <div className="flex items-start gap-4">
        <Zuva size={72} />
        <div className="min-w-0 flex-1 space-y-4">
          <h2 id="welcome" className="font-display text-2xl font-bold">{greeting}</h2>
          {!signedIn && (
            <label className="block max-w-xs"><span className="label">First name</span>
              <input value={name} onChange={(e) => setName(e.target.value.replace(/[^A-Za-zÀ-ÿ' -]/g, ''))} maxLength={20} className="input text-lg" autoComplete="given-name" placeholder="e.g. Tari" />
            </label>
          )}
          <div>
            <p className="label">{signedIn ? 'Your age' : 'How old are you?'}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Age">
              {AGES.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={age === a} onClick={() => setAge(a)} className={cn('grid h-11 w-11 place-items-center rounded-xl border-2 font-bold', age === a ? 'border-ink bg-gold' : 'border-ink/30 bg-white')}>{a === 20 ? '20+' : a}</button>
              ))}
            </div>
            {age != null && <p className="mt-2 text-sm font-semibold">Zuva will start you in <strong>{bandForAge(age).name}</strong> ({bandForAge(age).cambridge}). You can change it any time.</p>}
          </div>
          <div><p className="label">Which English?</p><AccentSwitch value={accent} onChange={setAccent} /></div>
          {signedIn ? (
            <button type="button" disabled={!ready || busy} onClick={() => void save(false)} className="btn-primary btn-lg disabled:opacity-50">Start learning <ArrowRight className="h-5 w-5" /></button>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Link to="/signup?next=/cambridge/esl" className={cn('btn-primary btn-lg', !ready && 'pointer-events-none opacity-50')} aria-disabled={!ready} onClick={() => void save(false)}>Make my free account</Link>
                <button type="button" disabled={!ready || busy} onClick={() => void save(true)} className="btn-outline btn-lg disabled:opacity-50">Just try it today</button>
              </div>
              <p className="max-w-prose text-sm text-ink/80">With a free account Zuva remembers you, learns how you like to learn and tells your teacher how you’re doing. Under 13? Ask a grown-up to help. A test session saves nothing and Zuva forgets you when you close the page.</p>
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
    <div className="min-h-screen bg-[#EEF4F3] text-ink">
      <div className="container max-w-6xl space-y-8 py-8">
        <header className="space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold"><span aria-hidden="true">🎓</span> Cambridge curriculum · English as a Second Language</p>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Learn English with Zuva</h1>
          <p className="max-w-3xl text-lg text-ink/80">36 weeks of games, stories and conversations for ages 2 to 20, from first words to Cambridge B2 First and beyond. Zuva talks with you, helps you sound out words, makes new games as you improve, and remembers how you learn. Choose British or American English.</p>
        </header>

        {needsWelcome ? (
          <Welcome signedIn={!!user} firstName={firstName} onGuest={(name, trial, age) => esl.setGuest({ name, age, trial })} onSave={async (age, accent) => { await esl.save({ age, accent, band: bandForAge(age).id, week: 1, voice: true }); }} />
        ) : (
          <section className="flex flex-col gap-5 rounded-3xl border-4 border-ink bg-white p-5 sm:flex-row sm:items-center sm:p-7" aria-labelledby="hello">
            <Zuva size={80} />
            <div className="min-w-0 flex-1">
              <h2 id="hello" className="font-display text-2xl font-bold">{firstName ? `Welcome back, ${firstName}!` : 'Welcome back!'}</h2>
              <p className="mt-1 text-ink/80">You’re in <strong>{band?.name}</strong> ({band?.ages}, {band?.cambridge}). Next up: <strong>Week {week}: {ESL_WEEKS[week - 1]?.theme}</strong>.</p>
              {!user && guest?.trial && <p className="mt-1 text-sm font-semibold text-gold-700">Test session: nothing is saved. <Link to="/signup?next=/cambridge/esl" className="underline">Make a free account</Link> so Zuva can remember you.</p>}
            </div>
            <button type="button" onClick={() => navigate(`/cambridge/esl/week/${eslWeekOpen(week, pro) ? week : ESL_FREE_WEEKS}`)} className="btn-primary btn-lg shrink-0">Continue <ArrowRight className="h-5 w-5" /></button>
          </section>
        )}

        {settings && (
          <section className="flex flex-wrap items-center gap-3" aria-label="Settings">
            <label className="flex items-center gap-2 text-sm font-bold">Level
              <select value={settings.band} onChange={(e) => void esl.save({ band: e.target.value as EslBandId })} className="input min-h-10 py-1 text-sm">
                {ESL_BANDS.map((b) => <option key={b.id} value={b.id}>{b.name} (ages {b.ages})</option>)}
              </select>
            </label>
            <AccentSwitch value={settings.accent} onChange={(a) => void esl.save({ accent: a })} />
            <MuteSwitch />
          </section>
        )}

        {p && p.overall.attempts > 0 && (
          <section className="rounded-3xl bg-white p-5" aria-labelledby="noticed">
            <h2 id="noticed" className="font-display text-xl font-bold">What Zuva has noticed</h2>
            <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="font-bold text-teal-700">Getting good at</p><p>{p.strengths.map((s) => s.what).join(', ') || 'Keep playing and Zuva will tell you!'}</p></div>
              <div><p className="font-bold">Practising</p><p>{p.struggles.map((s) => s.what).slice(0, 2).join(', ') || 'Nothing tricky yet'}</p></div>
              <div><p className="font-bold">Favourite games</p><p>{p.enjoys.map((e) => e.title).join(', ') || 'Tell Zuva with the thumbs up!'}</p></div>
              <div><p className="font-bold">Words to review today</p><p>{p.dueWords.slice(0, 6).join(', ') || 'All caught up'}</p></div>
            </div>
            {(esl.me.data?.notesToTeacher.length ?? 0) > 0 && <p className="mt-3 text-xs text-ink/70">Zuva shares notes about your learning with your teacher. Latest: “{esl.me.data!.notesToTeacher[0]!.note}”</p>}
          </section>
        )}

        <section aria-labelledby="map" className="space-y-6">
          <h2 id="map" className="font-display text-2xl font-bold">The year at a glance</h2>
          {[1, 2, 3].map((term) => (
            <div key={term}>
              <h3 className="mb-3 font-bold uppercase tracking-wide text-ink/75">Term {term}</h3>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ESL_WEEKS.filter((w) => w.term === term).map((w) => {
                  const open = eslWeekOpen(w.week, pro);
                  const stars = band ? esl.starsFor(w.week, band.id) : 0;
                  return (
                    <li key={w.week}>
                      <Link to={`/cambridge/esl/week/${w.week}`} className={cn('flex h-full items-center gap-3 rounded-2xl border-2 bg-white p-3 transition hover:-translate-y-0.5', w.week === week ? 'border-ink shadow-[0_4px_0_#0C1C38]' : 'border-transparent')}>
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#FFF8EA] text-3xl" aria-hidden="true">{w.words[0]![1]}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold uppercase text-ink/70">Week {w.week}{w.review ? ' · review' : ''}</span>
                          <span className="block font-bold leading-tight">{band?.tier === 'secondary' ? w.title : w.theme}</span>
                          {stars > 0 && <span className="mt-0.5 flex items-center gap-1 text-xs font-bold"><Star className="h-3.5 w-3.5 fill-gold text-gold" /> {stars}</span>}
                        </span>
                        {!open && <Lock className="h-4 w-4 shrink-0 text-ink/60" aria-label="Plus" />}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <p className="text-sm text-ink/75">Weeks 1–{ESL_FREE_WEEKS} are free for everyone. The rest of the year comes with <Link to="/pricing" className="underline">Plus</Link> (7-day free trial). The levels follow Cambridge English (Pre A1 Starters to B2 First and C1 Advanced); this is our own mapping, not endorsed by Cambridge.</p>
        </section>
      </div>
    </div>
  );
}
