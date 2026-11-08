/**
 * The teacher portal starter tour: a spotlight walk through the real portal, narrated by Zuva.
 * Shows once on a teacher's first visit and can be replayed from "Take the tour".
 * Esc closes it, arrow keys step, and narration can be switched off (remembered).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { say, stopSpeaking } from '@/features/esl/voice';
import { MaterialIcon } from '@/components/icons';
import { storage } from '@/lib/utils';

const SEEN = storage<boolean>('gaa:teacher-tour:v1', false);
const VOICE = storage<boolean>('gaa:teacher-tour:voice', true);
const EVENT = 'gaa:teacher-tour';

export const startTour = () => window.dispatchEvent(new Event(EVENT));

/** Each step points at a `data-tour` target on the dashboard or in the teaching nav. */
export const TOUR_STEPS: { target: string; title: string; body: string }[] = [
  { target: 'stats', title: 'Welcome to your teaching portal', body: 'This is your dashboard. At the top: how many learners you have, who needs attention, work waiting to be marked, and what you have earned.' },
  { target: 'insights', title: 'See how your class is doing', body: 'These charts show who is active each day, how far learners are through onboarding, your test averages, and what to teach next, worked out from the marks they actually earned.' },
  { target: 'attention', title: 'Who needs a nudge', body: 'Learners who have not handed in work, are scoring low, have gone quiet, are rushing through answers, or joined but never started. Tap a name for their full picture and an AI report.' },
  { target: 'invites', title: 'Bring learners in', body: 'Make an invite link or code. Learners who join with it become your students, and can be added to a class straight away.' },
  { target: 'tests', title: 'Homework, tests and exams', body: 'Build a paper or pull questions from Cambridge Maths. Multiple choice, numbers and short answers are marked instantly. Zuva suggests marks for written answers from your rubric, and you confirm them.' },
  { target: 'gradebook', title: 'Every mark, recorded', body: 'The gradebook keeps every result, learner by learner, so you can track progress over the term and download it as a spreadsheet.' },
  { target: 'students', title: 'Each learner, in depth', body: 'Open any student to see their lessons, English and Maths mastery, test history and activity, and ask Zuva for a progress report with next steps.' },
  { target: 'plans', title: 'Lesson plans in minutes', body: 'Pick a course and lessons, and Zuva writes a timed lesson plan you can edit and reuse.' },
  { target: 'zuva', title: 'Your teaching assistant', body: 'Ask Zuva anything about your classes: who to help first, a homework task on loops, or a reteach of a question your class found hard.' },
  { target: 'wallet', title: 'Get paid', body: 'You earn a share of every subscription your students pay. It builds up in your wallet, and you can request a payout when it reaches the minimum.' },
];

type Box = { top: number; left: number; width: number; height: number };

export function TeacherTour() {
  const [step, setStep] = useState<number | null>(null);
  const [voice, setVoice] = useState(() => VOICE.get());
  const [box, setBox] = useState<Box | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const open = () => setStep(0);
    window.addEventListener(EVENT, open);
    // First visit: wait for the dashboard to render its targets.
    const t = !SEEN.get() ? window.setTimeout(open, 900) : undefined;
    return () => { window.removeEventListener(EVENT, open); if (t) clearTimeout(t); };
  }, []);

  const close = useCallback(() => { SEEN.set(true); stopSpeaking(); setStep(null); }, []);
  const go = useCallback((n: number) => setStep((s) => (s == null ? s : n < 0 ? 0 : n >= TOUR_STEPS.length ? (close(), null) : n)), [close]);

  // Visible targets only (the nav is the same on every portal page).
  const target = step == null ? null : (Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${TOUR_STEPS[step]!.target}"]`)).find((el) => el.offsetParent !== null) ?? null);

  useLayoutEffect(() => {
    if (step == null) return;
    const el = target;
    if (!el) { setBox(null); return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    const measure = () => { const r = el.getBoundingClientRect(); setBox({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 }); };
    measure();
    const t = window.setTimeout(measure, reduce ? 0 : 350);
    window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [step, target]);

  useEffect(() => {
    if (step == null) return;
    card.current?.focus();
    if (voice) { const s = TOUR_STEPS[step]!; void say(`${s.title}. ${s.body}`, 'gb', 'secondary'); }
    return () => stopSpeaking();
  }, [step, voice]);

  useEffect(() => {
    if (step == null) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(step + 1); if (e.key === 'ArrowLeft') go(step - 1); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [step, go, close]);

  if (step == null) return null;
  const s = TOUR_STEPS[step]!;
  const last = step === TOUR_STEPS.length - 1;
  const vh = window.innerHeight, vw = window.innerWidth;
  const phone = vw < 640;
  // Card goes below the spotlight when there's room, above otherwise; docked at the bottom on phones.
  const below = box ? box.top + box.height + 240 < vh : true;
  const cardStyle: React.CSSProperties = phone || !box ? {} : { top: below ? box.top + box.height + 12 : Math.max(12, box.top - 12), left: Math.min(Math.max(12, box.left), vw - 412), transform: below ? undefined : 'translateY(-100%)' };

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="presentation">
      {box ? (
        <div aria-hidden="true" className="pointer-events-none fixed rounded-xl ring-2 ring-gold transition-all duration-300 motion-reduce:transition-none" style={{ ...box, boxShadow: '0 0 0 9999px rgb(12 28 56 / 0.62)' }} />
      ) : <div aria-hidden="true" className="fixed inset-0 bg-ink-900/60" />}
      <div className="fixed inset-0" onClick={close} aria-hidden="true" />
      <div ref={card} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body"
        className={phone || !box ? 'fixed inset-x-3 bottom-3 rounded-xl bg-card p-5 text-fg shadow-2xl outline-none' : 'fixed w-[400px] rounded-xl bg-card p-5 text-fg shadow-2xl outline-none'}
        style={cardStyle}>
        <div className="flex items-center gap-2 text-sm text-muted-fg">
          <span className="tabular-nums">Step {step + 1} of {TOUR_STEPS.length}</span>
          <button type="button" onClick={() => { const v = !voice; VOICE.set(v); setVoice(v); if (!v) stopSpeaking(); }} aria-pressed={voice} className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-3 hover:bg-muted">
            <MaterialIcon name={voice ? 'volume_up' : 'volume_off'} className="text-[20px]" /> {voice ? 'Narration on' : 'Narration off'}
          </button>
          <button type="button" onClick={close} aria-label="Close the tour" className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted"><MaterialIcon name="close" /></button>
        </div>
        <h2 id="tour-title" className="mt-1 font-display text-xl font-bold">{s.title}</h2>
        <p id="tour-body" className="mt-2 text-[16px] leading-relaxed">{s.body}</p>
        <div className="mt-2 flex gap-1" aria-hidden="true">{TOUR_STEPS.map((_, i) => <span key={i} className={i === step ? 'h-1.5 w-5 rounded-full bg-teal' : 'h-1.5 w-1.5 rounded-full bg-border'} />)}</div>
        <div className="mt-4 flex gap-2">
          {step > 0 ? <button type="button" className="btn-outline" onClick={() => go(step - 1)}>Back</button> : <button type="button" className="btn-ghost" onClick={close}>Skip tour</button>}
          <button type="button" className="btn-primary ml-auto" onClick={() => go(step + 1)}>{last ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
