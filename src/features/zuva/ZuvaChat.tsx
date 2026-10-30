import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ZuvaAction, ZuvaCard, ZuvaMode } from '@shared/zuva';
import { Mic, Send, StopCircle, Volume2, ArrowRight, Loader2 } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { errorMessage } from '@/lib/api';
import { storage, cn } from '@/lib/utils';
import { speak } from '@/features/kids/sfx';
import { Zuva } from '@/features/kids/Zuva';
import { streamZuva, type ZuvaChatRequest } from './api';
import { useDictation } from './useDictation';
import { ZuvaCardView } from './ZuvaCards';

export interface ChatMsg { id: number; role: 'user' | 'assistant'; text: string; cards: ZuvaCard[]; actions: ZuvaAction[]; working: string[]; pending: boolean; error?: boolean }

type Context = Pick<ZuvaChatRequest, 'page' | 'lesson' | 'activity'>;

export interface ZuvaChatProps {
  mode: ZuvaMode;
  skin: 'kids' | 'grown';
  greeting: string;
  starters: string[];
  getContext: () => Context;
  /** Threads are kept per key (e.g. one per lesson) for this browser session. */
  threadKey: string;
  signedIn: boolean;
  /** A message Zuva wants to add (e.g. a coach clue). Changing `nonce` adds it. */
  inject?: { text: string; nonce: number } | null;
  /** Ask Zuva something on the child's behalf (e.g. from a coach bubble). */
  ask?: { text: string; nonce: number } | null;
  autoSpeak?: boolean;
}

let msgId = 0;
const threads = storage<Record<string, string>>('gaa:zuva:threads:v1', {});

/** Reveals text gradually, so a reply feels spoken rather than dumped. */
function useTypewriter(full: string, active: boolean) {
  const [n, setN] = useState(active ? 0 : full.length);
  useEffect(() => {
    if (!active) { setN(full.length); return; }
    setN(0);
    const step = Math.max(2, Math.ceil(full.length / 90));
    const t = setInterval(() => setN((x) => { if (x >= full.length) { clearInterval(t); return x; } return x + step; }), 16);
    return () => clearInterval(t);
  }, [full, active]);
  return full.slice(0, n);
}

function AssistantText({ text, animate, kids }: { text: string; animate: boolean; kids: boolean }) {
  const shown = useTypewriter(text, animate);
  return kids ? <p className="whitespace-pre-wrap">{shown}</p> : <Markdown className="prose-sm">{shown}</Markdown>;
}

export function ZuvaChat({ mode, skin, greeting, starters, getContext, threadKey, signedIn, inject, ask, autoSpeak }: ZuvaChatProps) {
  const kids = skin === 'kids';
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const threadId = useRef<string | undefined>(threads.get()[threadKey]);

  useEffect(() => { threadId.current = threads.get()[threadKey]; setMessages([]); }, [threadKey]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  useEffect(() => () => abort.current?.abort(), []);

  const patchLast = (fn: (m: ChatMsg) => ChatMsg) => setMessages((ms) => { const c = [...ms]; c[c.length - 1] = fn(c[c.length - 1]!); return c; });

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    const history = messages.filter((m) => !m.error && m.text).slice(-6).map((m) => ({ role: m.role, content: m.text.slice(0, 2000) }));
    setMessages((ms) => [...ms, { id: ++msgId, role: 'user', text, cards: [], actions: [], working: [], pending: false }, { id: ++msgId, role: 'assistant', text: '', cards: [], actions: [], working: [], pending: true }]);
    setInput('');
    setBusy(true);
    abort.current = new AbortController();
    try {
      await streamZuva({ mode, message: text, threadId: signedIn ? threadId.current : undefined, history: signedIn ? undefined : history, ...getContext() }, (e) => {
        if (e.t === 'tool') patchLast((m) => ({ ...m, working: [...m.working, e.label] }));
        else if (e.t === 'card') patchLast((m) => ({ ...m, cards: [...m.cards, e.card] }));
        else if (e.t === 'action') patchLast((m) => ({ ...m, actions: [...m.actions, e.action] }));
        else if (e.t === 'text') {
          patchLast((m) => ({ ...m, text: e.text, pending: false }));
          if (autoSpeak) speak(e.text);
        } else if (e.t === 'error') patchLast((m) => ({ ...m, text: e.message, pending: false, error: true }));
        else if (e.t === 'done' && e.threadId) { threadId.current = e.threadId; threads.set({ ...threads.get(), [threadKey]: e.threadId }); }
      }, abort.current.signal);
    } catch (e) {
      patchLast((m) => ({ ...m, text: errorMessage(e), pending: false, error: true }));
    } finally {
      patchLast((m) => ({ ...m, pending: false }));
      setBusy(false);
    }
  }, [autoSpeak, busy, getContext, messages, mode, signedIn, threadKey]);

  // Coach clues appear as Zuva messages; coach "ask" sends on the child's behalf.
  useEffect(() => { if (inject) setMessages((ms) => [...ms, { id: ++msgId, role: 'assistant', text: inject.text, cards: [], actions: [], working: [], pending: false }]); }, [inject?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ask) void send(ask.text); }, [ask?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const dictation = useDictation((t) => { if (kids) void send(t); else setInput((v) => (v ? `${v} ${t}` : t)); });
  const recording = dictation.state === 'recording';

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', kids && 'font-kids')}>
      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        <div className="flex items-start gap-2">
          {kids && <Zuva size={44} />}
          <div className={cn('max-w-[92%] rounded-2xl px-4 py-2.5', kids ? 'rounded-tl-sm border-2 border-ink bg-white text-lg text-ink' : 'bg-muted text-sm')}>{kids ? greeting : <Markdown className="prose-sm">{greeting}</Markdown>}</div>
        </div>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <button key={s} type="button" onClick={() => void send(s)} className={cn('rounded-full border-2 px-3 py-2 text-left font-semibold transition-transform active:scale-95', kids ? 'min-h-11 border-ink/30 bg-white text-base text-ink' : 'border-border text-sm hover:border-teal')}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn('flex flex-col gap-2', m.role === 'user' ? 'items-end' : 'items-start')}>
            {m.role === 'assistant' && m.working.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {m.working.map((w, i) => (
                  <span key={i} className={cn('inline-flex items-center gap-1 rounded-full bg-[#D6EBE8] px-2.5 py-1 text-xs font-semibold text-ink', m.pending && i === m.working.length - 1 && 'animate-pulse')}>{w}…</span>
                ))}
              </div>
            )}
            {m.cards.map((c, i) => <div key={i} className="w-full"><ZuvaCardView card={c} kids={kids} onAsk={(t) => void send(t)} /></div>)}
            {(m.text || m.pending) && (
              <div className={cn('flex max-w-[92%] items-start gap-2', m.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('rounded-2xl px-4 py-2.5', m.role === 'user' ? (kids ? 'bg-ink text-lg text-white' : 'bg-ink text-sm text-white') : kids ? 'border-2 border-ink bg-white text-lg text-ink' : 'bg-muted text-sm', m.error && 'border-[#E2553E] text-[#9B2C1D]')}>
                  {m.pending && !m.text ? (
                    <span className="inline-flex gap-1" aria-label="Zuva is thinking"><span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60" /><span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60 [animation-delay:.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60 [animation-delay:.3s]" /></span>
                  ) : m.role === 'assistant' ? <AssistantText text={m.text} animate={m.id === messages[messages.length - 1]?.id} kids={kids} /> : m.text}
                </div>
                {m.role === 'assistant' && m.text && !m.error && typeof window !== 'undefined' && 'speechSynthesis' in window && (
                  <button type="button" onClick={() => speak(m.text)} className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D6EBE8] text-ink" aria-label="Read this aloud"><Volume2 /></button>
                )}
              </div>
            )}
            {m.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {m.actions.map((a, i) => <Link key={i} to={a.to} className={cn('inline-flex items-center gap-1.5 rounded-full px-4 font-bold', kids ? 'min-h-11 border-4 border-ink bg-gold text-ink' : 'btn-primary btn-sm')}>{a.label} <ArrowRight /></Link>)}
              </div>
            )}
          </div>
        ))}
      </div>
      {(dictation.error || recording || dictation.state === 'transcribing') && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-sm" role="status">
          {recording && (
            <>
              <span className="flex h-6 items-end gap-0.5" aria-hidden="true">
                {[0.6, 1, 0.8, 0.5].map((k, i) => <motion.span key={i} className="w-1.5 rounded bg-[#E2553E]" animate={{ height: `${6 + dictation.level * 18 * k}px` }} transition={{ duration: 0.08 }} />)}
              </span>
              <span className="font-semibold">Listening… {dictation.seconds}s. Tap stop when you’re done.</span>
            </>
          )}
          {dictation.state === 'transcribing' && <span className="inline-flex items-center gap-2 font-semibold"><Loader2 className="animate-spin" /> Writing down what you said…</span>}
          {dictation.error && !recording && <span className="text-[#9B2C1D]">{dictation.error}</span>}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className={cn('flex items-end gap-2 border-t border-border p-3', kids && 'bg-[#EEF4F3]')}>
        {dictation.supported && (
          <button
            type="button"
            onClick={dictation.toggle}
            disabled={busy || dictation.state === 'transcribing' || dictation.state === 'asking'}
            aria-pressed={recording}
            aria-label={recording ? 'Stop recording' : 'Talk to Zuva'}
            className={cn('flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-40', kids ? 'h-14 w-14 border-4 border-ink' : 'h-[42px] w-[42px] border-2 border-border', recording ? 'bg-[#E2553E] text-white' : kids ? 'bg-gold text-ink' : 'bg-card')}
          >
            {recording ? <StopCircle /> : <Mic />}
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          rows={1}
          maxLength={2000}
          placeholder={kids ? 'Type, or tap the microphone and talk…' : 'Ask Zuva, or tap the mic to dictate…'}
          className={cn('input max-h-32 min-h-[42px] resize-none', kids && 'min-h-14 rounded-2xl border-2 border-ink text-lg')}
          aria-label="Message to Zuva"
        />
        <button disabled={busy || !input.trim()} className={cn('shrink-0', kids ? 'flex h-14 w-14 items-center justify-center rounded-full border-4 border-ink bg-[#23807F] text-white disabled:opacity-40' : 'btn-run h-[42px] px-3')} aria-label="Send"><Send /></button>
      </form>
    </div>
  );
}
