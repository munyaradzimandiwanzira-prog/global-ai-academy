import { cn } from '@/lib/utils';

/** Brand mark: Great Zimbabwe chevron courses over a navy stone, with a teal "neuron" node. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('h-9 w-9', className)} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#142B52" />
      <path d="M8 20 L16 14 L24 20 L32 14 L40 20" fill="none" stroke="#D4A64A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 28 L16 22 L24 28 L32 22 L40 28" fill="none" stroke="#D4A64A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
      <path d="M12 36 H36" stroke="#F5F0E6" strokeWidth="2.4" strokeLinecap="round" opacity=".35" />
      <circle cx="36" cy="36" r="4.2" fill="#3FA3A1" stroke="#142B52" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[17px] font-bold tracking-tight">Global AI Academy</span>
          <span className="mt-0.5 block text-[11px] font-medium text-muted-fg">Learn · Build · Ship — from Zimbabwe</span>
        </span>
      )}
    </span>
  );
}
