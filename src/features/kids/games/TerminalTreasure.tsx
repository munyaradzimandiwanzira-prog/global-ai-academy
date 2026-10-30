import { useEffect, useRef, useState } from 'react';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { dir, file, nodeAt, pathString, run, type Shell } from './engines/terminal';
import { LevelTabs, StarRow, kidButton } from './common';

interface Mission {
  name: string;
  brief: string;
  make: () => Shell;
  /** Done when this returns true after a command. */
  done: (s: Shell, line: string, out: string[]) => boolean;
  /** Commands a quick solver needs, used to award stars (fewer commands = more stars). */
  par: number;
  hints: string[];
}

const home = ['home', 'zuva'];

const MISSIONS: Mission[] = [
  {
    name: 'Look around', par: 2,
    brief: 'You are inside a computer that runs Linux. Type ls and press Enter to see what is here. Then read the note with cat note.txt',
    make: () => ({ home, cwd: home, fs: dir({ home: dir({ zuva: dir({ 'note.txt': file('Welcome, explorer!\nThe password for level 2 is: MOSI'), photos: dir({ 'falls.jpg': file('(a picture of Victoria Falls)') }) }) }) }) }),
    done: (_s, line, out) => line.startsWith('cat') && out.join(' ').includes('MOSI'),
    hints: ['Type exactly: ls   then press Enter.', 'Now type: cat note.txt', 'cat shows what is inside a file. ls shows what is in a folder.'],
  },
  {
    name: 'Into the folders', par: 4,
    brief: 'Treasure is hidden in the kariba folder, inside another folder. Use cd to go into folders and ls to look. Read treasure.txt when you find it!',
    make: () => ({ home, cwd: home, fs: dir({ home: dir({ zuva: dir({ kariba: dir({ boats: dir({ 'ticket.txt': file('A boat ticket. Not treasure.') }), island: dir({ 'treasure.txt': file('You found the Kariba treasure: 10 golden fish!') }) }), notes: dir({}) }) }) }) }),
    done: (_s, line, out) => line.startsWith('cat') && out.join(' ').includes('golden fish'),
    hints: ['Type: cd kariba   to go into that folder.', 'Use ls to see the folders inside kariba. Which one sounds like it hides treasure?', 'Try: cd island   then   ls   then   cat treasure.txt'],
  },
  {
    name: 'Find your way back', par: 3,
    brief: 'You are lost deep in the folders. Use pwd to see where you are, cd .. to go up one folder, and get back to /home/zuva. Then read home.txt',
    make: () => ({ home, cwd: ['home', 'zuva', 'trip', 'day1', 'morning'], fs: dir({ home: dir({ zuva: dir({ 'home.txt': file('Welcome home! You climbed back up the folder tree.'), trip: dir({ day1: dir({ morning: dir({ 'breakfast.txt': file('Sadza and eggs.') }) }) }) }) }) }) }),
    done: (s, line, out) => pathString(s.cwd) === '/home/zuva' && line.startsWith('cat') && out.join(' ').includes('Welcome home'),
    hints: ['Type pwd to see where you are now.', 'cd .. takes you up one folder. Do it until pwd says /home/zuva.', 'Shortcut: cd ~ jumps straight home. Then: cat home.txt'],
  },
  {
    name: 'Build a camp', par: 3,
    brief: 'Make a new folder called camp. Go into it and make a file called tent.txt.',
    make: () => ({ home, cwd: home, fs: dir({ home: dir({ zuva: dir({ 'plan.txt': file('Make a folder called camp. Put a file called tent.txt inside it.') }) }) }) }),
    done: (s) => nodeAt(s.fs, [...home, 'camp', 'tent.txt'])?.type === 'file',
    hints: ['mkdir makes a folder. Try: mkdir camp', 'Go inside: cd camp', 'touch makes an empty file. Try: touch tent.txt'],
  },
  {
    name: 'Secret files', par: 3,
    brief: 'Some files are hidden. Their names start with a dot. Find the secret code in the vault folder.',
    make: () => ({ home, cwd: home, fs: dir({ home: dir({ zuva: dir({ vault: dir({ 'empty.txt': file('Nothing to see here... or is there?'), '.code.txt': file('The secret code is 2-7-1-8. Shh!') }) }) }) }) }),
    done: (_s, line, out) => line.startsWith('cat') && out.join(' ').includes('2-7-1-8'),
    hints: ['Go into the vault: cd vault', 'ls hides files that start with a dot. Try: ls -a', 'Now read it: cat .code.txt'],
  },
];

interface Line { kind: 'in' | 'out'; text: string; cwd?: string }

export default function TerminalTreasure() {
  const { award } = useKidsStars();
  const coach = useCoach('terminal');
  const [mi, setMi] = useState(0);
  const M = MISSIONS[mi]!;
  const [shell, setShell] = useState<Shell>(M.make);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const [count, setCount] = useState(0);
  const [won, setWon] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShell(M.make()); setLines([{ kind: 'out', text: 'Type help to see the commands.' }]); setInput(''); setCount(0); setWon(null);
    coach.level(mi + 1, M.brief, M.hints);
  }, [mi]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [lines]);

  const submit = (raw: string) => {
    const line = raw.trim();
    if (!line || won !== null) return;
    const r = run(shell, line);
    const prompt = pathString(shell.cwd).replace('/home/zuva', '~');
    setHistory((h) => [line, ...h].slice(0, 30));
    setHIdx(-1);
    setInput('');
    const n = count + 1;
    setCount(n);
    if (r.out === null) { setLines([]); setShell(r.shell); return; }
    setLines((ls) => [...ls, { kind: 'in', text: line, cwd: prompt }, ...r.out!.map((t) => ({ kind: 'out' as const, text: t }))]);
    setShell(r.shell);
    const bad = r.out.some((t) => /not found|cannot|no folder|no file|which file/.test(t));
    play(bad ? 'wrong' : 'tap');
    if (M.done(r.shell, line, r.out)) {
      const stars = n <= M.par + 2 ? 3 : n <= M.par + 6 ? 2 : 1;
      setWon(stars);
      award(`terminal:${mi + 1}`, stars);
      coach.attempt(true, `solved with ${n} commands`);
      coach.complete(stars);
      play('win');
      celebrate('big');
    } else if (bad) coach.attempt(false, `typed "${line}" → ${r.out[0]}`);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <LevelTabs prefix="terminal" count={MISSIONS.length} current={mi} onPick={setMi} labels={MISSIONS.map((m) => m.name)} />
      <div className="mb-3 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : 'happy'} />
        <div className="flex-1"><SpeechBubble>{won ? 'Mission complete! Real programmers use these same commands every day.' : M.brief}</SpeechBubble></div>
      </div>
      <div className="overflow-hidden rounded-[24px] border-4 border-ink bg-[#0F1B33] text-[#D6EBE8]" onClick={() => field.current?.focus()}>
        <div className="flex items-center gap-2 bg-[#2E4A62] px-4 py-2 text-sm font-bold text-white">
          <span className="h-3 w-3 rounded-full bg-[#F28B82]" /><span className="h-3 w-3 rounded-full bg-[#F7C35C]" /><span className="h-3 w-3 rounded-full bg-[#8FD3D1]" />
          <span className="ml-2">zuva@kids-computer</span>
        </div>
        <div ref={box} className="h-72 overflow-y-auto p-4 font-mono text-[15px] leading-relaxed" aria-live="polite">
          {lines.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-words">
              {l.kind === 'in' ? <><span className="text-[#8FD3D1]">zuva:{l.cwd}$</span> <span className="text-white">{l.text}</span></> : l.text}
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="flex items-center gap-2">
            <label htmlFor="term-in" className="shrink-0 text-[#8FD3D1]">zuva:{pathString(shell.cwd).replace('/home/zuva', '~')}$</label>
            <input
              id="term-in"
              ref={field}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') { e.preventDefault(); const i = Math.min(hIdx + 1, history.length - 1); setHIdx(i); setInput(history[i] ?? ''); }
                if (e.key === 'ArrowDown') { e.preventDefault(); const i = Math.max(hIdx - 1, -1); setHIdx(i); setInput(i < 0 ? '' : history[i] ?? ''); }
              }}
              autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off"
              disabled={won !== null}
              className="min-w-0 flex-1 bg-transparent text-white caret-[#F7C35C] outline-none"
            />
          </form>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {['ls', 'pwd', 'cd ..', 'cd ~', 'help'].map((c) => (
          <button key={c} onClick={() => submit(c)} className="min-h-11 rounded-full border-2 border-ink bg-white px-4 font-mono font-bold active:scale-95">{c}</button>
        ))}
      </div>
      {won !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <StarRow n={won} /> <span className="font-bold">{count} commands</span>
          {mi < MISSIONS.length - 1 && <button onClick={() => setMi(mi + 1)} className={`${kidButton} bg-[#23807F] text-white`}>Next mission</button>}
        </div>
      )}
    </div>
  );
}
