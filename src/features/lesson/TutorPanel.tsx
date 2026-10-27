import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Sparkles, Lock } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Markdown } from '@/components/Markdown';
import { cn } from '@/lib/utils';

interface Msg { role: 'user' | 'assistant'; content: string }

const STARTERS = ['Explain this lesson more simply', 'Give me a real-life Zimbabwean example', 'Quiz me with one question', 'What should I learn next?'];

export function TutorPanel({ open, onClose, trackId, lessonTitle, excerpt }: { open: boolean; onClose: () => void; trackId: string; lessonTitle: string; excerpt: string }) {
  const { user, can } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { setMessages([]); }, [lessonTitle]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [messages]);
  useEffect(() => () => abort.current?.abort(), []);

  const allowed = can('ai.tutor');

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    abort.current = new AbortController();
    try {
      await api.stream('/api/ai/tutor', { trackId, lessonTitle, lessonExcerpt: excerpt.slice(0, 6000), messages: next.slice(-12) }, (chunk) => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: copy[copy.length - 1]!.content + chunk };
          return copy;
        });
      }, abort.current.signal);
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: `⚠️ ${errorMessage(e)}` };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-ink-900/30 lg:hidden" onClick={onClose} />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
            aria-label="AI tutor"
          >
            <header className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-lg" aria-hidden="true">☀️</span>
              <div className="flex-1">
                <div className="font-display font-semibold">Professor Zuva</div>
                <div className="text-xs text-white/60">Your AI tutor · {lessonTitle}</div>
              </div>
              <button onClick={onClose} className="rounded p-1 hover:bg-white/10" aria-label="Close tutor"><X className="h-5 w-5" /></button>
            </header>
            <div className="chevron-band" />
            {!allowed ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <Lock className="h-10 w-10 text-gold-600" />
                <h3 className="mt-3 font-display text-xl font-semibold">Chat with your AI tutor</h3>
                <p className="mt-2 text-sm text-muted-fg">Professor Zuva explains any lesson your way, gives local examples and quizzes you. The tutor is included with Plus and Academy. Coach hints on challenges stay free.</p>
                {user ? <Link to="/pricing" className="btn-gold mt-5">See Plus</Link> : <Link to="/signup" className="btn-primary mt-5">Create a free account</Link>}
              </div>
            ) : (
              <>
                <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    <div>
                      <p className="text-sm text-muted-fg">Ask anything about <strong className="text-fg">{lessonTitle}</strong>. Try:</p>
                      <div className="mt-3 flex flex-col gap-2">
                        {STARTERS.map((s) => (
                          <button key={s} onClick={() => send(s)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-teal hover:bg-teal-100/50 dark:hover:bg-night-700"><Sparkles className="h-4 w-4 text-gold-600" />{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={cn('max-w-[92%] rounded-2xl px-4 py-2.5 text-sm', m.role === 'user' ? 'ml-auto bg-ink text-white' : 'bg-muted')}>
                      {m.role === 'assistant' ? (m.content ? <Markdown className="prose-sm">{m.content}</Markdown> : <span className="inline-flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-muted-fg" /><span className="h-2 w-2 animate-bounce rounded-full bg-muted-fg [animation-delay:.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-muted-fg [animation-delay:.3s]" /></span>) : m.content}
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-end gap-2 border-t border-border p-3">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); } }}
                    rows={1}
                    maxLength={4000}
                    placeholder="Ask Professor Zuva…"
                    className="input max-h-32 min-h-[42px] resize-none"
                    aria-label="Message"
                  />
                  <button disabled={busy || !input.trim()} className="btn-run h-[42px] px-3" aria-label="Send"><Send className="h-4 w-4" /></button>
                </form>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
