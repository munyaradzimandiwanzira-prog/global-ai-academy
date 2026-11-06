import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { ZuvaChat } from '@/features/zuva/ZuvaChat';
import { PageHeader } from '@/components/ui';
import { TeachNav, firstName, useTeacherScope } from './shared';

const STARTERS = [
  'Who in my classes needs help this week?',
  'Write a report on my weakest learner and what to do next',
  'Plan a 40-minute Python lesson on loops for beginners',
  'Draft homework on functions for my class',
];

/**
 * Zuva as the teacher's colleague. The server runs it with the teacher agent prompt and tools that
 * only reach this teacher's own learners. Drafts come back as cards: nothing is sent until the
 * teacher presses a button.
 */
export default function TeachZuva() {
  const { user } = useAuth();
  const { readOnly } = useTeacherScope();
  const [params] = useSearchParams();
  const first = params.get('ask');
  const ask = useMemo(() => (first ? { text: first.slice(0, 500), nonce: 1 } : null), [first]);
  const getContext = useCallback(() => ({ page: { path: '/teach/zuva', title: 'Teacher portal: Ask Zuva' } }), []);
  return (
    <div className="container py-8">
      <PageHeader title="Ask Zuva" description="Your teaching assistant. Zuva can see how your learners are doing, write reports and lesson plans, and draft work for you to assign." />
      <TeachNav />
      {readOnly ? (
        <p className="card p-5 text-sm">Zuva works with the signed-in teacher's own learners, so it isn't available while you view another teacher's portal. Open <a className="underline" href="/teach/zuva">your own Zuva</a> instead.</p>
      ) : (
        <div className="card mx-auto flex h-[min(72vh,760px)] max-w-4xl flex-col overflow-hidden">
          <ZuvaChat
            mode="teacher"
            skin="grown"
            greeting={`Hi ${firstName(user?.name ?? 'there')}. Ask me about any of your learners or classes, or tell me what you'd like to teach next.`}
            starters={STARTERS}
            getContext={getContext}
            threadKey="teacher:main"
            signedIn
            ask={ask}
          />
        </div>
      )}
      <p className="mx-auto mt-3 max-w-4xl text-xs text-muted-fg">Zuva only sees learners linked to you. It can't message learners, grade or change payments. Check its suggestions: you know your learners best.</p>
    </div>
  );
}
