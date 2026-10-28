import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

/** Serializable graph snapshot (safe to pass through RunResult and React state). */
export interface ViewNode { id: number; labels: string[]; props: Record<string, unknown> }
export interface ViewRel { id: number; type: string; start: number; end: number; props: Record<string, unknown> }
export interface ViewGraph { nodes: ViewNode[]; rels: ViewRel[] }

const PALETTE = ['#23807F', '#C08A1E', '#5B3FA0', '#C2554D', '#3577B8', '#3E7D3A', '#B4472A', '#6B6A64'];
const CAPTION_KEYS = ['name', 'title', 'code', 'number', 'sku', 'id', 'text', 'key', 'imei'];

export function caption(n: ViewNode): string {
  for (const k of CAPTION_KEYS) {
    const v = n.props[k];
    if (v != null) {
      const s = String(v);
      return s.length > 16 ? `${s.slice(0, 15)}…` : s;
    }
  }
  return n.labels[0] ?? `#${n.id}`;
}

/** Split a caption over two lines at the space nearest the middle (or hard-split long single words). */
function wrap(text: string): [string, string?] {
  if (text.length <= 9) return [text];
  const spaces = [...text.matchAll(/ /g)].map((m) => m.index!);
  if (!spaces.length) return [text.slice(0, 8), text.slice(8, 16)];
  const mid = text.length / 2;
  const at = spaces.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best));
  return [text.slice(0, at), text.slice(at + 1)];
}

/**
 * Deterministic force-directed layout (repulsion + springs + gravity), computed once per graph.
 * O(n²) per iteration, fine for the few hundred nodes a practice query returns.
 */
function layout(g: ViewGraph, width: number, height: number): Map<number, { x: number; y: number }> {
  const n = g.nodes.length;
  const pos = new Map<number, { x: number; y: number; vx: number; vy: number }>();
  g.nodes.forEach((node, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, n);
    const r = Math.min(width, height) * 0.32;
    pos.set(node.id, { x: width / 2 + r * Math.cos(a), y: height / 2 + r * Math.sin(a), vx: 0, vy: 0 });
  });
  const ideal = Math.max(70, Math.min(140, Math.sqrt((width * height) / Math.max(1, n)) * 0.75));
  const nodes = [...pos.values()];
  for (let it = 0; it < 320; it++) {
    const cool = 1 - it / 320;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) { dx = 0.1 * (i - j); dy = 0.1; d2 = 0.02; }
        const f = (ideal * ideal) / d2;
        a.vx += dx * f * 0.02; a.vy += dy * f * 0.02;
        b.vx -= dx * f * 0.02; b.vy -= dy * f * 0.02;
      }
    }
    for (const r of g.rels) {
      const a = pos.get(r.start);
      const b = pos.get(r.end);
      if (!a || !b || a === b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - ideal) * 0.03;
      a.vx += (dx / d) * f; a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
    }
    for (const p of nodes) {
      p.vx += (width / 2 - p.x) * 0.004;
      p.vy += (height / 2 - p.y) * 0.004;
      const sp = Math.hypot(p.vx, p.vy);
      const max = 12 * cool + 0.5;
      if (sp > max) { p.vx = (p.vx / sp) * max; p.vy = (p.vy / sp) * max; }
      p.x = Math.min(width - 30, Math.max(30, p.x + p.vx));
      p.y = Math.min(height - 30, Math.max(30, p.y + p.vy));
      p.vx *= 0.6; p.vy *= 0.6;
    }
  }
  return new Map([...pos].map(([id, p]) => [id, { x: p.x, y: p.y }]));
}

export function GraphView({ graph, className, height = 380 }: { graph: ViewGraph; className?: string; height?: number }) {
  const width = 720;
  const [selected, setSelected] = useState<{ kind: 'node'; v: ViewNode } | { kind: 'rel'; v: ViewRel } | null>(null);
  const colours = useMemo(() => {
    const labels = [...new Set(graph.nodes.map((n) => n.labels[0] ?? ''))].sort();
    return new Map(labels.map((l, i) => [l, PALETTE[i % PALETTE.length]!]));
  }, [graph]);
  const pos = useMemo(() => layout(graph, width, height), [graph, height]);
  const R = 22;

  if (!graph.nodes.length) return null;
  const truncated = graph.nodes.length >= 300;

  return (
    <div className={cn('overflow-hidden rounded-lg border border-night-700 bg-[#0d1424]', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-night-700 px-3 py-1.5 text-[11px] text-sand/70">
        {[...colours].map(([label, c]) => (
          <span key={label} className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />{label || 'no label'}</span>
        ))}
        <span className="ml-auto text-sand/40">{graph.nodes.length} nodes · {graph.rels.length} relationships{truncated ? ' (first 300)' : ''}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`Graph of ${graph.nodes.length} nodes and ${graph.rels.length} relationships`}>
        <defs>
          <marker id="gv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#8a93a6" />
          </marker>
        </defs>
        {graph.rels.map((r) => {
          const a = pos.get(r.start);
          const b = pos.get(r.end);
          if (!a || !b) return null;
          if (r.start === r.end) {
            return (
              <g key={r.id} className="cursor-pointer" onClick={() => setSelected({ kind: 'rel', v: r })}>
                <path d={`M${a.x + 10},${a.y - R + 2} C${a.x + 40},${a.y - 70} ${a.x - 40},${a.y - 70} ${a.x - 10},${a.y - R + 2}`} fill="none" stroke="#5d667a" strokeWidth={1.4} markerEnd="url(#gv-arrow)" />
                <text x={a.x} y={a.y - 56} textAnchor="middle" fontSize="9" fill="#a9b0bd">{r.type}</text>
              </g>
            );
          }
          // Parallel relationships between the same pair are bent apart so each stays visible.
          const siblings = graph.rels.filter((x) => (x.start === r.start && x.end === r.end) || (x.start === r.end && x.end === r.start));
          const idx = siblings.indexOf(r);
          const bend = siblings.length > 1 ? (idx - (siblings.length - 1) / 2) * 34 * (r.start < r.end ? 1 : -1) : 0;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const nx = -dy / d;
          const ny = dx / d;
          const cx = (a.x + b.x) / 2 + nx * bend;
          const cy = (a.y + b.y) / 2 + ny * bend;
          // Trim the curve at both node circles.
          const s = { x: a.x + ((cx - a.x) / Math.hypot(cx - a.x, cy - a.y)) * R, y: a.y + ((cy - a.y) / Math.hypot(cx - a.x, cy - a.y)) * R };
          const e = { x: b.x + ((cx - b.x) / Math.hypot(cx - b.x, cy - b.y)) * (R + 2), y: b.y + ((cy - b.y) / Math.hypot(cx - b.x, cy - b.y)) * (R + 2) };
          const lx = 0.25 * s.x + 0.5 * cx + 0.25 * e.x;
          const ly = 0.25 * s.y + 0.5 * cy + 0.25 * e.y;
          const active = selected?.kind === 'rel' && selected.v.id === r.id;
          return (
            <g key={r.id} className="cursor-pointer" onClick={() => setSelected({ kind: 'rel', v: r })}>
              <path d={`M${s.x},${s.y} Q${cx},${cy} ${e.x},${e.y}`} fill="none" stroke={active ? '#D4A64A' : '#5d667a'} strokeWidth={active ? 2.2 : 1.4} markerEnd="url(#gv-arrow)" />
              <text x={lx} y={ly - 3} textAnchor="middle" fontSize="9" fill="#a9b0bd" style={{ fontFamily: 'JetBrains Mono Variable, monospace' }}>{r.type}</text>
            </g>
          );
        })}
        {graph.nodes.map((n) => {
          const p = pos.get(n.id)!;
          const active = selected?.kind === 'node' && selected.v.id === n.id;
          return (
            <g key={n.id} className="cursor-pointer" onClick={() => setSelected({ kind: 'node', v: n })}>
              <circle cx={p.x} cy={p.y} r={R} fill={colours.get(n.labels[0] ?? '') ?? '#6B6A64'} stroke={active ? '#D4A64A' : '#0d1424'} strokeWidth={active ? 3 : 2} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="8.5" fill="#fff" style={{ fontFamily: 'Inter Variable, sans-serif', fontWeight: 600, pointerEvents: 'none' }}>
                {(() => {
                  const [a, b] = wrap(caption(n));
                  return b ? <><tspan x={p.x} dy="-0.5em">{a}</tspan><tspan x={p.x} dy="1.1em">{b}</tspan></> : a;
                })()}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="min-h-[34px] border-t border-night-700 px-3 py-1.5 font-mono text-[11px] text-sand/80">
        {selected ? (
          <span>
            <span className="text-gold">{selected.kind === 'node' ? selected.v.labels.map((l) => `:${l}`).join('') : `[:${selected.v.type}]`}</span>{' '}
            {Object.entries(selected.v.props).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(' · ') || 'no properties'}
          </span>
        ) : (
          <span className="text-sand/40">Click a node or relationship to see its properties.</span>
        )}
      </div>
    </div>
  );
}

export default GraphView;
