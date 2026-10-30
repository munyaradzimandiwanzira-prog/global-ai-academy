/**
 * The Kids Zone games, in journey order. Plain data so the app, the Zuva agent and the
 * MCP server all describe the same games. (Pictures live in the app: src/features/kids/KidsArt.)
 */
export interface KidGame { id: string; title: string; text: string; place: string; color: string; skill: string; levels: number; topics: string[] }

export const KID_GAMES: KidGame[] = [
  { id: 'maze', title: 'Robo Maze', text: 'Snap code blocks together to guide Zuva to the mango.', place: 'Great Zimbabwe', color: '#23807F', skill: 'Sequences and loops', levels: 6, topics: ['sequences', 'loops', 'coding'] },
  { id: 'bugs', title: 'Bug Hunt', text: 'Every program has one bug. Find it and fix it.', place: 'Harare tech hub', color: '#B4472A', skill: 'Debugging', levels: 9, topics: ['debugging', 'coding'] },
  { id: 'turtle', title: 'Turtle Art', text: 'Type commands and watch the tortoise draw shapes.', place: 'Lake Kariba', color: '#5B8C3A', skill: 'Commands and angles', levels: 5, topics: ['commands', 'angles', 'shapes', 'coding'] },
  { id: 'pixels', title: 'Pixel Painter', text: 'Copy pictures on a grid. Whole rows at once are loops!', place: 'Mbare Art Market', color: '#C8302B', skill: 'Grids and loops', levels: 5, topics: ['grids', 'loops', 'art'] },
  { id: 'binary', title: 'Binary Bulbs', text: 'Light the bulbs to make numbers like a computer.', place: 'Bulawayo', color: '#B88A2E', skill: 'How computers count', levels: 4, topics: ['binary', 'computers', 'numbers'] },
  { id: 'circuit', title: 'Circuit Lab', text: 'Light a bulb, test metals and plastics, use the sun.', place: 'Hwange Solar', color: '#2F6FB2', skill: 'Electricity', levels: 3, topics: ['electricity', 'circuits', 'solar'] },
  { id: 'math', title: 'Math Sprint', text: 'How many sums can you solve in 60 seconds?', place: 'Victoria Falls', color: '#3577B8', skill: 'Mental maths', levels: 3, topics: ['maths', 'arithmetic'] },
  { id: 'safari', title: 'STEM Safari', text: 'Answer science and tech questions with the Big Five.', place: 'Hwange National Park', color: '#2E4A62', skill: 'Science and technology', levels: 3, topics: ['science', 'technology', 'quiz'] },
  { id: 'sorting', title: 'Computer Sort', text: 'Input, output, storage or processing? Sort the parts of a computer.', place: 'Masvingo', color: '#23807F', skill: 'How computers work', levels: 4, topics: ['computers', 'input', 'output', 'storage', 'hardware'] },
  { id: 'pcbuilder', title: 'PC Builder', text: 'Choose a processor, memory and power, then switch your computer on.', place: 'Marondera', color: '#3A8F4B', skill: 'Computer hardware', levels: 4, topics: ['hardware', 'computers', 'power', 'parts'] },
  { id: 'terminal', title: 'Terminal Treasure', text: 'Explore a Linux computer by typing commands to find hidden treasure.', place: 'Chinhoyi Caves', color: '#2E4A62', skill: 'Linux commands', levels: 5, topics: ['linux', 'terminal', 'command line', 'files'] },
  { id: 'functions', title: 'Function Factory', text: 'Test a secret number machine, then build one that matches it.', place: 'Kwekwe', color: '#B88A2E', skill: 'Functions and patterns', levels: 5, topics: ['functions', 'patterns', 'programming', 'algebra'] },
  { id: 'launch', title: 'Launch Lab', text: 'Throw mangoes into baskets. Change angle and power, even on the Moon!', place: 'Chimanimani Mountains', color: '#C8302B', skill: 'Forces and motion', levels: 5, topics: ['physics', 'forces', 'motion', 'gravity', 'projectiles'] },
  { id: 'bridge', title: 'Bridge Builder', text: 'Build a steel bridge strong enough for a truck, inside your budget.', place: 'Birchenough Bridge', color: '#B4472A', skill: 'Civil engineering', levels: 4, topics: ['civil engineering', 'bridges', 'structures', 'triangles'] },
  { id: 'packets', title: 'Packet Post', text: 'Route messages across the country’s internet, around broken cables.', place: 'Mutare', color: '#2F6FB2', skill: 'Networks and the internet', levels: 4, topics: ['networking', 'internet', 'routing', 'dns'] },
  { id: 'linebot', title: 'Line Bot', text: 'Write sensor rules so a robot follows the line to the flag.', place: 'Mazowe farms', color: '#5B8C3A', skill: 'Robotics and sensors', levels: 5, topics: ['robotics', 'sensors', 'robots', 'rules'] },
  { id: 'gamemaker', title: 'Game Maker', text: 'Design your own level, choose the rules, then play it.', place: 'Gweru', color: '#7A4FB8', skill: 'Game design', levels: 4, topics: ['game design', 'games', 'rules', 'level design'] },
  { id: 'teachai', title: 'Teach the Machine', text: 'Teach a computer to spot ripe mangoes. That is how AI learns!', place: 'Mutoko orchards', color: '#B0457A', skill: 'Artificial intelligence', levels: 3, topics: ['artificial intelligence', 'machine learning', 'data', 'bias'] },
];

export const kidGame = (id: string) => KID_GAMES.find((g) => g.id === id);
