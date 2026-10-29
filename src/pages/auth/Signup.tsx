import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { PublicUser } from '@shared/api-types';
import { ROLE_HOME } from '@shared/rbac';
import type { Level } from '@shared/content';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { safeNext, cn } from '@/lib/utils';
import { Field, Input } from '@/components/ui';
import { useTurnstile } from '@/components/Turnstile';
import { AuthShell } from './AuthShell';

const LEVELS: { id: Level; title: string; text: string; icon: string }[] = [
  { id: 'kids', title: 'Kids & teens', text: 'Games, puzzles and first steps', icon: '🧒' },
  { id: 'beginner', title: 'Total beginner', text: 'I have never written code', icon: '🌱' },
  { id: 'intermediate', title: 'Some experience', text: 'I can write simple programs', icon: '🌿' },
  { id: 'advanced', title: 'Working engineer', text: 'I want AI, agents and platforms', icon: '🌳' },
];

export default function Signup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', city: '', level: 'beginner' as Level, wantsToTeach: false, acceptTerms: false });
  const bot = useTurnstile('signup');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const { user, devVerifyUrl } = await api.post<{ user: PublicUser; devVerifyUrl?: string }>('/api/auth/signup', { ...form, city: form.city || undefined, turnstileToken: bot.token });
      setUser(user);
      toast.success('Account created. Welcome to the Academy!', { description: devVerifyUrl ? `Dev mode: confirm your email at ${devVerifyUrl}` : 'Check your inbox to confirm your email.' });
      const fallback = form.level === 'kids' ? '/kids' : ROLE_HOME[user.role];
      navigate(safeNext(params.get('next'), fallback), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields ?? { _: err.message });
      else setErrors({ _: 'Could not create your account. Try again.' });
      bot.reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your free account" subtitle={<>Already learning with us? <Link to="/login" className="font-semibold text-teal-600 hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors._ && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{errors._}</p>}
        <Field label="Full name" error={errors.name} htmlFor="name">
          <Input id="name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email" error={errors.email} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number." htmlFor="password">
          <Input id="password" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Town or city (optional)" htmlFor="city">
          <Input id="city" placeholder="e.g. Gweru" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <fieldset>
          <legend className="label">Where are you starting?</legend>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map((l) => (
              <button type="button" key={l.id} onClick={() => setForm({ ...form, level: l.id })} aria-pressed={form.level === l.id}
                className={cn('rounded-xl border p-3 text-left transition-colors', form.level === l.id ? 'border-teal bg-teal-100/60 dark:bg-teal/20' : 'border-border hover:bg-muted')}>
                <span className="mt-1 block text-sm font-semibold">{l.title}</span>
                <span className="block text-xs text-muted-fg">{l.text}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={form.wantsToTeach} onChange={(e) => setForm({ ...form, wantsToTeach: e.target.checked })} className="mt-0.5 h-4 w-4 accent-teal" />
          <span>I’m a teacher and want to run classes <span className="text-muted-fg">(an administrator reviews teaching requests)</span></span>
        </label>
        <div>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" required checked={form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} aria-invalid={!!errors.acceptTerms} aria-describedby={errors.acceptTerms ? 'terms-error' : undefined} className="mt-0.5 h-4 w-4 accent-teal" />
            <span>I agree to the <Link to="/terms" target="_blank" className="font-medium text-teal-600 underline">terms</Link> and <Link to="/privacy" target="_blank" className="font-medium text-teal-600 underline">privacy policy</Link>. If I’m under 18, my parent or guardian has agreed too.</span>
          </label>
          {errors.acceptTerms && <p id="terms-error" className="mt-1 text-xs font-medium text-red-600">{errors.acceptTerms}</p>}
        </div>
        {bot.widget}
        {errors.turnstile && <p className="text-xs font-medium text-red-600">{errors.turnstile}</p>}
        <button disabled={busy} className="btn-primary btn-lg w-full">{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}
