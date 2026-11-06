import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageLoader } from '@/components/ui';
import { GraduationCap } from '@/components/icons';
import { useInvitePreview } from '@/features/teachers/TeacherPicker';

/** The page an invite link opens: shows whose class it is, then signs the learner up or links them. */
export default function JoinTeacher() {
  const { code = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const preview = useInvitePreview(code);
  useEffect(() => { document.title = 'Join your teacher | Global AI Academy'; return () => { document.title = 'Global AI Academy'; }; }, []);
  const join = useMutation({
    mutationFn: () => api.post<{ teacherName: string; classroomId: string | null }>('/api/me/teachers', { code }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['my-teachers'] });
      qc.invalidateQueries({ queryKey: ['my-classes'] });
      toast.success(`You’ve joined ${r.teacherName}.`);
      navigate(r.classroomId ? `/classes/${r.classroomId}` : '/dashboard', { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (preview.isLoading) return <PageLoader />;
  const p = preview.data;
  const enc = encodeURIComponent(code);
  return (
    <div className="container flex min-h-[60vh] max-w-lg flex-col items-center justify-center py-12 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal/20"><GraduationCap className="h-8 w-8" /></span>
      {p ? (
        <>
          <h1 className="mt-5 font-display text-3xl font-bold">Join {p.teacherName}</h1>
          <p className="mt-2 text-muted-fg">{[p.school, p.classroomName && `Class: ${p.classroomName}`].filter(Boolean).join(' · ') || 'Learn with your teacher on Global AI Academy.'}</p>
          <p className="mt-4 text-sm">Joining is free. Your teacher will see your progress on the Academy and can set you work. They won’t see your chats with Zuva.</p>
          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {user ? (
              <button type="button" className="btn-primary btn-lg" disabled={join.isPending} onClick={() => join.mutate()}>{join.isPending ? 'Joining…' : `Join as ${user.name.split(' ')[0]}`}</button>
            ) : (
              <>
                <Link to={`/signup?invite=${enc}`} className="btn-primary btn-lg">Create a free account</Link>
                <Link to={`/login?next=${encodeURIComponent(`/join/${code}`)}`} className="btn-outline btn-lg">I already have one</Link>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-5 font-display text-3xl font-bold">This invite isn’t working</h1>
          <p className="mt-2 text-muted-fg">{preview.error ? errorMessage(preview.error) : 'Check the link or code with your teacher.'}</p>
          <Link to={user ? '/dashboard' : '/signup'} className="btn-outline mt-6">{user ? 'Go to my dashboard' : 'Sign up without a teacher'}</Link>
        </>
      )}
    </div>
  );
}
