/** Packet Post: a router network, the delay on each cable, and the fastest route. */
export interface Link { a: string; b: string; ms: number; down?: boolean }

export const linkKey = (a: string, b: string) => [a, b].sort().join('~');

export function findLink(links: Link[], a: string, b: string): Link | undefined {
  return links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
}

/** Total delay of a route, or null if two hops aren't joined by a working cable. */
export function routeCost(links: Link[], route: string[]): number | null {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const l = findLink(links, route[i - 1]!, route[i]!);
    if (!l || l.down) return null;
    total += l.ms;
  }
  return total;
}

/** Dijkstra's shortest path over working links. */
export function fastest(links: Link[], from: string, to: string): { ms: number; route: string[] } | null {
  const nodes = new Set(links.flatMap((l) => [l.a, l.b]));
  const dist = new Map<string, number>([...nodes].map((n) => [n, Infinity]));
  const prev = new Map<string, string>();
  dist.set(from, 0);
  const todo = new Set(nodes);
  while (todo.size) {
    let u: string | null = null;
    for (const n of todo) if (u === null || dist.get(n)! < dist.get(u)!) u = n;
    if (u === null || dist.get(u) === Infinity) break;
    todo.delete(u);
    if (u === to) break;
    for (const l of links) {
      if (l.down) continue;
      const v = l.a === u ? l.b : l.b === u ? l.a : null;
      if (!v || !todo.has(v)) continue;
      const alt = dist.get(u)! + l.ms;
      if (alt < dist.get(v)!) { dist.set(v, alt); prev.set(v, u); }
    }
  }
  if (!Number.isFinite(dist.get(to))) return null;
  const route = [to];
  while (route[0] !== from) route.unshift(prev.get(route[0]!)!);
  return { ms: dist.get(to)!, route };
}
