import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { storage, cn } from '@/lib/utils';
import { kidGame } from '@shared/kids-games';
import { Zuva } from '@/features/kids/Zuva';
import { speak } from '@/features/kids/sfx';
import { coachSnapshot, resetCoach, subscribeCoach } from '@/features/kids/coach';
import { answerOffer, initialCoachState, onEvent, onTick, onVisit, type CoachMove, type CoachState } from './coachEngine';
import { ZuvaChat } from './ZuvaChat';

/**
 * Zuva in the Kids Zone: a friendly companion in the corner that watches the game's coach events,
 * decides like a patient teacher when to offer help, and opens a chat the child can type or talk to.
 * Coach state lives at module level so it survives moving between games.
 */
let coach: CoachState = initialCoachState();
const quietPref = storage<boolean>('gaa:zuva:quiet:v1', false);
const speakPref = storage<boolean>('gaa:zuva:speak:v1', false);

type Bubble = { move: CoachMove; hint?: string } | null;

export function ZuvaCompanion({ game }: { game?: string }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<Bubble>(null);
  const [quiet, setQuiet] = useState(quietPref.get);
  const [autoSpeak, setAutoSpeak] = useState(speakPref.get);
  const [ask, setAsk] = useState<{ text: string; nonce: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const first = user?.name.trim().split(/\s+/)[0];
  const meta = game ? kidGame(game) : undefined;

  useEffect(() => quietPref.set(quiet), [quiet]);
  useEffect(() => speakPref.set(autoSpeak), [autoSpeak]);

  const show = useCallback((b: Bubble, ms?: number) => {
    clearTimeout(hideTimer.current);
    setBubble(b);
    if (b && autoSpeak && 'text' in b.move) speak(b.hint ?? b.move.text);
    if (ms) hideTimer.current = setTimeout(() => setBubble(null), ms);
  }, [autoSpeak]);

  // Visiting a game (and leaving one) feeds the "wandering" check and clears stale level state.
  useEffect(() => {
    if (!game) { resetCoach(); return; }
    const r = onVisit(game, coach, { quiet }, Date.now());
    coach = r.state;
    if (r.move.kind === 'wander') show({ move: r.move }, 12_000);
    return () => resetCoach();
  }, [game]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => subscribeCoach((ev, snap) => {
    if (ev.type === 'hint') return;
    const r = onEvent({ type: ev.type, ok: ev.ok, stars: ev.stars }, snap, coach, { quiet }, Date.now());
    coach = r.state;
    const m = r.move;
    if (m.kind === 'offer-hint') show({ move: m });
    else if (m.kind === 'praise' || m.kind === 'encourage') show({ move: m }, 7000);
    else if (m.kind === 'slow-down') show({ move: m }, 9000);
    else if (ev.type === 'level') setBubble(null);
  }), [quiet, show]);

  useEffect(() => {
    const t = setInterval(() => {
      const r = onTick(coachSnapshot(), coach, { quiet }, Date.now());
      coach = r.state;
      if (r.move.kind === 'check-in' && !open) show({ move: r.move }, 15_000);
    }, 5000);
    return () => clearInterval(t);
  }, [open, quiet, show]);

  const accept = (yes: boolean) => {
    const r = answerOffer(yes, coachSnapshot(), coach);
    coach = r.state;
    if (!yes) { show({ move: { kind: 'encourage', text: 'Okay! I believe in you. I’m here if you need me.' } }, 4000); return; }
    if (r.hint) show({ move: { kind: 'encourage', text: 'Here’s a clue:' }, hint: r.hint });
    else { setOpen(true); setAsk({ text: 'I’m stuck on this level. Can you give me a small clue?', nonce: Date.now() }); setBubble(null); }
  };

  const getContext = useCallback(() => {
    const s = coachSnapshot();
    return {
      page: { path: pathname, title: meta ? `${meta.title} (Kids Zone game)` : 'Kids Zone' },
      activity: s.game ? {
        game: s.game, level: s.level, goal: s.goal?.slice(0, 400), attempts: s.attempts, fails: s.fails, failStreak: s.failStreak,
        lastDetail: s.lastDetail?.slice(0, 300), secondsOnLevel: s.levelStartedAt ? Math.min(86_400, Math.round((Date.now() - s.levelStartedAt) / 1000)) : undefined,
        hintsShown: coach.hintsShown, hints: s.hints.slice(0, 6).map((h) => h.slice(0, 300)),
      } : undefined,
    };
  }, [meta, pathname]);

  const greeting = useMemo(() => {
    const hi = first ? `Mhoro ${first}! ` : 'Mhoro! ';
    if (meta) return `${hi}I’m Zuva. Playing ${meta.title}? Ask me anything, or tap the microphone and talk to me. I won’t give away answers, but I’ll help you think!`;
    return `${hi}I’m Zuva, your learning buddy. Ask me anything, pick a game together, or plan a real experiment you can build at home.${user ? '' : ' (Ask a grown-up to help you sign in, then I can remember what you like.)'}`;
  }, [first, meta, user]);

  const starters = meta
    ? ['I’m stuck, can you help?', 'Explain this level to me', 'How is this used in real life?', `Plan an experiment about ${meta.skill.toLowerCase()}`]
    : ['Pick a game for me', 'Plan an experiment I can build', 'Quiz me about computers', 'What should I learn next?'];

  const bubbleText = bubble && 'text' in bubble.move ? bubble.move.text : '';

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 font-kids sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {bubble && !open && (
            <motion.div key={bubbleText + (bubble.hint ?? '')} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="pointer-events-auto relative max-w-[min(320px,calc(100vw-2rem))] rounded-3xl border-4 border-ink bg-white p-4 text-ink shadow-lg" role="status">
              <button type="button" onClick={() => setBubble(null)} className="absolute right-2 top-2 rounded-full p-1 text-ink/60 hover:bg-ink/5" aria-label="Close"><X /></button>
              <p className="pr-6 text-[17px] font-semibold leading-snug">{bubbleText}</p>
              {bubble.hint && <p className="mt-2 rounded-2xl bg-[#FFF4D6] p-3 text-[17px]">{bubble.hint}</p>}
              {bubble.move.kind === 'offer-hint' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => accept(true)} className="min-h-11 rounded-full border-4 border-ink bg-gold px-4 font-bold">Yes please</button>
                  <button type="button" onClick={() => accept(false)} className="min-h-11 rounded-full border-2 border-ink/30 px-4 font-bold">I’ll keep trying</button>
                </div>
              )}
              {(bubble.move.kind === 'check-in' || bubble.move.kind === 'wander' || bubble.hint) && (
                <button type="button" onClick={() => { setOpen(true); if (bubble.hint) setAsk({ text: `Can you explain this clue a bit more? "${bubble.hint}"`, nonce: Date.now() }); setBubble(null); }} className="mt-3 min-h-11 rounded-full border-4 border-ink bg-[#8FD3D1] px-4 font-bold">{bubble.hint ? 'Explain more' : 'Talk to Zuva'}</button>
              )}
              <span className="absolute -bottom-3 right-10 h-5 w-5 rotate-45 border-b-4 border-r-4 border-ink bg-white" />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={() => { setOpen((o) => !o); setBubble(null); }}
          whileTap={{ scale: 0.92 }}
          className={cn('pointer-events-auto flex items-center gap-2 rounded-full border-4 border-ink bg-white py-1 pl-1 pr-4 font-bold text-ink shadow-lg', open && 'bg-gold')}
          aria-expanded={open}
          aria-label={open ? 'Close Zuva' : 'Talk to Zuva'}
        >
          <Zuva size={52} mood={bubble?.move.kind === 'praise' ? 'wow' : 'happy'} />
          <span className="hidden sm:inline">{open ? 'Close' : 'Ask Zuva'}</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-ink/30 sm:hidden" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-[28px] border-4 border-b-0 border-ink bg-[#F7FBFA] text-ink sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[min(680px,calc(100dvh-8rem))] sm:w-[420px] sm:rounded-[28px] sm:border-b-4"
              aria-label="Chat with Zuva"
            >
              <header className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
                <Zuva size={40} />
                <div className="min-w-0 flex-1 font-kids">
                  <div className="text-lg font-bold leading-tight">Zuva</div>
                  <div className="truncate text-xs text-white/70">{meta ? `Helping with ${meta.title}` : 'Your learning buddy'}</div>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close chat"><X /></button>
              </header>
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-ink/10 bg-white px-4 py-2 font-kids text-sm font-semibold">
                <label className="flex items-center gap-2"><input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} className="h-5 w-5 accent-[#23807F]" /> Let me try on my own</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="h-5 w-5 accent-[#23807F]" /> Read answers aloud</label>
              </div>
              <ZuvaChat mode="kids" skin="kids" greeting={greeting} starters={starters} getContext={getContext} threadKey={`kids:${game ?? 'home'}`} signedIn={!!user} ask={ask} autoSpeak={autoSpeak} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
