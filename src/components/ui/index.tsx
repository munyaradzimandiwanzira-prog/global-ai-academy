import * as RDialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn, initials } from '@/lib/utils';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-muted-fg', className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label ?? <span className="sr-only">Loading</span>}
    </span>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner label="Loading…" />
    </div>
  );
}

export function Dialog({
  open, onOpenChange, title, description, children, className, wide,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-[2px] data-[state=open]:animate-in" />
        <RDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl focus:outline-none',
            wide ? 'max-w-3xl' : 'max-w-lg',
            className,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <RDialog.Title className="font-display text-xl font-semibold">{title}</RDialog.Title>
              {description ? <RDialog.Description className="mt-1 text-sm text-muted-fg">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{title}</RDialog.Description>}
            </div>
            <RDialog.Close className="rounded-md p-1 text-muted-fg hover:bg-muted hover:text-fg" aria-label="Close">
              <X className="h-5 w-5" />
            </RDialog.Close>
          </div>
          {children}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function Avatar({ name, color, size = 32, className }: { name: string; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, background: color ?? '#23807F', fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name) || '?'}
    </span>
  );
}

export function ProgressBar({ value, className, tone = 'teal' }: { value: number; className?: string; tone?: 'teal' | 'gold' | 'ink' }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = tone === 'gold' ? 'bg-gold' : tone === 'ink' ? 'bg-ink dark:bg-sand' : 'bg-teal';
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 56, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#23807F" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="absolute text-xs font-semibold">{label ?? `${pct}%`}</span>
    </span>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-gold-600">{icon}</div>}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-md text-sm text-muted-fg">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-muted-fg">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('input', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('input min-h-[96px]', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn('input appearance-none bg-[length:16px] bg-[right_.6rem_center] bg-no-repeat pr-8', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold md:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-muted-fg">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-sm text-muted-fg">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-1.5 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-fg">{sub}</div>}
    </div>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    kids: 'bg-[#FDE7C8] text-[#8A4B00]',
    beginner: 'bg-teal-100 text-teal-600',
    intermediate: 'bg-gold-100 text-gold-600',
    advanced: 'bg-stone-100 text-stone',
  };
  const labels: Record<string, string> = { kids: 'Kids', beginner: 'Entry level', intermediate: 'Intermediate', advanced: 'Advanced' };
  return <span className={cn('chip', styles[level] ?? 'bg-muted text-fg')}>{labels[level] ?? level}</span>;
}

export { Button, ButtonLink, IconButton, buttonClass } from './Button';
export { TrackMark, monogram, readableOn } from './TrackMark';
export { CareerMark } from './CareerMark';
