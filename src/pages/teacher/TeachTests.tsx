import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TestSummary } from '@shared/tests';
import { api, errorMessage } from '@/lib/api';
import { Dialog, Empty, Field, Input, PageHeader, PageLoader, Select } from '@/components/ui';
import { ArrowRight, MaterialIcon, Plus } from '@/components/icons';
import { TeachNav, shortDate, useTeacherScope } from './shared';

const KIND = { homework: 'Homework', test: 'Test', exam: 'Exam' } as const;

/** Homework, tests and exams: marked automatically, recorded in the gradebook. */
export default function TeachTests() {
  const { readOnly } = useTeacherScope();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'homework' | 'test' | 'exam'>('test');
  const list = useQuery({ queryKey: ['teach-tests'], queryFn: () => api.get<{ tests: TestSummary[] }>('/api/tests') });
  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>('/api/tests', { title, kind, questions: [] }),
    onSuccess: (r) => nav(`/teach/tests/${r.id}`),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (list.isLoading) return <PageLoader />;
  const tests = list.data?.tests ?? [];
  return (
    <div className="container py-8">
      <PageHeader title="Homework, tests and exams" description="Build a test, set it for a class or chosen learners, and it marks itself. Every mark lands in the gradebook."
        actions={readOnly ? undefined : <><Link to="/teach/gradebook" className="btn-outline"><MaterialIcon name="table_view" /> Gradebook</Link><button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus /> New test</button></>} />
      <TeachNav />
      {tests.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead className="text-sm text-muted-fg"><tr><th className="py-2 pr-3 font-medium">Title</th><th className="pr-3 font-medium">Class</th><th className="pr-3 font-medium">Due</th><th className="pr-3 text-right font-medium">Handed in</th><th className="pr-3 text-right font-medium">Average</th><th /></tr></thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="py-3 pr-3"><Link to={`/teach/tests/${t.id}`} className="font-semibold hover:underline">{t.title}</Link><span className="block text-sm text-muted-fg">{KIND[t.kind]} · {t.questions} questions · {t.totalMarks} marks{t.timeLimitMin ? ` · ${t.timeLimitMin} min` : ''}</span></td>
                  <td className="pr-3">{t.publishedAt ? t.classroomName ?? 'Chosen learners' : <span className="text-muted-fg">Draft</span>}</td>
                  <td className="pr-3">{t.dueAt ? shortDate(t.dueAt) : '—'}</td>
                  <td className="pr-3 text-right tabular-nums">{t.publishedAt ? `${t.submitted} / ${t.assigned}` : '—'}</td>
                  <td className="pr-3 text-right tabular-nums">{t.averagePct == null ? '—' : `${t.averagePct}%`}</td>
                  <td className="text-right"><Link to={`/teach/tests/${t.id}`} aria-label={`Open ${t.title}`} className="inline-grid h-11 w-11 place-items-center rounded-full hover:bg-muted"><ArrowRight /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={<MaterialIcon name="quiz" className="text-[40px]" />} title="No tests yet" action={readOnly ? undefined : <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus /> Make your first test</button>}>
          Multiple choice, numbers and short answers are marked instantly. Written answers get a suggested mark from your rubric for you to confirm. You can pull ready-made questions from any Cambridge Maths unit.
        </Empty>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="New homework, test or exam">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 2) create.mutate(); }}>
          <Field label="Title" htmlFor="tt"><Input id="tt" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Fractions check, Week 6" autoFocus /></Field>
          <Field label="Type" htmlFor="tk"><Select id="tk" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="homework">Homework</option><option value="test">Test</option><option value="exam">Exam</option></Select></Field>
          <button className="btn-primary w-full" disabled={title.trim().length < 2 || create.isPending} aria-busy={create.isPending || undefined}>Create and add questions</button>
        </form>
      </Dialog>
    </div>
  );
}
