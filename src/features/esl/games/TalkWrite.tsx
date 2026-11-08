/** Talk Time (a role-play with Zuva) and Write and Check (writing marked by Zuva). */
import { useCallback, useState } from 'react';
import type { Activity, EslBandId } from '@shared/esl';
import type { ZuvaCard } from '@shared/zuva';
import { Check, Sparkles } from '@/components/icons';
import { ZuvaChat } from '@/features/zuva/ZuvaChat';
import { ZuvaCardView } from '@/features/zuva/ZuvaCards';
import { streamZuva } from '@/features/zuva/api';
import { Markdown } from '@/components/Markdown';
import { errorMessage } from '@/lib/api';
import { say } from '../voice';
import type { GameProps } from './kit';
import { buttonClass } from '@/components/ui/Button';

type Of<K extends Activity['kind']> = GameProps<Extract<Activity, { kind: K }>> & { week: number; band: EslBandId; guest?: { name?: string; age?: number; trial: boolean } };

export function Talk({ activity, tier, accent, signedIn, onAnswer, onDone, week, band, guest }: Of<'talk'>) {
  const [turns, setTurns] = useState(0);
  const [start] = useState(Date.now());
  const getContext = useCallback(() => ({ esl: { week, band, accent, activityId: activity.id, kind: 'talk' as const, task: activity.scenario, guest } }), [week, band, accent, activity.id, activity.scenario, guest]);
  const voice = useCallback((t: string, p?: 'word' | 'early' | 'primary' | 'secondary') => void say(t, accent, p ?? (tier === 'secondary' ? 'secondary' : tier)), [accent, tier]);
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-card p-4">
        <h4 className="font-display font-bold">The situation</h4>
        <p className="mt-1">{activity.scenario}</p>
        <p className="mt-2 text-[15px] text-muted-fg">Try to: {activity.goals.join('; ')}.</p>
      </div>
      <div className="flex h-[min(60vh,520px)] flex-col overflow-hidden rounded-md bg-card">
        <ZuvaChat mode="esl" skin={tier === 'secondary' ? 'grown' : 'kids'} greeting={activity.opener} starters={[]} compact getContext={getContext}
          threadKey={`esl-talk:${activity.id}`} signedIn={signedIn} autoSpeak voice={voice} onUserMessage={() => setTurns((n) => n + 1)} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">{turns < 3 ? `Keep talking: ${3 - turns} more ${3 - turns === 1 ? 'reply' : 'replies'} to finish.` : 'Great conversation! Finish when you’re ready.'}</p>
        <button type="button" disabled={turns < 3} onClick={() => { onAnswer({ item: activity.scenario.slice(0, 120), correct: true, ms: Date.now() - start, tries: 1, hints: 0, input: 'type' }); onDone(); }} className={buttonClass({ color: 'action' })}><Check /> Finish the conversation</button>
      </div>
    </div>
  );
}

export function Write({ activity, tier, accent, onAnswer, onDone, week, band, guest }: Of<'write'>) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
  const [cards, setCards] = useState<ZuvaCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [start] = useState(Date.now());
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ready = words >= Math.max(3, Math.floor(activity.minWords * 0.6));
  const check = async () => {
    setBusy(true); setError(null); setReply(''); setCards([]);
    try {
      await streamZuva({ mode: 'esl', message: `Please mark my writing with esl_check_writing.\n\nTask: ${activity.prompt}\n\nMy writing:\n${text}`.slice(0, 2000), esl: { week, band, accent, activityId: activity.id, kind: 'write', task: activity.prompt, guest } }, (e) => {
        if (e.t === 'card') setCards((c) => [...c, e.card]);
        else if (e.t === 'text') setReply(e.text);
        else if (e.t === 'error') setError(e.message);
      });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const feedback = cards.find((c) => c.kind === 'esl_feedback');
  const avg = feedback && feedback.kind === 'esl_feedback' && feedback.scores.length ? feedback.scores.reduce((n, s) => n + s.band, 0) / feedback.scores.length / 5 : null;
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-card p-4"><p className="font-semibold">{activity.prompt}</p><p className="mt-1 text-[15px] text-muted-fg">{activity.minWords}–{activity.maxWords} words. Zuva checks: {activity.criteria.join('; ')}.</p></div>
      <textarea aria-label="Your writing" value={text} onChange={(e) => setText(e.target.value)} rows={tier === 'secondary' ? 10 : 6} maxLength={3500} className="input w-full text-base leading-relaxed" spellCheck={false} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={words > activity.maxWords ? 'font-bold text-red-700 dark:text-red-300' : 'text-muted-fg'}>{words} words</span>
        <div className="flex gap-2">
          <button type="button" disabled={!ready || busy} onClick={() => void check()} aria-busy={busy || undefined} className={buttonClass({ color: 'action' })}><Sparkles /> {busy ? 'Zuva is reading…' : 'Check my writing'}</button>
          {feedback && <button type="button" onClick={() => { onAnswer({ item: activity.prompt.slice(0, 120), correct: (avg ?? 0) >= 0.6, score: avg, ms: Date.now() - start, tries: 1, hints: 0, input: 'type' }); onDone(); }} className={buttonClass({ variant: 'outlined' })}><Check /> Finish</button>}
        </div>
      </div>
      {error && <p role="alert" className="text-[15px] font-semibold text-red-700 dark:text-red-300">{error}</p>}
      {cards.map((c, k) => <ZuvaCardView key={k} card={c} kids={tier !== 'secondary'} onAsk={() => {}} />)}
      {reply && <div className="rounded-md bg-card p-4"><Markdown className="prose-sm">{reply}</Markdown></div>}
    </div>
  );
}
