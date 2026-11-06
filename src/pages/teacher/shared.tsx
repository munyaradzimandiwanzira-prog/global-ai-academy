import { NavLink, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Ticket, BookOpen, Sparkles, Wallet, GraduationCap, Eye } from '@/components/icons';

/**
 * An admin can open any teacher's portal with ?teacher=<id> and sees exactly what that teacher
 * sees (read-only). These helpers keep that parameter on every request and link.
 */
export function useTeacherScope() {
  const [params] = useSearchParams();
  const as = params.get('teacher');
  const q = (path: string) => (as ? `${path}${path.includes('?') ? '&' : '?'}teacher=${encodeURIComponent(as)}` : path);
  return { as, q, readOnly: !!as };
}

export const money = (cents: number) => `${cents < 0 ? '−' : ''}$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const firstName = (n: string) => n.split(/\s+/)[0] ?? n;

export function shortDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "today", "3 days ago", "never" for a YYYY-MM-DD last-active day. */
export function lastSeen(day: string | null) {
  if (!day) return 'never';
  const d = Math.round((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(day)) / 86_400_000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

const NAV = [
  { to: '/teach', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/teach/students', label: 'Students', icon: Users },
  { to: '/teach/invites', label: 'Invites', icon: Ticket },
  { to: '/teach/plans', label: 'Lesson plans', icon: BookOpen },
  { to: '/teach/zuva', label: 'Ask Zuva', icon: Sparkles },
  { to: '/teach/wallet', label: 'Wallet', icon: Wallet },
];

export function TeachNav() {
  const { as, q } = useTeacherScope();
  const viewing = useQuery({
    queryKey: ['admin-teacher-name', as],
    enabled: !!as,
    queryFn: () => api.get<{ teachers: { id: string; name: string }[] }>('/api/admin/teachers').then((r) => r.teachers.find((t) => t.id === as)?.name ?? 'this teacher'),
  });
  return (
    <>
      {as && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gold-600/40 bg-gold-100 px-4 py-2.5 text-sm text-ink dark:bg-gold/20 dark:text-gold-100" role="status">
          <Eye className="h-4 w-4" /> Viewing <strong>{viewing.data ?? '…'}</strong>’s portal as an admin. Read-only. <Link to="/admin/teachers" className="ml-auto font-semibold underline">Back to admin</Link>
        </div>
      )}
      <nav aria-label="Teaching" className="mb-6 flex gap-1 overflow-x-auto border-b border-border pb-px scrollbar-none">
        {NAV.map((n) => (
          <NavLink key={n.to} to={q(n.to)} end={n.end} className={({ isActive }) => cn('flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium', isActive ? 'border-teal text-fg' : 'border-transparent text-muted-fg hover:text-fg')}>
            <n.icon className="h-4 w-4" /> {n.label}
          </NavLink>
        ))}
        {!as && <NavLink to="/classes" className="flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-fg hover:text-fg"><GraduationCap className="h-4 w-4" /> Classes</NavLink>}
      </nav>
    </>
  );
}

const STATUS: Record<string, string> = {
  open: 'bg-muted text-fg/80',
  late: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  done: 'bg-teal-100 text-teal-600 dark:bg-teal-600/30 dark:text-teal-100',
  submitted: 'bg-gold-100 text-ink dark:bg-gold/25 dark:text-gold-100',
  graded: 'bg-teal-100 text-teal-600 dark:bg-teal-600/30 dark:text-teal-100',
};
const STATUS_LABEL: Record<string, string> = { open: 'To do', late: 'Overdue', done: 'Done', submitted: 'Submitted', graded: 'Marked' };

export function StatusChip({ status }: { status: string }) {
  return <span className={cn('chip whitespace-nowrap', STATUS[status] ?? STATUS.open)}>{STATUS_LABEL[status] ?? status}</span>;
}
