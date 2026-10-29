import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Sparkles, Check } from '@/components/icons';
import type { PublicUser } from '@shared/api-types';
import { PLANS, TRIAL, usd } from '@shared/config';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, ButtonLink } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * The paywall moment. Shown when a learner reaches the end of a free preview: it celebrates what
 * they have done, says exactly what unlocking gives them, and offers the cheapest next step
 * (free account → free trial → Plus).
 */
export function UpgradeCard({ title, done, unlocks, className }: { title: string; done?: string; unlocks: string[]; className?: string }) {
  const { user, setUser } = useAuth();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);

  const startTrial = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ user: PublicUser; message: string }>('/api/me/trial', {});
      setUser(r.user);
      toast.success(r.message);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn('not-prose overflow-hidden rounded-3xl bg-ink text-white dark:bg-night-800', className)} aria-labelledby="upgrade-title">
      <div className="grid gap-8 p-6 md:grid-cols-[1.3fr_1fr] md:p-9">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-gold"><Lock className="h-4 w-4" aria-hidden="true" /> Free preview finished</p>
          <h2 id="upgrade-title" className="mt-2 font-display text-[1.9rem] font-bold leading-tight md:text-[2.3rem]">{title}</h2>
          {done && <p className="mt-3 text-[15px] text-white/80">{done}</p>}
          <ul className="mt-5 space-y-2.5">
            {unlocks.map((u) => (
              <li key={u} className="flex gap-2.5 text-[15px] text-white/90"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />{u}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-2xl bg-white/5 p-5">
          <p className="text-sm text-white/70">Plus unlocks every professional track and lab</p>
          <p className="font-display text-4xl font-bold">{usd(PLANS.plus.priceUsdMonthly)}<span className="text-base font-medium text-white/60"> / month</span></p>
          {!user ? (
            <>
              <ButtonLink to={`/signup?next=${encodeURIComponent(pathname)}`} color="accent" size="lg" fullWidth>Create a free account</ButtonLink>
              <p className="text-center text-xs text-white/60">New accounts can try Plus free for {TRIAL.days} days.</p>
            </>
          ) : user.trialAvailable ? (
            <>
              <Button color="accent" size="lg" fullWidth loading={busy} onClick={startTrial} startIcon={<Sparkles className="h-4 w-4" />}>Start {TRIAL.days}-day free trial</Button>
              <ButtonLink to="/pricing" variant="outlined" color="light" fullWidth>Compare plans</ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink to="/pricing?plan=plus" color="accent" size="lg" fullWidth>Upgrade to Plus</ButtonLink>
              <ButtonLink to="/pricing" variant="outlined" color="light" fullWidth>Compare plans</ButtonLink>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default UpgradeCard;
