import { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Clock } from 'lucide-react';
import { SITE } from '@shared/config';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Field, Input, PageHeader, Select, Textarea } from '@/components/ui';

export default function Contact() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', subject: 'General question', body: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy');
    setErrors({});
    try {
      await api.post('/api/contact', form);
      setState('sent');
    } catch (err) {
      setErrors(err instanceof ApiError && err.fields ? err.fields : { _: errorMessage(err) });
      setState('idle');
    }
  };

  return (
    <div className="container py-10">
      <PageHeader title="Contact us" description="Questions about learning, schools, scholarships or payments — we usually reply within one working day." />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {state === 'sent' ? (
          <div className="card p-8">
            <h2 className="font-display text-2xl font-semibold">Message sent. Ndatenda — thank you!</h2>
            <p className="mt-2 text-muted-fg">We’ll reply to {form.email}.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card space-y-4 p-6">
            {errors._ && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors._}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={errors.name} htmlFor="cn"><Input id="cn" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Email" error={errors.email} htmlFor="ce"><Input id="ce" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </div>
            <Field label="Topic" htmlFor="cs">
              <Select id="cs" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                {['General question', 'School or bootcamp partnership', 'Scholarship application', 'Payments and billing', 'Teaching on the Academy', 'Report a problem'].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Message" error={errors.body} htmlFor="cb"><Textarea id="cb" rows={6} required minLength={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
            <button disabled={state === 'busy'} className="btn-primary btn-lg">{state === 'busy' ? 'Sending…' : 'Send message'}</button>
          </form>
        )}
        <aside className="card space-y-4 p-6 text-sm">
          <a href={`mailto:${SITE.contact.email}`} className="flex items-center gap-3 hover:text-teal-600"><Mail className="h-5 w-5 text-gold-600" />{SITE.contact.email}</a>
          <a href={`tel:${SITE.contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 hover:text-teal-600"><Phone className="h-5 w-5 text-gold-600" />{SITE.contact.phone}</a>
          <a href={`https://wa.me/${SITE.contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-teal-600"><MessageCircle className="h-5 w-5 text-gold-600" />Chat on WhatsApp</a>
          <p className="flex items-center gap-3"><MapPin className="h-5 w-5 text-gold-600" />{SITE.contact.address}</p>
          <p className="flex items-center gap-3"><Clock className="h-5 w-5 text-gold-600" />{SITE.contact.hours}</p>
        </aside>
      </div>
    </div>
  );
}
