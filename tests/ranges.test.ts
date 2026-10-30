import { describe, expect, it } from 'vitest';
import { parseRange, withRanges } from '../worker/lib/ranges';

describe('byte ranges for media', () => {
  it('parses the ranges media players send', () => {
    expect(parseRange('bytes=0-1', 100)).toEqual({ start: 0, end: 1 });
    expect(parseRange('bytes=0-', 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=100-', 100)).toBe('unsatisfiable');
    expect(parseRange('bytes=5-2', 100)).toBe('unsatisfiable');
    expect(parseRange('bytes=0-1,5-6', 100)).toBeNull();
    expect(parseRange(null, 100)).toBeNull();
  });
  it('answers 206, 200 and 416 with the right headers', async () => {
    const asset = () => new Response(new Uint8Array([...Array(10).keys()]), { headers: { 'content-type': 'video/mp4' } });
    const r = await withRanges(new Request('https://x/v.mp4', { headers: { range: 'bytes=2-4' } }), asset(), 'public');
    expect(r.status).toBe(206);
    expect(r.headers.get('content-range')).toBe('bytes 2-4/10');
    expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([2, 3, 4]);
    const full = await withRanges(new Request('https://x/v.mp4'), asset(), 'public');
    expect(full.status).toBe(200);
    expect(full.headers.get('accept-ranges')).toBe('bytes');
    expect(full.headers.get('content-length')).toBe('10');
    const bad = await withRanges(new Request('https://x/v.mp4', { headers: { range: 'bytes=50-' } }), asset(), 'public');
    expect(bad.status).toBe(416);
    expect(bad.headers.get('content-range')).toBe('bytes */10');
  });
});
