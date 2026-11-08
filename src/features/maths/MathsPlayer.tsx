import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MATHS_KIND_INFO, type MathsActivity, type MathsKind } from '@shared/maths';
import { ArrowRight, RotateCcw, Star, ThumbsDown, ThumbsUp, MaterialIcon, type SymbolName } from '@/components/icons';
import { Spinner } from '@/components/ui';
import { buttonClass } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { play } from '@/features/kids/sfx';
import { say, stopSpeaking } from '@/features/esl/voice';
import { ZuvaSays } from '@/features/esl/games/kit';
import { focusRing } from '@/features/esl/ui';
import { PtLine } from '@/features/esl/support';
import type { MathsAnswer } from './games';
import { useMathsPlace } from './context';

const G = () => import('./games');
const GAMES = {
  sprint: lazy(() => G().then((m) => ({ default: m.Sprint }))),
  choice: lazy(() => G().then((m) => ({ default: m.Choice }))),
  numberline: lazy(() => G().then((m) => ({ default: m.NumberLine }))),
  blocks: lazy(() => G().then((m) => ({ default: m.Blocks }))),
  fraction: lazy(() => G().then((m) => ({ default: m.Fraction }))),
  word: lazy(() => G().then((m) => ({ default: m.Word }))),
  convince: lazy(() => G().then((m) => ({ default: m.Convince }))),
} as const;

/** One Material Symbol per maths game kind (read by the icon subset builder). */
export const MATHS_SYMBOL: Record<MathsKind, { symbol: SymbolName }> = {
  sprint: { symbol: 'bolt' }, choice: { symbol: 'checklist' }, numberline: { symbol: 'linear_scale' }, blocks: { symbol: 'view_module' },
  fraction: { symbol: 'pie_chart' }, word: { symbol: 'menu_book' }, convince: { symbol: 'forum' },
};
export const MathsIcon = ({ kind, className }: { kind: MathsKind; className?: string }) => <MaterialIcon name={MATHS_SYMBOL[kind].symbol} className={className} />;

const starsFrom = (xs: MathsAnswer[]) => { if (!xs.length) return 1; const first = xs.filter((a) => a.correct && a.tries === 1).length / xs.length; const right = xs.filter((a) => a.correct).length / xs.length; return first >= 0.9 ? 3 : right >= 0.6 ? 2 : 1; };

export function MathsPlayer({ activity, unitId, onFinished, onNext }: { activity: MathsActivity; unitId: string; onFinished?: (stars: number) => void; onNext?: () => void }) {
  const place = useMathsPlace();
  const signedIn = !!place?.signedIn;
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [round, setRound] = useState(0);
  const [stars, setStars] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const answers = useRef<MathsAnswer[]>([]);
  const started = useRef(0);
  const finished = useRef(false);
  const Game = GAMES[activity.kind] as unknown as React.ComponentType<Record<string, unknown>>;
  const info = MATHS_KIND_INFO[activity.kind];

  const post = useCallback((b: Record<string, unknown>) => { if (signedIn) void api.post('/api/maths/attempts', { unitId, ...b }).catch(() => {}); }, [signedIn, unitId]);
  useEffect(() => () => { stopSpeaking(); if (started.current && !finished.current) post({ events: [{ kind: activity.kind, event: 'quit', ms: Date.now() - started.current }] }); }, [activity.kind, post]);

  const begin = () => { stopSpeaking(); answers.current = []; finished.current = false; started.current = Date.now(); setPhase('play'); setRound((r) => r + 1); post({ events: [{ kind: activity.kind, event: round > 0 ? 'replay' : 'start' }] }); };
  const onAnswer = useCallback((a: MathsAnswer) => { answers.current.push(a); post({ attempts: [{ activityId: activity.id, item: a.item.slice(0, 200), correct: a.correct, ms: a.ms, tries: a.tries, hints: a.hints, support: !!a.support, input: a.input ?? 'tap' }] }); }, [post, activity.id]);
  const onDone = useCallback(() => {
    finished.current = true; const s = starsFrom(answers.current); setStars(s); setPhase('done'); play('win');
    void say(s === 3 ? 'Amazing! Three stars!' : s === 2 ? 'Well done! Two stars!' : 'Good effort! Practice makes progress.', 'gb', 'primary');
    post({ events: [{ kind: activity.kind, event: 'finish', ms: Date.now() - started.current }], completed: { activityId: activity.id, stars: s } });
    onFinished?.(s);
  }, [post, activity.kind, activity.id, onFinished]);
  const react = (like: boolean) => { setLiked(like); post({ events: [{ kind: activity.kind, event: like ? 'like' : 'dislike' }] }); };

  return (
    <div className="rounded-md bg-muted p-4 text-fg sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <MathsIcon kind={activity.kind} className="text-teal-700 dark:text-teal-300" />
        <h3 className="font-display text-xl font-bold">{activity.title}</h3>
        {place?.support === 'pt-MZ' && <span lang="pt-MZ" className="text-[15px] text-muted-fg">{info.pt}</span>}
      </div>
      {phase === 'intro' && (
        <div className="space-y-5">
          <ZuvaSays text={activity.intro} accent="gb" pace="primary" />
          {place?.support === 'pt-MZ' && <PtLine text={`${info.pt}: ${activity.kind === 'convince' ? 'explica o teu raciocínio ao Zuva, com exemplos.' : activity.kind === 'sprint' ? 'responde depressa com o teclado. Podes usar vírgula ou ponto nos decimais.' : 'lê com atenção e escolhe ou escreve a resposta.'}`} className="mx-auto max-w-xl" />}
          <button type="button" onClick={begin} className={buttonClass({ color: 'accent', size: 'lg' }, 'mx-auto flex h-14 px-8 text-lg')}>Start the game <ArrowRight /></button>
        </div>
      )}
      {phase === 'play' && (
        <Suspense fallback={<div className="flex justify-center py-16"><Spinner label="Getting the game ready…" /></div>}>
          <Game key={round} activity={activity} onAnswer={onAnswer} onDone={onDone} />
        </Suspense>
      )}
      {phase === 'done' && (
        <div className="space-y-5 text-center">
          <div className="flex justify-center gap-2" role="img" aria-label={`${stars} of 3 stars`}>{[1, 2, 3].map((n) => <Star key={n} className={cn('text-[64px]', n <= stars ? 'text-gold-700 dark:text-gold' : 'text-fg/20')} />)}</div>
          <p className="text-xl font-bold">{answers.current.filter((a) => a.correct).length} of {answers.current.length} right</p>
          <div>
            <p className="mb-2 font-semibold">Did you enjoy this game?</p>
            <div className="flex justify-center gap-3">
              <button type="button" aria-pressed={liked === true} onClick={() => react(true)} aria-label="I liked it" className={cn('grid h-14 w-14 place-items-center rounded-full transition-colors', focusRing, liked === true ? 'bg-teal text-white' : 'bg-card hover:bg-teal/10')}><ThumbsUp /></button>
              <button type="button" aria-pressed={liked === false} onClick={() => react(false)} aria-label="I didn’t like it" className={cn('grid h-14 w-14 place-items-center rounded-full transition-colors', focusRing, liked === false ? 'bg-red-700 text-white' : 'bg-card hover:bg-red-700/10')}><ThumbsDown /></button>
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
