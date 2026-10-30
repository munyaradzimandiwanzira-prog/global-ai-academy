import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio } from './api';
import { errorMessage } from '@/lib/api';

/**
 * Dictation: record a short clip with the microphone and turn it into text.
 * Works in every modern browser (MediaRecorder), including Safari, so children on shared phones
 * and laptops can talk to Zuva instead of typing. Audio is sent once for transcription and never stored.
 */
export type DictationState = 'idle' | 'asking' | 'recording' | 'transcribing';

const MAX_MS = 45_000;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t));
}

export function dictationSupported(): boolean {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

export function useDictation(onText: (text: string) => void) {
  const [state, setState] = useState<DictationState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const tick = useRef<ReturnType<typeof setInterval>>();
  const audioCtx = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(raf.current);
    clearTimeout(timer.current);
    clearInterval(tick.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => { rec.current?.state === 'recording' && rec.current.stop(); cleanup(); }, [cleanup]);

  const stop = useCallback(() => {
    if (rec.current?.state === 'recording') rec.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!dictationSupported()) { setError('Talking to Zuva needs a newer browser. You can type instead!'); return; }
    setState('asking');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      cleanup();
      setState('idle');
      setError((e as DOMException)?.name === 'NotAllowedError' ? 'Zuva needs permission to use the microphone. Allow it in your browser, or type instead.' : 'No microphone found. You can type instead!');
      return;
    }
    const mime = pickMime();
    const r = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    rec.current = r;
    chunks.current = [];
    r.ondataavailable = (ev) => { if (ev.data.size) chunks.current.push(ev.data); };
    r.onstop = async () => {
      cleanup();
      const blob = new Blob(chunks.current, { type: r.mimeType || mime || 'audio/webm' });
      if (blob.size < 1500) { setState('idle'); setError('I didn’t hear anything. Hold the microphone button while you talk.'); return; }
      setState('transcribing');
      try {
        const text = await transcribeAudio(blob);
        if (text) onText(text);
        else setError('I couldn’t catch that. Try again a little closer to the microphone.');
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setState('idle');
      }
    };
    // A simple volume meter so children can see Zuva is listening.
    try {
      audioCtx.current = new AudioContext();
      const analyser = audioCtx.current.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.current.createMediaStreamSource(stream.current).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 64));
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      /* meter is optional */
    }
    r.start(250);
    setSeconds(0);
    const started = Date.now();
    tick.current = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    timer.current = setTimeout(stop, MAX_MS);
    setState('recording');
  }, [cleanup, onText, stop]);

  const toggle = useCallback(() => (state === 'recording' ? stop() : state === 'idle' ? void start() : undefined), [start, state, stop]);

  return { state, error, level, seconds, start, stop, toggle, clearError: () => setError(null), supported: dictationSupported() };
}
