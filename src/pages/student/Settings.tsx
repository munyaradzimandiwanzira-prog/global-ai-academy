import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PublicUser } from '@shared/api-types';
import { PLANS } from '@shared/config';
import type { Level } from '@shared/content';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { SecuritySettings } from './SecuritySettings';
import { ZuvaMemorySettings } from './ZuvaMemorySettings';

export default function Settings() {
  const { user, setUser, refresh } = useAuth();
  const [profile, setProfile] = useState({ name: '', city: '', school: '', bio: '', level: 'beginner' as Level });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [teachMsg, setTeachMsg] = useState('');
  const payments = useQuery({ queryKey: ['my-payments'], queryFn: () => api.get<{ payments: { id: string; reference: string; plan: string; period: string; amount_cents: number; status: string; created_at: string }[] }>('/api/me/payments') });

  useEffect(() => {
    if (user) setProfile({ name: user.name, city: user.city ?? '', school: user.school ?? '', bio: user.bio ?? '', level: user.level });
  }, [user]);
  if (!user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      const r = await api.patch<{ user: PublicUser }>('/api/me/profile', { ...profile, city: profile.city || null, school: profile.school || null, bio: profile.bio || null });
      setUser({ ...r.user, pendingTeacherRequest: user.pendingTeacherRequest });
      toast.success('Profile saved');
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(errorMessage(err));
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/change-password', pw);
      setPw({ current: '', next: '' });
      toast.success('Password changed. Other devices were signed out.');
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <PageHeader title="Settings" />
      <div className="space-y-6">
        {user.mfaSetupRequired && (
          <p role="status" className="rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm"><strong className="font-semibold">Admin tools are paused</strong> until you turn on two-step login below.</p>
        )}
        <form onSubmit={saveProfile} className="card space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name} htmlFor="n"><Input id="n" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
            <Field label="Email" hint={user.emailVerified ? 'Confirmed' : 'Not confirmed yet'} htmlFor="em"><Input id="em" value={user.email} disabled /></Field>
            <Field label="Town or city" htmlFor="c"><Input id="c" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></Field>
            <Field label="School / university / employer" htmlFor="s"><Input id="s" value={profile.school} onChange={(e) => setProfile({ ...profile, school: e.target.value })} /></Field>
            <Field label="Level" htmlFor="l">
              <Select id="l" value={profile.level} onChange={(e) => setProfile({ ...profile, level: e.target.value as Level })}>
                <option value="kids">Kids & teens</option><option value="beginner">Entry level</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </Select>
            </Field>
          </div>
          <Field label="About you" htmlFor="b"><Textarea id="b" maxLength={500} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="What are you learning, and why?" /></Field>
          <button className="btn-primary">Save profile</button>
        </form>

        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold">Plan</h2>
          <p className="mt-2 text-sm">You’re on <strong>{PLANS[user.plan].name}</strong>{user.planExpiresAt && user.plan !== 'free' ? <> until {formatDate(user.planExpiresAt)}</> : null}.</p>
          <Link to="/pricing" className="btn-outline btn-sm mt-3">{user.plan === 'free' ? 'Upgrade' : 'Change or renew plan'}</Link>
          {payments.data?.payments.length ? (
            <table className="mt-5 w-full text-sm">
              <thead className="text-left text-xs text-muted-fg"><tr><th className="py-1.5">Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>{payments.data.payments.map((p) => <tr key={p.id} className="border-t border-border"><td className="py-2">{formatDate(p.created_at)}</td><td className="capitalize">{p.plan} · {p.period}</td><td>${(p.amount_cents / 100).toFixed(2)}</td><td className="capitalize">{p.status}</td></tr>)}</tbody>
            </table>
          ) : null}
        </section>

        {user.role === 'student' && (
          <section className="card p-6">
            <h2 className="font-display text-xl font-semibold">Teach on Global AI Academy</h2>
            {user.pendingTeacherRequest ? (
              <p className="mt-2 text-sm text-muted-fg">Your request is waiting for an administrator. We’ll switch your account to teacher once approved.</p>
            ) : (
              <form className="mt-3 space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api.post('/api/me/teacher-request', { message: teachMsg }); toast.success('Request sent'); void refresh(); } catch (err) { toast.error(errorMessage(err)); } }}>
                <p className="text-sm text-muted-fg">Teachers create classrooms, set assignments and grade learners. Tell us where you teach.</p>
                <Textarea value={teachMsg} onChange={(e) => setTeachMsg(e.target.value)} maxLength={1000} placeholder="e.g. I teach Form 3 Computer Science at … High School, Masvingo." />
                <button className="btn-outline">Request teaching access</button>
              </form>
            )}
          </section>
        )}

        <form onSubmit={changePassword} className="card space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">Password</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password" error={errors.current} htmlFor="cp"><Input id="cp" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="New password" error={errors.next} htmlFor="np"><Input id="np" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          </div>
          <button className="btn-outline">Change password</button>
        </form>

        <ZuvaMemorySettings />

        <SecuritySettings />
      </div>
    </div>
  );
}
