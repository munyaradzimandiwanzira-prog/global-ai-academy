/**
 * The Kids Zone learning curve: every level of every game placed on a Cambridge Primary stage
 * (plus Lower Secondary Stage 7) and tagged with the curriculum strands it practises.
 *
 * This is our own mapping to the strands of the Cambridge Primary Computing (0059), Science (0097)
 * and Mathematics (0096) curriculum frameworks. It is guidance for parents and teachers, not an
 * official alignment: it is not endorsed by Cambridge University Press & Assessment. The goals are
 * written in our own words; no framework text is reproduced.
 *
 * Plain data, shared by the app, the Zuva tutor and the MCP server.
 */

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Stage {
  id: StageId;
  name: string;
  /** Usual age during the stage. Schools vary; children can work above or below it. */
  ages: string;
  /** The Zimbabwe class most children are in at that age. Approximate. */
  grade: string;
  programme: 'Cambridge Primary' | 'Cambridge Lower Secondary';
  /** What a child at this stage is ready for, in a parent's words. */
  blurb: string;
}

export const STAGES: Stage[] = [
  { id: 1, name: 'Stage 1', ages: '5–6', grade: 'about Grade 1', programme: 'Cambridge Primary', blurb: 'Steps in order, simple patterns, input and output, pushes and pulls.' },
  { id: 2, name: 'Stage 2', ages: '6–7', grade: 'about Grade 2', programme: 'Cambridge Primary', blurb: 'Repeat loops, quarter turns, simple circuits, times tables 2, 5 and 10.' },
  { id: 3, name: 'Stage 3', ages: '7–8', grade: 'about Grade 3', programme: 'Cambridge Primary', blurb: 'Typed commands, number rules, networks, the parts inside a computer.' },
  { id: 4, name: 'Stage 4', ages: '8–9', grade: 'about Grade 4', programme: 'Cambridge Primary', blurb: 'Fair tests, binary numbers, if-rules for robots, strong shapes.' },
  { id: 5, name: 'Stage 5', ages: '9–10', grade: 'about Grade 5', programme: 'Cambridge Primary', blurb: 'First Python, angles in degrees, addresses on the internet, training data.' },
  { id: 6, name: 'Stage 6', ages: '10–11', grade: 'about Grade 6', programme: 'Cambridge Primary', blurb: 'Lists and loops in Python, gravity, fastest routes, fixing AI mistakes.' },
  { id: 7, name: 'Stage 7', ages: '11–12', grade: 'about Grade 7 or Form 1', programme: 'Cambridge Lower Secondary', blurb: 'The command line and other first steps into secondary computing.' },
];

export type Subject = 'computing' | 'science' | 'maths';
export type StrandId = 'ct' | 'prog' | 'data' | 'net' | 'sys' | 'physics' | 'earth' | 'biology' | 'tws' | 'number' | 'geometry';

export const SUBJECTS: { id: Subject; name: string; framework: string }[] = [
  { id: 'computing', name: 'Computing', framework: 'Cambridge Primary Computing (0059)' },
  { id: 'science', name: 'Science', framework: 'Cambridge Primary Science (0097)' },
  { id: 'maths', name: 'Maths', framework: 'Cambridge Primary Mathematics (0096)' },
];

export const STRANDS: Record<StrandId, { subject: Subject; name: string }> = {
  ct: { subject: 'computing', name: 'Computational thinking' },
  prog: { subject: 'computing', name: 'Programming' },
  data: { subject: 'computing', name: 'Managing data' },
  net: { subject: 'computing', name: 'Networks and digital communication' },
  sys: { subject: 'computing', name: 'Computer systems' },
  physics: { subject: 'science', name: 'Physics' },
  earth: { subject: 'science', name: 'Earth and space' },
  biology: { subject: 'science', name: 'Biology' },
  tws: { subject: 'science', name: 'Thinking and working scientifically' },
  number: { subject: 'maths', name: 'Number' },
  geometry: { subject: 'maths', name: 'Geometry and measure' },
};

export const STRAND_ORDER: StrandId[] = ['ct', 'prog', 'data', 'net', 'sys', 'physics', 'earth', 'biology', 'tws', 'number', 'geometry'];

export interface KidLevel {
  game: string;
  /** Key the game saves stars under (see kidsStore). */
  key: string;
  name: string;
  stage: StageId;
  strands: StrandId[];
  /** What the child can do after this level, in their words. */
  goal: string;
  /** Search string that opens the game on this level, e.g. "?level=3". */
  query: string;
}

type Row = [name: string, stage: StageId, strands: StrandId[], goal: string];

/** Levels opened with ?level=N (1-based), starred as `${prefix}:${N}`. */
const numbered = (game: string, prefix: string, rows: Row[]): KidLevel[] =>
  rows.map(([name, stage, strands, goal], i) => ({ game, key: `${prefix}:${i + 1}`, name, stage, strands, goal, query: `?level=${i + 1}` }));

/** Levels opened and starred by an id rather than a number. */
const named = (game: string, rows: [id: string, key: string, query: string, ...Row][]): KidLevel[] =>
  rows.map(([, key, query, name, stage, strands, goal]) => ({ game, key, name, stage, strands, goal, query }));

export const KID_LEVELS: KidLevel[] = [
  ...numbered('maze', 'maze', [
    ['Straight to the mango', 1, ['prog', 'ct'], 'I can give a robot step-by-step instructions.'],
    ['First turn', 1, ['prog'], 'I can use turns to change which way the robot faces.'],
    ['Zig-zag', 1, ['ct'], 'I can spot a pattern in my steps.'],
    ['Long road', 2, ['prog'], 'I can use a repeat block instead of copying blocks.'],
    ['Staircase loop', 2, ['prog', 'ct'], 'I can repeat a group of steps.'],
    ['Around the wall', 2, ['ct'], 'I can plan a route before I code it.'],
    ['Turn left to go up', 2, ['prog'], 'I can choose the right turn for the way the robot faces.'],
    ['Loop in a loop', 5, ['prog'], 'I can put one loop inside another.'],
    ['Long staircase', 3, ['prog', 'ct'], 'I can make one loop do a long job.'],
    ['Spiral', 4, ['ct'], 'I can find the parts that repeat in a tricky path.'],
  ]),
  ...numbered('bugs', 'bug', [
    ['Wrong turn', 1, ['ct'], 'I can find the wrong step in a set of instructions.'],
    ['Cup of tea', 1, ['ct'], 'I can put steps in the right order.'],
    ['Wonky square', 3, ['ct', 'geometry'], 'I can fix a turn so a shape joins up.'],
    ['Count to 5', 6, ['prog'], 'I can fix where a Python loop stops.'],
    ['Say hello', 5, ['prog'], 'I can spot a variable name spelt two ways.'],
    ['Bun money', 5, ['prog', 'number'], 'I can fix a sum inside a program.'],
    ['Too hot?', 5, ['prog'], 'I can fix the test in an if-statement.'],
    ['Fruit list', 6, ['prog', 'data'], 'I can loop over every item in a list.'],
    ['Average mark', 6, ['prog', 'number'], 'I can fix a formula for the average.'],
  ]),
  ...named('turtle', [
    ['line', 'turtle:line', '?challenge=line', 'A straight line', 2, ['prog', 'geometry'], 'I can type a command that moves the turtle.'],
    ['square', 'turtle:square', '?challenge=square', 'Square', 3, ['prog', 'geometry'], 'I can repeat moves and quarter turns to draw a square.'],
    ['triangle', 'turtle:triangle', '?challenge=triangle', 'Triangle', 5, ['prog', 'geometry'], 'I can work out the turn a triangle needs.'],
    ['hexagon', 'turtle:hexagon', '?challenge=hexagon', 'Hexagon', 5, ['prog', 'geometry'], 'I can use 360° ÷ sides to draw any shape.'],
    ['star', 'turtle:star', '?challenge=star', 'Star', 6, ['prog', 'geometry'], 'I can find the turn that makes a star.'],
    ['steps', 'turtle:steps', '?challenge=steps', 'Staircase', 3, ['prog', 'ct'], 'I can repeat a pattern of moves and turns.'],
  ]),
  ...numbered('pixels', 'pixel', [
    ['Flag stripes', 1, ['ct'], 'I can copy a picture square by square.'],
    ['Sky and land', 1, ['ct'], 'I can fill a whole row at once.'],
    ['Checkerboard', 2, ['ct'], 'I can spot a pattern and carry it on.'],
    ['Stone chevrons', 3, ['ct'], 'I can copy a repeating pattern.'],
    ['Zuva the sun', 3, ['sys', 'data'], 'I can explain that screen pictures are made of pixels.'],
  ]),
  ...numbered('binary', 'binary', [
    ['Three bulbs', 4, ['sys', 'number'], 'I can make the numbers up to 7 with three bulbs.'],
    ['Four bulbs', 5, ['sys', 'number'], 'I can make the numbers up to 15 in binary.'],
    ['Five bulbs', 5, ['sys', 'number'], 'I can make the numbers up to 31 in binary.'],
    ['A whole byte', 6, ['sys', 'number'], 'I can make any number up to 255, like a computer byte.'],
  ]),
  ...numbered('circuit', 'circuit', [
    ['Switch it on', 2, ['physics', 'tws'], 'I can build a full loop so a bulb lights up.'],
    ['Conductor or insulator?', 5, ['physics', 'tws'], 'I can test which materials let electricity through.'],
    ['Power from the sun', 5, ['physics', 'earth'], 'I can explain how sunlight powers a bulb.'],
  ]),
  ...named('math', [
    ['add10', 'math:+:0', '?mode=add&level=1', 'Adding to 10', 1, ['number'], 'I can add numbers to 10 quickly.'],
    ['sub10', 'math:−:0', '?mode=subtract&level=1', 'Taking away within 10', 1, ['number'], 'I can take away within 10 quickly.'],
    ['add20', 'math:+:1', '?mode=add&level=2', 'Adding to 20', 2, ['number'], 'I can add numbers to 20 without counting on fingers.'],
    ['times5', 'math:×:0', '?mode=times&level=1', 'Times tables to 5', 2, ['number'], 'I know my 2, 5 and 10 times tables.'],
    ['share5', 'math:÷:0', '?mode=share&level=1', 'Sharing into groups', 2, ['number'], 'I can share a number into equal groups.'],
    ['add50', 'math:+:2', '?mode=add&level=3', 'Adding to 50', 3, ['number'], 'I can add two-digit numbers in my head.'],
    ['times10', 'math:×:1', '?mode=times&level=2', 'Times tables to 10', 4, ['number'], 'I know all my times tables to 10 × 10.'],
    ['times12', 'math:×:2', '?mode=times&level=3', 'Times tables to 12', 5, ['number'], 'I can multiply quickly up to 12 × 12.'],
    ['mix100', 'math:mix:3', '?mode=mix&level=4', 'Mixed sums to 100', 6, ['number'], 'I can switch between all four operations fast.'],
  ]),
  ...named('safari', [
    ['science', 'safari:science', '?topic=science', 'Science with Ellie', 3, ['biology', 'physics'], 'I can answer questions about living things and materials.'],
    ['maths', 'safari:maths', '?topic=maths', 'Maths with Gigi', 3, ['number', 'geometry'], 'I can use number facts and shapes to answer puzzles.'],
    ['tech', 'safari:tech', '?topic=tech', 'Tech with Rhino Robo', 4, ['sys', 'net'], 'I can answer questions about computers and the internet.'],
    ['world', 'safari:world', '?topic=world', 'Our world with Leo', 3, ['earth'], 'I can answer questions about Earth and our country.'],
  ]),
  ...numbered('sorting', 'sorting', [
    ['In or out?', 1, ['sys'], 'I can sort devices into input and output.'],
    ['Inside the box', 3, ['sys'], 'I can name the parts inside a computer and their jobs.'],
    ['Tricky ones', 4, ['sys'], 'I can explain devices that are both input and output.'],
    ['Follow the photo', 5, ['sys', 'data'], 'I can follow data through input, processing, storage and output.'],
  ]),
  ...numbered('pcbuilder', 'pcbuilder', [
    ['Make it turn on', 4, ['sys'], 'I can choose the parts a computer needs to start.'],
    ['School computer', 5, ['sys'], 'I can pick parts that fit a job and a budget.'],
    ['Gaming PC', 6, ['sys', 'number'], 'I can check the power supply is big enough for the parts.'],
    ['Fix it!', 6, ['sys', 'ct'], 'I can find the faulty part and fix the computer.'],
  ]),
  ...numbered('terminal', 'terminal', [
    ['Look around', 5, ['sys', 'data'], 'I can list the files in a folder with a command.'],
    ['Into the folders', 5, ['sys', 'data'], 'I can move into a folder by typing.'],
    ['Find your way back', 6, ['sys', 'data'], 'I can use paths to move around a computer.'],
    ['Build a camp', 6, ['sys', 'data'], 'I can make new folders and files.'],
    ['Secret files', 7, ['sys', 'data'], 'I can find hidden files on a Linux computer.'],
  ]),
  ...numbered('functions', 'functions', [
    ['Add machine', 3, ['ct', 'number'], 'I can find a one-step rule from what goes in and out.'],
    ['Double machine', 3, ['ct', 'number'], 'I can spot a multiplying rule.'],
    ['Two-step machine', 5, ['ct', 'number'], 'I can work out a rule with two steps.'],
    ['Order matters', 5, ['ct', 'number'], 'I can show that swapping two steps changes the answer.'],
    ['Three steps', 6, ['ct', 'number'], 'I can work out a three-step rule.'],
  ]),
  ...numbered('launch', 'launch', [
    ['First throw', 2, ['physics', 'tws'], 'I can push harder or softer to change how far it goes.'],
    ['Baobab in the way', 3, ['physics', 'tws'], 'I can change the angle to clear an obstacle.'],
    ['Onto the roof', 4, ['physics', 'tws'], 'I can change one thing at a time to hit a target.'],
    ['Windy day', 5, ['physics', 'tws'], 'I can see how wind changes a flight and allow for it.'],
    ['On the Moon', 6, ['physics', 'earth'], 'I can explain why things fly further where gravity is weaker.'],
  ]),
  ...numbered('bridge', 'bridge', [
    ['Little stream', 4, ['physics', 'geometry'], 'I can use triangles to make a strong frame.'],
    ['Save River', 5, ['physics', 'geometry'], 'I can build a longer bridge that holds a truck.'],
    ['Tight budget', 5, ['physics', 'number'], 'I can make a strong bridge with fewer beams.'],
    ['Middle pier', 6, ['physics', 'geometry'], 'I can use a support in the middle to share the load.'],
  ]),
  ...numbered('packets', 'packets', [
    ['First packet', 3, ['net'], 'I can send a message across a network one hop at a time.'],
    ['Cable cut', 4, ['net', 'ct'], 'I can find another route when a link breaks.'],
    ['Find the address', 5, ['net'], 'I can explain how a name like news.zw finds a computer.'],
    ['Traffic jam', 6, ['net', 'ct'], 'I can choose the fastest route, not just the shortest.'],
  ]),
  ...numbered('linebot', 'linebot', [
    ['Straight line', 3, ['prog', 'sys'], 'I can use a sensor reading to move a robot.'],
    ['One corner', 4, ['prog'], 'I can write an if-rule that makes the robot turn.'],
    ['Zig-zag', 4, ['prog', 'ct'], 'I can test my rules and change them.'],
    ['Fork in the road', 5, ['prog'], 'I can choose between rules when there are two ways.'],
    ['Rock on the road', 6, ['prog', 'ct'], 'I can add a rule for something unexpected.'],
  ]),
  ...numbered('gamemaker', 'gamemaker', [
    ['A game you can win', 2, ['prog', 'ct'], 'I can design a level a player can finish.'],
    ['Collect them all', 3, ['prog', 'ct'], 'I can add a goal to my game.'],
    ['Danger zone', 4, ['prog', 'ct'], 'I can add hazards and test that my game still works.'],
    ['Just right', 5, ['ct'], 'I can tune a game so it is not too easy or too hard.'],
  ]),
  ...numbered('teachai', 'teachai', [
    ['Teach it', 4, ['data', 'ct'], 'I can label examples so a computer can learn.'],
    ['Missing examples', 5, ['data', 'ct'], 'I can explain why missing examples make an AI guess wrong.'],
    ['Fix the mistakes', 6, ['data', 'ct'], 'I can find wrong labels and fix them.'],
  ]),
];

export const stageOf = (id: number | null | undefined) => STAGES.find((s) => s.id === id);
export const levelsFor = (game: string) => KID_LEVELS.filter((l) => l.game === game);
export const levelsAt = (stage: StageId) => KID_LEVELS.filter((l) => l.stage === stage);

/** The youngest and oldest stage a game's levels are pitched at. */
export function stageRange(game: string): [StageId, StageId] | null {
  const s = levelsFor(game).map((l) => l.stage);
  return s.length ? [Math.min(...s) as StageId, Math.max(...s) as StageId] : null;
}

/** Strands a game practises, in curriculum order. */
export const strandsFor = (game: string): StrandId[] => {
  const set = new Set(levelsFor(game).flatMap((l) => l.strands));
  return STRAND_ORDER.filter((s) => set.has(s));
};

export const subjectsFor = (game: string): Subject[] => [...new Set(strandsFor(game).map((s) => STRANDS[s].subject))];

export const stageLabel = (r: [StageId, StageId] | null) => (!r ? '' : r[0] === r[1] ? `Stage ${r[0]}` : `Stages ${r[0]}–${r[1]}`);

export const levelHref = (l: KidLevel) => `/kids/${l.game}${l.query}`;
