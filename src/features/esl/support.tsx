/**
 * Portuguese help in the games. The English being practised never changes: Portuguese explains the
 * instruction, or gives the meaning after a try (or as a hint, which the learner model counts).
 */
import { useState } from 'react';
import { PT_UI, ptWord, type ActivityKind, type PtKey, type SupportLang } from '@shared/esl';
import { MaterialIcon, Volume2 } from '@/components/icons';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useEslPlace } from './EslContext';
import { helperPill, focusRing } from './ui';
import { say } from './voice';

export function useSupport(): { on: boolean; lang: SupportLang } {
  const place = useEslPlace();
  const lang = place?.support ?? 'off';
  return { on: lang === 'pt-MZ', lang };
}

/** The instruction for each game, in Portuguese. */
export const PT_INTRO: Partial<Record<ActivityKind, PtKey>> = {
  echo: 'yourTurn', say: 'whatIsThis', pick: 'listenWhich', sound: 'tapSounds', rhyme: 'rhymes', spell: 'spellIt',
  order: 'orderWords', gap: 'fillGap', story: 'storyIntro', talk: 'talkIntro', write: 'writeIntro',
  pairs: 'pairsIntro', friends: 'friendsIntro', fix: 'fixIntro',
};

const speakPt = (t: string) => void say(t, 'gb', 'primary', 'pt-MZ');

/** A Portuguese line under English text, with a button to hear it. */
export function PtLine({ text, className }: { text: string; className?: string }) {
  return (
    <p lang="pt-MZ" className={cn('flex items-start gap-1.5 text-[15px] text-muted-fg', className)}>
      <MaterialIcon name="translate" className="mt-px text-[20px] text-teal-700 dark:text-teal-300" />
      <span className="min-w-0 flex-1">{text}</span>
      <button type="button" onClick={() => speakPt(text)} aria-label={PT_UI.hearPt} title={PT_UI.hearPt} className={cn('-my-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-teal-700 hover:bg-teal/10 dark:text-teal-300', focusRing)}><Volume2 /></button>
    </p>
  );
}

/** "O que significa?" for one word from the glossary. Calls onUse the first time it is opened. */
export function Meaning({ word, onUse, className }: { word: string; onUse?: () => void; className?: string }) {
  const { on } = useSupport();
  const [open, setOpen] = useState(false);
  const pt = ptWord(word);
  if (!on || !pt) return null;
  return open ? <PtLine text={`${PT_UI.meaningIs} ${pt}`} className={cn('justify-center', className)} /> : (
    <button type="button" className={cn(helperPill, className)} onClick={() => { setOpen(true); onUse?.(); speakPt(pt); }}>
      <MaterialIcon name="translate" /> {PT_UI.meaning}
    </button>
  );
}

/** Portuguese for a sentence in a game (translated on the server, by position, then cached). */
export function Gloss({ activityId, field, index = 0, sub, onUse, className }: { activityId: string; field: 'intro' | 'item' | 'paragraph' | 'question' | 'option'; index?: number; sub?: number; onUse?: () => void; className?: string }) {
  const place = useEslPlace();
  const { on } = useSupport();
  const [state, setState] = useState<{ pt?: string; error?: string; busy?: boolean }>({});
  if (!on || !place) return null;
  if (state.pt) return <PtLine text={state.pt} className={className} />;
  const load = async () => {
    setState({ busy: true });
    onUse?.();
    try {
      const r = await api.post<{ pt: string }>('/api/esl/gloss', { week: place.week, band: place.band, activityId, field, index, sub });
      setState({ pt: r.pt });
      speakPt(r.pt);
    } catch (e) { setState({ error: errorMessage(e) }); }
  };
  return (
    <span className={cn('inline-flex flex-col items-center', className)}>
      <button type="button" className={helperPill} disabled={state.busy} aria-busy={state.busy || undefined} onClick={() => void load()}>
        <MaterialIcon name="translate" /> {state.busy ? '…' : PT_UI.meaning}
      </button>
      {state.error && <span role="alert" className="text-[15px] text-red-700 dark:text-red-300">{state.error}</span>}
    </span>
  );
}

/** Learner setting: English only, or Portuguese help. */
export function HelpSwitch({ value, onChange }: { value: SupportLang; onChange: (v: SupportLang) => void }) {
  return (
    <div role="radiogroup" aria-label="Help language" className="inline-flex rounded-full bg-card p-1">
      {([['off', 'English only'], ['pt-MZ', 'Ajuda em português']] as const).map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} lang={v === 'pt-MZ' ? 'pt-MZ' : undefined} onClick={() => onChange(v)}
          className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold transition-colors', focusRing, value === v ? 'bg-ink text-white dark:bg-sand dark:text-ink-900' : 'text-fg hover:bg-muted')}>
          {v === 'pt-MZ' && <MaterialIcon name="translate" className="text-[20px]" />} {label}
        </button>
      ))}
    </div>
  );
}

/** Small honest note shown wherever Portuguese appears. */
export function PtReviewNote() {
  const { on } = useSupport();
  if (!on) return null;
  return <p lang="pt-MZ" className="text-sm text-muted-fg">{PT_UI.aiTranslated}</p>;
}
