import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { compressToEncodedURIComponent } from 'lz-string';
import { Play, Search, ArrowRight } from 'lucide-react';
import { REFERENCES, getReference, type RefEntry } from '@/data/references';
import { lessonPath } from '@/lib/catalog';
import { TrackMark, buttonClass } from '@/components/ui';
import NotFound from '@/pages/NotFound';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function ReferenceIndex() {
  return (
    <div className="container py-14">
      <h1 className="display-lg">References</h1>
      <p className="lede mt-4 max-w-2xl text-fg/85">Look something up in seconds: every entry has its syntax, one plain sentence, and an example you can run.</p>
      <ul className="mt-12 grid gap-x-10 md:grid-cols-2">
        {REFERENCES.map((r) => (
          <li key={r.id} className="border-b border-border">
            <Link to={`/reference/${r.id}`} className="group flex items-center gap-5 py-5">
              <TrackMark short={r.short} color={r.color} size={52} />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl font-bold group-hover:text-teal-600">{r.title} reference</span>
                <span className="mt-1 block text-[15px] text-fg/75">{r.sections.reduce((n, s) => n + s.entries.length, 0)} entries · {r.sections.map((s) => s.title.toLowerCase()).join(', ')}</span>
              </span>
              <ArrowRight className="h-5 w-5 text-fg/40 group-hover:text-teal-600" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Entry({ entry, lang, section }: { entry: RefEntry; lang: string; section: string }) {
  const [name, syntax, description, example] = entry;
  return (
    <div id={`${slug(section)}-${slug(name)}`} className="grid scroll-mt-32 gap-x-8 gap-y-1 border-b border-border py-3.5 md:grid-cols-[17rem_1fr]">
      <div className="min-w-0">
        <h3 className="font-mono text-[15.5px] font-semibold tracking-normal"><code>{name}</code></h3>
        <code className="mt-0.5 block truncate font-mono text-[13px] text-fg/65" title={syntax}>{syntax}</code>
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[15.5px]">{description}</p>
          {example && (
            <Link to={`/playground?lang=${lang}#code=${compressToEncodedURIComponent(example)}`} className={buttonClass({ variant: 'text', color: 'action', size: 'sm' }, 'shrink-0')} aria-label={`Try ${name}`}>
              <Play className="fill-current" aria-hidden="true" /> Try it
            </Link>
          )}
        </div>
        {example && (
          <details className="mt-1 text-[14.5px]">
            <summary className="cursor-pointer font-medium text-teal-600">Example</summary>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-night px-4 py-3 font-mono text-[13.5px] leading-relaxed text-sand"><code>{example}</code></pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default function ReferencePage() {
  const { refId = '' } = useParams();
  const ref = getReference(refId);
  const [q, setQ] = useState('');

  const sections = useMemo(() => {
    if (!ref) return [];
    const term = q.trim().toLowerCase();
    if (!term) return ref.sections;
    return ref.sections
      .map((s) => ({ ...s, entries: s.entries.filter(([n, syn, d]) => `${n} ${syn} ${d}`.toLowerCase().includes(term)) }))
      .filter((s) => s.entries.length);
  }, [ref, q]);

  if (!ref) return <NotFound />;

  return (
    <div className="container py-12">
      <div className="flex flex-wrap items-center gap-5">
        <TrackMark short={ref.short} color={ref.color} size={64} />
        <div>
          <h1 className="display-md">{ref.title} reference</h1>
          <p className="mt-2 max-w-2xl text-[16px] text-fg/80">{ref.intro} Learning it from scratch? Start the <Link to={lessonPath(ref.trackId)} className="font-semibold text-teal-600 underline-offset-4 hover:underline">{ref.title} tutorial</Link>.</p>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <label className="relative block">
            <span className="sr-only">Filter this reference</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg/50" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${ref.title}…`} className="input pl-9" />
          </label>
          <nav className="mt-5 hidden lg:block" aria-label="Sections">
            <ul className="space-y-1 text-[15px]">
              {ref.sections.map((s) => <li key={s.title}><a href={`#${slug(s.title)}`} className="block rounded-lg px-3 py-1.5 hover:bg-muted">{s.title}</a></li>)}
            </ul>
            <p className="mt-6 px-3 text-sm text-fg/70">Other references</p>
            <ul className="mt-1 space-y-1 text-[15px]">
              {REFERENCES.filter((r) => r.id !== ref.id).map((r) => <li key={r.id}><Link to={`/reference/${r.id}`} className="block rounded-lg px-3 py-1.5 hover:bg-muted">{r.title}</Link></li>)}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0">
          {sections.length === 0 && <p className="text-fg/80">Nothing matches “{q}”. Try a shorter word.</p>}
          {sections.map((s) => (
            <section key={s.title} id={slug(s.title)} className="mb-12 scroll-mt-32">
              <h2 className="font-display text-3xl font-bold">{s.title}</h2>
              <div className="mt-2">{s.entries.map((e) => <Entry key={e[0]} entry={e} lang={ref.lang} section={s.title} />)}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
