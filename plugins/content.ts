import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { parseTrack, toCatalogEntry } from './content-parser';
import type { QuizQuestion, Track } from '../shared/content';

const VIRTUAL_CATALOG = 'virtual:catalog';
const VIRTUAL_QUIZ_BANK = 'virtual:quiz-bank';
const RESOLVED = (id: string) => '\0' + id;

/**
 * Compiles /content/tracks/*.md into:
 *  - virtual:catalog     → lightweight index of every track (used by nav, search, dashboards, worker)
 *  - virtual:quiz-bank   → exam questions per track (worker grades certificate exams server-side)
 *  - <file>.md?track     → the full parsed track (lazy-loaded per tutorial on the client)
 */
export function contentPlugin(): Plugin {
  const dir = resolve(__dirname, '../content/tracks');
  let cache: Track[] | null = null;

  const loadAll = (): Track[] => {
    if (cache) return cache;
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
    const tracks = files.map((f) => parseTrack(readFileSync(join(dir, f), 'utf8'), f));
    const ids = new Set<string>();
    for (const [i, t] of tracks.entries()) {
      if (`${t.meta.id}.md` !== files[i]) throw new Error(`[content] ${files[i]}: file name must match id "${t.meta.id}"`);
      if (ids.has(t.meta.id)) throw new Error(`[content] duplicate track id "${t.meta.id}"`);
      ids.add(t.meta.id);
    }
    cache = tracks.sort((a, b) => a.meta.order - b.meta.order || a.meta.title.localeCompare(b.meta.title));
    return cache;
  };

  return {
    name: 'gaa-content',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_CATALOG || id === VIRTUAL_QUIZ_BANK) return RESOLVED(id);
      return null;
    },
    load(id) {
      if (id === RESOLVED(VIRTUAL_CATALOG)) {
        const tracks = loadAll();
        readdirSync(dir).forEach((f) => this.addWatchFile(join(dir, f)));
        return `export default ${JSON.stringify(tracks.map(toCatalogEntry))};`;
      }
      if (id === RESOLVED(VIRTUAL_QUIZ_BANK)) {
        const bank: Record<string, (QuizQuestion & { id: string; examOnly: boolean })[]> = {};
        for (const t of loadAll()) {
          bank[t.meta.id] = t.lessons.flatMap((l) =>
            l.blocks.flatMap((b) => (b.type === 'quiz' ? b.questions.map((q, i) => ({ ...q, id: `${b.id}:${i}`, examOnly: !!b.examOnly })) : [])),
          );
        }
        return `export default ${JSON.stringify(bank)};`;
      }
      if (id.endsWith('.md?track')) {
        const file = id.slice(0, -'?track'.length);
        this.addWatchFile(file);
        const track = parseTrack(readFileSync(file, 'utf8'), file.split('/').pop());
        // Exam-only questions (and their answers) stay on the server — never ship them to the browser.
        const publicTrack = {
          ...track,
          lessons: track.lessons.map((l) => ({ ...l, blocks: l.blocks.filter((b) => !(b.type === 'quiz' && b.examOnly)) })),
        };
        return `export default ${JSON.stringify(publicTrack)};`;
      }
      return null;
    },
    configureServer(server) {
      server.watcher.add(dir);
      server.watcher.on('change', (file) => {
        if (!file.startsWith(dir)) return;
        cache = null;
        for (const env of Object.values(server.environments)) {
          for (const v of [VIRTUAL_CATALOG, VIRTUAL_QUIZ_BANK]) {
            const mod = env.moduleGraph.getModuleById(RESOLVED(v));
            if (mod) env.moduleGraph.invalidateModule(mod);
          }
        }
      });
    },
  };
}
