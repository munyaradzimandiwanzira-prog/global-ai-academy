import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Eraser, Star, Wand2 } from '@/components/icons';
import { CHALLENGES, run, sameDrawing, TurtleError, type Segment } from './turtle-engine';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { TurtleArt as TurtleIcon } from '../KidsArt';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';

const SIZE = 420;
const SNIPPETS = ['forward 50', 'right 90', 'left 90', 'repeat 4 [ ]', 'color red', 'penup', 'pendown', 'width 6'];
const FREE_EXAMPLES = [
  { name: 'Flower', code: 'color purple\nrepeat 36 [\n  repeat 4 [forward 80 right 90]\n  right 10\n]' },
  { name: 'Sun', code: 'color orange\nwidth 4\nrepeat 18 [forward 120 back 120 right 20]' },
  { name: 'Spiral', code: 'color teal\nrepeat 60 [forward 4 right 6 forward 4 right 6 forward 4]' },
];

export default function TurtleArt() {
  const { stars, award } = useKidsStars();
  const [mode, setMode] = useState<number | 'free'>(0);
  const challenge = mode === 'free' ? null : CHALLENGES[mode]!;
  const [code, setCode] = useState<string>(challenge?.starter ?? FREE_EXAMPLES[0]!.code);
  const [msg, setMsg] = useState<{ text: string; mood: 'happy' | 'wow' | 'oops' | 'think' }>({ text: challenge?.goal ?? 'Draw anything you like!', mood: 'think' });
  const canvas = useRef<HTMLCanvasElement>(null);
  const anim = useRef<number>();
  const [turtle, setTurtle] = useState({ x: SIZE / 2, y: SIZE / 2, heading: 0 });

  useEffect(() => {
    setCode(challenge?.starter ?? FREE_EXAMPLES[0]!.code);
    setMsg({ text: challenge?.goal ?? 'Free draw! Try an example, then change the numbers.', mood: 'think' });
    draw([], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const drawGuide = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!challenge) return;
    const target = run(challenge.target);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#B88A2E66';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (const s of target) {
      ctx.beginPath();
      ctx.moveTo(SIZE / 2 + s.x1, SIZE / 2 + s.y1);
      ctx.lineTo(SIZE / 2 + s.x2, SIZE / 2 + s.y2);
      ctx.stroke();
    }
    ctx.restore();
  }, [challenge]);

  const draw = useCallback((segments: Segment[], instant = false, onDone?: () => void) => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    cancelAnimationFrame(anim.current!);
    const clear = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = '#FFFDF6';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.strokeStyle = '#EDE5D3';
      ctx.lineWidth = 1;
      for (let g = 0; g <= SIZE; g += 30) {
        ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(SIZE, g); ctx.stroke();
      }
      drawGuide(ctx);
    };
    clear();
    const line = (s: Segment, t = 1) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(SIZE / 2 + s.x1, SIZE / 2 + s.y1);
      ctx.lineTo(SIZE / 2 + s.x1 + (s.x2 - s.x1) * t, SIZE / 2 + s.y1 + (s.y2 - s.y1) * t);
      ctx.stroke();
    };
    if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      segments.forEach((s) => line(s));
      const last = segments[segments.length - 1];
      setTurtle(last ? { x: SIZE / 2 + last.x2, y: SIZE / 2 + last.y2, heading: Math.atan2(last.x2 - last.x1, -(last.y2 - last.y1)) * 180 / Math.PI } : { x: SIZE / 2, y: SIZE / 2, heading: 0 });
      onDone?.();
      return;
    }
    const perSegment = Math.max(2, Math.min(18, Math.floor(900 / Math.max(1, segments.length))));
    let i = 0;
    let frame = 0;
    const tick = () => {
      if (i >= segments.length) return onDone?.();
      const s = segments[i]!;
      frame++;
      const t = Math.min(1, frame / perSegment);
      clear();
      for (let k = 0; k < i; k++) line(segments[k]!);
      line(s, t);
      setTurtle({ x: SIZE / 2 + s.x1 + (s.x2 - s.x1) * t, y: SIZE / 2 + s.y1 + (s.y2 - s.y1) * t, heading: Math.atan2(s.x2 - s.x1, -(s.y2 - s.y1)) * 180 / Math.PI });
      if (t >= 1) { i++; frame = 0; }
      anim.current = requestAnimationFrame(tick);
    };
    tick();
  }, [drawGuide]);

  useEffect(() => () => cancelAnimationFrame(anim.current!), []);

  const go = () => {
    try {
      const segs = run(code);
      setMsg({ text: 'Drawing…', mood: 'happy' });
      draw(segs, false, () => {
        if (!challenge) return setMsg({ text: 'Beautiful! Change a number and see what happens.', mood: 'wow' });
        if (sameDrawing(segs, run(challenge.target))) {
          const n = code.includes('repeat') || challenge.id === 'line' ? 3 : 2;
          award(`turtle:${challenge.id}`, n);
          celebrate('big');
          setMsg({ text: n === 3 ? 'Perfect match! ⭐⭐⭐' : 'It matches! Use repeat to earn 3 stars.', mood: 'wow' });
        } else {
          setMsg({ text: `Close! It doesn’t match the dotted shape yet. Tip: ${challenge.tip}`, mood: 'think' });
        }
      });
    } catch (e) {
      setMsg({ text: e instanceof TurtleError ? e.message : 'Hmm, something is not right in your code.', mood: 'oops' });
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap justify-center gap-2">
        {CHALLENGES.map((c, i) => (
          <button key={c.id} onClick={() => setMode(i)} className={cn('rounded-full border-2 px-4 py-2 text-sm font-bold', mode === i ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}>
            {c.title} {stars[`turtle:${c.id}`] ? <span className="ml-1 inline-flex">{Array.from({ length: stars[`turtle:${c.id}`]! }, (_, k) => <Star key={k} className="h-3 w-3 fill-gold text-gold" />)}</span> : null}
          </button>
        ))}
        <button onClick={() => setMode('free')} className={cn('rounded-full border-2 px-4 py-2 text-sm font-bold', mode === 'free' ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}><Wand2 className="mr-1 inline h-4 w-4" />Free draw</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="relative mx-auto rounded-3xl border-4 border-ink bg-white p-2 ">
          <canvas ref={canvas} width={SIZE} height={SIZE} className="block h-auto w-full max-w-[420px] rounded-2xl" aria-label="Drawing canvas" />
          <div className="pointer-events-none absolute left-2 top-2 h-[calc(100%-16px)] w-[calc(100%-16px)]">
            <span className="absolute" style={{ left: `${(turtle.x / SIZE) * 100}%`, top: `${(turtle.y / SIZE) * 100}%`, transform: `translate(-50%,-50%) rotate(${turtle.heading}deg)`, transition: 'left 200ms, top 200ms, transform 200ms' }} aria-hidden="true"><TurtleIcon size={34} /></span>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-end gap-2"><Zuva size={64} mood={msg.mood} /><div className="flex-1"><SpeechBubble>{msg.text}</SpeechBubble></div></div>
          <div className="rounded-3xl border-4 border-ink bg-white p-4">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SNIPPETS.map((s) => <button key={s} onClick={() => setCode((c) => (c.trim() ? `${c.replace(/\s+$/, '')}\n${s}` : s))} className="rounded-xl bg-[#E8F3DD] px-2.5 py-1.5 font-mono text-sm font-semibold text-[#3d6126] hover:bg-[#d7ebc4]">{s}</button>)}
            </div>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={9} className="w-full rounded-2xl border-2 border-ink/20 bg-[#FFFDF6] p-3 font-mono text-lg leading-relaxed outline-none focus:border-teal" aria-label="Turtle code" />
            <div className="mt-3 flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={go} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5B8C3A] py-3 text-xl font-bold text-white shadow-[0_5px_0_#3d6126]"><Play className="h-6 w-6 fill-current" /> Draw!</motion.button>
              <button onClick={() => { setCode(''); draw([], true); }} className="rounded-2xl border-4 border-ink bg-white px-4 font-bold"><Eraser className="h-5 w-5" /></button>
            </div>
          </div>
          {mode === 'free' && (
            <div className="flex flex-wrap gap-2">
              {FREE_EXAMPLES.map((ex) => <button key={ex.name} onClick={() => setCode(ex.code)} className="rounded-full bg-white px-4 py-2 font-semibold shadow">Try: {ex.name}</button>)}
            </div>
          )}
          <details className="rounded-2xl bg-white/70 p-4 text-sm">
            <summary className="cursor-pointer font-bold">All the words the turtle knows</summary>
            <ul className="mt-2 grid grid-cols-2 gap-1 font-mono">
              <li>forward 50</li><li>back 50</li><li>right 90</li><li>left 45</li><li>repeat 4 [ … ]</li><li>color red</li><li>width 5</li><li>penup / pendown</li><li>home</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
