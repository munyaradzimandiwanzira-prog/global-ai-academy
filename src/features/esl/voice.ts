import { useCallback, useEffect, useRef, useState } from 'react';
import type { Accent, EslTier } from '@shared/esl';
import { storage } from '@/lib/utils';

/**
 * Zuva's voice in the English course. Uses the server voice (accent-aware, cached for everyone, so
 * the second child to hear "apple" costs nothing) and falls back to the browser's own en-GB or
 * en-US voice when the server voice is unavailable, the device is offline, or the text is long.
 */
export type Pace = 'word' | EslTier;
const muted = storage<boolean>('gaa:esl:muted:v1', false);
const clips = new Map<string, string>();
let current: HTMLAudioElement | null = null;
let serverVoice = true;

export const isMuted = () => muted.get();
export function setMuted(v: boolean) { muted.set(v); if (v) stopSpeaking(); }

export function stopSpeaking() {
  current?.pause();
  current = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export type VoiceLang = 'en' | 'pt-MZ';

function browserSay(text: string, accent: Accent, pace: Pace, voiceLang: VoiceLang = 'en'): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    // Devices rarely have a Mozambican voice; European Portuguese is the closest standard.
    const lang = voiceLang === 'pt-MZ' ? 'pt-PT' : accent === 'us' ? 'en-US' : 'en-GB';
    u.lang = lang;
    u.rate = pace === 'early' || pace === 'word' ? 0.8 : pace === 'primary' ? 0.92 : 1;
    u.pitch = pace === 'early' ? 1.2 : 1.05;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang === lang && /female|samantha|serena|libby|sonia|jenny|aria|google/i.test(x.name)) ?? voices.find((x) => x.lang === lang) ?? voices.find((x) => x.lang.startsWith(voiceLang === 'pt-MZ' ? 'pt' : 'en'));
    if (v) u.voice = v;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

/** Say something in Zuva's voice. Resolves when it has finished (or straight away when muted). */
export async function say(text: string, accent: Accent, pace: Pace = 'primary', lang: VoiceLang = 'en'): Promise<void> {
  const clean = text.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();
  if (!clean || muted.get()) return;
  stopSpeaking();
  if (!serverVoice || clean.length > 300 || (typeof navigator !== 'undefined' && !navigator.onLine)) return browserSay(clean, accent, pace, lang);
  const key = `${lang}|${accent}|${pace}|${clean}`;
  try {
    let url = clips.get(key);
    if (!url) {
      const res = await fetch('/api/esl/speak', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: clean, accent, pace, lang }) });
      if (!res.ok) {
        // Out of today's voice budget or not configured: use the device voice for the rest of the visit.
        if (res.status === 503 || res.status === 429) serverVoice = false;
        return browserSay(clean, accent, pace, lang);
      }
      url = URL.createObjectURL(await res.blob());
      clips.set(key, url);
    }
    await new Promise<void>((resolve) => {
      const a = new Audio(url);
      current = a;
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => browserSay(clean, accent, pace, lang).then(resolve));
    });
  } catch {
    return browserSay(clean, accent, pace, lang);
  }
}

export function useMutedEsl() {
  const [m, setM] = useState(muted.get);
  const toggle = useCallback(() => setM((x) => { setMuted(!x); return !x; }), []);
  return { muted: m, toggle };
}

// ── Microphone ───────────────────────────────────────────────────────────

export const micSupported = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t));
}

export type MicState = 'idle' | 'asking' | 'listening' | 'checking';

/**
 * Record a short answer (up to `maxMs`), stopping early after a moment of quiet once the learner
 * has spoken, so small children don't have to press stop. Audio goes to the server once to be
 * transcribed and is not stored.
 */
export function useMic(maxMs = 5000) {
  const [state, setState] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});
  useEffect(() => () => stopRef.current(), []);

  const record = useCallback(async (): Promise<Blob | null> => {
    setError(null);
    if (!micSupported()) { setError('This device can’t use the microphone here.'); return null; }
    setState('asking');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setState('idle');
      setError('Please allow the microphone so Zuva can hear you (or ask a grown-up to help).');
      return null;
    }
    stopSpeaking();
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let spoke = false, quietSince = 0, raf = 0;
    const started = Date.now();
    return new Promise<Blob | null>((resolve) => {
      const finish = () => { if (rec.state === 'recording') rec.stop(); };
      stopRef.current = finish;
      const loop = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        const l = Math.min(1, peak / 64);
        setLevel(l);
        if (l > 0.12) { spoke = true; quietSince = 0; } else if (spoke && !quietSince) quietSince = Date.now();
        const elapsed = Date.now() - started;
        if (elapsed > maxMs || (spoke && quietSince && Date.now() - quietSince > 900 && elapsed > 700)) return finish();
        raf = requestAnimationFrame(loop);
      };
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close().catch(() => {});
        setLevel(0);
        setState('checking');
        resolve(chunks.length && spoke ? new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }) : null);
        if (!spoke) { setState('idle'); setError('I didn’t hear anything. Try again a bit louder!'); }
      };
      rec.start();
      setState('listening');
      raf = requestAnimationFrame(loop);
    });
  }, [maxMs]);

  return { state, setState, level, error, setError, record, stop: () => stopRef.current() };
}

export interface HearResult { heard: string; ok: boolean; score: number; close: boolean }

export async function hear(blob: Blob, target: string, tier: EslTier, context: string[]): Promise<HearResult> {
  const fd = new FormData();
  fd.append('audio', blob, blob.type.includes('mp4') ? 'speech.m4a' : 'speech.webm');
  fd.append('target', target);
  fd.append('tier', tier);
  fd.append('context', context.slice(0, 20).join(', '));
  const res = await fetch('/api/esl/hear', { method: 'POST', credentials: 'same-origin', body: fd });
  const data = (await res.json().catch(() => null)) as (HearResult & { error?: { message: string } }) | null;
  if (!res.ok || !data) throw new Error(data?.error?.message ?? 'Zuva couldn’t hear that. Try again.');
  return data;
}

/** Rough test for a Portuguese passage (accented letters or common function words). */
const PT_HINT = /[ãõçâêôáéíóú]|\b(não|você|tu|em português|para|também|muito|está|estás|isto|porque|significa|palavra|quando|depois|fazer|podes)\b/i;

/**
 * Read a reply that mixes English with Portuguese explanations: each part in its own voice.
 * Portuguese is usually in brackets or on its own line (the persona asks Zuva to do that).
 */
export async function sayMixed(text: string, accent: Accent, pace: Pace, support: 'off' | 'pt-MZ'): Promise<void> {
  if (support !== 'pt-MZ') return say(text, accent, pace);
  const parts = text.split(/(\([^)]{3,}\)|\n+)/).map((p) => p.replace(/^\(|\)$/g, '').trim()).filter(Boolean);
  for (const p of parts) {
    if (muted.get()) return;
    await say(p, accent, pace, PT_HINT.test(p) ? 'pt-MZ' : 'en');
  }
}
