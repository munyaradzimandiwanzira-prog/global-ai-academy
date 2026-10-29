import type { ReactNode } from 'react';
import { LogoMark } from '@/components/ui/Logo';
import { Photo } from '@/components/Photo';

export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="container grid min-h-[calc(100vh-101px)] items-center gap-10 py-10 lg:grid-cols-[1fr_1.05fr]">
      <div className="mx-auto w-full max-w-md">
        <LogoMark className="h-11 w-11" />
        <h1 className="mt-5 text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-fg">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
      {/* The conical tower: the photograph is the panel; ink fades down from the top so the words stay readable. */}
      <figure className="relative hidden h-full min-h-[560px] overflow-hidden rounded-[20px] bg-ink text-white lg:block">
        <Photo name="great-zimbabwe-tower" alt="" sizes="(min-width: 1280px) 600px, 48vw" className="absolute inset-0" imgClassName="object-[50%_70%]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,28,56,.94)_0%,rgba(12,28,56,.82)_34%,rgba(12,28,56,.18)_68%,rgba(12,28,56,.55)_100%)]" aria-hidden="true" />
        <div className="relative p-10">{aside ?? <DefaultAside />}</div>
        <figcaption className="absolute inset-x-0 bottom-0 px-10 pb-6 text-sm text-white/80">
          The conical tower, Great Zimbabwe. Granite, laid without mortar, about 700 years ago.
        </figcaption>
      </figure>
    </div>
  );
}

function DefaultAside() {
  return (
    <>
      <p className="max-w-md font-display text-[1.7rem] font-semibold leading-snug">“Kugara hunzwana.” Living together means understanding one another — and that is how we learn.</p>
      <ul className="mt-7 max-w-md space-y-2 text-[17px] text-white/85">
        <li>Save your progress across phone and laptop</li>
        <li>Earn XP, streaks and verifiable certificates</li>
        <li>Join your teacher’s class with a code</li>
        <li>Get AI coaching when your code won’t run</li>
      </ul>
    </>
  );
}
