/**
 * Bridge Builder: decides whether a pin-jointed frame (beams joined at nodes) is rigid.
 * A frame is rigid when no joint can move without stretching a beam. We check this with the
 * rigidity matrix: one row per beam, two columns (x, y) per free joint. The frame is rigid when
 * the matrix rank equals 2 × (number of free joints). Anchors on the riverbanks do not move.
 */
export interface Node { id: number; x: number; y: number; anchor?: boolean; deck?: boolean }
export interface Beam { a: number; b: number }

export const beamLength = (nodes: Node[], b: Beam) => {
  const p = nodes[b.a]!;
  const q = nodes[b.b]!;
  return Math.hypot(p.x - q.x, p.y - q.y);
};

export function rank(m: number[][], eps = 1e-9): number {
  const a = m.map((r) => [...r]);
  const rows = a.length;
  const cols = rows ? a[0]!.length : 0;
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let piv = r;
    for (let i = r + 1; i < rows; i++) if (Math.abs(a[i]![c]!) > Math.abs(a[piv]![c]!)) piv = i;
    if (Math.abs(a[piv]![c]!) < eps) continue;
    [a[r], a[piv]] = [a[piv]!, a[r]!];
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const f = a[i]![c]! / a[r]![c]!;
      if (f !== 0) for (let k = c; k < cols; k++) a[i]![k]! -= f * a[r]![k]!;
    }
    r++;
  }
  return r;
}

export interface BridgeCheck { rigid: boolean; deckConnected: boolean; wobbly: number[]; usedFree: number[] }

export function checkBridge(nodes: Node[], beams: Beam[]): BridgeCheck {
  const used = new Set(beams.flatMap((b) => [b.a, b.b]));
  const deck = nodes.filter((n) => n.deck).map((n) => n.id);
  // The road needs every deck joint on the bridge, joined from bank to bank.
  const adj = new Map<number, number[]>();
  for (const b of beams) {
    adj.set(b.a, [...(adj.get(b.a) ?? []), b.b]);
    adj.set(b.b, [...(adj.get(b.b) ?? []), b.a]);
  }
  const left = deck[0]!;
  const seen = new Set([left]);
  const queue = [left];
  while (queue.length) for (const n of adj.get(queue.shift()!) ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  const deckConnected = deck.every((d) => seen.has(d));

  const free = [...used].filter((i) => !nodes[i]!.anchor).sort((a, b) => a - b);
  const col = new Map(free.map((n, i) => [n, i]));
  const m = beams.map((b) => {
    const row = Array(free.length * 2).fill(0);
    const p = nodes[b.a]!;
    const q = nodes[b.b]!;
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    if (col.has(b.a)) { row[col.get(b.a)! * 2] = dx; row[col.get(b.a)! * 2 + 1] = dy; }
    if (col.has(b.b)) { row[col.get(b.b)! * 2] = -dx; row[col.get(b.b)! * 2 + 1] = -dy; }
    return row;
  });
  const rigid = free.length === 0 ? beams.length > 0 : rank(m) === free.length * 2;

  // Point at joints that can still wobble: each free joint that is held by fewer than two
  // non-parallel beams, so the child knows where to add a triangle.
  const wobbly = rigid
    ? []
    : free.filter((n) => {
        const dirs = beams
          .filter((b) => b.a === n || b.b === n)
          .map((b) => {
            const o = nodes[b.a === n ? b.b : b.a]!;
            const p = nodes[n]!;
            return Math.atan2(o.y - p.y, o.x - p.x);
          });
        const distinct = dirs.filter((d, i) => dirs.findIndex((e) => Math.abs(Math.sin(e - d)) < 1e-6) === i);
        return distinct.length < 2;
      });
  return { rigid: rigid && deckConnected, deckConnected, wobbly, usedFree: free };
}

export const bridgeCost = (nodes: Node[], beams: Beam[], perMetre: number) => Math.round(beams.reduce((s, b) => s + beamLength(nodes, b), 0) * perMetre);

export interface BridgeLevel { name: string; gap: number; budget: number; pier?: boolean; brief: string; hints: string[] }

export const BRIDGE_LEVELS: BridgeLevel[] = [
  { name: 'Little stream', gap: 4, budget: 1800, brief: 'Build a bridge so the truck can cross! Tap one joint, then another, to add a steel beam. Tap a beam’s two joints again to remove it.', hints: ['The road (the bottom row) must go all the way across.', 'A straight road alone will sag. Add beams above it.', 'Triangles do not change shape when you push them. Make every square into two triangles.'] },
  { name: 'Save River', gap: 6, budget: 2700, brief: 'Birchenough Bridge crosses the Save River. Build a strong bridge across this wider gap, inside the budget.', hints: ['Use the same trick: a row of triangles along the road.', 'Long beams cost more. Short diagonal beams are cheap and strong.', 'If a joint is shaking, it needs one more beam in a different direction.'] },
  { name: 'Tight budget', gap: 8, budget: 3700, brief: 'A long bridge with a tight budget. Engineers must be strong AND careful with money.', hints: ['You don’t need beams everywhere: one triangle row is enough.', 'Remove any beam that does not make a new triangle.', 'A zig-zag of diagonals above the road (a Warren truss) is very cheap.'] },
  { name: 'Middle pier', gap: 10, budget: 4700, pier: true, brief: 'The river is very wide, but there is a rock in the middle for a pier. Use it to hold your bridge up!', hints: ['The pier joint in the middle cannot move, just like the riverbanks.', 'Join the road to the pier with beams.', 'Make triangles on both halves of the bridge.'] },
];


export function makeNodes(L: BridgeLevel): Node[] {
  const nodes: Node[] = [];
  let id = 0;
  for (let x = 0; x <= L.gap; x++) {
    for (const y of [2, 1, 0]) nodes.push({ id: id++, x, y, anchor: y === 0 && (x === 0 || x === L.gap), deck: y === 0 });
  }
  nodes.push({ id: id++, x: 0, y: -1, anchor: true });
  nodes.push({ id: id++, x: L.gap, y: -1, anchor: true });
  if (L.pier) nodes.push({ id: id++, x: L.gap / 2, y: -1.5, anchor: true });
  return nodes;
}

