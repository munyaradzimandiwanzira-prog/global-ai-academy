import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { eslBand, type Accent, type Activity, type EslBandId } from '@shared/esl';
import { ArrowRight, RotateCcw, Star, ThumbsDown, ThumbsUp } from '@/components/icons';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { play } from '@/features/kids/sfx';
import { say, stopSpeaking } from './voice';
import { ZuvaSays, type Answer } from './games/kit';
import { GameIcon, focusRing } from './ui';
import { buttonClass } from '@/components/ui/Button';
import type { Guest } from './store';

const Word = () => import('./games/WordGames');
const Sentence = () => import('./games/SentenceGames');
const TW = () => import('./games/TalkWrite');
const GAMES = {
  echo: lazy(() => Word().then((m) => ({ default: m.Echo }))),
  say: lazy(() => Word().then((m) => ({ default: m.SayIt }))),
  pick: lazy(() => Word().then((m) => ({ default: m.Pick }))),
  rhyme: lazy(() => Word().then((m) => ({ default: m.Rhyme }))),
  sound: lazy(() => Word().then((m) => ({ default: m.SoundOut }))),
  spell: lazy(() => Word().then((m) => ({ default: m.Spell }))),
  order: lazy(() => Sentence().then((m) => ({ default: m.Order }))),
  gap: lazy(() => Sentence().then((m) => ({ default: m.Gap }))),
  story: lazy(() => Sentence().then((m) => ({ default: m.Story }))),
  talk: lazy(() => TW().then((m) => ({ default: m.Talk }))),
  write: lazy(() => TW().then((m) => ({ default: m.Write }))),
} as const;

/** Words in a game, used to help the speech recogniser (never the answer alone). */
function contextWords(a: Activity): string[] {
  switch (a.kind) {
    case 'say': case 'pick': case 'sound': case 'spell': return a.items.map((x) => x.word);
    case 'rhyme': return a.items.flatMap((x) => [x.word, ...x.options.map((o) => o.word)]);
    case 'echo': return a.items.flatMap((x) => x.text.split(/\s+/)).slice(0, 20);
    default: return [];
  }
}

export const starsFrom = (answers: Answer[]) => {
  if (!answers.length) return 1;
  const firstTry = answers.filter((a) => a.correct && a.tries === 1).length / answers.length;
  const right = answers.filter((a) => a.correct).length / answers.length;
  return firstTry >= 0.9 ? 3 : right >= 0.6 ? 2 : 1;
};

export interface PlayerProps {
  activity: Activity;
  week: number;
  band: EslBandId;
  accent: Accent;
  signedIn: boolean;
  guest?: Guest | null;
  sessionId?: string | null;
  onFinished?: (stars: number) => void;
  onNext?: () => void;
}

export function GamePlayer({ activity, week, band, accent, signedIn, guest, sessionId, onFinished, onNext }: PlayerProps) {
  const tier = eslBand(band)!.tier;
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [round, setRound] = useState(0);
  const [stars, setStars] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const answers = useRef<Answer[]>([]);
  const started = useRef(0);
  const finished = useRef(false);
  const ctx = useMemo(() => contextWords(activity), [activity]);
  const Game = GAMES[activity.kind] as unknown as React.ComponentType<Record<string, unknown>>;

  const post = useCallback((body: Record<string, unknown>) => {
    if (!signedIn) return;
    void api.post('/api/esl/attempts', { sessionId: sessionId ?? null, ...body }).catch(() => {});
  }, [signedIn, sessionId]);

  // Leaving a game half way counts as a quit for the enjoyment model.
  useEffect(() => () => {
    stopSpeaking();
    if (started.current && !finished.current) post({ events: [{ kind: activity.kind, event: 'quit', ms: Date.now() - started.current }] });
  }, [activity.kind, post]);

  const begin = () => {
    stopSpeaking();
    answers.current = [];
    finished.current = false;
    started.current = Date.now();
    setPhase('play');
    setRound((r) => r + 1);
    post({ events: [{ kind: activity.kind, event: round > 0 ? 'replay' : 'start' }] });
  };

  const onAnswer = useCallback((a: Answer) => {
    answers.current.push(a);
    post({ attempts: [{ week, band, activityId: activity.id, kind: activity.kind, item: a.item.slice(0, 200), correct: a.correct, score: a.score ?? null, ms: a.ms, tries: a.tries, hints: a.hints, input: a.input, heard: a.heard ?? null }] });
  }, [post, week, band, activity.id, activity.kind]);

  const onDone = useCallback(() => {
    finished.current = true;
    const s = starsFrom(answers.current);
    setStars(s);
    setPhase('done');
    play('win');
    void say(s === 3 ? 'Amazing! Three stars!' : s === 2 ? 'Well done! Two stars!' : 'Good effort! Practice makes progress.', accent, tier);
    post({ events: [{ kind: activity.kind, event: 'finish', ms: Date.now() - started.current }], completed: { week, band, activityId: activity.id, stars: s } });
    onFinished?.(s);
  }, [accent, tier, post, activity.kind, activity.id, week, band, onFinished]);

  const react = (like: boolean) => {
    setLiked(like);
    post({ events: [{ kind: activity.kind, event: like ? 'like' : 'dislike' }] });
    void say(like ? 'Yay! I’ll make more games like this.' : 'Thanks for telling me. I’ll try something different.', accent, tier);
  };

  return (
    <div className={cn('rounded-md bg-muted p-4 text-fg sm:p-6', tier === 'early' && 'font-kids')}>
      <div className="mb-5 flex items-center gap-3">
        <GameIcon kind={activity.kind} className="text-teal-700 dark:text-teal-300" />
        <h3 className="font-display text-xl font-bold">{activity.title}</h3>
        {activity.origin === 'zuva' && <p className="text-[15px] text-muted-fg">made for you by Zuva</p>}
      </div>
      {phase === 'intro' && (
        <div className="space-y-5">
          <ZuvaSays text={activity.intro} accent={accent} pace={tier} />
          <button type="button" onClick={begin} className={buttonClass({ color: 'accent', size: 'lg' }, 'mx-auto flex h-14 px-8 text-lg')}>Start the game <ArrowRight /></button>
        </div>
      )}
      {phase === 'play' && (
        <Suspense fallback={<div className="flex justify-center py-16"><Spinner label="Getting the game ready…" /></div>}>
          <Game key={round} activity={activity} tier={tier} accent={accent} context={ctx} signedIn={signedIn} onAnswer={onAnswer} onDone={onDone} week={week} band={band} guest={guest ?? undefined} />
        </Suspense>
      )}
      {phase === 'done' && (
        <div className="space-y-5 text-center">
          <div className="flex justify-center gap-2" aria-label={`${stars} of 3 stars`}>
            {[1, 2, 3].map((n) => <Star key={n} className={cn('text-[64px]', n <= stars ? 'text-gold-700 dark:text-gold' : 'text-fg/20')} />)}
          </div>
          <p className="text-xl font-bold">{answers.current.filter((a) => a.correct).length} of {answers.current.length} right</p>
          <div>
            <p className="mb-2 font-semibold">Did you enjoy this game?</p>
            <div className="flex justify-center gap-3">
              <button type="button" aria-pressed={liked === true} onClick={() => react(true)} className={cn('grid h-14 w-14 place-items-center rounded-full transition-colors', focusRing, liked === true ? 'bg-teal text-white' : 'bg-card hover:bg-teal/10')} aria-label="I liked it"><ThumbsUp /></button>
              <button type="button" aria-pressed={liked === false} onClick={() => react(false)} className={cn('grid h-14 w-14 place-items-center rounded-full transition-colors', focusRing, liked === false ? 'bg-red-700 text-white' : 'bg-card hover:bg-red-700/10')} aria-label="I didn’t like it"><ThumbsDown /></button>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={begin} className={buttonClass({ variant: 'outlined', size: 'lg' })}><RotateCcw /> Play again</button>
            {onNext && <button type="button" onClick={onNext} className={buttonClass({ color: 'accent', size: 'lg' })}>Next game <ArrowRight /></button>}
          </div>
        </div>
      )}
    </div>
  );
}
