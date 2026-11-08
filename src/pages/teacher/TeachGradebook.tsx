import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Gradebook } from '@shared/tests';
import type { Classroom } from '@shared/api-types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Empty, PageHeader, PageLoader, Select } from '@/components/ui';
import { MaterialIcon } from '@/components/icons';
import { TeachNav, shortDate } from './shared';

const tone = (pct: number | null) => (pct == null ? '' : pct < 50 ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100' : pct < 75 ? 'bg-gold-100 text-ink-900' : 'bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-50');

/** Every recorded mark: learners down, tests across, with CSV export. */
export default function TeachGradebook() {
  const [cls, setCls] = useState('');
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api.get<{ teaching: Classroom[] }>('/api/classrooms') });
  const g = useQuery({ queryKey: ['gradebook', cls], queryFn: () => api.get<Gradebook>(`/api/tests/gradebook${cls ? `?classroom=${cls}` : ''}`) });
  const csv = () => {
    if (!g.data) return;
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [['Learner', ...g.data.tests.map((t) => t.title), 'Average'], ...g.data.students.map((s) => [s.name, ...g.data!.tests.map((t) => { const c = s.cells[t.id]; return c ? (c.pct == null ? c.status : `${c.pct}%`) : ''; }), s.average == null ? '' : `${s.average}%`])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map((x) => esc(String(x))).join(',')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'gradebook.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="container py-8">
      <PageHeader title="Gradebook" description="Every mark from homework, tests and exams. Red is below 50%, gold below 75%." actions={<button type="button" className="btn-outline" onClick={csv} disabled={!g.data?.students.length}><MaterialIcon name="download" /> Download CSV</button>} />
      <TeachNav />
      <label className="mb-4 flex max-w-xs items-center gap-2 text-[15px] font-semibold">Class<Select value={cls} onChange={(e) => setCls(e.target.value)}><option value="">All classes</option>{(classes.data?.teaching ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label>
      {g.isLoading ? <PageLoader /> : !g.data?.tests.length ? (
        <Empty icon={<MaterialIcon name="table_view" className="text-[40px]" />} title="No marks yet" action={<Link to="/teach/tests" className="btn-primary">Make a test</Link>}>Set a test or homework and marks appear here as learners hand in.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-1 text-[15px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-bg py-2 pr-3 text-left font-medium text-muted-fg">Learner</th>
                {g.data.tests.map((t) => <th key={t.id} className="min-w-28 px-1 text-left align-bottom text-sm font-medium"><Link to={`/teach/tests/${t.id}`} className="hover:underline">{t.title}</Link><span className="block font-normal text-muted-fg">{t.dueAt ? shortDate(t.dueAt) : t.kind}</span></th>)}
                <th className="px-1 text-right text-sm font-medium">Average</th>
              </tr>
            </thead>
            <tbody>
              {g.data.students.map((s) => (
                <tr key={s.id}>
                  <td className="sticky left-0 bg-bg py-1 pr-3"><Link to={`/teach/students/${s.id}`} className="hover:underline">{s.name}</Link></td>
                  {g.data!.tests.map((t) => { const c = s.cells[t.id]; return <td key={t.id} className={cn('rounded-md px-2 py-1.5 text-center tabular-nums', c?.pct != null ? tone(c.pct) : 'text-muted-fg')}>{!c ? '' : c.pct != null ? `${c.pct}%` : c.status === 'not started' ? 'Not started' : c.status === 'started' ? 'Started' : 'To confirm'}</td>; })}
                  <td className={cn('rounded-md px-2 py-1.5 text-right font-semibold tabular-nums', tone(s.average))}>{s.average == null ? '—' : `${s.average}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
