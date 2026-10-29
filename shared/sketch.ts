/**
 * Pencil-sketch diagrams
 * ----------------------
 * Authored in lesson Markdown as a ```sketch block (YAML). Authors place nodes on a grid
 * (col/row, fractions allowed) instead of pixels, so diagrams stay tidy and easy to edit:
 *
 *   ```sketch
 *   title: The agent loop
 *   caption: The harness runs the loop; the model only decides the next step.
 *   nodes:
 *     - id: goal
 *       label: User goal
 *       col: 0
 *       row: 1
 *       shape: pill
 *     - id: llm
 *       label: "LLM\ndecides"
 *       col: 1
 *       row: 1
 *       tone: gold
 *   edges:
 *     - from: goal
 *       to: llm
 *       label: prompt
 *   groups:
 *     - label: Harness
 *       nodes: [llm]
 *   ```
 *
 * This module is pure (no DOM) so the build-time parser validates every diagram and the
 * renderer and tests share one layout.
 */

export type SketchShape = 'box' | 'round' | 'pill' | 'db' | 'circle' | 'diamond' | 'doc' | 'person' | 'note' | 'dot';
export type SketchTone = 'plain' | 'teal' | 'gold' | 'rose' | 'sky' | 'grape' | 'ink';

export interface SketchNode {
  id: string;
  label: string;
  col: number;
  row: number;
  shape?: SketchShape;
  tone?: SketchTone;
  /** Small second line in a lighter hand, e.g. a type or example. */
  sub?: string;
  /** Size in grid units (default 1×1 cell minus gutter). */
  w?: number;
  h?: number;
}

export interface SketchEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** Curve the line: positive bends left of travel, negative right (in px). */
  bend?: number;
  /** Arrowheads: 'end' (default), 'both' or 'none'. */
  arrow?: 'end' | 'both' | 'none';
}

export interface SketchGroup {
  label: string;
  nodes: string[];
  tone?: SketchTone;
}

export interface SketchSpec {
  title?: string;
  caption?: string;
  /** Cell size in px (defaults 200×120). */
  cellW?: number;
  cellH?: number;
  nodes: SketchNode[];
  edges: SketchEdge[];
  groups: SketchGroup[];
}

export interface Rect { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }

export interface LaidOutNode extends SketchNode { box: Rect; cx: number; cy: number }
export interface LaidOutEdge extends SketchEdge {
  /** Polyline/curve control points: [start, control?, end]. */
  start: Point;
  end: Point;
  control?: Point;
  labelAt?: Point;
  /** Self-loop drawn as a cubic above the node. */
  loop?: { c1: Point; c2: Point };
}
export interface LaidOutGroup extends SketchGroup { box: Rect }
export interface SketchLayout {
  width: number;
  height: number;
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  groups: LaidOutGroup[];
}

const SHAPES: SketchShape[] = ['box', 'round', 'pill', 'db', 'circle', 'diamond', 'doc', 'person', 'note', 'dot'];
const TONES: SketchTone[] = ['plain', 'teal', 'gold', 'rose', 'sky', 'grape', 'ink'];
// ── Text metrics ──
// The renderer draws in Caveat; measured widths at the sizes it uses, plus a margin.
const LABEL_CH = 7.8; // 21px weight 600 (measured ≈7.3px per character)
const SUB_CH = 5.9; // 16px (measured ≈5.5)
const EDGE_CH = 6.6; // 17px weight 600 (measured ≈6.0); also the label backdrop width in Sketch.tsx
const PAD = 28;
const GROUP_PAD = 18;
const GROUP_LABEL = 22;

const num = (v: unknown, fallback?: number): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Validate raw YAML into a SketchSpec. Throws with a readable message on authoring mistakes. */
export function parseSketch(raw: unknown): SketchSpec {
  if (!raw || typeof raw !== 'object') throw new Error('sketch must be a YAML mapping');
  const y = raw as Record<string, unknown>;
  if (!Array.isArray(y.nodes) || !y.nodes.length) throw new Error('sketch needs at least one node');
  const ids = new Set<string>();
  const nodes: SketchNode[] = (y.nodes as Record<string, unknown>[]).map((n, i) => {
    const id = String(n.id ?? '');
    if (!id) throw new Error(`sketch node #${i + 1} has no id`);
    if (ids.has(id)) throw new Error(`sketch node id "${id}" is used twice`);
    ids.add(id);
    const col = num(n.col);
    const row = num(n.row);
    if (col == null || row == null) throw new Error(`sketch node "${id}" needs numeric col and row`);
    const shape = (n.shape as SketchShape) ?? 'box';
    if (!SHAPES.includes(shape)) throw new Error(`sketch node "${id}": unknown shape "${shape}" (use ${SHAPES.join(', ')})`);
    const tone = (n.tone as SketchTone) ?? 'plain';
    if (!TONES.includes(tone)) throw new Error(`sketch node "${id}": unknown tone "${tone}" (use ${TONES.join(', ')})`);
    return {
      id,
      label: n.label != null ? String(n.label) : shape === 'dot' ? '' : id,
      col,
      row,
      shape,
      tone,
      sub: n.sub != null ? String(n.sub) : undefined,
      w: num(n.w),
      h: num(n.h),
    };
  });
  const edges: SketchEdge[] = ((y.edges as Record<string, unknown>[] | undefined) ?? []).map((e, i) => {
    const from = String(e.from ?? '');
    const to = String(e.to ?? '');
    if (!ids.has(from)) throw new Error(`sketch edge #${i + 1}: unknown "from" node "${from}"`);
    if (!ids.has(to)) throw new Error(`sketch edge #${i + 1}: unknown "to" node "${to}"`);
    const arrow = (e.arrow as SketchEdge['arrow']) ?? 'end';
    if (!['end', 'both', 'none'].includes(arrow)) throw new Error(`sketch edge #${i + 1}: arrow must be end, both or none`);
    return { from, to, label: e.label != null ? String(e.label) : undefined, dashed: e.dashed === true, bend: num(e.bend), arrow };
  });
  const groups: SketchGroup[] = ((y.groups as Record<string, unknown>[] | undefined) ?? []).map((g, i) => {
    const members = Array.isArray(g.nodes) ? (g.nodes as unknown[]).map(String) : [];
    if (!members.length) throw new Error(`sketch group #${i + 1} lists no nodes`);
    for (const m of members) if (!ids.has(m)) throw new Error(`sketch group "${g.label}": unknown node "${m}"`);
    const tone = (g.tone as SketchTone) ?? 'plain';
    if (!TONES.includes(tone)) throw new Error(`sketch group "${g.label}": unknown tone "${tone}"`);
    return { label: String(g.label ?? ''), nodes: members, tone };
  });
  return {
    title: y.title != null ? String(y.title) : undefined,
    caption: y.caption != null ? String(y.caption) : undefined,
    cellW: num(y.cellW),
    cellH: num(y.cellH),
    nodes,
    edges,
    groups,
  };
}

/** Where the segment from the rectangle's centre towards `toward` leaves the rectangle (or ellipse). */
export function borderPoint(box: Rect, toward: Point, shape: SketchShape = 'box'): Point {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  if (shape === 'circle' || shape === 'dot') {
    const a = box.w / 2;
    const b = box.h / 2;
    const t = 1 / Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));
    return { x: cx + dx * t, y: cy + dy * t };
  }
  if (shape === 'diamond') {
    const t = 1 / (Math.abs(dx) / (box.w / 2) + Math.abs(dy) / (box.h / 2));
    return { x: cx + dx * t, y: cy + dy * t };
  }
  const sx = Math.abs(dx) > 0 ? box.w / 2 / Math.abs(dx) : Infinity;
  const sy = Math.abs(dy) > 0 ? box.h / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(sx, sy);
  return { x: cx + dx * t, y: cy + dy * t };
}

export function layoutSketch(spec: SketchSpec): SketchLayout {
  const cellW = spec.cellW ?? 200;
  const cellH = spec.cellH ?? 120;
  // Groups need room above their members for the label, so shift everything down when groups exist.
  const top = PAD + (spec.groups.length ? GROUP_PAD + GROUP_LABEL : 0);
  const left = PAD + (spec.groups.length ? GROUP_PAD : 0);

  const nodes: LaidOutNode[] = spec.nodes.map((n) => {
    // A 'dot' is a small anchor, e.g. for a note that points at the middle of a relationship.
    const defaultW = n.shape === 'dot' ? 9 : n.shape === 'circle' ? 96 : n.shape === 'person' ? 60 : n.shape === 'diamond' ? 140 : cellW - 44;
    const defaultH = n.shape === 'dot' ? 9 : n.shape === 'circle' ? 96 : n.shape === 'person' ? 78 : n.shape === 'diamond' ? 84 : n.shape === 'db' ? 78 : 64;
    // Shapes grow to fit their text unless the author fixed a size; the lint then catches any crowding.
    const fit = fitText(n);
    // An author's w/h is a minimum: text always fits.
    const w = Math.max(n.w != null ? n.w * cellW - 44 : defaultW, fit.w);
    const h = Math.max(n.h != null ? n.h * cellH - 40 : defaultH, n.shape === 'circle' && n.h == null ? fit.w : fit.h);
    const cx = left + n.col * cellW + cellW / 2;
    const cy = top + n.row * cellH + cellH / 2;
    return { ...n, box: { x: cx - w / 2, y: cy - h / 2, w, h }, cx, cy };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const edges: LaidOutEdge[] = spec.edges.map((e) => {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    if (a === b) {
      const { x, y, w } = a.box;
      const start = { x: x + w * 0.72, y };
      const end = { x: x + w * 0.28, y };
      return { ...e, start, end, loop: { c1: { x: start.x + 30, y: y - 62 }, c2: { x: end.x - 30, y: y - 62 } }, labelAt: { x: a.cx, y: y - 52 } };
    }
    const bend = e.bend ?? 0;
    const mid = { x: (a.cx + b.cx) / 2, y: (a.cy + b.cy) / 2 };
    const len = Math.hypot(b.cx - a.cx, b.cy - a.cy) || 1;
    // Perpendicular (left of travel) offset for curved edges.
    const nx = -(b.cy - a.cy) / len;
    const ny = (b.cx - a.cx) / len;
    const control = bend ? { x: mid.x + nx * bend * 2, y: mid.y + ny * bend * 2 } : undefined;
    const aim = (from: LaidOutNode, other: Point) => borderPoint(padBox(from), other, from.shape);
    const start = aim(a, control ?? { x: b.cx, y: b.cy });
    const end = aim(b, control ?? { x: a.cx, y: a.cy });
    // A quadratic Bézier passes through the midpoint of its control polygon at t = 0.5.
    const labelAt = control
      ? { x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x, y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y }
      : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    return { ...e, start, end, control, labelAt };
  });

  placeEdgeLabels(nodes, edges);

  const groups: LaidOutGroup[] = spec.groups.map((g) => {
    const members = g.nodes.map((id) => byId.get(id)!);
    const x0 = Math.min(...members.map((m) => m.box.x)) - GROUP_PAD;
    const y0 = Math.min(...members.map((m) => m.box.y)) - GROUP_PAD - GROUP_LABEL;
    const x1 = Math.max(...members.map((m) => m.box.x + m.box.w)) + GROUP_PAD;
    const y1 = Math.max(...members.map((m) => m.box.y + m.box.h + (m.shape === 'person' ? 26 : 0))) + GROUP_PAD;
    return { ...g, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
  });

  const maxX = Math.max(...nodes.map((n) => n.box.x + n.box.w), ...groups.map((g) => g.box.x + g.box.w));
  const maxY = Math.max(...nodes.map((n) => n.box.y + n.box.h + (n.shape === 'person' ? 26 : 0)), ...groups.map((g) => g.box.y + g.box.h));
  // Self-loops and negative rows/cols can reach past the top-left margin; shift everything if so.
  const minY = Math.min(top, ...nodes.map((n) => n.box.y), ...groups.map((g) => g.box.y), ...edges.filter((e) => e.loop).map((e) => e.loop!.c1.y - 10));
  const minX = Math.min(PAD, ...nodes.map((n) => n.box.x), ...groups.map((g) => g.box.x));
  const shift = minY < PAD ? PAD - minY : 0;
  const shiftX = minX < PAD ? PAD - minX : 0;
  if (shift || shiftX) {
    const s = (p: Point) => ({ x: p.x + shiftX, y: p.y + shift });
    for (const n of nodes) { n.box.y += shift; n.cy += shift; n.box.x += shiftX; n.cx += shiftX; }
    for (const g of groups) { g.box.y += shift; g.box.x += shiftX; }
    for (const e of edges) {
      e.start = s(e.start); e.end = s(e.end);
      if (e.control) e.control = s(e.control);
      if (e.labelAt) e.labelAt = s(e.labelAt);
      if (e.loop) e.loop = { c1: s(e.loop.c1), c2: s(e.loop.c2) };
    }
  }
  return { width: Math.ceil(maxX + PAD + shiftX), height: Math.ceil(maxY + PAD + shift), nodes, edges, groups };
}

/**
 * Edge labels start at the middle of their line. If that spot covers a shape or another label,
 * try sliding the label off the line (either side) and along it, and keep the first clear spot.
 */
function placeEdgeLabels(nodes: LaidOutNode[], edges: LaidOutEdge[]) {
  const solids = nodes.filter((n) => n.shape !== 'dot').map((n) => n.box);
  const placed: Rect[] = [];
  const pointAt = (e: LaidOutEdge, t: number): Point =>
    e.control
      ? { x: (1 - t) ** 2 * e.start.x + 2 * (1 - t) * t * e.control.x + t ** 2 * e.end.x, y: (1 - t) ** 2 * e.start.y + 2 * (1 - t) * t * e.control.y + t ** 2 * e.end.y }
      : { x: e.start.x + (e.end.x - e.start.x) * t, y: e.start.y + (e.end.y - e.start.y) * t };
  for (const e of edges) {
    if (!e.label || !e.labelAt || e.loop) continue;
    const box0 = edgeLabelBox(e)!;
    const clear = (r: Rect) => !solids.some((b) => overlap(r, b, 3)) && !placed.some((b) => overlap(r, b, 2));
    if (clear(box0)) { placed.push(box0); continue; }
    const dx = e.end.x - e.start.x;
    const dy = e.end.y - e.start.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // Distance that moves the label just clear of its own line, given its size and the line's angle.
    const off = Math.abs(nx) * (box0.w / 2) + Math.abs(ny) * (box0.h / 2) + 4;
    let best: Point | null = null;
    outer: for (const t of [0.5, 0.42, 0.58, 0.34, 0.66]) {
      for (const side of [0, 1, -1]) {
        const p = pointAt(e, t);
        const at = { x: p.x + nx * off * side, y: p.y + ny * off * side };
        const r = { ...box0, x: at.x - box0.w / 2, y: at.y - box0.h / 2 };
        if (clear(r)) { best = at; placed.push(r); break outer; }
      }
    }
    if (best) e.labelAt = best; else placed.push(box0);
  }
}

/** The smallest shape that holds a node's label and sub-line comfortably (see the lint constants). */
function fitText(n: SketchNode): { w: number; h: number } {
  if (n.shape === 'dot' || n.shape === 'person') return { w: 0, h: 0 };
  const label = Math.max(0, ...n.label.split('\n').map((l) => l.length * LABEL_CH));
  const sub = n.sub ? Math.max(...n.sub.split('\n').map((l) => l.length * SUB_CH)) : 0;
  const text = Math.max(label, sub);
  const h = n.label.split('\n').length * 22 + (n.sub ? n.sub.split('\n').length * 18 : 0) + 18;
  switch (n.shape) {
    case 'circle': return { w: Math.ceil(text / 0.86) + 6, h };
    case 'diamond': return { w: Math.ceil(text / 0.64) + 6, h: h + 26 };
    case 'pill': case 'round': return { w: Math.ceil(text) + 28, h };
    default: return { w: Math.ceil(text) + 20, h };
  }
}

/** Arrows stop a few pixels short of the shape so the head never overlaps the outline. */
function padBox(n: LaidOutNode): Rect {
  if (n.shape === 'dot') return { ...n.box };
  const g = 6;
  // A stick figure's label hangs below its box, so arrows aim at the label too.
  const below = n.shape === 'person' ? 22 : 0;
  return { x: n.box.x - g, y: n.box.y - g, w: n.box.w + g * 2, h: n.box.h + g * 2 + below };
}

/** Plain-text description of a diagram for screen readers and search. */
export function describeSketch(spec: SketchSpec): string {
  const name = new Map(spec.nodes.map((n) => [n.id, n.label.replace(/\n/g, ' ') || 'a point']));
  const lines = spec.edges.map((e) => `${name.get(e.from)} ${e.arrow === 'both' ? '↔' : '→'} ${name.get(e.to)}${e.label ? ` (${e.label.replace(/\n/g, ' ')})` : ''}`);
  const groups = spec.groups.map((g) => `${g.label}: ${g.nodes.map((id) => name.get(id)).join(', ')}`);
  return [spec.title, ...groups, ...lines].filter(Boolean).join('. ');
}

// ── Layout lint ────────────────────────────────────────────────────────────
const MAX_WIDTH = 1000;

const usableWidth = (n: LaidOutNode): number => {
  switch (n.shape) {
    case 'circle': return n.box.w * 0.86;
    case 'diamond': return n.box.w * 0.64;
    case 'pill': case 'round': return n.box.w - 22;
    case 'person': return 150; // label sits under the figure
    default: return n.box.w - 14;
  }
};

const overlap = (a: Rect, b: Rect, slack = 0) =>
  a.x + slack < b.x + b.w && b.x + slack < a.x + a.w && a.y + slack < b.y + b.h && b.y + slack < a.y + a.h;

function segmentHitsRect(p: Point, q: Point, r: Rect): boolean {
  // Sample the segment; robust and plenty precise at diagram scale.
  for (let t = 0.04; t <= 0.96; t += 0.02) {
    const x = p.x + (q.x - p.x) * t;
    const y = p.y + (q.y - p.y) * t;
    if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true;
  }
  return false;
}

function edgePoints(e: LaidOutEdge): Point[] {
  if (e.loop) return [];
  if (!e.control) return [e.start, e.end];
  const pts: Point[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push({
      x: (1 - t) ** 2 * e.start.x + 2 * (1 - t) * t * e.control.x + t ** 2 * e.end.x,
      y: (1 - t) ** 2 * e.start.y + 2 * (1 - t) * t * e.control.y + t ** 2 * e.end.y,
    });
  }
  return pts;
}

export function edgeLabelBox(e: LaidOutEdge): Rect | null {
  if (!e.label || !e.labelAt) return null;
  const lines = e.label.split('\n');
  const w = Math.max(...lines.map((l) => l.length)) * EDGE_CH + 12;
  const h = lines.length * 18 + 6;
  return { x: e.labelAt.x - w / 2, y: e.labelAt.y - h / 2, w, h };
}

/**
 * Finds layout problems a reader would notice: overlapping shapes, text wider than its shape,
 * arrows cutting through other shapes, and edge labels sitting on shapes or on each other.
 * The content checker fails the build on any of these, so every diagram stays clean.
 */
export function lintSketch(spec: SketchSpec): string[] {
  const L = layoutSketch(spec);
  const issues: string[] = [];
  const solid = L.nodes.filter((n) => n.shape !== 'dot');
  const name = (n: LaidOutNode) => n.id;

  for (let i = 0; i < solid.length; i++)
    for (let j = i + 1; j < solid.length; j++)
      if (overlap(solid[i].box, solid[j].box, 2)) issues.push(`nodes "${name(solid[i])}" and "${name(solid[j])}" overlap`);

  for (const n of solid) {
    const room = usableWidth(n);
    for (const line of n.label.split('\n')) if (line.length * LABEL_CH > room + 2) issues.push(`label "${line}" is too wide for node "${n.id}" (${Math.round(line.length * LABEL_CH)}px > ${Math.round(room)}px)`);
    if (n.sub) for (const line of n.sub.split('\n')) if (line.length * SUB_CH > room + 2) issues.push(`sub "${line}" is too wide for node "${n.id}"`);
    const textH = n.label.split('\n').length * 22 + (n.sub ? n.sub.split('\n').length * 18 : 0);
    if (n.shape !== 'person' && textH > n.box.h + 4) issues.push(`text is too tall for node "${n.id}"`);
  }

  for (const e of L.edges) {
    const pts = edgePoints(e);
    for (const n of solid) {
      if (n.id === e.from || n.id === e.to) continue;
      const pad = { x: n.box.x + 4, y: n.box.y + 4, w: n.box.w - 8, h: n.box.h - 8 };
      for (let k = 1; k < pts.length; k++) if (segmentHitsRect(pts[k - 1], pts[k], pad)) { issues.push(`edge ${e.from}→${e.to} passes through node "${n.id}"`); break; }
    }
  }

  const labels = L.edges.map((e) => ({ e, box: edgeLabelBox(e) })).filter((x): x is { e: LaidOutEdge; box: Rect } => !!x.box);
  for (const { e, box } of labels)
    for (const n of solid) if (overlap(box, n.box, 3)) issues.push(`label "${e.label}" on ${e.from}→${e.to} overlaps node "${n.id}"`);
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++)
      if (overlap(labels[i].box, labels[j].box, 2)) issues.push(`labels "${labels[i].e.label}" and "${labels[j].e.label}" overlap`);

  if (L.width > MAX_WIDTH) issues.push(`diagram is ${L.width}px wide (max ${MAX_WIDTH}); use fewer columns or a smaller cellW`);
  return issues;
}
