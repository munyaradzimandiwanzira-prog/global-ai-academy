/** Pictures for maths questions, drawn in SVG with the site palette (currentColor follows dark mode). */
import type { Visual as V } from '@shared/maths';

const INK = 'currentColor';
const TEAL = '#23807F';
const GOLD = '#D4A64A';

function Clock({ h, m }: { h: number; m: number }) {
  const ang = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const hourDeg = ((h % 12) + m / 60) * 30, minDeg = m * 6;
  return (
    <svg viewBox="0 0 120 120" className="h-44 w-44" role="img" aria-label={`A clock showing ${h}:${String(m).padStart(2, '0')}`}>
      <circle cx="60" cy="60" r="54" fill="none" stroke={INK} strokeWidth="3" />
      {Array.from({ length: 60 }, (_, i) => { const big = i % 5 === 0; const a = ang(i * 6); return <line key={i} x1={60 + Math.cos(a) * (big ? 44 : 49)} y1={60 + Math.sin(a) * (big ? 44 : 49)} x2={60 + Math.cos(a) * 52} y2={60 + Math.sin(a) * 52} stroke={INK} strokeWidth={big ? 2.5 : 1} />; })}
      {Array.from({ length: 12 }, (_, i) => { const a = ang((i + 1) * 30); return <text key={i} x={60 + Math.cos(a) * 36} y={60 + Math.sin(a) * 36 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>{i + 1}</text>; })}
      <line x1="60" y1="60" x2={60 + Math.cos(ang(hourDeg)) * 26} y2={60 + Math.sin(ang(hourDeg)) * 26} stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <line x1="60" y1="60" x2={60 + Math.cos(ang(minDeg)) * 42} y2={60 + Math.sin(ang(minDeg)) * 42} stroke={TEAL} strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="3.5" fill={INK} />
    </svg>
  );
}

const POLY: Record<string, number> = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, octagon: 8 };
function Shape({ name }: { name: string }) {
  const common = { fill: `${TEAL}22`, stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  let el: JSX.Element;
  if (POLY[name]) {
    const n = POLY[name]!; const pts = Array.from({ length: n }, (_, i) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2 + (n === 4 ? Math.PI / 4 : 0); return `${60 + Math.cos(a) * 46},${62 + Math.sin(a) * 46}`; }).join(' ');
    el = <polygon points={pts} {...common} />;
  } else if (name === 'rectangle') el = <rect x="14" y="34" width="92" height="52" {...common} />;
  else if (name === 'circle') el = <circle cx="60" cy="60" r="44" {...common} />;
  else if (name === 'sphere') el = <><circle cx="60" cy="60" r="44" {...common} /><ellipse cx="60" cy="60" rx="44" ry="12" fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="4 4" /></>;
  else if (name === 'cube' || name === 'cuboid') { const w = name === 'cube' ? 56 : 76; el = <><rect x="18" y="40" width={w} height="56" {...common} /><polygon points={`18,40 ${18 + 22},20 ${18 + w + 22},20 ${18 + w},40`} {...common} /><polygon points={`${18 + w},40 ${18 + w + 22},20 ${18 + w + 22},76 ${18 + w},96`} {...common} /></>; }
  else if (name === 'cylinder') el = <><path d="M24 30 v60 a36 12 0 0 0 72 0 v-60" {...common} /><ellipse cx="60" cy="30" rx="36" ry="12" {...common} /></>;
  else if (name === 'cone') el = <><path d="M60 14 L24 92 a36 12 0 0 0 72 0 Z" {...common} /><ellipse cx="60" cy="92" rx="36" ry="12" fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="4 4" /></>;
  else el = <><polygon points="60,14 18,92 102,92" {...common} /><polygon points="60,14 102,92 112,76" {...common} /></>;
  return <svg viewBox="0 0 120 120" className="h-40 w-40" role="img" aria-label="A shape">{el}</svg>;
}

function Bars({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1); const step = max > 12 ? 2 : 1; const top = Math.ceil(max / step) * step || 2;
  const W = 300, H = 180, left = 28, bottom = 26, bw = (W - left - 10) / data.length;
  return (
    <figure className="w-full max-w-sm">
      <figcaption className="mb-1 text-center font-semibold">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
        {Array.from({ length: top / step + 1 }, (_, i) => { const v = i * step; const y = H - bottom - (v / top) * (H - bottom - 10); return <g key={i}><line x1={left} x2={W - 6} y1={y} y2={y} stroke={INK} strokeOpacity="0.12" /><text x={left - 6} y={y + 4} fontSize="10" textAnchor="end" fill={INK}>{v}</text></g>; })}
        {data.map((d, i) => { const h = (d.value / top) * (H - bottom - 10); const x = left + i * bw + bw * 0.18; return <g key={d.label}><rect x={x} y={H - bottom - h} width={bw * 0.64} height={h} rx="3" fill={i % 2 ? GOLD : TEAL} /><text x={x + bw * 0.32} y={H - 8} fontSize="11" textAnchor="middle" fill={INK}>{d.label}</text></g>; })}
      </svg>
    </figure>
  );
}

export function FractionPicture({ num, den, size = 260 }: { num: number; den: number; size?: number }) {
  const w = size / den;
  return (
    <svg viewBox={`0 0 ${size} 48`} className="w-full max-w-xs" role="img" aria-label={`${num} of ${den} equal parts shaded`}>
      {Array.from({ length: den }, (_, i) => <rect key={i} x={i * w + 1} y="1" width={w - 2} height="46" rx="3" fill={i < num ? TEAL : 'transparent'} stroke={INK} strokeWidth="2" />)}
    </svg>
  );
}

function ArrayPic({ rows, cols }: { rows: number; cols: number }) {
  return (
    <svg viewBox={`0 0 ${cols * 26 + 6} ${rows * 26 + 6}`} className="max-h-44 w-auto" role="img" aria-label={`${rows} rows of ${cols}`}>
      {Array.from({ length: rows * cols }, (_, i) => <circle key={i} cx={(i % cols) * 26 + 16} cy={Math.floor(i / cols) * 26 + 16} r="9" fill={GOLD} stroke={INK} strokeWidth="1.5" />)}
    </svg>
  );
}

function Dots({ n }: { n: number }) {
  // Dice-like groups of five make counting easier (subitising).
  return (
    <svg viewBox="0 0 260 110" className="w-full max-w-xs" role="img" aria-label="Some dots to count">
      {Array.from({ length: n }, (_, i) => { const group = Math.floor(i / 5), k = i % 5; const gx = (group % 4) * 64 + 8, gy = Math.floor(group / 4) * 56 + 6; const pos = [[10, 10], [40, 10], [25, 25], [10, 40], [40, 40]][k]!; return <circle key={i} cx={gx + pos[0]!} cy={gy + pos[1]!} r="9" fill={TEAL} />; })}
    </svg>
  );
}

export function Visual({ v }: { v: V }) {
  switch (v.type) {
    case 'clock': return <Clock h={v.h} m={v.m} />;
    case 'shape': return <Shape name={v.name} />;
    case 'bars': return <Bars title={v.title} data={v.data} />;
    case 'fraction': return <FractionPicture num={v.num} den={v.den} />;
    case 'array': return <ArrayPic rows={v.rows} cols={v.cols} />;
    case 'dots': return <Dots n={v.n} />;
  }
}
