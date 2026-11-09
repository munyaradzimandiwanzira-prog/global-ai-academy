import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MaterialIcon, type SymbolName } from '@/components/icons';
import { TOUR_STEPS } from '@/pages/teacher/Tour';
import { PAYOUT_MIN_CENTS } from '@shared/teaching';

const STEPS: { symbol: SymbolName; title: string; text: string }[] = [
  { symbol: 'person_add', title: 'Sign up as a teacher', text: 'Create a free account and tick “I’m a teacher”. We check every request before the teaching portal opens.' },
  { symbol: 'confirmation_number', title: 'Invite your learners', text: 'Share an invite link or code. Learners join you free, and you can put them straight into a class.' },
  { symbol: 'school', title: 'Choose what to teach', text: 'Cambridge Primary English and Maths, Kids Zone, or any of the coding and AI tracks. Assign lessons, levels and practice.' },
  { symbol: 'quiz', title: 'Set work that marks itself', text: 'Homework, tests and exams with instant marking. Written answers get a suggested mark from your rubric for you to confirm.' },
  { symbol: 'insights', title: 'Track every learner', text: 'A gradebook of every mark, charts that show who is active and what to reteach, and an AI progress report for each child.' },
  { symbol: 'account_balance_wallet', title: 'Get paid', text: 'A share of every subscription your students pay goes to your wallet. Request a payout to EcoCash, OneMoney, InnBucks or a bank.' },
];

const FEATURES: { symbol: SymbolName; title: string; text: string }[] = [
  { symbol: 'auto_awesome', title: 'Zuva, your teaching assistant', text: 'Ask who to help first, get a timed lesson plan from any course, or turn a question your class got wrong into a 20-minute reteach.' },
  { symbol: 'timer', title: 'Timed tests and exams', text: 'Set a time limit and due date. Answers save as learners go and hand in automatically when time runs out.' },
  { symbol: 'calculate', title: 'Cambridge Maths question bank', text: 'Pull fresh questions from 36 units across Stages 1 to 6, each with a correct answer, pictures where they help, and no checking to do.' },
  { symbol: 'menu_book', title: 'Your own courses', text: 'Write units and lessons with notes, video and a self-marking check, or let Zuva draft a lesson for you to edit. Share with a class and see who is keeping up.' },
  { symbol: 'campaign', title: 'Parents in the loop', text: 'Email class announcements to parents as well as learners, and send each family a clear progress report written from real marks.' },
  { symbol: 'notifications', title: 'Nothing slips', text: 'See who hasn’t handed in, who has gone quiet, who is rushing through answers and who joined but never started.' },
];

function RequestButton() {
  const qc = useQueryClient();
  const r = useQuery({ queryKey: ['teacher-request'], queryFn: () => api.get<{ status: 'none' | 'pending' | 'approved' | 'rejected' }>('/api/me/teacher-request') });
  const ask = useMutation({ mutationFn: () => api.post('/api/me/teacher-request', {}), onSuccess: () => { toast.success('Request sent. We’ll email you when your portal is open.'); void qc.invalidateQueries({ queryKey: ['teacher-request'] }); }, onError: (e) => toast.error(errorMessage(e)) });
  if (r.data?.status === 'approved') return <Link to="/teach" className="btn-gold btn-lg">Open your teaching portal</Link>;
  if (r.data?.status === 'pending') return <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 font-semibold" role="status"><MaterialIcon name="hourglass_top" /> Request received. We’ll email you.</p>;
  return <button type="button" className="btn-gold btn-lg" onClick={() => ask.mutate()} disabled={ask.isPending || r.isLoading} aria-busy={ask.isPending || undefined}>Ask to teach</button>;
}

/** Public page for teachers: how the platform works for them, what they earn, and the way in. */
export default function Teachers() {
  const { user } = useAuth();
  const cta = user ? <RequestButton /> : <Link to="/signup?teacher=1" className="btn-gold btn-lg">Sign up as a teacher</Link>;
  return (
    <>
      <section className="bg-ink text-white dark:bg-night-800">
        <div className="container grid items-center gap-10 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow !text-gold">For teachers</p>
            <h1 className="mt-3 max-w-[16ch] text-4xl font-extrabold md:text-5xl">Teach more. Mark less.</h1>
            <p className="lede mt-6 max-w-xl text-white/85">Run your classes on Global AI Academy. Homework marks itself, every result is recorded, and Zuva shows you who needs help and what to teach next. You earn from every learner who subscribes.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {cta}
              <a href="#how" className="btn-outline-light btn-lg">How it works</a>
            </div>
            <p className="mt-4 text-sm text-white/70">Free to join. Learners join you free too.</p>
          </div>
          {/* A schematic of the dashboard, built from the same parts as the real one. */}
          <div aria-hidden="true" className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
            <div className="grid grid-cols-3 gap-2">
              {[['28', 'Students'], ['3', 'Need attention'], ['74%', 'Class average']].map(([v, l]) => <div key={l} className="rounded-lg bg-white/[.08] p-3"><div className="font-display text-2xl font-bold">{v}</div><div className="text-xs text-white/70">{l}</div></div>)}
            </div>
            <div className="mt-3 rounded-lg bg-white/[.08] p-3">
              <div className="text-xs text-white/70">Learners active each day</div>
              <div className="mt-2 flex h-24 items-end gap-1.5">{[9, 14, 12, 18, 21, 7, 4, 16, 19, 22, 20, 24, 10, 6].map((h, i) => <span key={i} className="flex-1 rounded-t-[4px] bg-teal-400" style={{ height: `${(h / 24) * 100}%` }} />)}</div>
            </div>
            <div className="mt-3 space-y-1.5 rounded-lg bg-white/[.08] p-3 text-sm">
              <div className="flex items-center gap-2"><MaterialIcon name="alarm" className="text-[18px] text-gold" /> 2 overdue tests not handed in</div>
              <div className="flex items-center gap-2"><MaterialIcon name="insights" className="text-[18px] text-gold" /> Reteach: 41% of marks on “Order these fractions”</div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="container scroll-mt-20 py-16">
        <h2 className="text-3xl font-bold">How it works</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-6">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-50"><MaterialIcon name={s.symbol} /></span><span className="font-display text-sm font-semibold text-muted-fg">Step {i + 1}</span></div>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-[15px] text-fg/80">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-bold">What you earn</h2>
            <p className="mt-4 text-lg">A share of every subscription your students pay, currently 10%, split equally if a learner has more than one teacher. It lands in your wallet as soon as the payment clears.</p>
            <p className="mt-4 text-[15px] text-fg/80">Request a payout once your balance reaches ${(PAYOUT_MIN_CENTS / 100).toFixed(2)}. Refunded payments are reversed, and every entry is shown in your wallet so you can check it.</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="card p-5">
                <MaterialIcon name={f.symbol} className="text-[28px] text-teal-600 dark:text-teal-400" />
                <h3 className="mt-3 font-display font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[15px] text-fg/80">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-3xl font-bold">A tour of the portal</h2>
        <p className="mt-2 max-w-2xl text-lg text-fg/80">When your portal opens, a narrated tour walks you through it. Here’s what it covers.</p>
        <ol className="mt-8 grid gap-x-8 gap-y-5 md:grid-cols-2">
          {TOUR_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-teal font-display font-bold tabular-nums">{i + 1}</span>
              <span><strong className="font-display">{s.title}.</strong> <span className="text-fg/80">{s.body}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-ink py-14 text-white dark:bg-night-800">
        <div className="container flex flex-wrap items-center justify-between gap-6">
          <div><h2 className="text-2xl font-bold md:text-3xl">Ready to bring your class?</h2><p className="mt-2 text-white/80">Questions first? <Link to="/contact" className="font-semibold underline">Talk to us</Link>.</p></div>
          {cta}
        </div>
      </section>
    </>
  );
}
