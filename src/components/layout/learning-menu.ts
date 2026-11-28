import type { CatalogTrack, TrackCategory } from '@shared/content';
import type { SymbolName } from '../icon-codepoints';

/**
 * The learning menu under the header: a few dropdowns instead of one button per topic.
 *
 * Every track in the catalogue appears in exactly one dropdown (Start here and Kids are plain
 * links). AI and ML material is gathered under one "AI/ML Learning" menu, split into sections
 * that follow a learner's path from maths to production. Sections name their tracks explicitly
 * so the order reads as a path; any AI, data or agentic track not named lands in "More AI", so a
 * newly added track can never silently disappear from the menu.
 */
export type MenuId = 'aiml' | 'cambridge' | 'coding' | 'apps';

interface SectionSpec {
  label: string;
  blurb: string;
  /** Tracks listed in this order. Ids that do not exist yet are skipped. */
  trackIds?: string[];
  /** Every track in these categories that no other section claimed, easiest first. */
  categories?: TrackCategory[];
}

interface MenuSpec {
  id: MenuId;
  label: string;
  /** Material Symbol shown before the label (must already be in the icon subset). */
  symbol: SymbolName;
  sections: SectionSpec[];
}

const AI_CATEGORIES: TrackCategory[] = ['maths-data', 'ai', 'agentic'];

export const MENU_SPECS: MenuSpec[] = [
  {
    id: 'aiml',
    label: 'AI/ML Learning',
    symbol: 'neurology',
    sections: [
      {
        label: 'Maths & data',
        blurb: 'The maths, statistics and data skills underneath every model.',
        trackIds: ['ml-math', 'statistics', 'data-science', 'web-scraping'],
      },
      {
        label: 'Machine learning & deep learning',
        blurb: 'How models learn, from a straight line to a transformer.',
        trackIds: ['ai-fundamentals', 'machine-learning', 'deep-learning', 'transformers', 'hugging-face'],
      },
      {
        label: 'Building with LLMs',
        blurb: 'Use language models in real products, reliably and safely.',
        trackIds: ['prompt-engineering', 'llm-apis', 'openai-platform', 'pydantic', 'langchain', 'rag', 'graphrag', 'ai-evaluations', 'guardrails'],
      },
      {
        label: 'Agentic AI',
        blurb: 'Systems where models plan, call tools and act.',
        trackIds: ['ai-agents', 'agentic-engineering', 'mcp', 'agentic-security', 'ai-workflows'],
      },
      {
        label: 'AI in production',
        blurb: 'Serve, scale, monitor and pay for models.',
        trackIds: ['mlops', 'inference-engineering', 'sagemaker'],
      },
      {
        label: 'More AI',
        blurb: 'New tracks in AI, data and agents.',
        categories: AI_CATEGORIES,
      },
    ],
  },
  {
    id: 'cambridge',
    label: 'Cambridge',
    symbol: 'school',
    sections: [],
  },
  {
    id: 'coding',
    label: 'Coding',
    symbol: 'code',
    sections: [
      { label: 'Programming languages', blurb: 'Languages you write programs in.', categories: ['languages'] },
      { label: 'Web development', blurb: 'Websites, web apps and the servers behind them.', categories: ['web'] },
      { label: 'Frameworks', blurb: 'Libraries that do the heavy lifting.', categories: ['frameworks'] },
      { label: 'Databases', blurb: 'Store and query data.', categories: ['databases'] },
      { label: 'Developer tools', blurb: 'Editors, the terminal and Git.', categories: ['tools'] },
    ],
  },
  {
    id: 'apps',
    label: 'Apps, Cloud & Hardware',
    symbol: 'cloud',
    sections: [
      { label: 'Mobile apps', blurb: 'Apps for Android and iPhone.', categories: ['mobile'] },
      { label: 'Cloud, DevOps & security', blurb: 'Ship, connect and protect software.', categories: ['cloud'] },
      { label: 'Hardware & robotics', blurb: 'Electronics, sensors and robots you program.', categories: ['hardware'] },
    ],
  },
];

export interface MenuSection {
  label: string;
  blurb: string;
  tracks: CatalogTrack[];
}

export interface Menu {
  id: MenuId;
  label: string;
  symbol: SymbolName;
  sections: MenuSection[];
}

const LEVEL_RANK: Record<string, number> = { kids: 0, beginner: 1, intermediate: 2, advanced: 3 };
const easiestFirst = (a: CatalogTrack, b: CatalogTrack) => LEVEL_RANK[a.level]! - LEVEL_RANK[b.level]! || a.order - b.order;

/** Resolves the specs against the catalogue. Empty sections are dropped. */
export function buildMenus(catalog: CatalogTrack[]): Menu[] {
  const byId = new Map(catalog.map((t) => [t.id, t]));
  const claimed = new Set<string>();
  // Named tracks are claimed first, across all menus, so a category section never repeats them.
  for (const m of MENU_SPECS) for (const s of m.sections) for (const id of s.trackIds ?? []) if (byId.has(id)) claimed.add(id);

  return MENU_SPECS.map((m) => ({
    id: m.id,
    label: m.label,
    symbol: m.symbol,
    sections: m.sections
      .map((s): MenuSection => {
        const named = (s.trackIds ?? []).map((id) => byId.get(id)).filter((t): t is CatalogTrack => !!t);
        const byCategory = s.categories
          ? catalog.filter((t) => s.categories!.includes(t.category) && !claimed.has(t.id)).sort(easiestFirst)
          : [];
        byCategory.forEach((t) => claimed.add(t.id));
        return { label: s.label, blurb: s.blurb, tracks: [...named, ...byCategory] };
      })
      .filter((s) => s.tracks.length),
  }));
}

/** Which dropdown a track lives in, for highlighting the menu of the page being read. */
export function menuOfTrack(menus: Menu[], trackId: string): MenuId | undefined {
  return menus.find((m) => m.sections.some((s) => s.tracks.some((t) => t.id === trackId)))?.id;
}
