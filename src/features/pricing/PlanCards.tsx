import { Check } from '@/components/icons';
import { PLAN_CATALOG, priceFor, usd, yearlyDiscountPercent, yearlyPrice, yearlySaving, type BillingPeriod, type Plan } from '@shared/config';
import { cn } from '@/lib/utils';

/** Monthly / yearly switch. The yearly label states the real saving, computed from config. */
export function PeriodToggle({ period, onChange, tone = 'default' }: { period: BillingPeriod; onChange: (p: BillingPeriod) => void; tone?: 'default' | 'dark' }) {
  return (
    <div role="radiogroup" aria-label="Billing period" className={cn('inline-flex rounded-full p-1', tone === 'dark' ? 'bg-white/10' : 'bg-granite-100 dark:bg-night-700')}>
      {(['monthly', 'yearly'] as const).map((p) => (
        <button
          key={p}
          role="radio"
          aria-checked={period === p}
          onClick={() => onChange(p)}
          className={cn(
            'h-10 rounded-full px-5 text-sm font-semibold transition-colors',
            period === p
              ? tone === 'dark' ? 'bg-white text-ink' : 'bg-ink text-white dark:bg-sand dark:text-ink'
              : tone === 'dark' ? 'text-white/80 hover:text-white' : 'text-fg/75 hover:text-fg',
          )}
        >
          {p === 'monthly' ? 'Monthly' : `Yearly · 2 months free`}
        </button>
      ))}
    </div>
  );
}

export function PriceLine({ plan, period, tone = 'default' }: { plan: Plan; period: BillingPeriod; tone?: 'default' | 'dark' }) {
  const muted = tone === 'dark' ? 'text-white/70' : 'text-muted-fg';
  if (!plan.priceUsdMonthly) {
    return (
      <div>
        <p className="font-display text-5xl font-bold tracking-display">$0</p>
        <p className={cn('mt-1 text-sm', muted)}>Free forever</p>
      </div>
    );
  }
  return (
    <div>
      <p className="font-display text-5xl font-bold tracking-display tabular">
        {usd(priceFor(plan, period))}
        <span className={cn('ml-1 align-baseline font-sans text-base font-medium tracking-normal', muted)}>{period === 'yearly' ? '/ year' : '/ month'}</span>
      </p>
      <p className={cn('mt-1 text-sm tabular', muted)}>
        {period === 'yearly'
          ? <>Save {usd(yearlySaving(plan))} ({yearlyDiscountPercent}%) · works out at {usd(Math.round((yearlyPrice(plan) / 12) * 100) / 100)} a month</>
          : <>or {usd(yearlyPrice(plan))} a year, saving {usd(yearlySaving(plan))}</>}
      </p>
    </div>
  );
}

/**
 * The four plans side by side. Free, Plus, Academy are on sale; Premium is coming soon and
 * offers the waitlist instead of checkout.
 */
export function PlanCards({
  period, tone = 'default', currentPlan, onChoose, actionLabel, featureLimit,
}: {
  period: BillingPeriod;
  tone?: 'default' | 'dark';
  currentPlan?: string;
  onChoose: (plan: Plan) => void;
  actionLabel?: (plan: Plan) => string;
  featureLimit?: number;
}) {
  const dark = tone === 'dark';
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PLAN_CATALOG.map((p) => {
        const current = currentPlan === p.id;
        const label = current ? 'Your current plan' : actionLabel?.(p) ?? (p.comingSoon ? 'Join the waitlist' : p.id === 'free' ? 'Start free' : `Choose ${p.name}`);
        return (
          <article
            key={p.id}
            className={cn(
              'flex flex-col rounded-3xl p-6 md:p-7',
              dark
                ? p.highlight ? 'bg-gold text-ink-900' : p.comingSoon ? 'bg-white text-ink-900' : 'bg-white/[.07]'
                : p.highlight ? 'bg-ink text-white dark:bg-gold dark:text-ink-900' : p.comingSoon ? 'bg-stone text-white' : 'bg-card',
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              {p.highlight && <span className="text-sm font-semibold">Most chosen</span>}
              {p.comingSoon && <span className="text-sm font-semibold">Opening soon</span>}
            </div>
            <p className={cn('mt-1 min-h-[2.5rem] text-[15px]', (dark && !p.highlight && !p.comingSoon) || (!dark && (p.highlight || p.comingSoon)) ? 'opacity-80' : 'text-fg/75')}>{p.blurb}</p>
            <div className="mt-6">
              <PriceLine plan={p} period={period} tone={(dark && !p.highlight && !p.comingSoon) || (!dark && (p.highlight || p.comingSoon)) ? 'dark' : 'default'} />
            </div>
            <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
              {p.features.slice(0, featureLimit ?? p.features.length).map((f) => (
                <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-[18px] w-[18px] shrink-0 opacity-80" aria-hidden="true" />{f}</li>
              ))}
            </ul>
            <button
              type="button"
              disabled={current}
              onClick={() => onChoose(p)}
              className={cn(
                'btn btn-lg mt-7 w-full',
                dark
                  ? p.highlight ? 'bg-ink text-white hover:bg-ink-700' : p.comingSoon ? 'bg-stone text-white hover:bg-stone-400' : 'border-[1.5px] border-white/70 text-white hover:bg-white/10'
                  : p.highlight ? 'bg-gold text-ink-900 hover:bg-gold-600 dark:bg-ink dark:text-white' : p.comingSoon ? 'bg-white text-stone hover:bg-sand' : 'btn-outline',
              )}
            >
              {label}
            </button>
          </article>
        );
      })}
    </div>
  );
}
