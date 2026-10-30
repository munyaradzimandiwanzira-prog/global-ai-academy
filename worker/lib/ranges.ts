/**
 * HTTP Range support for media served from static assets. The assets layer answers a Range
 * request with the whole file (200), which stops seeking and makes Safari on iOS refuse to play
 * video. This turns a full asset response into the 206 / 416 a media player expects.
 */

export type ByteRange = { start: number; end: number } | 'unsatisfiable' | null;

/** Parses a single `bytes=` range (multi-range requests fall back to the full file). */
export function parseRange(header: string | null | undefined, size: number): ByteRange {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  if (size === 0) return 'unsatisfiable';
  let start: number;
  let end: number;
  if (m[1] === '') {
    // Suffix: the last N bytes.
    const n = Number(m[2]);
    if (n === 0) return 'unsatisfiable';
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

/** Serves `asset` honouring the request's Range header. */
export async function withRanges(req: Request, asset: Response, cacheControl: string): Promise<Response> {
  if (!asset.ok) return asset;
  const headers = new Headers(asset.headers);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', cacheControl);
  headers.delete('content-encoding');
  const body = await asset.arrayBuffer();
  const size = body.byteLength;
  const range = parseRange(req.headers.get('range'), size);
  const head = req.method === 'HEAD';

  if (range === 'unsatisfiable') {
    headers.set('content-range', `bytes */${size}`);
    headers.delete('content-length');
    return new Response(null, { status: 416, headers });
  }
  if (!range) {
    headers.set('content-length', String(size));
    return new Response(head ? null : body, { status: 200, headers });
  }
  headers.set('content-range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('content-length', String(range.end - range.start + 1));
  return new Response(head ? null : body.slice(range.start, range.end + 1), { status: 206, headers });
}
