/**
 * The Academy's MCP server (Model Context Protocol, Streamable HTTP at POST /api/mcp).
 *
 * It exposes PUBLIC, READ-ONLY knowledge: the course catalogue, the Kids Zone games and the
 * safe-experiments library. No personal data and no actions, so it needs no login and any MCP
 * client (Claude, ChatGPT, IDEs, other agents) can use it.
 *
 * Zuva itself is a client of this same server (see callAcademyTool), so there is one
 * implementation of every knowledge tool, whether a learner's tutor or an outside agent asks.
 *
 * Supports protocol 2026-07-28 (stateless: per-request _meta, server/discover, resultType) and the
 * handshake-based 2025-03-26 … 2025-11-25 revisions (initialize / notifications/initialized / ping).
 */
import { allTracks, getTrack } from '../lib/catalog';
import { KID_GAMES, kidGame } from '@shared/kids-games';
import { EXPERIMENTS, getExperiment, searchExperiments } from './experiments';
import { CATEGORY_LABELS, type CatalogTrack } from '@shared/content';

export const MODERN = '2026-07-28';
export const SUPPORTED_VERSIONS = [MODERN, '2025-11-25', '2025-06-18', '2025-03-26'];
const SERVER_INFO = { name: 'global-ai-academy', title: 'Global AI Academy', version: '1.0.0' };
const INSTRUCTIONS = 'Read-only knowledge from Global AI Academy (skurulearning.com): search coding, AI and engineering lessons, get course outlines, list the Kids Zone learning games, and find safe hands-on science experiments for children with materials lists. All links are relative to https://skurulearning.com.';

type Json = Record<string, unknown>;
interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Json;
  run: (args: Json) => { text: string; data: unknown } | { error: string };
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown, d: number, lo: number, hi: number) => (Number.isInteger(v) ? Math.min(hi, Math.max(lo, v as number)) : d);
const words = (q: string) => q.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 1);

export function searchLessons(query: string, limit = 6) {
  const ws = words(query);
  const results: { score: number; track: string; trackTitle: string; lesson: string; title: string; path: string; level: string }[] = [];
  for (const t of allTracks() as CatalogTrack[]) {
    const trackHay = `${t.title} ${t.summary} ${t.tags.join(' ')} ${CATEGORY_LABELS[t.category] ?? ''}`.toLowerCase();
    const trackScore = ws.reduce((s, w) => s + (trackHay.includes(w) ? 1 : 0), 0);
    t.lessons.forEach((l) => {
      const title = l.title.toLowerCase();
      const score = trackScore + ws.reduce((s, w) => s + (title.includes(w) ? 3 : 0), 0);
      if (score > 0) results.push({ score, track: t.id, trackTitle: t.title, lesson: l.slug, title: l.title, path: `/learn/${t.id}/${l.slug}`, level: t.level });
    });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit).map(({ score: _s, ...r }) => r);
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'search_lessons',
    title: 'Search lessons',
    description: 'Search Global AI Academy lessons (Python, web, databases, AI, agents, cloud, hardware, kids coding…) by topic. Returns lesson titles and paths.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Topic or question, e.g. "for loops" or "pgvector"' }, limit: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['query'], additionalProperties: false },
    run: (a) => {
      const q = str(a.query);
      if (!q) return { error: 'query is required' };
      const r = searchLessons(q, int(a.limit, 6, 1, 10));
      return { text: r.length ? r.map((x) => `${x.title} (${x.trackTitle}, ${x.level}) → ${x.path}`).join('\n') : 'No lessons matched.', data: r };
    },
  },
  {
    name: 'get_track_outline',
    title: 'Course outline',
    description: 'Get a course (track) outline: title, level, summary and its lessons in order, with paths.',
    inputSchema: { type: 'object', properties: { track_id: { type: 'string', description: 'Track id such as "python", "rag" or "kids-coding"' } }, required: ['track_id'], additionalProperties: false },
    run: (a) => {
      const t = getTrack(str(a.track_id, 60));
      if (!t) return { error: `Unknown track. Known tracks: ${(allTracks() as CatalogTrack[]).map((x) => x.id).join(', ')}` };
      const lessons = t.lessons.map((l, i) => ({ n: i + 1, title: l.title, path: `/learn/${t.id}/${l.slug}`, minutes: l.minutes }));
      return { text: `${t.title} (${t.level}): ${t.summary}\n${lessons.map((l) => `${l.n}. ${l.title} → ${l.path}`).join('\n')}`, data: { id: t.id, title: t.title, level: t.level, summary: t.summary, lessons } };
    },
  },
  {
    name: 'list_kids_games',
    title: 'Kids Zone games',
    description: 'List the Kids Zone learning games (coding, physics, Linux, networking, hardware, engineering, robotics, AI) with what each teaches. Optionally filter by topic.',
    inputSchema: { type: 'object', properties: { topic: { type: 'string', description: 'Optional topic filter, e.g. "robots"' } }, additionalProperties: false },
    run: (a) => {
      const t = str(a.topic, 60).toLowerCase();
      const games = KID_GAMES.filter((g) => !t || `${g.title} ${g.skill} ${g.topics.join(' ')} ${g.text}`.toLowerCase().includes(t) || g.topics.some((x) => t.includes(x)));
      const list = games.map((g) => ({ id: g.id, title: g.title, skill: g.skill, levels: g.levels, place: g.place, about: g.text, path: `/kids/${g.id}` }));
      return { text: list.map((g) => `${g.title}: ${g.skill} (${g.levels} levels) → ${g.path}`).join('\n') || 'No games matched.', data: list };
    },
  },
  {
    name: 'find_experiments',
    title: 'Find safe experiments',
    description: 'Find safe, low-cost hands-on science and engineering experiments for children by topic. Returns ids, titles and safety level.',
    inputSchema: { type: 'object', properties: { topic: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 8 } }, required: ['topic'], additionalProperties: false },
    run: (a) => {
      const r = searchExperiments(str(a.topic), int(a.limit, 5, 1, 8)).map((e) => ({ id: e.id, title: e.title, goal: e.goal, safety: e.safety.level, minAge: e.minAge, game: e.game }));
      return { text: r.length ? r.map((e) => `${e.id}: ${e.title} — ${e.goal} (safety: ${e.safety}, age ${e.minAge}+)`).join('\n') : `No match. Available: ${EXPERIMENTS.map((e) => e.id).join(', ')}`, data: r };
    },
  },
  {
    name: 'get_experiment',
    title: 'Experiment details',
    description: 'Full details of one experiment: goal, safety rules, materials with where to find them and rough cost in USD, steps and the science behind it.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    run: (a) => {
      const e = getExperiment(str(a.id, 60));
      if (!e) return { error: 'Unknown experiment id. Use find_experiments first.' };
      return { text: JSON.stringify(e), data: e };
    },
  },
];

const toolByName = (n: string) => MCP_TOOLS.find((t) => t.name === n);

// ── JSON-RPC dispatch ───────────────────────────────────────────────────────

interface RpcRequest { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Json }
type RpcResponse = { jsonrpc: '2.0'; id: string | number | null; result?: unknown; error?: { code: number; message: string; data?: unknown } };

const ok = (id: RpcRequest['id'], result: unknown): RpcResponse => ({ jsonrpc: '2.0', id: id ?? null, result });
const fail = (id: RpcRequest['id'], code: number, message: string, data?: unknown): RpcResponse => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } });

/** Handles one JSON-RPC message for a given protocol version. Returns null for notifications. */
export function dispatch(msg: RpcRequest, version: string): RpcResponse | null {
  const modern = version === MODERN;
  const done = (r: Json) => (modern ? { resultType: 'complete', ...r, _meta: { 'io.modelcontextprotocol/serverInfo': SERVER_INFO } } : r);
  const isNotification = msg.id === undefined;
  switch (msg.method) {
    case 'initialize': {
      if (modern) return fail(msg.id, -32601, 'initialize is not used in protocol 2026-07-28; call server/discover');
      const asked = str((msg.params as Json | undefined)?.protocolVersion, 20);
      return ok(msg.id, { protocolVersion: SUPPORTED_VERSIONS.includes(asked) && asked !== MODERN ? asked : '2025-11-25', capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS });
    }
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;
    case 'ping':
      return modern ? fail(msg.id, -32601, 'ping was removed in 2026-07-28') : ok(msg.id, {});
    case 'server/discover':
      return ok(msg.id, done({ supportedVersions: SUPPORTED_VERSIONS, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS }));
    case 'tools/list':
      return ok(msg.id, done({ tools: MCP_TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema, annotations: { readOnlyHint: true, openWorldHint: false } })), ...(modern ? { ttlMs: 3_600_000, cacheScope: 'public' } : {}) }));
    case 'tools/call': {
      const p = (msg.params ?? {}) as Json;
      const tool = toolByName(str(p.name, 128));
      if (!tool) return fail(msg.id, -32602, `Unknown tool: ${str(p.name, 128)}`);
      const args = p.arguments && typeof p.arguments === 'object' ? (p.arguments as Json) : {};
      const r = tool.run(args);
      if ('error' in r) return ok(msg.id, done({ content: [{ type: 'text', text: r.error }], isError: true }));
      return ok(msg.id, done({ content: [{ type: 'text', text: r.text }], structuredContent: r.data, isError: false }));
    }
    default:
      return isNotification ? null : fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

const decodeHeader = (v: string | null) => {
  if (!v) return v;
  const m = /^=\?base64\?(.*)\?=$/.exec(v);
  return m ? new TextDecoder().decode(Uint8Array.from(atob(m[1]!), (ch) => ch.charCodeAt(0))) : v;
};

/** HTTP entry point (Streamable HTTP transport, JSON responses). */
export async function handleMcpHttp(req: Request, selfOrigin: string): Promise<Response> {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  // DNS-rebinding protection: browsers send Origin; only our own site may call from a browser.
  const origin = req.headers.get('origin');
  if (origin && origin !== selfOrigin) return json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Forbidden origin' } }, 403);
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });

  let msg: RpcRequest;
  try {
    msg = (await req.json()) as RpcRequest;
  } catch {
    return json(fail(null, -32700, 'Parse error'), 400);
  }
  if (Array.isArray(msg) || !msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return json(fail(null, -32600, 'Invalid request: send one JSON-RPC message per POST'), 400);

  const header = req.headers.get('mcp-protocol-version');
  const metaVersion = str((msg.params?._meta as Json | undefined)?.['io.modelcontextprotocol/protocolVersion'], 20);
  const version = header ?? (metaVersion || '2025-03-26');
  if (!SUPPORTED_VERSIONS.includes(version)) return json(fail(msg.id, -32022, 'Unsupported protocol version', { supported: SUPPORTED_VERSIONS, requested: version }), 400);

  if (version === MODERN) {
    // Header ⇄ body validation required by 2026-07-28 (HeaderMismatch = -32020).
    if (metaVersion !== MODERN) return json(fail(msg.id, -32020, 'Header mismatch: _meta protocolVersion must equal MCP-Protocol-Version'), 400);
    const method = req.headers.get('mcp-method');
    if (method !== msg.method) return json(fail(msg.id, -32020, 'Header mismatch: Mcp-Method'), 400);
    if (msg.method === 'tools/call' && decodeHeader(req.headers.get('mcp-name')) !== str(msg.params?.name, 128)) return json(fail(msg.id, -32020, 'Header mismatch: Mcp-Name'), 400);
  }

  const res = dispatch(msg, version);
  if (!res) return new Response(null, { status: 202 });
  const status = res.error?.code === -32601 ? 404 : res.error && res.error.code !== -32602 ? 400 : 200;
  return json(res, status);
}

// ── In-process client used by Zuva ──────────────────────────────────────────

let rpcId = 0;
/** Calls one of the Academy MCP tools through the same JSON-RPC path outside clients use. */
export function callAcademyTool(name: string, args: Json): { ok: boolean; text: string; data?: unknown } {
  const res = dispatch({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args, _meta: { 'io.modelcontextprotocol/protocolVersion': MODERN, 'io.modelcontextprotocol/clientInfo': { name: 'zuva', version: '1.0.0' } } } }, MODERN);
  if (!res || res.error) return { ok: false, text: res?.error?.message ?? 'No response' };
  const r = res.result as { content: { text: string }[]; structuredContent?: unknown; isError?: boolean };
  return { ok: !r.isError, text: r.content.map((c) => c.text).join('\n'), data: r.structuredContent };
}

export { kidGame };
