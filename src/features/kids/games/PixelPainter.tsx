import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Eraser, ArrowRight, RotateCcw, Rows3 } from '@/components/icons';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';
import { COLOURS, PICTURES } from './pixel-pictures';

/**
 * Pixel Painter: copy the picture on a grid. Painting a whole row at once is a loop,
 * so the fewer taps you use, the more stars you earn. When you finish, the game shows the
 * Python loop that would paint the same picture.
 */
const W = 8;
const H = 7;
const blank = () => Array.from({ length: H }, () => Array<string>(W).fill(''));

export default function PixelPainter() {
  const { stars, award } = useKidsStars();
  const [pi, setPi] = useState(0);
  const [grid, setGrid] = useState<string[][]>(blank);
  const [colour, setColour] = useState('G');
  const [rowMode, setRowMode] = useState(true);
  const [taps, setTaps] = useState(0);
  const painting = useRef(false);
  const P = PICTURES[pi]!;
  const palette = useMemo(() => [...new Set(P.rows.join(''))], [P]);

  const matched = grid.reduce((n, row, y) => n + row.filter((c, x) => c === P.rows[y]![x]).length, 0);
  const done = matched === W * H;
  const starCount = taps <= P.par ? 3 : taps <= P.par * 1.6 ? 2 : 1;

  useEffect(() => { setGrid(blank()); setTaps(0); setColour(palette[0]!); setRowMode(pi !== 2); }, [pi, palette]);
  useEffect(() => {
    if (!done) return;
    play('win');
    celebrate('big');
    award(`pixel:${pi + 1}`, starCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const paint = (x: number, y: number, count = true) => {
    if (done) return;
    setGrid((g) => g.map((row, ry) => (rowMode ? (ry === y ? row.map(() => colour) : row) : ry === y ? row.map((c, rx) => (rx === x ? colour : c)) : row)));
    if (count) { setTaps((t) => t + 1); play('tap'); }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {PICTURES.map((p, i) => (
          <button key={p.title} onClick={() => setPi(i)} className={cn('flex h-12 items-center gap-1.5 rounded-2xl border-[3px] px-4 font-bold transition-transform active:scale-95', pi === i ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}>
            {p.title}{stars[`pixel:${i + 1}`] ? <Star className="h-4 w-4 fill-gold text-gold" /> : null}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
        <Zuva size={90} mood={done ? 'wow' : 'happy'} />
        <div className="w-full flex-1">
          <SpeechBubble>
            {done ? `Beautiful! You used ${taps} taps. A computer would use the loop below.` : `${P.story} Copy it! Painting a whole row at once is a loop: it saves taps and earns more stars.`}
          </SpeechBubble>
        </div>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <p className="font-bold">Copy this</p>
          <div className="grid gap-1 rounded-2xl border-4 border-ink bg-ink p-1.5" style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }} aria-label={`Target picture: ${P.title}`} role="img">
            {P.rows.flatMap((row, y) => [...row].map((c, x) => <span key={`${x}-${y}`} className="h-5 w-5 rounded-[3px] sm:h-6 sm:w-6" style={{ background: COLOURS[c]!.hex }} />))}
          </div>
          <p className="text-lg font-bold tabular">{Math.round((matched / (W * H)) * 100)}% matched</p>
          <p className="text-ink/70 tabular">{taps} taps · 3 stars at {P.par} or fewer</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            className="grid touch-none select-none gap-1 rounded-3xl border-4 border-ink bg-ink p-2"
            style={{ gridTemplateColumns: `repeat(${W}, 1fr)` }}
            onPointerUp={() => { painting.current = false; }}
            onPointerLeave={() => { painting.current = false; }}
          >
            {grid.flatMap((row, y) => row.map((c, x) => (
              <motion.button
                key={`${x}-${y}`}
                aria-label={`Row ${y + 1}, square ${x + 1}${c ? `, ${COLOURS[c]!.name}` : ', empty'}`}
                whileTap={{ scale: 0.88 }}
                onPointerDown={() => { painting.current = true; paint(x, y); }}
                onPointerEnter={() => { if (painting.current && !rowMode) paint(x, y, false); }}
                className="h-9 w-9 rounded-md sm:h-11 sm:w-11"
                style={{ background: c ? COLOURS[c]!.hex : '#F3F2EE' }}
              />
            )))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Paint colour">
            {palette.map((k) => (
              <button key={k} role="radio" aria-checked={colour === k} aria-label={COLOURS[k]!.name} onClick={() => { setColour(k); play('tap'); }}
                className={cn('h-14 w-14 rounded-full border-4 transition-transform active:scale-90', colour === k ? 'scale-110 border-ink' : 'border-white')} style={{ background: COLOURS[k]!.hex }} />
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setRowMode(true)} aria-pressed={rowMode} className={cn('flex h-12 items-center gap-2 rounded-2xl border-[3px] px-4 font-bold', rowMode ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}><Rows3 className="h-5 w-5" /> Whole row (loop)</button>
            <button onClick={() => setRowMode(false)} aria-pressed={!rowMode} className={cn('flex h-12 items-center gap-2 rounded-2xl border-[3px] px-4 font-bold', !rowMode ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}>One square</button>
            <button onClick={() => { setGrid(blank()); setTaps(0); }} className="flex h-12 items-center gap-2 rounded-2xl border-[3px] border-ink/20 bg-white px-4 font-bold"><Eraser className="h-5 w-5" /> Clear</button>
          </div>
        </div>
      </div>

      {done && (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-10 max-w-3xl rounded-[28px] border-4 border-ink bg-white p-6">
          <h2 className="flex items-center gap-2 text-2xl font-bold">{Array.from({ length: starCount }, (_, i) => <Star key={i} className="h-6 w-6 fill-gold text-gold" />)} The same picture in Python</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-[15px] leading-relaxed text-white">{P.code}</pre>
          <div className="mt-5 flex flex-wrap gap-3">
            {pi < PICTURES.length - 1 && <button onClick={() => setPi(pi + 1)} className="flex h-14 items-center gap-2 rounded-2xl bg-ink px-6 text-lg font-bold text-white">Next picture <ArrowRight className="h-5 w-5" /></button>}
            <button onClick={() => { setGrid(blank()); setTaps(0); }} className="flex h-14 items-center gap-2 rounded-2xl border-[3px] border-ink bg-white px-5 text-lg font-bold"><RotateCcw className="h-5 w-5" /> Try for 3 stars</button>
          </div>
        </motion.section>
      )}
    </div>
  );
}
