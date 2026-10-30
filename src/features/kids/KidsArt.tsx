/**
 * Original flat illustrations for the Kids Zone, drawn in the Academy palette.
 * One consistent language: thick ink outlines (4px at 96px), flat fills, rounded joins.
 * Replaces emoji, which render differently on every phone and cannot be animated.
 */
import type { SVGProps } from 'react';

const INK = '#142B52';
type ArtProps = SVGProps<SVGSVGElement> & { size?: number };
const base = (size: number, rest: SVGProps<SVGSVGElement>) => ({ width: size, height: size, viewBox: '0 0 96 96', 'aria-hidden': true, ...rest });
const line = { stroke: INK, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function RobotArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <line x1="48" y1="10" x2="48" y2="22" {...line} />
      <circle cx="48" cy="9" r="5" fill="#3FA3A1" {...line} strokeWidth={3} />
      <rect x="20" y="22" width="56" height="42" rx="12" fill="#8FD3D1" {...line} />
      <rect x="29" y="31" width="38" height="20" rx="8" fill={INK} />
      <circle cx="40" cy="41" r="4.5" fill="#F7C35C" /><circle cx="56" cy="41" r="4.5" fill="#F7C35C" />
      <path d="M40 57 Q48 62 56 57" fill="none" {...line} strokeWidth={3} />
      <rect x="30" y="64" width="36" height="20" rx="6" fill="#23807F" {...line} />
      <circle cx="40" cy="74" r="3" fill="#F7C35C" /><circle cx="56" cy="74" r="3" fill="#F28B82" />
      <path d="M20 44 H12 M76 44 H84" {...line} />
    </svg>
  );
}

export function TurtleArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <ellipse cx="74" cy="56" rx="11" ry="9" fill="#9BCB6B" {...line} />
      <circle cx="78" cy="53" r="2.5" fill={INK} />
      <path d="M26 70 l-6 10 M40 74 l-2 10 M58 74 l2 10 M68 68 l6 10" {...line} />
      <path d="M16 66 Q16 30 44 28 Q70 30 70 66 Z" fill="#5B8C3A" {...line} />
      <path d="M30 40 L44 34 L58 40 L58 56 L44 62 L30 56 Z" fill="#9BCB6B" {...line} strokeWidth={3} />
      <path d="M12 64 L8 62" {...line} />
    </svg>
  );
}

export function StopwatchArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="40" y="8" width="16" height="9" rx="3" fill="#3577B8" {...line} strokeWidth={3} />
      <circle cx="48" cy="54" r="32" fill="#EEF4F3" {...line} />
      <circle cx="48" cy="54" r="24" fill="#D6EBE8" />
      <path d="M48 54 L48 34" {...line} />
      <path d="M48 54 L62 62" {...line} stroke="#3577B8" />
      <circle cx="48" cy="54" r="4" fill={INK} />
      <path d="M74 24 l6 -6" {...line} />
    </svg>
  );
}

export function BulbArt({ size = 96, lit = true, ...rest }: ArtProps & { lit?: boolean }) {
  return (
    <svg {...base(size, rest)}>
      {lit && <g stroke="#F2B544" strokeWidth="4" strokeLinecap="round"><path d="M48 4 v8 M18 16 l6 6 M78 16 l-6 6 M8 44 h8 M80 44 h8" /></g>}
      <path d="M48 16 C28 16 20 32 24 46 C27 56 36 60 36 70 H60 C60 60 69 56 72 46 C76 32 68 16 48 16 Z" fill={lit ? '#FFE45C' : '#C9C5BB'} {...line} />
      <path d="M40 56 L44 46 L48 54 L52 46 L56 56" fill="none" {...line} strokeWidth={3} />
      <rect x="36" y="70" width="24" height="8" rx="2" fill="#9A968C" {...line} strokeWidth={3} />
      <rect x="39" y="78" width="18" height="8" rx="3" fill="#5E5A52" {...line} strokeWidth={3} />
    </svg>
  );
}

export function LionArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <g fill="#B4472A" {...line} strokeWidth={3}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={48 + Math.cos(a) * 28} cy={50 + Math.sin(a) * 28} r="11" />;
        })}
      </g>
      <circle cx="48" cy="50" r="26" fill="#F2B544" {...line} />
      <circle cx="39" cy="44" r="3.5" fill={INK} /><circle cx="57" cy="44" r="3.5" fill={INK} />
      <path d="M44 54 H52 L48 59 Z" fill={INK} />
      <path d="M48 59 Q42 66 38 62 M48 59 Q54 66 58 62" fill="none" {...line} strokeWidth={3} />
    </svg>
  );
}

export function SnakeArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M18 76 C18 58 46 64 46 48 C46 34 22 38 22 24 C22 14 34 10 44 12" fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round" />
      <path d="M18 76 C18 58 46 64 46 48 C46 34 22 38 22 24 C22 14 34 10 44 12" fill="none" stroke="#3776AB" strokeWidth="11" strokeLinecap="round" />
      <path d="M50 52 C56 68 82 62 80 80" fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round" />
      <path d="M50 52 C56 68 82 62 80 80" fill="none" stroke="#F2B544" strokeWidth="11" strokeLinecap="round" />
      <circle cx="46" cy="11" r="2.5" fill="#fff" />
      <path d="M52 12 l8 -2 M60 10 l3 -3 M60 10 l3 3" {...line} strokeWidth={2.5} stroke="#B4472A" />
    </svg>
  );
}

export function BugArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M36 22 L30 10 M60 22 L66 10" {...line} />
      <path d="M22 44 H10 M22 58 L10 64 M74 44 H86 M74 58 L86 64 M26 32 L14 26 M70 32 L82 26" {...line} />
      <ellipse cx="48" cy="54" rx="26" ry="30" fill="#B4472A" {...line} />
      <path d="M48 26 V84" {...line} />
      <circle cx="48" cy="28" r="13" fill={INK} />
      <circle cx="43" cy="26" r="3" fill="#fff" /><circle cx="53" cy="26" r="3" fill="#fff" />
      <circle cx="36" cy="50" r="5" fill={INK} /><circle cx="60" cy="50" r="5" fill={INK} /><circle cx="38" cy="68" r="4" fill={INK} /><circle cx="58" cy="68" r="4" fill={INK} />
    </svg>
  );
}

export function PixelArt({ size = 96, ...rest }: ArtProps) {
  const cells = [
    '..GG..', '.GGGG.', 'YYYYYY', 'RRRRRR', 'KKKKKK', 'RRRRRR',
  ];
  const fill: Record<string, string> = { G: '#3A8F4B', Y: '#F2B544', R: '#C8302B', K: INK, '.': '#EEF4F3' };
  return (
    <svg {...base(size, rest)}>
      <rect x="10" y="10" width="76" height="76" rx="8" fill="#EEF4F3" {...line} />
      {cells.map((row, y) => [...row].map((c, x) => <rect key={`${x}-${y}`} x={18 + x * 10} y={18 + y * 10} width="9" height="9" rx="1.5" fill={fill[c]} />))}
    </svg>
  );
}

export function BatteryArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="14" y="30" width="60" height="36" rx="8" fill="#EEF4F3" {...line} />
      <rect x="74" y="40" width="8" height="16" rx="2" fill={INK} />
      <rect x="20" y="36" width="26" height="24" rx="4" fill="#3A8F4B" />
      <path d="M58 36 L50 50 H58 L52 62" fill="none" stroke="#F2B544" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SunArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <g stroke="#F2B544" strokeWidth="5" strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => <line key={i} x1="48" y1="8" x2="48" y2="18" transform={`rotate(${i * 45} 48 48)`} />)}
      </g>
      <circle cx="48" cy="48" r="24" fill="#F7C35C" {...line} />
    </svg>
  );
}

/** A small stone-wall chevron strip: the Great Zimbabwe motif, drawn for kids' headers. */
export function ChevronStrip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 20" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M0 16 L10 4 L20 16 L30 4 L40 16 L50 4 L60 16 L70 4 L80 16 L90 4 L100 16 L110 4 L120 16 L130 4 L140 16 L150 4 L160 16 L170 4 L180 16 L190 4 L200 16 L210 4 L220 16 L230 4 L240 16" fill="none" stroke="#D4A64A" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function ElephantArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <ellipse cx="22" cy="44" rx="16" ry="20" fill="#9AA6B2" {...line} />
      <ellipse cx="74" cy="44" rx="16" ry="20" fill="#9AA6B2" {...line} />
      <circle cx="48" cy="42" r="24" fill="#B8C2CC" {...line} />
      <path d="M48 52 C48 70 40 80 32 82" fill="none" stroke={INK} strokeWidth="14" strokeLinecap="round" />
      <path d="M48 52 C48 70 40 80 32 82" fill="none" stroke="#B8C2CC" strokeWidth="7" strokeLinecap="round" />
      <circle cx="39" cy="38" r="3.5" fill={INK} /><circle cx="57" cy="38" r="3.5" fill={INK} />
      <path d="M58 56 L66 64" stroke="#EEF4F3" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function GiraffeArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M44 86 V40 L52 40 V86" fill="#F2B544" {...line} />
      <rect x="30" y="14" width="34" height="26" rx="12" fill="#F2B544" {...line} />
      <path d="M38 14 V6 M56 14 V6" {...line} />
      <circle cx="38" cy="5" r="3" fill="#2E4A62" /><circle cx="56" cy="5" r="3" fill="#2E4A62" />
      <circle cx="40" cy="24" r="3" fill={INK} /><circle cx="54" cy="24" r="3" fill={INK} />
      <ellipse cx="47" cy="33" rx="8" ry="4" fill="#E0A422" />
      <circle cx="48" cy="54" r="3" fill="#B4472A" /><circle cx="47" cy="68" r="3" fill="#B4472A" /><circle cx="49" cy="80" r="2.5" fill="#B4472A" />
    </svg>
  );
}

export function RhinoArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="14" y="36" width="56" height="34" rx="16" fill="#8A9097" {...line} />
      <path d="M22 70 v12 M34 70 v12 M52 70 v12 M64 70 v12" {...line} />
      <path d="M68 44 C80 42 88 50 86 62 L70 64 Z" fill="#8A9097" {...line} />
      <path d="M80 44 L86 30 L88 46" fill="#EEF4F3" {...line} strokeWidth={3} />
      <circle cx="74" cy="50" r="2.5" fill={INK} />
      <path d="M60 36 l2 -8 l4 8" fill="#8A9097" {...line} strokeWidth={3} />
    </svg>
  );
}

export function TrophyArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M28 14 H68 V36 C68 50 58 58 48 58 C38 58 28 50 28 36 Z" fill="#F2B544" {...line} />
      <path d="M28 20 H16 C16 34 22 40 30 40 M68 20 H80 C80 34 74 40 66 40" fill="none" {...line} />
      <path d="M48 58 V70" {...line} />
      <rect x="32" y="70" width="32" height="12" rx="3" fill="#2E4A62" {...line} />
      <path d="M41 30 L46 35 L56 25" fill="none" {...line} stroke="#EEF4F3" />
    </svg>
  );
}

export function MangoArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M50 22 C72 22 84 42 78 62 C72 82 46 86 32 74 C18 62 22 34 38 26" fill="#F2A33A" {...line} />
      <path d="M44 24 C46 14 54 10 62 12 C58 20 52 24 44 24 Z" fill="#3A8F4B" {...line} strokeWidth={3} />
      <path d="M42 46 C46 40 54 38 58 40" fill="none" stroke="#FFE45C" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function TreeTile({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="17" y="24" width="6" height="12" rx="2" fill="#2E4A62" />
      <circle cx="20" cy="17" r="13" fill="#3A8F4B" stroke={INK} strokeWidth="2.5" />
      <circle cx="15" cy="13" r="3" fill="#5BB06A" />
    </svg>
  );
}

export function RockTile({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M6 32 L10 16 L20 8 L32 14 L35 32 Z" fill="#9A968C" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M14 22 L22 18 M20 28 L28 24" stroke="#D9D6CE" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Art for the second half of Zuva's journey ─────────────────────────────────

export function CatapultArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M8 82 H88" {...line} />
      <path d="M14 30 Q44 6 80 22" fill="none" stroke="#F2B544" strokeWidth="3" strokeDasharray="5 6" strokeLinecap="round" />
      <circle cx="80" cy="24" r="7" fill="#F7C35C" {...line} strokeWidth={3} />
      <rect x="18" y="62" width="40" height="12" rx="4" fill="#B88A2E" {...line} />
      <path d="M24 62 L50 30" {...line} strokeWidth={6} stroke="#7A5418" />
      <path d="M24 62 L50 30" fill="none" {...line} />
      <circle cx="51" cy="28" r="6" fill="#C8302B" {...line} strokeWidth={3} />
      <circle cx="26" cy="78" r="6" fill={INK} /><circle cx="52" cy="78" r="6" fill={INK} />
    </svg>
  );
}

export function TerminalArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="10" y="16" width="76" height="60" rx="10" fill={INK} {...line} />
      <rect x="10" y="16" width="76" height="14" rx="7" fill="#2E4A62" />
      <circle cx="20" cy="23" r="3" fill="#F28B82" /><circle cx="30" cy="23" r="3" fill="#F7C35C" /><circle cx="40" cy="23" r="3" fill="#8FD3D1" />
      <path d="M22 44 L32 52 L22 60" fill="none" stroke="#8FD3D1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 60 H56" stroke="#F7C35C" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function ControllerArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M22 34 H74 Q88 34 90 52 L92 66 Q93 78 82 78 Q74 78 68 66 H28 Q22 78 14 78 Q3 78 4 66 L6 52 Q8 34 22 34 Z" fill="#7A4FB8" {...line} />
      <path d="M24 46 V60 M17 53 H31" stroke="#F7C35C" strokeWidth="5" strokeLinecap="round" />
      <circle cx="68" cy="48" r="4.5" fill="#8FD3D1" /><circle cx="77" cy="56" r="4.5" fill="#F28B82" />
      <path d="M48 20 V34" {...line} />
      <circle cx="48" cy="16" r="5" fill="#F2B544" {...line} strokeWidth={3} />
    </svg>
  );
}

export function NetworkArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M24 26 L48 50 L74 22 M48 50 L22 74 M48 50 L76 74" {...line} />
      {[[24, 26, '#8FD3D1'], [74, 22, '#F7C35C'], [22, 74, '#F28B82'], [76, 74, '#9BCB6B']].map(([x, y, c]) => (
        <circle key={`${x}${y}`} cx={x as number} cy={y as number} r="9" fill={c as string} {...line} />
      ))}
      <rect x="36" y="40" width="24" height="20" rx="5" fill="#2F6FB2" {...line} />
      <circle cx="44" cy="50" r="2.5" fill="#F7C35C" /><circle cx="52" cy="50" r="2.5" fill="#8FD3D1" />
    </svg>
  );
}

export function ComputerArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="12" y="14" width="72" height="50" rx="8" fill="#2E4A62" {...line} />
      <rect x="20" y="22" width="56" height="34" rx="4" fill="#8FD3D1" />
      <path d="M30 46 L40 34 L48 42 L56 30 L66 46" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 64 L36 76 H60 L56 64" fill="#9AA6B2" {...line} />
      <rect x="24" y="78" width="48" height="8" rx="4" fill="#D6EBE8" {...line} strokeWidth={3} />
    </svg>
  );
}

export function ChipArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <g {...line} strokeWidth={4}>
        {[30, 42, 54, 66].map((p) => <path key={p} d={`M${p} 10 V20 M${p} 76 V86 M10 ${p} H20 M76 ${p} H86`} />)}
      </g>
      <rect x="20" y="20" width="56" height="56" rx="8" fill="#3A8F4B" {...line} />
      <rect x="32" y="32" width="32" height="32" rx="4" fill="#B88A2E" {...line} strokeWidth={3} />
      <path d="M40 48 H56 M48 40 V56" stroke="#F7C35C" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function FactoryArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="26" y="30" width="44" height="44" rx="8" fill="#23807F" {...line} />
      <circle cx="48" cy="52" r="11" fill="#F7C35C" {...line} strokeWidth={3} />
      <circle cx="48" cy="52" r="4" fill={INK} />
      <path d="M6 52 H26 M70 52 H90" {...line} />
      <path d="M18 46 L26 52 L18 58" fill="none" {...line} />
      <path d="M82 46 L90 52 L82 58" fill="none" {...line} />
      <rect x="2" y="44" width="10" height="16" rx="3" fill="#8FD3D1" {...line} strokeWidth={3} />
      <path d="M38 30 V16 H58 V30" fill="#9AA6B2" {...line} />
    </svg>
  );
}

export function BridgeArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M4 74 Q48 92 92 74 V90 H4 Z" fill="#2F6FB2" />
      <path d="M8 60 Q48 10 88 60" fill="none" stroke="#C8302B" strokeWidth="6" strokeLinecap="round" />
      <path d="M8 60 Q48 10 88 60" fill="none" {...line} strokeWidth={2} />
      <path d="M4 60 H92" {...line} strokeWidth={5} />
      {[22, 34, 48, 62, 74].map((x) => <path key={x} d={`M${x} 60 V${x === 48 ? 36 : x === 34 || x === 62 ? 41 : 50}`} {...line} strokeWidth={3} />)}
      <path d="M8 60 V80 M88 60 V80" {...line} strokeWidth={6} />
    </svg>
  );
}

export function LineBotArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 86 Q30 60 48 70 T90 50" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <rect x="26" y="20" width="44" height="34" rx="10" fill="#F7C35C" {...line} />
      <rect x="34" y="28" width="28" height="12" rx="5" fill={INK} />
      <circle cx="42" cy="34" r="3" fill="#8FD3D1" /><circle cx="54" cy="34" r="3" fill="#8FD3D1" />
      <circle cx="30" cy="58" r="8" fill="#2E4A62" {...line} /><circle cx="66" cy="58" r="8" fill="#2E4A62" {...line} />
      <path d="M36 54 L32 66 M48 54 V66 M60 54 L64 66" stroke="#F28B82" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BrainArt({ size = 96, ...rest }: ArtProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M48 18 Q30 10 22 26 Q8 30 12 46 Q4 58 16 68 Q18 84 36 80 Q44 88 48 80 Q52 88 60 80 Q78 84 80 68 Q92 58 84 46 Q88 30 74 26 Q66 10 48 18 Z" fill="#F2A7C0" {...line} />
      <path d="M48 20 V80" {...line} strokeWidth={3} />
      <circle cx="32" cy="40" r="4" fill="#23807F" /><circle cx="64" cy="40" r="4" fill="#23807F" />
      <circle cx="30" cy="62" r="4" fill="#F7C35C" /><circle cx="66" cy="62" r="4" fill="#F7C35C" />
      <path d="M32 40 L30 62 M64 40 L66 62 M32 40 L48 50 M64 40 L48 50" stroke={INK} strokeWidth="2" />
    </svg>
  );
}
