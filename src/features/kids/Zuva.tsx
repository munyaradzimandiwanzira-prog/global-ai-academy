import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { speak } from './sfx';

/** Zuva — the Kids Zone mascot: a little sun-robot. Original artwork. */
export function Zuva({ size = 120, mood = 'happy', className }: { size?: number; mood?: 'happy' | 'wow' | 'oops' | 'think'; className?: string }) {
  const mouth =
    mood === 'happy' ? 'M40 66 Q50 76 60 66' : mood === 'wow' ? 'M46 66 a4 5 0 1 0 8 0 a4 5 0 1 0 -8 0' : mood === 'oops' ? 'M40 72 Q50 64 60 72' : 'M42 70 L58 68';
  return (
    <motion.svg
      viewBox="0 0 100 110"
      width={size}
      height={size * 1.1}
      className={className}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      role="img"
      aria-label="Zuva the robot"
    >
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} style={{ originX: '50px', originY: '56px' }}>
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="48" y="6" width="4" height="12" rx="2" fill="#F2B544" transform={`rotate(${i * 30} 50 56)`} />
        ))}
      </motion.g>
      <line x1="50" y1="22" x2="50" y2="12" stroke="#142B52" strokeWidth="3" strokeLinecap="round" />
      <motion.circle cx="50" cy="10" r="5" fill="#3FA3A1" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
      <circle cx="50" cy="56" r="32" fill="#F7C35C" stroke="#B88A2E" strokeWidth="3" />
      <rect x="28" y="40" width="44" height="34" rx="12" fill="#142B52" />
      <motion.g animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.9, 0.95, 1] }} style={{ originY: '52px' }}>
        <circle cx="40" cy="53" r="5" fill={mood === 'oops' ? '#F28B82' : '#8FD3D1'} />
        <circle cx="60" cy="53" r="5" fill={mood === 'oops' ? '#F28B82' : '#8FD3D1'} />
      </motion.g>
      <path d={mouth} stroke="#F7C35C" strokeWidth="3" fill={mood === 'wow' ? '#F7C35C' : 'none'} strokeLinecap="round" />
      <circle cx="30" cy="66" r="3" fill="#F28B82" opacity=".6" />
      <circle cx="70" cy="66" r="3" fill="#F28B82" opacity=".6" />
      <rect x="36" y="88" width="10" height="16" rx="4" fill="#142B52" />
      <rect x="54" y="88" width="10" height="16" rx="4" fill="#142B52" />
    </motion.svg>
  );
}

/** Zuva's speech bubble. Young learners can tap the speaker to hear it read aloud. */
export function SpeechBubble({ children, readAloud = true }: { children: React.ReactNode; readAloud?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="relative flex items-start gap-3 rounded-3xl border-4 border-ink bg-white px-5 py-3 font-kids text-lg font-medium text-ink">
      <span ref={ref} className="flex-1">{children}</span>
      {readAloud && typeof window !== 'undefined' && 'speechSynthesis' in window && (
        <button type="button" onClick={() => speak(ref.current?.textContent ?? '')} className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFE2A8] text-ink transition-transform hover:scale-105 active:scale-95" aria-label="Read this to me">
          <Volume2 className="h-5 w-5" />
        </button>
      )}
      <span className="absolute -bottom-3 left-10 h-5 w-5 rotate-45 border-b-4 border-r-4 border-ink bg-white" />
    </motion.div>
  );
}
