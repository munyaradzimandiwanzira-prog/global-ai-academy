import { useCallback, useEffect, useState } from 'react';
import { storage } from '@/lib/utils';

/**
 * Tiny sound kit for the Kids Zone, synthesised with Web Audio (no audio files to download on
 * a data bundle). Muted state is remembered per device. Read-aloud uses the browser's own voices.
 */
const muted = storage<boolean>('gaa:kids:muted:v1', false);
let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

export type Sound = 'tap' | 'right' | 'wrong' | 'win' | 'step';

export function play(sound: Sound) {
  if (muted.get() || typeof window === 'undefined') return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    if (sound === 'tap') tone(660, 0, 0.06, 'triangle', 0.06);
    if (sound === 'step') tone(520, 0, 0.08, 'triangle', 0.07);
    if (sound === 'right') { tone(660, 0, 0.12); tone(990, 0.1, 0.18); }
    if (sound === 'wrong') { tone(240, 0, 0.18, 'square', 0.05); tone(180, 0.15, 0.22, 'square', 0.05); }
    if (sound === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle', 0.1));
  } catch {
    /* audio unavailable: silently skip */
  }
}

export function speak(text: string) {
  if (muted.get() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ''));
  u.rate = 0.95;
  u.pitch = 1.1;
  const voice = window.speechSynthesis.getVoices().find((v) => /en[-_](ZA|GB|US)/i.test(v.lang));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function useMuted() {
  const [isMuted, set] = useState(muted.get);
  useEffect(() => { muted.set(isMuted); if (isMuted && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }, [isMuted]);
  const toggle = useCallback(() => set((m) => !m), []);
  return { muted: isMuted, toggle };
}
