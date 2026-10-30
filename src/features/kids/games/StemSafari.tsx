import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Star } from '@/components/icons';
import { useKidsStars } from '../kidsStore';
import { Zuva } from '../Zuva';
import { ElephantArt, GiraffeArt, RhinoArt, LionArt, TrophyArt } from '../KidsArt';
import { play } from '../sfx';
import { useCoach } from '../coach';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';

type Topic = 'science' | 'maths' | 'tech' | 'world';
interface Question { topic: Topic; q: string; options: string[]; answer: number; fact: string }

const GUIDES: Record<Topic, { animal: ComponentType<{ size?: number }>; name: string; color: string; label: string }> = {
  science: { animal: ElephantArt, name: 'Ellie the Elephant', color: '#23807F', label: 'Science' },
  maths: { animal: GiraffeArt, name: 'Gigi the Giraffe', color: '#3577B8', label: 'Maths' },
  tech: { animal: RhinoArt, name: 'Rhino Robo', color: '#7A4FB8', label: 'Tech & coding' },
  world: { animal: LionArt, name: 'Leo the Lion', color: '#B88A2E', label: 'Our world' },
};

const BANK: Question[] = [
  { topic: 'science', q: 'What do plants need from the sun to make their food?', options: ['Light', 'Sand', 'Wind', 'Noise'], answer: 0, fact: 'Plants use sunlight, water and carbon dioxide to make sugar. This is called photosynthesis.' },
  { topic: 'science', q: 'Which gas do we breathe in to stay alive?', options: ['Carbon dioxide', 'Oxygen', 'Helium', 'Steam'], answer: 1, fact: 'Our lungs take oxygen from the air and our blood carries it around the body.' },
  { topic: 'science', q: 'Water turns into ice at…', options: ['0 °C', '50 °C', '100 °C', '25 °C'], answer: 0, fact: 'Pure water freezes at 0 °C and boils at 100 °C at sea level.' },
  { topic: 'science', q: 'Which planet do we live on?', options: ['Mars', 'Jupiter', 'Earth', 'Venus'], answer: 2, fact: 'Earth is the third planet from the Sun.' },
  { topic: 'science', q: 'What is the biggest land animal on Earth?', options: ['Rhino', 'Hippo', 'Giraffe', 'African elephant'], answer: 3, fact: 'African elephants can weigh more than 6 tonnes!' },
  { topic: 'science', q: 'Solar panels turn sunlight into…', options: ['Water', 'Electricity', 'Food', 'Sound'], answer: 1, fact: 'Many homes and schools in Zimbabwe use solar panels to power lights and phones.' },
  { topic: 'science', q: 'Which part of the plant takes in water from the soil?', options: ['Flower', 'Leaf', 'Roots', 'Fruit'], answer: 2, fact: 'Roots soak up water and minerals and hold the plant in the ground.' },
  { topic: 'science', q: 'How many legs does an insect have?', options: ['4', '6', '8', '10'], answer: 1, fact: 'Insects have 6 legs. Spiders have 8, so spiders are not insects!' },
  { topic: 'science', q: 'What force pulls things down to the ground?', options: ['Magnetism', 'Gravity', 'Friction', 'Wind'], answer: 1, fact: 'Gravity is why a mango falls down from the tree, not up.' },
  { topic: 'science', q: 'A magnet will stick to…', options: ['Wood', 'Plastic', 'Iron', 'Glass'], answer: 2, fact: 'Magnets attract iron, nickel and cobalt.' },
  { topic: 'maths', q: 'What is 7 × 8?', options: ['54', '56', '64', '48'], answer: 1, fact: '7 × 8 = 56. A trick: 5, 6, 7, 8 → 56 = 7 × 8!' },
  { topic: 'maths', q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: 1, fact: 'Bees build honeycombs out of hexagons.' },
  { topic: 'maths', q: 'What is half of 50?', options: ['20', '25', '30', '15'], answer: 1, fact: 'Half means dividing by 2: 50 ÷ 2 = 25.' },
  { topic: 'maths', q: 'A kombi has 15 seats. 9 people get in. How many seats are empty?', options: ['5', '6', '7', '24'], answer: 1, fact: '15 − 9 = 6 empty seats.' },
  { topic: 'maths', q: 'How many degrees are in a full turn?', options: ['90', '180', '270', '360'], answer: 3, fact: 'A full circle is 360°. A right angle is 90°.' },
  { topic: 'maths', q: 'Which number is even?', options: ['7', '13', '18', '21'], answer: 2, fact: 'Even numbers can be split into two equal groups.' },
  { topic: 'maths', q: 'If a mango costs $1, how much do 4 mangoes cost?', options: ['$3', '$4', '$5', '$40'], answer: 1, fact: '4 × $1 = $4.' },
  { topic: 'maths', q: 'What is 100 − 37?', options: ['63', '73', '67', '57'], answer: 0, fact: '100 − 37 = 63. Check: 63 + 37 = 100.' },
  { topic: 'maths', q: 'How many minutes are in one hour?', options: ['30', '60', '100', '24'], answer: 1, fact: '60 minutes make an hour, and 24 hours make a day.' },
  { topic: 'maths', q: 'Which shape has 3 sides?', options: ['Square', 'Circle', 'Triangle', 'Rectangle'], answer: 2, fact: 'Triangles are very strong shapes — that’s why bridges use them.' },
  { topic: 'tech', q: 'What do we call a list of step-by-step instructions?', options: ['A song', 'An algorithm', 'A poem', 'A map'], answer: 1, fact: 'A recipe for sadza is an algorithm too!' },
  { topic: 'tech', q: 'In binary, computers use only two digits. Which ones?', options: ['1 and 2', '0 and 1', '5 and 10', 'A and B'], answer: 1, fact: '0 means off and 1 means on.' },
  { topic: 'tech', q: 'A mistake in a computer program is called a…', options: ['Bug', 'Bird', 'Byte', 'Bulb'], answer: 0, fact: 'Fixing mistakes is called debugging.' },
  { topic: 'tech', q: 'Which of these is a programming language?', options: ['Python', 'Elephant', 'Football', 'Mbira'], answer: 0, fact: 'Python is named after a comedy show, not the snake!' },
  { topic: 'tech', q: 'Doing the same thing again and again in code is called a…', options: ['Loop', 'Jump', 'Nap', 'Hop'], answer: 0, fact: 'Loops save us from writing the same line many times.' },
  { topic: 'tech', q: 'What does AI stand for?', options: ['Animal Island', 'Artificial Intelligence', 'Air Inside', 'All In'], answer: 1, fact: 'AI helps computers do things like recognise pictures and understand speech.' },
  { topic: 'tech', q: 'Which part is the “brain” of a computer?', options: ['Mouse', 'Screen', 'CPU (processor)', 'Speaker'], answer: 2, fact: 'The CPU follows millions of instructions every second.' },
  { topic: 'tech', q: 'A good password should be…', options: ['Your name', '123456', 'Long and secret', 'Shared with friends'], answer: 2, fact: 'Never share your password — not even with your best friend.' },
  { topic: 'tech', q: '8 bits make one…', options: ['Byte', 'Bite', 'Kilo', 'Pixel'], answer: 0, fact: 'One byte can store a number from 0 to 255.' },
  { topic: 'tech', q: 'Tiny dots that make up a picture on a screen are called…', options: ['Pixels', 'Pebbles', 'Petals', 'Puzzles'], answer: 0, fact: 'A phone screen has millions of pixels.' },
  { topic: 'world', q: 'Victoria Falls is on which river?', options: ['Limpopo', 'Zambezi', 'Save', 'Nile'], answer: 1, fact: 'Its local name, Mosi-oa-Tunya, means “the smoke that thunders”.' },
  { topic: 'world', q: 'What is the capital city of Zimbabwe?', options: ['Bulawayo', 'Mutare', 'Harare', 'Gweru'], answer: 2, fact: 'Harare is Zimbabwe’s largest city.' },
  { topic: 'world', q: 'Great Zimbabwe was built from…', options: ['Stone', 'Glass', 'Plastic', 'Metal'], answer: 0, fact: 'Its walls were built without mortar — the stones fit together perfectly!' },
  { topic: 'world', q: 'Lake Kariba was made by building a…', options: ['Bridge', 'Dam', 'Road', 'Tower'], answer: 1, fact: 'The Kariba Dam on the Zambezi makes electricity for Zimbabwe and Zambia.' },
  { topic: 'world', q: 'Which continent is Zimbabwe in?', options: ['Asia', 'Europe', 'Africa', 'South America'], answer: 2, fact: 'Africa has 54 countries.' },
  { topic: 'world', q: 'Which of these is one of Africa’s “Big Five” animals?', options: ['Zebra', 'Leopard', 'Giraffe', 'Hippo'], answer: 1, fact: 'The Big Five are the lion, leopard, elephant, rhino and buffalo.' },
  { topic: 'world', q: 'The tall tree with a very thick trunk that can store water is the…', options: ['Baobab', 'Pine', 'Palm', 'Oak'], answer: 0, fact: 'Some baobab trees are more than a thousand years old.' },
  { topic: 'world', q: 'How many official languages does Zimbabwe’s constitution recognise?', options: ['3', '8', '16', '2'], answer: 2, fact: 'Zimbabwe recognises 16 official languages, including English, Shona, Ndebele and sign language.' },
  { topic: 'world', q: 'Which ocean is closest to Zimbabwe?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 1, fact: 'Zimbabwe is landlocked, but the Indian Ocean is just across Mozambique.' },
  { topic: 'world', q: 'Which national park is Zimbabwe’s largest?', options: ['Hwange', 'Matobo', 'Nyanga', 'Mana Pools'], answer: 0, fact: 'Hwange National Park is home to tens of thousands of elephants.' },
];

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export default function StemSafari() {
  const coach = useCoach('safari');
  const { award } = useKidsStars();
  const [topic, setTopic] = useState<Topic | 'all' | null>(null);
  const [seed, setSeed] = useState(0);
  const questions = useMemo(() => (topic ? shuffle(BANK.filter((q) => topic === 'all' || q.topic === topic)).slice(0, 10) : []), [topic, seed]);
  const [i, setI] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const q = questions[i];
  const over = topic && (i >= questions.length || (lives === 0 && picked === null));

  const pick = (o: number) => {
    if (picked !== null || !q) return;
    setPicked(o);
    if (o === q.answer) { setScore((s) => s + 1); celebrate('small'); play('right'); coach.attempt(true); } else { setLives((l) => l - 1); play('wrong'); coach.attempt(false, `answered "${q.options[o]}" to "${q.q}"`); }
  };
  const next = () => {
    setPicked(null);
    const ni = i + 1;
    setI(ni);
    if (ni >= questions.length || lives === 0) {
      const s = score;
      const starsWon = s >= 9 ? 3 : s >= 6 ? 2 : s >= 3 ? 1 : 0;
      if (starsWon) award(`safari:${topic}`, starsWon);
    }
  };
  const restart = (t: Topic | 'all' | null) => { setTopic(t); setSeed((x) => x + 1); setI(0); setLives(3); setScore(0); setPicked(null); };

  if (!topic) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold">Choose your safari guide</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(Object.keys(GUIDES) as Topic[]).map((t) => (
            <motion.button key={t} whileHover={{ y: -4 }} whileTap={{ scale: 0.96 }} onClick={() => restart(t)} className="flex items-center gap-4 rounded-3xl border-4 border-ink bg-white p-5 text-left ">
              {(() => { const A = GUIDES[t].animal; return <A size={72} />; })()}
              <span><span className="block text-xl font-bold" style={{ color: GUIDES[t].color }}>{GUIDES[t].label}</span><span className="text-ink/60">with {GUIDES[t].name}</span></span>
            </motion.button>
          ))}
        </div>
        <button onClick={() => restart('all')} className="mt-5 rounded-2xl bg-ink px-6 py-3 text-lg font-bold text-white">🌍 Mixed safari — all topics</button>
      </div>
    );
  }

  if (over) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="flex justify-center">{lives === 0 ? <Zuva size={110} mood="oops" /> : <TrophyArt size={120} />}</div>
        <h2 className="mt-3 text-4xl font-bold">{score} / {questions.length}</h2>
        <div className="mt-2 flex justify-center gap-1">{[1, 2, 3].map((s) => <Star key={s} className={cn('h-10 w-10', s <= (score >= 9 ? 3 : score >= 6 ? 2 : score >= 3 ? 1 : 0) ? 'fill-gold text-gold' : 'text-ink/20')} />)}</div>
        <p className="mt-3 text-lg">{lives === 0 ? 'Out of hearts! Every explorer learns from mistakes.' : 'Safari complete — what an explorer!'}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => restart(topic)} className="rounded-2xl bg-[#5B8C3A] px-6 py-3 text-lg font-bold text-white">Play again</button>
          <button onClick={() => restart(null)} className="rounded-2xl border-4 border-ink bg-white px-6 py-3 text-lg font-bold">New guide</button>
        </div>
      </div>
    );
  }

  const guide = GUIDES[q!.topic];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-lg font-bold">Question {i + 1} / {questions.length}</span>
        <span className="flex gap-1" aria-label={`${lives} lives left`}>{[0, 1, 2].map((h) => <Heart key={h} className={cn('h-7 w-7', h < lives ? 'fill-red-500 text-red-500' : 'text-ink/20')} />)}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}>
          <div className="flex items-end gap-3">
            <motion.span className="inline-flex" animate={{ rotate: picked === null ? [0, -6, 6, 0] : picked === q!.answer ? [0, 15, -15, 0] : 0, y: picked === q!.answer ? [0, -20, 0] : 0 }} transition={{ duration: 0.8, repeat: picked === null ? Infinity : 0, repeatDelay: 1.5 }}><guide.animal size={96} /></motion.span>
            <div className="mb-3 rounded-3xl border-4 border-ink bg-white px-5 py-4 text-xl font-bold ">{q!.q}</div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {q!.options.map((o, oi) => (
              <motion.button key={o} whileTap={{ scale: 0.96 }} onClick={() => pick(oi)} disabled={picked !== null}
                className={cn('rounded-2xl border-4 px-5 py-4 text-left text-lg font-bold transition-colors',
                  picked === null ? 'border-ink/20 bg-white hover:border-ink' : oi === q!.answer ? 'border-[#5B8C3A] bg-[#DFF3D3]' : oi === picked ? 'border-red-400 bg-[#FDE0DC]' : 'border-ink/10 bg-white opacity-60')}>
                {o}
              </motion.button>
            ))}
          </div>
          {picked !== null && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-5 rounded-3xl bg-white p-5">
              <p className="text-lg font-bold">{picked === q!.answer ? 'Correct!' : 'Not quite!'}</p>
              <p className="mt-1">{q!.fact}</p>
              <button onClick={next} className="mt-4 rounded-2xl bg-ink px-6 py-3 font-bold text-white">{i + 1 < questions.length && lives > 0 ? 'Next question ➜' : 'See my score'}</button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
