import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Volume2, VolumeX } from '@/components/icons';
import { Zuva, SpeechBubble } from './Zuva';
import { useKidsStars } from './kidsStore';
import { useMuted } from './sfx';
import { RobotArt, TurtleArt, StopwatchArt, BulbArt, LionArt, BugArt, PixelArt, BatteryArt, SnakeArt, ChevronStrip } from './KidsArt';
import { useAuth } from '@/lib/auth';
import { Photo } from '@/components/Photo';
import { cn } from '@/lib/utils';

type Art = ComponentType<{ size?: number; className?: string }>;

/**
 * Every game is a stop on Zuva's journey across Zimbabwe. The place is part of the story,
 * so children meet their own country while they learn to think like coders.
 */
export const KID_GAMES: { id: string; title: string; text: string; place: string; art: Art; color: string; skill: string; levels: number }[] = [
  { id: 'maze', title: 'Robo Maze', text: 'Snap code blocks together to guide Zuva to the mango.', place: 'Great Zimbabwe', art: RobotArt, color: '#23807F', skill: 'Sequences and loops', levels: 6 },
  { id: 'bugs', title: 'Bug Hunt', text: 'Every program has one bug. Find it and fix it.', place: 'Harare tech hub', art: BugArt, color: '#B4472A', skill: 'Debugging', levels: 9 },
  { id: 'turtle', title: 'Turtle Art', text: 'Type commands and watch the tortoise draw shapes.', place: 'Lake Kariba', art: TurtleArt, color: '#5B8C3A', skill: 'Commands and angles', levels: 5 },
  { id: 'pixels', title: 'Pixel Painter', text: 'Copy pictures on a grid. Whole rows at once are loops!', place: 'Mbare Art Market', art: PixelArt, color: '#C8302B', skill: 'Grids and loops', levels: 5 },
  { id: 'binary', title: 'Binary Bulbs', text: 'Light the bulbs to make numbers like a computer.', place: 'Bulawayo', art: BulbArt, color: '#B88A2E', skill: 'How computers count', levels: 4 },
  { id: 'circuit', title: 'Circuit Lab', text: 'Light a bulb, test metals and plastics, use the sun.', place: 'Hwange Solar', art: BatteryArt, color: '#2F6FB2', skill: 'Electricity', levels: 3 },
  { id: 'math', title: 'Math Sprint', text: 'How many sums can you solve in 60 seconds?', place: 'Victoria Falls', art: StopwatchArt, color: '#3577B8', skill: 'Mental maths', levels: 3 },
  { id: 'safari', title: 'STEM Safari', text: 'Answer science and tech questions with the Big Five.', place: 'Hwange National Park', art: LionArt, color: '#2E4A62', skill: 'Science and technology', levels: 3 },
];

export function MuteButton({ className }: { className?: string }) {
  const { muted, toggle } = useMuted();
  return (
    <button onClick={toggle} aria-pressed={muted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-white transition-transform active:scale-90', className)}>
      {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  );
}

export default function KidsHome() {
  const { total, stars } = useKidsStars();
  const { user } = useAuth();
  const starsFor = (id: string) => Object.entries(stars).filter(([k]) => k.startsWith(`${id === 'pixels' ? 'pixel' : id === 'bugs' ? 'bug' : id}:`)).reduce((n, [, v]) => n + v, 0);

  return (
    <div className="min-h-screen bg-[#EEF4F3] font-kids text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <Link to="/" className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Grown-up site</Link>
        <div className="flex items-center gap-2">
          <MuteButton />
          <motion.div key={total} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="flex h-11 items-center gap-2 rounded-full bg-white px-4 font-semibold tabular"><Star className="h-5 w-5 fill-gold text-gold" /> {total} stars</motion.div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-end gap-x-8 gap-y-6 px-5 pb-10 pt-4 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_300px]">
        <motion.div initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }} className="justify-self-center">
          <Zuva size={170} />
        </motion.div>
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.05] sm:text-7xl">Kids Zone</h1>
          <ChevronStrip className="mt-3 h-4 w-56" />
          <div className="mt-6 max-w-2xl">
            <SpeechBubble>
              Mhoro! I’m Zuva, the little sun robot. {user ? `Welcome back, ${user.name.split(' ')[0]}!` : 'Come on a journey across Zimbabwe with me.'} Every stop is a game, and every level earns stars.
            </SpeechBubble>
          </div>
        </div>
        {/* Real learners, softly faded into the page so the games stay the focus. */}
        <Photo
          name="kids-zone"
          sizes="300px"
          className="hidden h-[380px] w-[300px] self-end overflow-hidden rounded-t-[28px] lg:block [mask-image:linear-gradient(180deg,#000_55%,transparent)]"
          imgClassName="object-[50%_30%]"
        />
      </section>

      <main className="relative bg-[#D6EBE8] px-5 pb-20 pt-14">
        <svg className="absolute -top-px left-0 h-10 w-full" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0 H1440 V10 Q1080 40 720 18 T0 22 Z" fill="#EEF4F3" /></svg>
        <h2 className="mx-auto max-w-6xl text-3xl font-bold sm:text-4xl">Zuva’s journey</h2>
        <ol className="relative mx-auto mt-10 max-w-6xl">
          {/* The road: a real path the stops sit on (desktop), a simple line on phones. */}
          <span aria-hidden="true" className="absolute bottom-6 left-[27px] top-6 w-3 rounded-full bg-[#9CCBC6] md:left-1/2 md:-ml-1.5" />
          {KID_GAMES.map((g, i) => {
            const right = i % 2 === 1;
            const earned = starsFor(g.id);
            const max = g.levels * 3;
            return (
              <motion.li
                key={g.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                className={cn('relative mb-8 pl-20 md:mb-4 md:w-1/2 md:pl-0', right ? 'md:ml-auto md:pl-14' : 'md:pr-14')}
              >
                <span aria-hidden="true" className={cn('absolute left-[14px] top-8 flex h-9 w-9 items-center justify-center rounded-full border-4 border-ink bg-white text-sm font-bold md:top-10', right ? 'md:-left-[18px]' : 'md:left-auto md:-right-[18px]')}>{i + 1}</span>
                <Link to={`/kids/${g.id}`} className="group flex items-center gap-5 rounded-[28px] border-4 border-ink bg-white p-5 transition-transform duration-200 ease-out hover:-translate-y-1 active:scale-[.98]">
                  <motion.span whileHover={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.5 }} className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl" style={{ background: `${g.color}1f` }}>
                    <g.art size={76} />
                  </motion.span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold" style={{ color: g.color }}>{g.place}</span>
                    <span className="block text-2xl font-bold">{g.title}</span>
                    <span className="mt-1 block text-[16px] leading-snug text-ink/75">{g.text}</span>
                    <span className="mt-2 flex items-center gap-1.5 text-sm font-semibold tabular">
                      <Star className={cn('h-4 w-4', earned ? 'fill-gold text-gold' : 'text-ink/40')} /> {earned} of {max} stars · {g.skill}
                    </span>
                  </span>
                </Link>
              </motion.li>
            );
          })}
          <motion.li initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative pl-20 md:mx-auto md:w-2/3 md:pl-0">
            <Link to="/learn/kids-coding" className="flex items-center gap-5 rounded-[28px] border-4 border-ink bg-ink p-6 text-white transition-transform hover:-translate-y-1">
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white/10"><SnakeArt size={76} /></span>
              <span>
                <span className="block text-sm font-semibold text-gold">The last stop</span>
                <span className="block text-2xl font-bold">My First Python</span>
                <span className="mt-1 block text-white/85">Ready for real code? Write Python that talks, counts and draws, right here.</span>
              </span>
            </Link>
          </motion.li>
        </ol>
        <p className="mx-auto mt-14 max-w-2xl text-center text-[15px] text-ink/75">For parents and teachers: games need no account and collect no personal data. Sign in to save stars across devices. Tap the speaker on any speech bubble to hear it read aloud.</p>
      </main>
    </div>
  );
}
