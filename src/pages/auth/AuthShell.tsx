import type { ReactNode } from 'react';
import { LogoMark } from '@/components/ui/Logo';

export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="container grid min-h-[calc(100vh-101px)] items-center gap-10 py-10 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md">
        <LogoMark className="h-11 w-11" />
        <h1 className="mt-5 text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-fg">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
      <div className="relative hidden h-full min-h-[520px] overflow-hidden rounded-3xl bg-ink p-10 text-white lg:block">
        <div className="absolute inset-x-0 bottom-0 h-40 stone-wall opacity-90" />
        <div className="absolute inset-x-0 bottom-40 chevron-band" />
        <div className="relative">{aside ?? <DefaultAside />}</div>
      </div>
    </div>
  );
}

function DefaultAside() {
  return (
    <>
      <p className="font-display text-3xl font-semibold leading-snug">“Kugara hunzwana.” Living together means understanding one another — and that is how we learn.</p>
      <ul className="mt-8 space-y-3 text-white/80">
        <li>• Save your progress across phone and laptop</li>
        <li>• Earn XP, streaks and verifiable certificates</li>
        <li>• Join your teacher’s class with a code</li>
        <li>• Get AI coaching when your code won’t run</li>
      </ul>
    </>
  );
}
