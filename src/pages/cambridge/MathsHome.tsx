import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MATHS_STAGES, STRAND_NAMES, mathsUnitOpen, unitsForStage, stageForAge, type MathsStage, type Strand } from '@shared/maths';
import type { SupportLang } from '@shared/esl';
import { can } from '@shared/rbac';
import { ArrowRight, Lock, MaterialIcon, Star, type SymbolName } from '@/components/icons';
import { PageLoader } from '@/components/ui';
import { buttonClass } from '@/components/ui/Button';
import { Zuva } from '@/features/kids/Zuva';
import { cn } from '@/lib/utils';
import { focusRing, surface } from '@/features/esl/ui';
import { HelpSwitch } from '@/features/esl/support';
import { MuteSwitch } from './EslHome';
import { useMaths } from '@/features/maths/store';

/** One Material Symbol per strand (read by the icon subset builder). */
export const STRAND_SYMBOL: Record<Strand, { symbol: SymbolName }> = { number: { symbol: 'calculate' }, geometry: { symbol: 'category' }, statistics: { symbol: 'bar_chart' } };
const AGES = Array.from({ length: 9 }, (_, i) => i + 4);

function Welcome({ signedIn, firstName, onSave, onGuest }: { signedIn: boolean; firstName?: string; onSave: (age: number, support: SupportLang) => Promise<void>; onGuest?: (name: string, age: number) => void }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [support, setSupport] = useState<SupportLang>('off');
  const [busy, setBusy] = useState(false);
  const ready = age != null && (signedIn || name.trim().length >= 2);
  return (
    <section className={cn(surface, 'p-5 sm:p-8')} aria-labelledby="welcome">
      <div className="flex items-start gap-4">
        <Zuva size={72} />
        <div className="min-w-0 flex-1 space-y-4">
          <h2 id="welcome" className="max-w-2xl font-display text-2xl font-bold leading-tight">{signedIn ? `Hello ${firstName}! Let’s do some maths. How old are you?` : 'Hello! I’m Zuva. What’s your name, and how old are you?'}</h2>
          {!signedIn && <label className="block max-w-xs"><span className="label text-[15px]">First name</span><input value={name} onChange={(e) => setName(e.target.value.replace(/[^A-Za-zÀ-ÿ' -]/g, ''))} maxLength={20} className="input text-lg" autoComplete="given-name" placeholder="e.g. Tari" /></label>}
          <div>
            <p className="label text-[15px]">Age</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Age">
              {AGES.map((a) => <button key={a} type="button" role="radio" aria-checked={age === a} onClick={() => setAge(a)} className={cn('grid h-11 w-11 place-items-center rounded-md text-[17px] font-bold transition-colors', focusRing, age === a ? 'bg-gold text-ink-900' : 'bg-muted hover:bg-gold-100 dark:hover:bg-night-700')}>{a === 12 ? '12+' : a}</button>)}
            </div>
            {age != null && <p className="mt-2 text-[15px]">Zuva will start you in <strong>Stage {stageForAge(age)}</strong>. You can change it any time.</p>}
          </div>
          <div>
            <p className="label text-[15px]">Do you speak Portuguese? <span lang="pt-MZ" className="font-normal text-muted-fg">Falas português?</span></p>
            <HelpSwitch value={support} onChange={setSupport} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!ready || busy} onClick={async () => { setBusy(true); if (!signedIn) onGuest?.(name.trim().split(/\s+/)[0]!.slice(0, 20), age!); await onSave(age!, support); setBusy(false); }} className={buttonClass({ size: 'lg' })}>Start maths <ArrowRight /></button>
            {!signedIn && <Link to="/signup?next=/cambridge/maths" className={buttonClass({ variant: 'outlined', size: 'lg' })}>Make a free account</Link>}
          </div>
          {!signedIn && <p className="max-w-prose text-[15px] text-muted-fg">Without an account your progress stays on this device. With a free account Zuva remembers how you learn and tells your teacher how you’re doing.</p>}
        </div>
      </div>
    </section>
  );
}

export default function MathsHome() {
  const m = useMaths();
  const { user, settings } = m;
  const [stage, setStage] = useState<MathsStage | null>(null);
  useEffect(() => { document.title = 'Cambridge Maths with Zuva (Stages 1–6) | Global AI Academy'; }, []);
  useEffect(() => { if (settings && stage == null) setStage(settings.stage); }, [settings, stage]);
  if (m.loading) return <PageLoader />;
  const pro = !!user && can({ role: user.role, plan: user.plan }, 'content.pro');
  const st = (stage ?? settings?.stage ?? 1) as MathsStage;
  const units = unitsForStage(st);
  const p = m.me.data?.patterns;
  const firstName = user?.name.split(/\s+/)[0] ?? m.guest?.name;

  return (
    <div className="min-h-screen bg-granite text-fg dark:bg-night">
      <div className="container space-y-10 py-10">
        <header className="max-w-3xl space-y-3">
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.02em]">Cambridge Maths with Zuva</h1>
          <p className="text-lg">Stages 1 to 6, for about ages 5 to 11: number, geometry and measure, statistics and probability, with fresh practice every day and “Convince me” puzzles that build real reasoning. Help in Portuguese when you need it. Our own mapping to Cambridge Primary Mathematics, not endorsed by Cambridge.</p>
        </header>

        {!settings ? (
          <Welcome signedIn={!!user} firstName={firstName} onGuest={(name, age) => m.setGuest({ name, age, trial: false })} onSave={async (age, support) => { const s = await m.save({ age, support }); setStage(s.stage); }} />
        ) : (
          <section aria-label="Settings" className="flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Stage" className="inline-flex flex-wrap gap-1 rounded-md bg-card p-1">
              {MATHS_STAGES.map((s) => <button key={s.stage} type="button" role="radio" aria-checked={st === s.stage} onClick={() => { setStage(s.stage); void m.save({ stage: s.stage }); }} className={cn('min-h-10 rounded-md px-3 text-[15px] font-semibold transition-colors', focusRing, st === s.stage ? 'bg-ink text-white dark:bg-sand dark:text-ink-900' : 'hover:bg-muted')}>Stage {s.stage} <span className="font-normal opacity-75">({s.ages})</span></button>)}
            </div>
            <HelpSwitch value={settings.support} onChange={(v) => void m.save({ support: v })} />
            <MuteSwitch />
          </section>
        )}

        {p && p.overall.attempts > 0 && (
          <section className={cn(surface, 'p-5 sm:p-8')} aria-labelledby="noticed">
            <h2 id="noticed" className="font-display text-2xl font-bold">What Zuva has noticed</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div><h3 className="font-bold text-teal-700 dark:text-teal-300">Getting good at</h3><p>{p.strengths.map((s) => s.what).join(', ') || 'Keep playing and Zuva will tell you!'}</p></div>
              <div><h3 className="font-bold">Practising</h3><p>{p.struggles.map((s) => s.what).slice(0, 2).join(', ') || 'Nothing tricky yet'}</p></div>
              <div><h3 className="font-bold">Quick at</h3><p>{p.fast.map((s) => s.title).join(', ') || '—'}</p></div>
              <div><h3 className="font-bold">Accuracy</h3><p className="font-display text-2xl font-bold tabular-nums">{p.overall.accuracy == null ? '—' : `${Math.round(p.overall.accuracy * 100)}%`}</p></div>
            </div>
          </section>
        )}

        <section aria-labelledby="units" className="space-y-6">
          <h2 id="units" className="font-display text-2xl font-bold">Stage {st} units</h2>
          {(['number', 'geometry', 'statistics'] as const).map((strand) => {
            const list = units.filter((u) => u.strand === strand);
            if (!list.length) return null;
            return (
              <div key={strand}>
                <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><MaterialIcon name={STRAND_SYMBOL[strand].symbol} className="text-teal-700 dark:text-teal-300" /> {STRAND_NAMES[strand].en}{settings?.support === 'pt-MZ' && <span lang="pt-MZ" className="font-sans text-[15px] font-normal text-muted-fg">{STRAND_NAMES[strand].pt}</span>}</h3>
                <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((u) => {
                    const open = mathsUnitOpen(u, pro);
                    const stars = m.starsFor(u.id);
                    return (
                      <li key={u.id}>
                        <Link to={`/cambridge/maths/${u.id}`} className={cn('flex h-full items-start gap-3 rounded-md bg-card p-4 transition-colors hover:bg-muted', focusRing)}>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-muted-fg">Unit {u.order}{open && !pro && u.order <= 2 ? ', free' : ''}</span>
                            <span className="block font-bold leading-tight">{u.title}</span>
                            {settings?.support === 'pt-MZ' && <span lang="pt-MZ" className="block text-[15px] text-muted-fg">{u.pt}</span>}
                            <span className="mt-1 block text-[15px] text-muted-fg">{u.objectives[0]}</span>
                            {stars > 0 && <span className="mt-1 flex items-center gap-1 text-sm font-semibold"><Star className="text-[18px] text-gold-700 dark:text-gold" /> {stars} {stars === 1 ? 'star' : 'stars'}</span>}
                          </span>
                          {!open && <Lock className="shrink-0 text-muted-fg" label="Needs Plus" />}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
          <p className="max-w-3xl text-[15px] text-muted-fg">Units 1 and 2 of every stage are free. The rest come with <Link to="/pricing" className="underline">Plus</Link> (7-day free trial). Portuguese is AI-translated and awaiting review by a Portuguese-speaking teacher.</p>
        </section>
      </div>
    </div>
  );
}
