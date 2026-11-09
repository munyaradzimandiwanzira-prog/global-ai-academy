import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { LearnerCourseCard } from '@shared/courses';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Empty, PageHeader, PageLoader, ProgressBar } from '@/components/ui';
import { MaterialIcon } from '@/components/icons';
import { COURSE_BAND } from '@/pages/teacher/TeachCourses';

/** Courses a learner's teachers have shared with them. */
export default function MyCourses() {
  const q = useQuery({ queryKey: ['my-courses'], queryFn: () => api.get<{ courses: LearnerCourseCard[] }>('/api/courses/mine/list') });
  if (q.isLoading) return <PageLoader />;
  const list = q.data?.courses ?? [];
  return (
    <div className="container py-8">
      <PageHeader title="Courses from your teachers" />
      {!list.length ? <Empty icon={<MaterialIcon name="menu_book" className="text-[40px]" />} title="No courses yet">When a teacher shares a course with you or your class, it appears here.</Empty> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <li key={c.id}>
              <Link to={`/my-courses/${c.id}`} className="card relative flex h-full flex-col overflow-hidden p-5 pl-7 hover:border-teal">
                <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-2', COURSE_BAND[c.color])} />
                <span className="text-sm text-muted-fg">{c.subject || 'Course'} · {c.teacher}</span>
                <span className="mt-1 font-display text-lg font-semibold">{c.title}</span>
                {c.summary && <span className="mt-1 line-clamp-2 text-[15px] text-fg/80">{c.summary}</span>}
                <span className="mt-auto pt-4"><ProgressBar value={c.lessons ? (c.done / c.lessons) * 100 : 0} label={`${c.title} progress`} /><span className="mt-1 block text-sm text-muted-fg">{c.done} of {c.lessons} lessons</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
