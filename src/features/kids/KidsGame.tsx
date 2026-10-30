import { lazy, Suspense } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star } from '@/components/icons';
import { KID_GAMES, MuteButton } from './KidsHome';
import { useKidsStars } from './kidsStore';
import { Spinner } from '@/components/ui';

const GAMES = {
  maze: lazy(() => import('./games/RoboMaze')),
  turtle: lazy(() => import('./games/TurtleArt')),
  math: lazy(() => import('./games/MathSprint')),
  binary: lazy(() => import('./games/BinaryBulbs')),
  safari: lazy(() => import('./games/StemSafari')),
  bugs: lazy(() => import('./games/BugHunt')),
  pixels: lazy(() => import('./games/PixelPainter')),
  circuit: lazy(() => import('./games/CircuitLab')),
  sorting: lazy(() => import('./games/ComputerSort')),
  pcbuilder: lazy(() => import('./games/PCBuilder')),
  terminal: lazy(() => import('./games/TerminalTreasure')),
  functions: lazy(() => import('./games/FunctionFactory')),
  launch: lazy(() => import('./games/LaunchLab')),
  bridge: lazy(() => import('./games/BridgeBuilder')),
  packets: lazy(() => import('./games/PacketPost')),
  linebot: lazy(() => import('./games/LineBot')),
  gamemaker: lazy(() => import('./games/GameMaker')),
  teachai: lazy(() => import('./games/TeachMachine')),
} as const;

export default function KidsGame() {
  const { game = '' } = useParams();
  const { total } = useKidsStars();
  const meta = KID_GAMES.find((g) => g.id === game);
  const Game = GAMES[game as keyof typeof GAMES];
  if (!meta || !Game) return <Navigate to="/kids" replace />;
  return (
    <div className="min-h-screen bg-[#EEF4F3] font-kids text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/kids" className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> All games</Link>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><meta.art size={40} />{meta.title}</h1>
        <div className="flex items-center gap-2">
          <MuteButton className="hidden sm:flex" />
          <div className="flex h-11 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold tabular"><Star className="h-4 w-4 fill-gold text-gold" /> {total}</div>
        </div>
      </header>
      <main className="px-4 pb-12 pt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><Spinner label="Loading game…" /></div>}>
          <Game />
        </Suspense>
      </main>
    </div>
  );
}
