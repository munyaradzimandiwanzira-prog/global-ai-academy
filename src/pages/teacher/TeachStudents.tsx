import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { RosterStudent } from '@shared/teaching';
import { api } from '@/lib/api';
import { Avatar, Empty, Input, PageHeader, PageLoader, Select } from '@/components/ui';
import { Users, Ticket, ArrowRight } from '@/components/icons';
import { TeachNav, lastSeen, useTeacherScope } from './shared';

type Filter = 'all' | 'attention' | 'inactive' | 'open' | 'paid';

export default function TeachStudents() {
  const { q, readOnly } = useTeacherScope();
  const { data, isLoading } = useQuery({ queryKey: ['teach-students', q('')], queryFn: () => api.get<{ students: RosterStudent[] }>(q('/api/teach/students')) });
  const [search, setSearch] = useState('');
  const [cls, setCls] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const students = data?.students ?? [];
  const classes = useMemo(() => [...new Map(students.flatMap((s) => s.classes).map((c) => [c.id, c])).values()], [students]);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const inactive = (s: RosterStudent) => !s.lastActiveDay || s.lastActiveDay < weekAgo;
  const shown = students.filter((s) => {
    if (search && !`${s.name} ${s.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (cls && !s.classes.some((c) => c.id === cls)) return false;
    if (filter === 'attention') return inactive(s) || s.assignmentsOpen >= 2;
    if (filter === 'inactive') return inactive(s);
    if (filter === 'open') return s.assignmentsOpen > 0;
    if (filter === 'paid') return s.paid;
    return true;
  });

  const exportCsv = () => {
    const rows = [['Name', 'Email', 'Level', 'Plan', 'Classes', 'Lessons done', 'Kids Zone stars', 'Work open', 'Work done', 'Average %', 'Last active']]
      .concat(shown.map((s) => [s.name, s.email, s.level, s.plan, s.classes.map((c) => c.name).join('; '), String(s.lessonsDone), String(s.kidsStars), String(s.assignmentsOpen), String(s.assignmentsDone), s.avgScore === null ? '' : String(s.avgScore), s.lastActiveDay ?? '']));
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (isLoading) return <PageLoader />;
  return (
    <div className="container py-8">
      <PageHeader title="Students" description="Everyone who joined you by invite or is in one of your classes." actions={students.length ? <button type="button" className="btn-outline" onClick={exportCsv}>Download CSV</button> : undefined} />
      <TeachNav />
      {!students.length ? (
        <Empty icon={<Users className="h-10 w-10" />} title="No students yet" action={readOnly ? undefined : <Link to="/teach/invites" className="btn-primary"><Ticket className="h-4 w-4" /> Make an invite link</Link>}>
          Share an invite link or class code. Joining you is free for learners.
        </Empty>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px_200px]">
            <label className="sr-only" htmlFor="st-search">Search students</label>
            <Input id="st-search" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="sr-only" htmlFor="st-class">Class</label>
            <Select id="st-class" value={cls} onChange={(e) => setCls(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <label className="sr-only" htmlFor="st-filter">Show</label>
            <Select id="st-filter" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">Everyone ({students.length})</option>
              <option value="attention">Needs attention</option>
              <option value="inactive">Inactive 7+ days</option>
              <option value="open">Has work to do</option>
              <option value="paid">On a paid plan</option>
            </Select>
          </div>

          {/* Phones: cards. Wider screens: a table. */}
          <ul className="space-y-3 md:hidden">
            {shown.map((s) => (
              <li key={s.id}>
                <Link to={q(`/teach/students/${s.id}`)} className="card flex items-center gap-3 p-4">
                  <Avatar name={s.name} color={s.avatarColor} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className="block text-sm text-muted-fg">{s.lessonsDone} lessons · {s.assignmentsOpen} to do · active {lastSeen(s.lastActiveDay)}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-fg" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Students with progress</caption>
              <thead className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-fg">
                <tr>
                  <th scope="col" className="px-4 py-3">Student</th>
                  <th scope="col" className="px-3 py-3">Classes</th>
                  <th scope="col" className="px-3 py-3 text-right">Lessons</th>
                  <th scope="col" className="px-3 py-3 text-right">Kids ★</th>
                  <th scope="col" className="px-3 py-3 text-right">Work</th>
                  <th scope="col" className="px-3 py-3 text-right">Avg</th>
                  <th scope="col" className="px-3 py-3">Active</th>
                  <th scope="col" className="px-3 py-3">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/50">
                    <th scope="row" className="px-4 py-3 font-normal">
                      <Link to={q(`/teach/students/${s.id}`)} className="flex items-center gap-3">
                        <Avatar name={s.name} color={s.avatarColor} size={32} />
                        <span className="min-w-0"><span className="block font-semibold hover:underline">{s.name}</span><span className="block text-xs text-muted-fg">{s.level}</span></span>
                      </Link>
                    </th>
                    <td className="px-3 py-3 text-muted-fg">{s.classes.map((c) => c.name).join(', ') || 'Invite only'}</td>
                    <td className="px-3 py-3 text-right tabular">{s.lessonsDone}</td>
                    <td className="px-3 py-3 text-right tabular">{s.kidsStars}</td>
                    <td className="px-3 py-3 text-right tabular">{s.assignmentsDone}/{s.assignmentsDone + s.assignmentsOpen}</td>
                    <td className="px-3 py-3 text-right tabular">{s.avgScore === null ? '—' : `${s.avgScore}%`}</td>
                    <td className={`px-3 py-3 ${!s.lastActiveDay || s.lastActiveDay < weekAgo ? 'font-semibold text-red-700 dark:text-red-300' : ''}`}>{lastSeen(s.lastActiveDay)}</td>
                    <td className="px-3 py-3">{s.paid ? <span className="chip bg-teal-100 text-teal-600 dark:bg-teal-600/30 dark:text-teal-100">{s.plan}</span> : <span className="text-muted-fg">free</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!shown.length && <p className="p-6 text-center text-sm text-muted-fg">No students match.</p>}
          </div>
        </>
      )}
    </div>
  );
}
