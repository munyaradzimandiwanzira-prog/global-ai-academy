import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as RDialog from '@radix-ui/react-dialog';
import { Search, CornerDownLeft } from '@/components/icons';
import { search, lessonPath, catalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { TrackMark } from '@/components/ui';

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const results = useMemo(() => (q ? search(q) : catalog.slice(0, 8).map((t) => ({ trackId: t.id, trackTitle: t.title, icon: t.icon, short: t.short, color: t.color, slug: null, title: `${t.title} tutorial`, haystack: '' }))), [q]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { if (!open) setQ(''); }, [open]);

  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    onOpenChange(false);
    navigate(lessonPath(r.trackId, r.slug));
  };

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-[2px]" />
        <RDialog.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <RDialog.Title className="sr-only">Search tutorials</RDialog.Title>
          <RDialog.Description className="sr-only">Type to search lessons across every track</RDialog.Description>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-5 w-5 text-muted-fg" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === 'Enter') go(active);
              }}
              placeholder="Search Python loops, RAG, CSS grid, VS Code…"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-fg"
              aria-label="Search tutorials"
            />
            <kbd className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-fg">Esc</kbd>
          </div>
          <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
            {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-fg">No lessons match “{q}”. Try a shorter word.</li>}
            {results.map((r, i) => (
              <li key={`${r.trackId}/${r.slug}`} role="option" aria-selected={i === active}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(i)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left', i === active ? 'bg-muted' : '')}
                >
                  <TrackMark short={r.short} color={r.color} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted-fg">{r.trackTitle}</span>
                  </span>
                  {i === active && <CornerDownLeft className="h-4 w-4 text-muted-fg" />}
                </button>
              </li>
            ))}
          </ul>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
