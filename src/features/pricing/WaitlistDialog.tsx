import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, Field, Input, Textarea, Button } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PLAN_CATALOG, usd } from '@shared/config';

const premium = PLAN_CATALOG.find((p) => p.id === 'premium')!;

export function WaitlistDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', note: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post<{ ok: true; alreadyJoined: boolean }>('/api/waitlist', { ...form, plan: 'premium' });
      setDone(true);
      toast.success(r.alreadyJoined ? 'You were already on the list. We will be in touch.' : 'You are on the Premium waitlist.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Premium is opening soon" description={`${usd(premium.priceUsdMonthly)} a month: weekly 1:1 mentorship, a small live cohort, GPU lab credits and placement support.`}>
      {done ? (
        <div className="space-y-4">
          <p>Thank you. We are admitting the first Premium cohort in small groups and will email <strong>{form.email}</strong> before anyone else hears about it.</p>
          <Button variant="outlined" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Your name" htmlFor="wl-name">
            <Input id="wl-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="wl-email">
            <Input id="wl-email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="What do you want from Premium? (optional)" hint="Your goal, current role, or the job you are aiming for." htmlFor="wl-note">
            <Textarea id="wl-note" rows={3} maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Button type="submit" color="primary" size="lg" fullWidth loading={busy}>Join the Premium waitlist</Button>
        </form>
      )}
    </Dialog>
  );
}
