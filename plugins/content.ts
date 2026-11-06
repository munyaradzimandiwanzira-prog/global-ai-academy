import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { activityIds, parseTrack, proLessons, publicTrack, toCatalogEntry } from './content-parser';
import type { Block, QuizQuestion, Track } from '../shared/content';

const VIRTUAL_CATALOG = 'virtual:catalog';
const VIRTUAL_QUIZ_BANK = 'virtual:quiz-bank';
const VIRTUAL_PRO = 'virtual:pro-lessons';
const VIRTUAL_ACTIVITY = 'virtual:activity-ids';
const VIRTUAL_OUTLINES = 'virtual:lesson-outlines';
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
      if (id === VIRTUAL_CATALOG || id === VIRTUAL_QUIZ_BANK || id === VIRTUAL_PRO || id === VIRTUAL_ACTIVITY || id === VIRTUAL_OUTLINES) return RESOLVED(id);
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
      if (id === RESOLVED(VIRTUAL_PRO)) {
        // Server-only: imported by the Worker, never by browser code.
        return `export default ${JSON.stringify(proLessons(loadAll()))};`;
      }
      if (id === RESOLVED(VIRTUAL_ACTIVITY)) {
        // Server-only: the Worker validates activity ids against this before awarding XP.
        return `export default ${JSON.stringify(activityIds(loadAll()))};`;
      }
      if (id === RESOLVED(VIRTUAL_OUTLINES)) {
        // Server-only: a short outline of every lesson so Zuva can ground lesson plans in the real content.
        const out: Record<string, string> = {};
        for (const t of loadAll()) for (const l of t.lessons) out[`${t.meta.id}/${l.slug}`] = lessonOutline(l.blocks);
        return `export default ${JSON.stringify(out)};`;
      }
      if (id.endsWith('.md?track')) {
        const file = id.slice(0, -'?track'.length);
        this.addWatchFile(file);
        const track = parseTrack(readFileSync(file, 'utf8'), file.split('/').pop());
        // Exam-only questions and paywalled lessons stay on the server — never ship them to the browser.
        return `export default ${JSON.stringify(publicTrack(track))};`;
      }
      return null;
    },
    configureServer(server) {
      server.watcher.add(dir);
      server.watcher.on('change', (file) => {
        if (!file.startsWith(dir)) return;
        cache = null;
        for (const env of Object.values(server.environments)) {
          for (const v of [VIRTUAL_CATALOG, VIRTUAL_QUIZ_BANK, VIRTUAL_PRO, VIRTUAL_ACTIVITY, VIRTUAL_OUTLINES]) {
            const mod = env.moduleGraph.getModuleById(RESOLVED(v));
            if (mod) env.moduleGraph.invalidateModule(mod);
          }
        }
      });
    },
  };
}

/**
 * A lesson in about 700 characters: its headings, the first sentence under each, and what the
 * learner practises. Enough for planning a class, far smaller than the lesson itself.
 */
export function lessonOutline(blocks: Block[], max = 700): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === 'md') {
      for (const para of b.md.split(/\n{2,}/)) {
        const line = para.trim();
        if (!line || line.startsWith('```') || line.startsWith('|') || line.startsWith('<')) continue;
        if (/^#{1,4}\s/.test(line)) parts.push(`# ${line.replace(/^#+\s*/, '')}`);
        else parts.push(line.replace(/[*_`>]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').split(/(?<=[.!?])\s/)[0]!.slice(0, 160));
      }
    } else if (b.type === 'run') parts.push(`Runs ${b.lang}: ${b.code.split('\n').slice(0, 2).join(' / ').slice(0, 100)}`);
    else if (b.type === 'exercise') parts.push(`Exercise: ${b.prompt.slice(0, 120)}`);
    else if (b.type === 'challenge') parts.push(`Challenge: ${b.challenge.title}`);
    else if (b.type === 'quiz' && !b.examOnly) parts.push(`Quiz: ${b.questions.length} questions`);
  }
  let out = '';
  for (const p of parts) {
    if (out.length + p.length + 1 > max) break;
    out += (out ? '\n' : '') + p;
  }
  return out;
}
