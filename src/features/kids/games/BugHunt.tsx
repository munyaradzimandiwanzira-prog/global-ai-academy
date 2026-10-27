import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowRight, RotateCcw } from 'lucide-react';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { BugArt } from '../KidsArt';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';
import { BUG_LEVELS } from './bug-levels';

/**
 * Bug Hunt: every program has exactly one bug. Find the line, then choose the fix.
 * Teaches debugging (the most important coding habit) from picture steps up to real Python.
 */
export default function BugHunt() {
  const { stars, award } = useKidsStars();
  const [level, setLevel] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [fix, setFix] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const L = BUG_LEVELS[level]!;
  const foundBug = picked === L.bug;
  const solved = foundBug && fix === L.answer;

  const reset = (n: number) => { setLevel(n); setPicked(null); setFix(null); setMistakes(0); };

  const tapLine = (i: number) => {
    if (solved) return;
    setPicked(i);
    setFix(null);
    if (i === L.bug) play('right');
    else { play('wrong'); setMistakes((m) => m + 1); }
  };

  const chooseFix = (i: number) => {
    if (solved) return;
    setFix(i);
    if (i === L.answer) {
      play('win');
      celebrate(level === BUG_LEVELS.length - 1 ? 'big' : 'small');
      award(`bug:${level + 1}`, mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);
    } else { play('wrong'); setMistakes((m) => m + 1); }
  };

  const mood = solved ? 'wow' : picked !== null && !foundBug ? 'oops' : 'think';
  const say = solved
    ? `You squashed the bug! ${L.why}`
    : foundBug
      ? 'You found the bug! Now pick the fix.'
      : picked !== null
        ? 'That line is fine. Look again: which line breaks the goal?'
        : `Goal: ${L.goal} One line has a bug. Tap it!`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {BUG_LEVELS.map((_, i) => (
          <button key={i} onClick={() => reset(i)} aria-label={`Level ${i + 1}`} className={cn('flex h-12 min-w-12 items-center justify-center gap-1 rounded-2xl border-[3px] px-3 text-lg font-bold transition-transform active:scale-95', level === i ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}>
            {i + 1}{stars[`bug:${i + 1}`] ? <Star className="h-4 w-4 fill-gold text-gold" /> : null}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
        <Zuva size={90} mood={mood} />
        <div className="w-full flex-1"><SpeechBubble>{say}</SpeechBubble></div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <section aria-label="The program" className="rounded-[28px] border-4 border-ink bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><BugArt size={36} /> The program</h2>
          <ol className="space-y-2">
            {L.lines.map((ln, i) => {
              const isPicked = picked === i;
              const fixedText = solved && i === L.bug ? L.fixes[L.answer] : ln;
              return (
                <li key={i}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    animate={isPicked && !foundBug ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                    onClick={() => tapLine(i)}
                    className={cn(
                      'flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border-[3px] px-4 text-left text-lg transition-colors',
                      L.code && 'font-mono text-base',
                      solved && i === L.bug ? 'border-[#3A8F4B] bg-[#E3F4E0]' : isPicked ? (foundBug ? 'border-[#B4472A] bg-[#FBE3DC]' : 'border-ink/30 bg-[#FFF6E5]') : 'border-ink/15 hover:border-ink/40',
                    )}
                  >
                    <span className="w-6 shrink-0 text-right font-kids text-sm text-ink/50">{i + 1}</span>
                    <span className="whitespace-pre">{fixedText}</span>
                  </motion.button>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-label="Choose the fix" className="rounded-[28px] border-4 border-ink bg-[#FFE2A8] p-5">
          <h2 className="mb-3 text-xl font-bold">{foundBug ? 'Pick the fix' : 'Fixes appear when you find the bug'}</h2>
          <AnimatePresence>
            {foundBug && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                {L.fixes.map((f, i) => (
                  <motion.button
                    key={f}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => chooseFix(i)}
                    className={cn(
                      'flex min-h-[3.25rem] w-full items-center rounded-2xl border-[3px] bg-white px-4 text-left text-lg',
                      L.code && 'font-mono text-base',
                      fix === i ? (i === L.answer ? 'border-[#3A8F4B] bg-[#E3F4E0]' : 'border-[#B4472A]') : 'border-ink/20 hover:border-ink/50',
                    )}
                  >
                    <span className="whitespace-pre">{f}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {solved && (
            <div className="mt-5 flex flex-wrap gap-3">
              {level < BUG_LEVELS.length - 1
                ? <button onClick={() => reset(level + 1)} className="flex h-14 items-center gap-2 rounded-2xl bg-ink px-6 text-lg font-bold text-white transition-transform active:scale-95">Next bug <ArrowRight className="h-5 w-5" /></button>
                : <p className="text-lg font-bold">You are a real debugger! Every coder spends half their time doing this.</p>}
              <button onClick={() => reset(level)} className="flex h-14 items-center gap-2 rounded-2xl border-[3px] border-ink bg-white px-5 text-lg font-bold"><RotateCcw className="h-5 w-5" /> Again</button>
            </div>
          )}
        </section>
      </div>
      <p className="mx-auto mt-8 max-w-xl text-center text-sm text-ink/70">The first computer “bug” was a real moth stuck in a machine in 1947. Today a bug means any mistake in a program, and finding them is called debugging.</p>
    </div>
  );
}
