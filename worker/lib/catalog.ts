import catalog from 'virtual:catalog';
import type { CatalogTrack } from '@shared/content';

const byId = new Map<string, CatalogTrack>(catalog.map((t) => [t.id, t]));

export const getTrack = (id: string) => byId.get(id);
export const allTracks = () => catalog;

export function lessonExists(trackId: string, slug: string): boolean {
  return !!byId.get(trackId)?.lessons.some((l) => l.slug === slug);
}

export function lessonMinutes(trackId: string, slug: string): number {
  return byId.get(trackId)?.lessons.find((l) => l.slug === slug)?.minutes ?? 0;
}
