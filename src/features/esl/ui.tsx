/**
 * The English course's small design system, built on the site tokens (ground granite/night,
 * card surfaces, ink, teal for right, red-700 for wrong, gold for Zuva and stars).
 *
 *   surfaces   flat, separated by one tone step (bg-card on the ground, bg-muted inside a card)
 *   radius     buttons are pills (the site button system); tiles and cards are 6px
 *   icons      Material Symbols Outlined only (locked axes); emoji appear only as word pictures
 *   targets    56px for children's taps, 44px minimum everywhere else
 */
import type { ActivityKind } from '@shared/esl';
import { MaterialIcon, type SymbolName } from '@/components/icons';
import { cn } from '@/lib/utils';

/** One Material Symbol per game type (the build script reads the `symbol:` entries for the font subset). */
const GAME_SYMBOL: Record<ActivityKind, { symbol: SymbolName }> = {
  echo: { symbol: 'repeat' },
  say: { symbol: 'record_voice_over' },
  pick: { symbol: 'hearing' },
  sound: { symbol: 'abc' },
  rhyme: { symbol: 'music_note' },
  spell: { symbol: 'spellcheck' },
  order: { symbol: 'train' },
  gap: { symbol: 'edit_note' },
  story: { symbol: 'menu_book' },
  talk: { symbol: 'forum' },
  write: { symbol: 'edit' },
};

export function GameIcon({ kind, className }: { kind: ActivityKind; className?: string }) {
  return <MaterialIcon name={GAME_SYMBOL[kind].symbol} className={className} />;
}

/** A flat surface on the page ground. */
export const surface = 'rounded-md bg-card text-fg';

/** Focus ring shared by every custom control in the course. */
export const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal';

/** A tap target in the games: flat, 56px, a state colour only when it means something. */
export function optionClass(state?: 'right' | 'wrong', extra?: string) {
  return cn(
    'flex min-h-14 items-center justify-center gap-2 rounded-md p-2 font-bold transition-[background-color,transform] duration-[180ms] active:scale-[.97] disabled:cursor-not-allowed',
    focusRing,
    state === 'right' ? 'bg-teal-100 text-teal-900 ring-2 ring-teal dark:bg-teal-900 dark:text-teal-50'
      : state === 'wrong' ? 'bg-red-100 text-red-900 ring-2 ring-red-700 dark:bg-red-950 dark:text-red-100'
        : 'bg-card text-fg hover:bg-gold-100 dark:hover:bg-night-700 disabled:opacity-45',
    extra,
  );
}

/** A soft pill for Zuva's helper actions (Again, clue, blend). Low emphasis, still 44px. */
export const helperPill = cn('inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-teal-700 transition-colors hover:bg-teal/10 dark:text-teal-300', focusRing);
