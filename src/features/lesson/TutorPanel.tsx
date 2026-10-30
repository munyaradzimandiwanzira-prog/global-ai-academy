import { useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Lock } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { ZuvaChat } from '@/features/zuva/ZuvaChat';

const STARTERS = ['Explain this lesson more simply', 'Give me a real-life Zimbabwean example', 'Quiz me on this lesson', 'What should I learn next?', 'Help me plan a hands-on project'];

/** Professor Zuva: the lesson tutor. Same agent as the Kids Zone, with the grown-up persona, lesson context, tools, memory and dictation. */
export function TutorPanel({ open, onClose, trackId, lessonTitle, excerpt }: { open: boolean; onClose: () => void; trackId: string; lessonTitle: string; excerpt: string }) {
  const { user, can } = useAuth();
  const { pathname } = useLocation();
  const allowed = can('ai.tutor');
  const first = user?.name.trim().split(/\s+/)[0];
  const getContext = useCallback(() => ({ page: { path: pathname, title: lessonTitle }, lesson: { trackId, lessonTitle, excerpt: excerpt.slice(0, 6000) } }), [excerpt, lessonTitle, pathname, trackId]);
  const greeting = useMemo(() => `${first ? `Mhoro ${first}! ` : ''}I’m Professor Zuva. Ask me anything about **${lessonTitle}**, type or tap the mic to talk. I can explain, quiz you, find lessons, and plan hands-on projects.`, [first, lessonTitle]);

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
              <ZuvaChat mode="learner" skin="grown" greeting={greeting} starters={STARTERS} getContext={getContext} threadKey={`lesson:${trackId}:${lessonTitle}`} signedIn={!!user} />
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
