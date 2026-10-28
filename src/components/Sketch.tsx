import { memo, useId, useMemo } from 'react';
import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import '@fontsource-variable/caveat';
import { describeSketch, layoutSketch, type LaidOutEdge, type LaidOutNode, type Point, type SketchSpec, type SketchTone } from '@shared/sketch';

/**
 * Renders a ```sketch block as a clean pencil drawing: graphite outlines drawn with rough.js,
 * coloured-pencil hatching for fills, handwritten labels. Deterministic (seeded from the title)
 * so a diagram looks the same on every visit, and themed through CSS variables for dark mode.
 */

type PathInfo = { d: string; stroke: string; strokeWidth: number; fill?: string; dash?: string };
/** rough.js drops strokeLineDash in toPaths(), so dashes are re-applied when rendering. */
const dashed = (paths: PathInfo[], dash: string): PathInfo[] => paths.map((p) => ({ ...p, dash }));

const TONE_VAR: Record<SketchTone, string | undefined> = {
  plain: undefined,
  teal: 'var(--sk-teal)',
  gold: 'var(--sk-gold)',
  rose: 'var(--sk-rose)',
  sky: 'var(--sk-sky)',
  grape: 'var(--sk-grape)',
  ink: 'var(--sk-inkfill)',
};
const INK = 'var(--sk-ink)';
const SOFT = 'var(--sk-soft)';
const FONT = "'Caveat Variable', 'Caveat', 'Comic Sans MS', cursive";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h) % 2 ** 31 || 1;
}

const roundRect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`;

function drawNode(gen: ReturnType<typeof rough.generator>, n: LaidOutNode, base: Options): PathInfo[] {
  const { x, y, w, h } = n.box;
  const tone = TONE_VAR[n.tone ?? 'plain'];
  const o: Options = { ...base, seed: base.seed! + hash(n.id), ...(tone ? { fill: tone, fillStyle: 'hachure', hachureGap: 6.5, fillWeight: 0.7, hachureAngle: -41 + (hash(n.id) % 20) } : {}) };
  const paths = (d: ReturnType<typeof gen.rectangle>) => gen.toPaths(d) as PathInfo[];
  switch (n.shape) {
    case 'round':
      return paths(gen.path(roundRect(x, y, w, h, 12), o));
    case 'pill':
      return paths(gen.path(roundRect(x, y, w, h, h / 2), o));
    case 'circle':
      return paths(gen.ellipse(n.cx, n.cy, w, h, o));
    case 'dot':
      return paths(gen.circle(n.cx, n.cy, w, { ...o, fill: INK, fillStyle: 'solid', roughness: 0.3 }));
    case 'diamond':
      return paths(gen.polygon([[n.cx, y], [x + w, n.cy], [n.cx, y + h], [x, n.cy]], o));
    case 'db': {
      const ry = 10;
      const body = `M${x},${y + ry} L${x},${y + h - ry} A${w / 2},${ry} 0 0,0 ${x + w},${y + h - ry} L${x + w},${y + ry}`;
      return [...paths(gen.path(body, o)), ...paths(gen.ellipse(n.cx, y + ry, w, ry * 2, { ...o, fill: undefined }))];
    }
    case 'doc': {
      const wave = `M${x},${y} L${x + w},${y} L${x + w},${y + h - 8} Q${x + w * 0.75},${y + h - 18} ${x + w / 2},${y + h - 6} Q${x + w * 0.25},${y + h + 6} ${x},${y + h - 6} Z`;
      return paths(gen.path(wave, o));
    }
    case 'note': {
      const f = 14;
      const d = `M${x},${y} L${x + w - f},${y} L${x + w},${y + f} L${x + w},${y + h} L${x},${y + h} Z M${x + w - f},${y} L${x + w - f},${y + f} L${x + w},${y + f}`;
      return paths(gen.path(d, { ...o, fill: o.fill ?? 'var(--sk-gold)', fillStyle: 'hachure', hachureGap: 8 }));
    }
    case 'person': {
      const head = 16;
      const top = y + head + 2;
      const p: Options = { ...o, fill: undefined };
      return [
        ...paths(gen.circle(n.cx, y + head / 2 + 2, head, { ...o })),
        ...paths(gen.line(n.cx, top, n.cx, y + h * 0.66, p)),
        ...paths(gen.line(n.cx - 20, y + h * 0.4, n.cx + 20, y + h * 0.4, p)),
        ...paths(gen.line(n.cx, y + h * 0.66, n.cx - 15, y + h, p)),
        ...paths(gen.line(n.cx, y + h * 0.66, n.cx + 15, y + h, p)),
      ];
    }
    default:
      return paths(gen.rectangle(x, y, w, h, o));
  }
}

function arrowHead(gen: ReturnType<typeof rough.generator>, tip: Point, from: Point, o: Options): PathInfo[] {
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
  const len = 12;
  const spread = 0.42;
  const a = { x: tip.x - len * Math.cos(ang - spread), y: tip.y - len * Math.sin(ang - spread) };
  const b = { x: tip.x - len * Math.cos(ang + spread), y: tip.y - len * Math.sin(ang + spread) };
  return gen.toPaths(gen.linearPath([[a.x, a.y], [tip.x, tip.y], [b.x, b.y]], { ...o, roughness: 0.5 })) as PathInfo[];
}

function drawEdge(gen: ReturnType<typeof rough.generator>, e: LaidOutEdge, base: Options, i: number): PathInfo[] {
  const o: Options = { ...base, seed: base.seed! + i * 7 + 3, strokeLineDash: e.dashed ? [7, 6] : undefined, disableMultiStroke: !!e.dashed };
  let line: PathInfo[];
  let endFrom: Point;
  let startFrom: Point;
  if (e.loop) {
    line = gen.toPaths(gen.path(`M${e.start.x},${e.start.y} C${e.loop.c1.x},${e.loop.c1.y} ${e.loop.c2.x},${e.loop.c2.y} ${e.end.x},${e.end.y}`, o)) as PathInfo[];
    endFrom = e.loop.c2;
    startFrom = e.loop.c1;
  } else if (e.control) {
    line = gen.toPaths(gen.path(`M${e.start.x},${e.start.y} Q${e.control.x},${e.control.y} ${e.end.x},${e.end.y}`, o)) as PathInfo[];
    endFrom = e.control;
    startFrom = e.control;
  } else {
    line = gen.toPaths(gen.line(e.start.x, e.start.y, e.end.x, e.end.y, o)) as PathInfo[];
    endFrom = e.start;
    startFrom = e.end;
  }
  if (e.dashed) line = dashed(line, '7 6');
  const head: Options = { ...o, strokeLineDash: undefined };
  if (e.arrow !== 'none') line.push(...arrowHead(gen, e.end, endFrom, head));
  if (e.arrow === 'both') line.push(...arrowHead(gen, e.start, startFrom, head));
  return line;
}

function Lines({ text, x, y, size, color, weight = 500 }: { text: string; x: number; y: number; size: number; color: string; weight?: number }) {
  const lines = text.split('\n');
  const lh = size * 1.02;
  const y0 = y - ((lines.length - 1) * lh) / 2;
  return (
    <text
      x={x}
      y={y0}
      textAnchor="middle"
      dominantBaseline="central"
      // A paper-coloured halo, like an eraser clearing the hatching, keeps labels legible.
      style={{ fontFamily: FONT, fontSize: size, fontWeight: weight, fill: color, stroke: 'var(--sk-paper)', strokeWidth: 4.5, strokeLinejoin: 'round', paintOrder: 'stroke' }}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>{l}</tspan>
      ))}
    </text>
  );
}

const HATCH = new Set(Object.values(TONE_VAR).filter(Boolean) as string[]);

const PathList = ({ paths }: { paths: PathInfo[] }) => (
  <>
    {paths.map((p, i) => (
      <path
        key={i}
        d={p.d}
        // Coloured-pencil hatching is drawn lighter than the graphite outline.
        style={{ stroke: p.stroke, strokeWidth: p.strokeWidth, strokeDasharray: p.dash, fill: p.fill && p.fill !== 'none' ? p.fill : 'none', opacity: HATCH.has(p.stroke) && p.strokeWidth < 1.2 ? 0.5 : 1 }}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
  </>
);

export const Sketch = memo(function Sketch({ spec }: { spec: SketchSpec }) {
  const titleId = useId();
  const descId = useId();
  const drawn = useMemo(() => {
    const layout = layoutSketch(spec);
    const gen = rough.generator();
    const base: Options = { stroke: INK, strokeWidth: 1.35, roughness: 0.85, bowing: 0.7, seed: hash(spec.title ?? spec.nodes.map((n) => n.id).join()) };
    const groups = layout.groups.map((g, i) => ({
      g,
      paths: dashed(gen.toPaths(gen.path(roundRect(g.box.x, g.box.y, g.box.w, g.box.h, 14), { ...base, seed: base.seed! + 101 + i, stroke: TONE_VAR[g.tone ?? 'plain'] ?? SOFT, strokeWidth: 1.25, disableMultiStroke: true })) as PathInfo[], '9 7'),
    }));
    const edges = layout.edges.map((e, i) => ({ e, paths: drawEdge(gen, e, { ...base, strokeWidth: 1.25 }, i) }));
    const nodes = layout.nodes.map((n) => ({ n, paths: drawNode(gen, n, base) }));
    return { layout, groups, edges, nodes };
  }, [spec]);

  const { layout } = drawn;
  const description = useMemo(() => describeSketch(spec), [spec]);

  return (
    <figure className="not-prose my-7">
      <div className="overflow-x-auto rounded-xl border border-border" style={{ background: 'var(--sk-paper)' }}>
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          style={{ maxWidth: layout.width, minWidth: Math.min(layout.width, 520), display: 'block', margin: '0 auto' }}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
        >
          <title id={titleId}>{spec.title ?? 'Diagram'}</title>
          <desc id={descId}>{description}</desc>
          {drawn.groups.map(({ g, paths }, i) => (
            <g key={`g${i}`}>
              <PathList paths={paths} />
              <text x={g.box.x + 14} y={g.box.y + 15} dominantBaseline="central" style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, fill: TONE_VAR[g.tone ?? 'plain'] ?? SOFT }}>
                {g.label}
              </text>
            </g>
          ))}
          {drawn.edges.map(({ paths }, i) => <PathList key={`e${i}`} paths={paths} />)}
          {drawn.nodes.map(({ n, paths }) => {
            const person = n.shape === 'person';
            const ly = person ? n.box.y + n.box.h + 14 : n.sub ? n.cy - 8 : n.cy;
            return (
              <g key={n.id}>
                <PathList paths={paths} />
                {n.label && <Lines text={n.label} x={n.cx} y={ly} size={person ? 19 : 21} color={INK} weight={600} />}
                {n.sub && !person && <Lines text={n.sub} x={n.cx} y={n.cy + 14 + (n.label.split('\n').length - 1) * 10} size={16} color={SOFT} />}
              </g>
            );
          })}
          {/* Labels last so they sit above lines, on a paper-coloured backing for legibility. */}
          {drawn.edges.map(({ e }, i) =>
            e.label && e.labelAt ? (
              <g key={`l${i}`}>
                <rect
                  x={e.labelAt.x - Math.max(...e.label.split('\n').map((l) => l.length)) * 4.3 - 6}
                  y={e.labelAt.y - e.label.split('\n').length * 9.5 - 2}
                  width={Math.max(...e.label.split('\n').map((l) => l.length)) * 8.6 + 12}
                  height={e.label.split('\n').length * 19 + 4}
                  rx={6}
                  style={{ fill: 'var(--sk-paper)', opacity: 0.92 }}
                />
                <Lines text={e.label} x={e.labelAt.x} y={e.labelAt.y} size={17} color={SOFT} weight={600} />
              </g>
            ) : null,
          )}
        </svg>
      </div>
      {spec.caption && <figcaption className="mt-2 text-center text-sm text-muted-fg">{spec.caption}</figcaption>}
    </figure>
  );
});

export default Sketch;
