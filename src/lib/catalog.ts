import catalog from 'virtual:catalog';
import { CATEGORY_ORDER, type CatalogTrack, type Track, type TrackCategory } from '@shared/content';

export { catalog };

const byId = new Map(catalog.map((t) => [t.id, t]));
export const getCatalogTrack = (id: string): CatalogTrack | undefined => byId.get(id);

const LEVEL_RANK: Record<string, number> = { kids: 0, beginner: 1, intermediate: 2, advanced: 3 };

/** Topics in menu order; inside each, easiest first so a newcomer meets the right first track. */
export function tracksByCategory(): { category: TrackCategory; tracks: CatalogTrack[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    tracks: catalog.filter((t) => t.category === category).sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.order - b.order),
  })).filter((g) => g.tracks.length);
}

/** Lazy loaders — each track becomes its own small chunk. */
const loaders = import.meta.glob<Track>('/content/tracks/*.md', { query: '?track', import: 'default' });
const loaderById = new Map<string, () => Promise<Track>>();
for (const [path, loader] of Object.entries(loaders)) {
  loaderById.set(path.split('/').pop()!.replace(/\.md$/, ''), loader);
}

export async function loadTrack(id: string): Promise<Track> {
  const loader = loaderById.get(id);
  if (!loader) throw new Error(`Track "${id}" not found`);
  return loader();
}

export interface SearchEntry {
  trackId: string;
  trackTitle: string;
  icon: string;
  short: string;
  color: string;
  slug: string | null;
  title: string;
  haystack: string;
}

export const searchIndex: SearchEntry[] = catalog.flatMap((t: CatalogTrack): SearchEntry[] => [
  { trackId: t.id, trackTitle: t.title, icon: t.icon, short: t.short, color: t.color, slug: null, title: `${t.title} tutorial`, haystack: `${t.title} ${t.short} ${t.tags.join(' ')} ${t.summary}`.toLowerCase() },
  ...t.lessons.map((l: CatalogTrack['lessons'][number]): SearchEntry => ({ trackId: t.id, trackTitle: t.title, icon: t.icon, short: t.short, color: t.color, slug: l.slug, title: l.title, haystack: `${l.title} ${t.title} ${t.short}`.toLowerCase() })),
]);

export function search(query: string, limit = 12): SearchEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return searchIndex
    .map((e) => {
      let score = 0;
      for (const term of terms) {
        const i = e.haystack.indexOf(term);
        if (i === -1) return null;
        score += i === 0 ? 3 : e.title.toLowerCase().includes(term) ? 2 : 1;
      }
      if (!e.slug) score += 1;
      return { e, score };
    })
    .filter((x): x is { e: SearchEntry; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}

export const lessonPath = (trackId: string, slug?: string | null) => (slug ? `/learn/${trackId}/${slug}` : `/learn/${trackId}`);
