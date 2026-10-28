import { CypherError, describeStats, fmtValue, resultGraph, runCypher, type GNode, type GRel } from '@/features/graph/engine';
import { buildGraph, datasetFromCode, getDataset } from '@/features/graph/datasets';
import type { ViewGraph } from '@/features/graph/types';
import type { RunOptions, RunResult, OutputLine } from './types';

const MAX_VIEW_NODES = 300;

export const toView = (nodes: GNode[], rels: GRel[]): ViewGraph => {
  const kept = nodes.slice(0, MAX_VIEW_NODES);
  const ids = new Set(kept.map((n) => n.id));
  return {
    nodes: kept.map((n) => ({ id: n.id, labels: [...n.labels], props: { ...n.props } })),
    rels: rels.filter((r) => ids.has(r.start) && ids.has(r.end)).map((r) => ({ id: r.id, type: r.type, start: r.start, end: r.end, props: { ...r.props } })),
  };
};

/**
 * Runs Cypher against a fresh copy of a practice graph. Choose the graph with a first-line
 * comment such as `// dataset: fraud` (default: skuru; `// dataset: empty` starts blank).
 */
export async function runCypherCode(code: string, _opts: RunOptions = {}): Promise<RunResult> {
  const started = performance.now();
  const datasetId = datasetFromCode(code);
  const lines: OutputLine[] = [];
  try {
    const graph = buildGraph(datasetId);
    const res = runCypher(graph, code);
    const ds = getDataset(datasetId);
    lines.push({ kind: 'system', text: `Graph: ${ds?.title ?? 'empty database'}` });
    const stats = describeStats(res.stats);
    if (stats) lines.push({ kind: 'info', text: stats });
    if (!res.returned && !stats) lines.push({ kind: 'info', text: 'Query ran. No changes and no RETURN, so there is nothing to show.' });
    const view = res.returned ? resultGraph(graph, res.rows) : { nodes: [], rels: [] };
    // stdout carries a plain-text copy of the table so output-matching challenges can check it.
    if (res.returned) for (const row of res.rows) lines.push({ kind: 'stdout', text: row.map((v) => fmtValue(v)).join(' | ') });
    return {
      ok: true,
      lines,
      table: res.returned ? [{ columns: res.columns, rows: res.rows.map((r) => r.map((v) => (v === null ? null : fmtValue(v)))) }] : undefined,
      graph: view.nodes.length ? toView(view.nodes, view.rels) : undefined,
      hideStdout: res.returned,
      durationMs: Math.round(performance.now() - started),
    };
  } catch (e) {
    const message = e instanceof CypherError ? e.message : `Unexpected error: ${(e as Error).message}`;
    return { ok: false, lines, error: message, durationMs: Math.round(performance.now() - started) };
  }
}
