import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Smartphone, CreditCard, Check, Minus, Tag } from '@/components/icons';
import { PLANS, PLAN_CATALOG, SITE, TRIAL, usd, priceFor, yearlyDiscountPercent, type BillingPeriod, type Plan, type PlanId } from '@shared/config';
import type { PublicUser } from '@shared/api-types';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Dialog, Field, Input, Button, ButtonLink } from '@/components/ui';
import { PlanCards, PeriodToggle } from '@/features/pricing/PlanCards';
import { WaitlistDialog } from '@/features/pricing/WaitlistDialog';
import { cn } from '@/lib/utils';

interface Quote { listCents: number; amountCents: number; percentOff: number; promoCode: string | null }

/** Rows for the comparison table: which plan includes what. Content, not decoration. */
const COMPARE: { label: string; plans: Partial<Record<Plan['id'], string | true>> }[] = [
  { label: 'Core tutorials, references and examples', plans: { free: true, plus: true, academy: true, premium: true } },
  { label: 'Professional tracks: agentic AI, MCP, GraphRAG, Neo4j, evals, inference, SageMaker…', plans: { free: 'Free preview', plus: true, academy: true, premium: true } },
  { label: 'Graph Lab simulated work placements', plans: { free: '1 full + previews', plus: 'All', academy: 'All', premium: 'All' } },
  { label: 'Run code in the browser (Python, JS, HTML, CSS, SQL, Cypher)', plans: { free: true, plus: true, academy: true, premium: true } },
  { label: 'Exercises, quizzes and coding challenges', plans: { free: true, plus: true, academy: true, premium: true } },
  { label: 'Kids Zone games', plans: { free: true, plus: true, academy: true, premium: true } },
  { label: 'AI requests a day', plans: { free: '15', plus: '150', academy: '400', premium: 'Unlimited' } },
  { label: 'Saved projects', plans: { free: '3', plus: '100, shareable', academy: '200, shareable', premium: 'Unlimited' } },
  { label: 'Professor Zuva AI tutor', plans: { plus: true, academy: true, premium: true } },
  { label: 'Goals and study plans', plans: { plus: true, academy: true, premium: true } },
  { label: 'Certification exams and certificates', plans: { plus: true, academy: true, premium: true } },
  { label: 'Teacher-led classrooms and live sessions', plans: { academy: true, premium: true } },
  { label: 'Graded assignments (AI + teacher)', plans: { academy: true, premium: true } },
  { label: 'Mentor-reviewed capstone project', plans: { academy: true, premium: true } },
  { label: 'Weekly 1:1 mentorship', plans: { premium: true } },
  { label: 'GPU lab credits and placement support', plans: { premium: true } },
];

const FAQ: { q: string; a: string }[] = [
  { q: 'Is the free plan really free?', a: 'Yes. Every core tutorial, reference, exercise, quiz, challenge and code editor is free for everyone, with or without an account, and every professional track has a free preview. Plus unlocks the professional tracks and Graph Lab placements in full, and paid plans add support around the content: an AI tutor, certificates, classrooms and mentoring.' },
  { q: 'How do I pay from Zimbabwe?', a: 'With EcoCash, OneMoney, or a Visa/Mastercard through Paynow Zimbabwe. Prices are in US dollars. Schools can also pay by bank transfer — contact us for an invoice.' },
  { q: 'How does yearly billing work?', a: `You pay for 10 months and get 12: that is ${yearlyDiscountPercent}% off. Plus is ${usd(priceFor(PLANS.plus, 'yearly'))} a year instead of ${usd(PLANS.plus.priceUsdMonthly * 12)}; Academy is ${usd(priceFor(PLANS.academy, 'yearly'))} instead of ${usd(PLANS.academy.priceUsdMonthly * 12)}.` },
  { q: 'Can I try Plus before paying?', a: `Yes. Every learner on the Free plan can start one ${TRIAL.days}-day Plus trial from this page or their dashboard. No payment details are needed, and it simply ends after ${TRIAL.days} days.` },
  { q: 'What happens when my plan ends?', a: 'You keep your account, progress, certificates and projects. Paid features pause and you return to Free until you renew.' },
  { q: 'Do you offer scholarships?', a: 'Yes. Learners who cannot afford a plan can apply through the contact page; administrators grant Plus or Academy scholarships for a set number of months.' },
  { q: 'When does Premium open?', a: 'We are admitting the first Premium cohort in small groups so every learner gets a real mentor. Join the waitlist and we will email you first.' },
];

export default function Pricing() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<BillingPeriod>('yearly');
  const [checkout, setCheckout] = useState<Exclude<PlanId, 'free'> | null>(null);
  const [waitlist, setWaitlist] = useState(false);
  const [method, setMethod] = useState<'web' | 'ecocash' | 'onemoney'>('ecocash');
  const [phone, setPhone] = useState('');
  const [promo, setPromo] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [trialBusy, setTrialBusy] = useState(false);
  const config = useQuery({ queryKey: ['pay-config'], queryFn: () => api.get<{ paynow: boolean }>('/api/payments/config') });

  useEffect(() => { setQuote(null); }, [checkout, period]);

  const choose = (plan: Plan) => {
    if (plan.comingSoon) return setWaitlist(true);
    if (plan.id === 'free') return navigate(user ? '/dashboard' : '/signup');
    if (!user) return navigate(`/signup?next=/pricing`);
    setPromo('');
    setCheckout(plan.id as Exclude<PlanId, 'free'>);
  };

  const startTrial = async () => {
    if (!user) return navigate('/signup?next=/pricing');
    setTrialBusy(true);
    try {
      const r = await api.post<{ user: PublicUser; message: string }>('/api/me/trial', {});
      setUser(r.user);
      toast.success(r.message);
      navigate('/dashboard');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTrialBusy(false);
    }
  };

  const applyPromo = async () => {
    if (!checkout || !promo.trim()) return;
    try {
      setQuote(await api.post<Quote>('/api/payments/quote', { code: promo.trim(), plan: checkout, period }));
    } catch (err) {
      setQuote(null);
      toast.error(errorMessage(err));
    }
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post<{ reference: string; redirectUrl: string | null; activated: boolean }>('/api/payments/checkout', {
        plan: checkout, period, method, phone: method === 'web' ? undefined : phone, promoCode: quote?.promoCode ?? undefined,
      });
      if (r.activated) {
        toast.success('Your plan is active. Enjoy!');
        window.location.assign('/dashboard');
      } else if (r.redirectUrl && method === 'web') window.location.href = r.redirectUrl;
      else navigate(`/billing/return?ref=${r.reference}&wait=1`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const list = checkout ? priceFor(PLANS[checkout], period) : 0;
  const due = quote ? quote.amountCents / 100 : list;
  const free = quote?.amountCents === 0;

  return (
    <div>
      <section className="bg-ink text-white dark:bg-night">
        <div className="container grid gap-10 pb-14 pt-14 md:pt-20 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <h1 className="display-lg">Free to learn. Pay for a mentor.</h1>
            <p className="lede mt-6 max-w-xl text-white/80">
              Core tutorials and every editor are free, forever. Plus unlocks the professional tracks and Graph Lab, an AI tutor and certificates; Academy adds teacher-led classes; Premium, soon, one-to-one mentoring. Pay with EcoCash, OneMoney or card.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <PeriodToggle period={period} onChange={setPeriod} tone="dark" />
            {user?.trialAvailable && (
              <Button color="accent" size="lg" loading={trialBusy} onClick={startTrial}>Try Plus free for {TRIAL.days} days</Button>
            )}
            {!user && <p className="text-white/75">New here? <Link to="/signup?next=/pricing" className="font-semibold text-gold underline-offset-4 hover:underline">Create a free account</Link> and try Plus for {TRIAL.days} days.</p>}
          </div>
        </div>
        <div className="container pb-16">
          <PlanCards period={period} tone="dark" currentPlan={user?.plan} onChoose={choose} />
        </div>
        <div className="chevron-band" />
      </section>

      <section className="container py-20">
        <h2 className="display-md max-w-2xl">Compare every plan</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[15px]">
            <thead>
              <tr className="border-b-2 border-ink/80 dark:border-sand/40">
                <th className="py-3 pr-4 font-semibold">What you get</th>
                {PLAN_CATALOG.map((p) => <th key={p.id} className="w-[15%] px-3 py-3 text-center font-display text-lg font-bold">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.label} className="border-b border-border">
                  <td className="py-3 pr-4">{row.label}</td>
                  {PLAN_CATALOG.map((p) => {
                    const v = row.plans[p.id];
                    return (
                      <td key={p.id} className="px-3 py-3 text-center tabular">
                        {v === true ? <Check className="mx-auto h-5 w-5 text-teal" aria-label="Included" /> : v ? <span className="font-medium">{v}</span> : <Minus className="mx-auto h-4 w-4 text-muted-fg/60" aria-label="Not included" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="py-4 pr-4 font-semibold">Price ({period})</td>
                {PLAN_CATALOG.map((p) => <td key={p.id} className="px-3 py-4 text-center font-display text-lg font-bold tabular">{p.priceUsdMonthly ? usd(priceFor(p, period)) : '$0'}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-granite-100 py-20 dark:bg-night-800">
        <div className="container grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="display-md">Questions before you pay</h2>
            <p className="lede mt-4 text-fg/80">Still unsure? WhatsApp us on <a href={`https://wa.me/${SITE.contact.whatsapp.replace(/\D/g, '')}`} className="font-semibold text-teal-600 underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">{SITE.contact.phone}</a> or visit us at {SITE.contact.address}.</p>
            <div className="mt-8 rounded-3xl bg-ink p-7 text-white">
              <h3 className="font-display text-2xl font-bold">Schools and organisations</h3>
              <p className="mt-2 text-white/80">Sponsored Academy seats, bulk pricing, a teacher dashboard and invoices for bank transfer.</p>
              <ButtonLink to="/contact" color="accent" className="mt-5">Talk to us about your school</ButtonLink>
            </div>
          </div>
          <dl className="divide-y divide-border">
            {FAQ.map((f) => (
              <div key={f.q} className="py-5 first:pt-0">
                <dt className="font-display text-xl font-semibold">{f.q}</dt>
                <dd className="mt-2 text-[16px] leading-relaxed text-fg/85">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <WaitlistDialog open={waitlist} onOpenChange={setWaitlist} />

      <Dialog open={!!checkout} onOpenChange={(o) => !o && setCheckout(null)} title={`Upgrade to ${checkout ? PLANS[checkout].name : ''}`} description={checkout ? `${period === 'yearly' ? 'Yearly' : 'Monthly'} billing · prices in US dollars` : undefined}>
        {checkout && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-granite-100 p-4 dark:bg-night-700">
              <div className="flex items-baseline justify-between"><span>{PLANS[checkout].name}, {period}</span><span className={cn('tabular', quote?.percentOff && 'text-muted-fg line-through')}>{usd(list)}</span></div>
              {quote?.percentOff ? <div className="mt-1 flex items-baseline justify-between text-teal-600"><span>Code {quote.promoCode} · {quote.percentOff}% off</span><span className="tabular">−{usd((quote.listCents - quote.amountCents) / 100)}</span></div> : null}
              <div className="mt-2 flex items-baseline justify-between font-display text-xl font-bold"><span>Due today</span><span className="tabular">{usd(due)}</span></div>
            </div>

            <div className="flex gap-2">
              <label className="sr-only" htmlFor="promo">Promo code</label>
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" aria-hidden="true" />
                <Input id="promo" className="pl-9 uppercase" placeholder="Promo code" value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setQuote(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void applyPromo(); } }} />
              </div>
              <Button variant="outlined" onClick={applyPromo} disabled={!promo.trim()}>Apply</Button>
            </div>

            {free ? (
              <form onSubmit={pay}><Button type="submit" size="lg" fullWidth loading={busy}>Activate {PLANS[checkout].name}</Button></form>
            ) : config.data?.paynow === false ? (
              <div className="space-y-3 text-[15px]">
                <p>Online payment is being switched on. To upgrade today, send {usd(due)} by EcoCash or bank transfer and we will activate your plan the same day.</p>
                <p>WhatsApp <a className="font-semibold text-teal-600 underline" href={`https://wa.me/${SITE.contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'd like to upgrade ${user?.email ?? ''} to ${PLANS[checkout].name} (${period}).`)}`} target="_blank" rel="noopener noreferrer">{SITE.contact.phone}</a> or email <a href={`mailto:${SITE.contact.email}?subject=${encodeURIComponent(`Upgrade to ${PLANS[checkout].name}`)}`} className="font-semibold text-teal-600 underline">{SITE.contact.email}</a> with your account email.</p>
              </div>
            ) : (
              <form onSubmit={pay} className="space-y-4">
                <fieldset className="grid grid-cols-3 gap-2">
                  <legend className="label">Pay with</legend>
                  {([['ecocash', 'EcoCash', Smartphone], ['onemoney', 'OneMoney', Smartphone], ['web', 'Card / other', CreditCard]] as const).map(([id, label, Icon]) => (
                    <button type="button" key={id} onClick={() => setMethod(id)} aria-pressed={method === id} className={cn('flex flex-col items-center gap-1 rounded-2xl border-[1.5px] p-3 text-sm font-medium transition-colors', method === id ? 'border-teal bg-teal/[.08]' : 'border-border hover:bg-muted')}>
                      <Icon className="h-5 w-5" aria-hidden="true" /> {label}
                    </button>
                  ))}
                </fieldset>
                {method !== 'web' && (
                  <Field label="Mobile number to charge" hint="You will get a prompt on your phone to enter your PIN." htmlFor="ph">
                    <Input id="ph" inputMode="numeric" pattern="0\d{9}" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0771234567" />
                  </Field>
                )}
                <Button type="submit" size="lg" fullWidth loading={busy}>{method === 'web' ? `Pay ${usd(due)} with Paynow` : `Send ${usd(due)} payment prompt`}</Button>
                <p className="text-center text-xs text-muted-fg">Payments are processed securely by Paynow Zimbabwe.</p>
              </form>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
