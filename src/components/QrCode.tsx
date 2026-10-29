import { useEffect, useState } from 'react';

/**
 * Renders text as a QR code (inline SVG, no innerHTML). The encoder is loaded on demand so it only
 * costs bytes on the screen that needs it. Dark modules use the text colour on a white quiet zone,
 * which phone cameras read reliably in both themes.
 */
export function QrCode({ value, size = 188, label }: { value: string; size?: number; label: string }) {
  const [path, setPath] = useState<{ d: string; n: number } | null>(null);

  useEffect(() => {
    let alive = true;
    void import('qrcode-generator').then(({ default: qrcode }) => {
      const qr = qrcode(0, 'M');
      qr.addData(value);
      qr.make();
      const n = qr.getModuleCount();
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
      if (alive) setPath({ d, n });
    });
    return () => { alive = false; };
  }, [value]);

  if (!path) return <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-muted" aria-hidden="true" />;
  const box = path.n + 8; // 4-module quiet zone on each side, as the QR spec requires
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${box} ${box}`} shapeRendering="crispEdges" className="rounded-lg">
      <rect width={box} height={box} fill="#fff" />
      <path d={path.d} fill="#0b1b33" />
    </svg>
  );
}
