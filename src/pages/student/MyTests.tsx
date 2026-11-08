import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { LearnerTest } from '@shared/tests';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Empty, PageHeader, PageLoader } from '@/components/ui';
import { ArrowRight, MaterialIcon } from '@/components/icons';
import { shortDate } from '@/pages/teacher/shared';

const KIND = { homework: 'Homework', test: 'Test', exam: 'Exam' } as const;
const overdue = (t: LearnerTest) => !!t.dueAt && new Date(t.dueAt).getTime() < Date.now() && (t.status === 'to do' || t.status === 'started');

/** A learner's homework, tests and exams from their teachers. */
export default function MyTests() {
  const q = useQuery({ queryKey: ['my-tests'], queryFn: () => api.get<{ tests: LearnerTest[] }>('/api/tests/mine/list') });
  if (q.isLoading) return <PageLoader />;
  const tests = q.data?.tests ?? [];
  const todo = tests.filter((t) => t.status === 'to do' || t.status === 'started');
  const done = tests.filter((t) => t.status === 'submitted' || t.status === 'marked');
  const Row = ({ t }: { t: LearnerTest }) => (
    <li>
      <Link to={`/tests/${t.id}`} className="card flex min-h-16 items-center gap-4 p-4 hover:border-teal">
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', t.status === 'marked' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100' : overdue(t) ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-100' : 'bg-gold-100 text-ink')}>
          <MaterialIcon name={t.status === 'marked' ? 'task_alt' : t.status === 'submitted' ? 'hourglass_top' : 'quiz'} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{t.title}</span>
          <span className="block text-sm text-muted-fg">{KIND[t.kind]} from {t.teacher} · {t.questions} questions{t.timeLimitMin ? ` · ${t.timeLimitMin} min` : ''}{t.dueAt ? ` · due ${shortDate(t.dueAt)}` : ''}{overdue(t) ? ' · overdue' : ''}</span>
        </span>
        <span className="shrink-0 text-right font-display text-lg font-bold tabular-nums">{t.status === 'marked' && t.pct != null ? `${t.pct}%` : t.status === 'submitted' ? <span className="text-sm font-medium text-muted-fg">Being marked</span> : t.status === 'started' ? <span className="text-sm font-medium">Carry on</span> : <ArrowRight />}</span>
      </Link>
    </li>
  );
  return (
    <div className="container max-w-3xl py-8">
      <PageHeader title="Tests and homework" description="Work your teachers have set. Most of it is marked the moment you hand it in." />
      {!tests.length ? <Empty icon={<MaterialIcon name="quiz" className="text-[40px]" />} title="Nothing set yet">When a teacher sets you homework or a test, it shows up here and in your notifications.</Empty> : (
        <div className="space-y-8">
          {!!todo.length && <section aria-labelledby="todo"><h2 id="todo" className="mb-3 font-display text-lg font-semibold">To do</h2><ul className="space-y-2">{todo.map((t) => <Row key={t.id} t={t} />)}</ul></section>}
          {!!done.length && <section aria-labelledby="done"><h2 id="done" className="mb-3 font-display text-lg font-semibold">Handed in</h2><ul className="space-y-2">{done.map((t) => <Row key={t.id} t={t} />)}</ul></section>}
        </div>
      )}
    </div>
  );
}
