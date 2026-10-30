/** Launch Lab: projectile motion with gravity and wind, in metres and seconds. */
export interface Wall { x1: number; x2: number; h: number }
export interface Target { x1: number; x2: number; y: number }
export interface Shot { angleDeg: number; speed: number }
export interface World { g: number; wind?: number; walls?: Wall[]; target: Target }
export interface Point { x: number; y: number }
export type Outcome = { kind: 'target' | 'wall' | 'ground'; x: number; y: number };

export function simulate(shot: Shot, world: World, dt = 0.01, maxT = 60): { points: Point[]; outcome: Outcome } {
  const a = (shot.angleDeg * Math.PI) / 180;
  let vx = shot.speed * Math.cos(a);
  let vy = shot.speed * Math.sin(a);
  let x = 0;
  let y = 0;
  const points: Point[] = [{ x, y }];
  const { target } = world;
  for (let t = 0; t < maxT; t += dt) {
    const px = x;
    const py = y;
    vx += (world.wind ?? 0) * dt;
    vy -= world.g * dt;
    x += vx * dt;
    y += vy * dt;
    // Hits a wall (anything below the wall's top inside its width).
    for (const w of world.walls ?? []) {
      if (x >= w.x1 && x <= w.x2 && y <= w.h) return { points: [...points, { x, y: Math.max(y, 0) }], outcome: { kind: 'wall', x, y } };
    }
    // Falls into the basket: crosses the basket's rim height going down, inside its width.
    if (vy < 0 && py >= target.y && y <= target.y) {
      const f = (py - target.y) / (py - y || 1);
      const cx = px + (x - px) * f;
      if (cx >= target.x1 && cx <= target.x2) return { points: [...points, { x: cx, y: target.y }], outcome: { kind: 'target', x: cx, y: target.y } };
    }
    if (y <= 0 && t > 0) {
      const f = py / (py - y || 1);
      const gx = px + (x - px) * f;
      return { points: [...points, { x: gx, y: 0 }], outcome: { kind: 'ground', x: gx, y: 0 } };
    }
    if (points.length === 0 || Math.abs(x - points[points.length - 1]!.x) + Math.abs(y - points[points.length - 1]!.y) > 0.4) points.push({ x, y });
  }
  return { points, outcome: { kind: 'ground', x, y } };
}

/** Kid-friendly description of a miss, used by the coach. */
export function describeMiss(outcome: Outcome, target: Target): string {
  if (outcome.kind === 'target') return 'hit the basket';
  if (outcome.kind === 'wall') return 'hit the tree in the way — try a higher angle';
  const mid = (target.x1 + target.x2) / 2;
  const d = Math.round(outcome.x - mid);
  return d < 0 ? `landed ${-d} m short` : `landed ${d} m too far`;
}
