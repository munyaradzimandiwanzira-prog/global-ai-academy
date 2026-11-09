import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { LearnerCourse } from '@shared/courses';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageLoader, ProgressBar } from '@/components/ui';
import { ArrowLeft, MaterialIcon } from '@/components/icons';
import { COURSE_BAND } from '@/pages/teacher/TeachCourses';

/** A teacher's course: units and lessons with ticks, and a button to carry on. */
export default function MyCourse() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['my-course', id], queryFn: () => api.get<LearnerCourse>(`/api/courses/mine/${id}`), retry: false });
  if (q.isLoading) return <PageLoader />;
  if (!q.data) return <div className="container py-10"><p>{errorMessage(q.error)}</p></div>;
  const { course, units } = q.data;
  const next = units.flatMap((u) => u.lessons).find((l) => !l.done) ?? units[0]?.lessons[0];
  return (
    <div className="container max-w-3xl py-8">
      <Link to="/my-courses" className="btn-ghost btn-sm -ml-3 mb-2"><ArrowLeft /> Courses</Link>
      <header className="card relative overflow-hidden p-6 pl-8">
        <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-2', COURSE_BAND[course.color])} />
        <p className="text-sm text-muted-fg">{[course.subject, course.audience].filter(Boolean).join(' · ') || 'Course'} · by {course.teacher}</p>
        <h1 className="mt-1 font-display text-3xl font-bold">{course.title}</h1>
        {course.summary && <p className="mt-2 text-[16px] text-fg/85">{course.summary}</p>}
        <div className="mt-4"><ProgressBar value={course.lessons ? (course.done / course.lessons) * 100 : 0} label="Course progress" /><p className="mt-1 text-sm text-muted-fg">{course.done} of {course.lessons} lessons done</p></div>
        {next && <Link to={`/my-courses/${id}/${next.id}`} className="btn-primary mt-4">{course.done ? 'Carry on' : 'Start'}: {next.title}</Link>}
      </header>
      <div className="mt-6 space-y-5">
        {units.map((u, ui) => (
          <section key={u.id} aria-labelledby={`u-${u.id}`}>
            <h2 id={`u-${u.id}`} className="mb-2 font-display text-lg font-semibold">{ui + 1}. {u.title}</h2>
            <ol className="card divide-y divide-border overflow-hidden">
              {u.lessons.map((l) => (
                <li key={l.id}>
                  <Link to={`/my-courses/${id}/${l.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-muted">
                    <MaterialIcon name={l.done ? 'check_circle' : 'radio_button_unchecked'} className={cn('text-[24px]', l.done ? 'text-teal-700 dark:text-teal-400' : 'text-muted-fg')} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{l.title}</span><span className="block text-sm text-muted-fg">{l.minutes} min{l.pct != null ? ` · check ${l.pct}%` : ''}</span></span>
                    <span className="sr-only">{l.done ? 'Done' : 'Not done'}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
