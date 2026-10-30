/**
 * Hands-on experiments Zuva can suggest. Every one was chosen to be cheap, made from things a
 * family or school in Zimbabwe can find, and safe for children with the stated level of adult help.
 * The planner sub-agent adapts these; it must not invent experiments outside this safety envelope.
 *
 * Safety levels: easy = a child can do it alone; helper = an adult nearby; adult = an adult does one step.
 * Never: mains electricity, fire or open flames, chemicals beyond kitchen ones, car or lithium batteries.
 */
import type { ExperimentCard } from '@shared/zuva';

export interface Experiment extends Omit<ExperimentCard, 'kind'> { id: string; topics: string[]; minAge: number }

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'lemon-battery', title: 'Lemon battery', minAge: 8, topics: ['electricity', 'circuits', 'energy', 'chemistry', 'battery'], game: 'circuit',
    goal: 'Make electricity from lemons and light a small LED.',
    safety: { level: 'helper', rules: ['Ask an adult to help push the nails and coins into the lemons.', 'Do not eat the lemons afterwards.', 'Wash your hands when you finish.'] },
    materials: [
      { item: 'Lemons', qty: '4', where: 'market or kitchen', approxUsd: 1, substitute: 'Potatoes work too' },
      { item: 'Galvanised (silver-coloured) nails', qty: '4', where: 'hardware shop', approxUsd: 0.5 },
      { item: 'Copper coins or short copper wires', qty: '4', where: 'home or hardware shop', approxUsd: 0.5, substitute: 'Bare copper from an old cable, with an adult' },
      { item: 'Crocodile-clip wires', qty: '5', where: 'electronics shop', approxUsd: 2, substitute: 'Thin wire twisted tightly' },
      { item: 'Small red LED', qty: '1', where: 'electronics shop', approxUsd: 0.2 },
    ],
    steps: ['Roll each lemon on the table to make it juicy.', 'Push one nail and one copper coin into each lemon, about 2 cm apart. They must not touch.', 'Join the copper of lemon 1 to the nail of lemon 2, and so on, in a chain.', 'Connect the free copper to the LED’s long leg and the free nail to the short leg.', 'Turn the lights off and look closely. Does it glow? If not, flip the LED round.'],
    science: 'Two different metals in an acid make a tiny voltage. One lemon gives about 0.9 volts; joining four in a row adds them up, enough for an LED.',
    tryNext: 'Try 2, 3 and 4 lemons. How many do you need before the LED glows?',
  },
  {
    id: 'balloon-rocket', title: 'Balloon rocket', minAge: 6, topics: ['forces', 'motion', 'physics', 'rocket', 'newton'], game: 'launch',
    goal: 'Make a balloon zoom along a string like a rocket.',
    safety: { level: 'easy', rules: ['Keep balloons away from little children who might put them in their mouths.', 'Do not let go of the balloon near anyone’s face.'] },
    materials: [
      { item: 'Balloon', qty: '2', where: 'shop or party supplies', approxUsd: 0.3 },
      { item: 'String or fishing line', qty: '4 m', where: 'home or hardware shop', approxUsd: 0.5 },
      { item: 'Drinking straw', qty: '1', where: 'kitchen or shop', approxUsd: 0.1 },
      { item: 'Sticky tape', qty: '1 roll', where: 'stationery shop', approxUsd: 0.5 },
    ],
    steps: ['Thread the straw onto the string.', 'Tie the string tight between two chairs.', 'Blow up the balloon and pinch the end. Do not tie it.', 'Tape the balloon under the straw.', 'Let go and watch it fly! Measure how far it goes.'],
    science: 'Air rushes out backwards, so the balloon is pushed forwards. Every action has an equal and opposite reaction (Newton’s third law), just like real rockets.',
    tryNext: 'Does a bigger breath of air make it go further? Try three times and write down the distances.',
  },
  {
    id: 'paper-bridge', title: 'Paper bridge challenge', minAge: 7, topics: ['civil engineering', 'bridges', 'structures', 'triangles', 'forces'], game: 'bridge',
    goal: 'Build a bridge from paper that holds as many coins as possible.',
    safety: { level: 'easy', rules: ['Use child-safe scissors.'] },
    materials: [
      { item: 'A4 paper', qty: '5 sheets', where: 'home or stationery shop', approxUsd: 0.2 },
      { item: 'Two books or bricks the same height', qty: '2', where: 'home', approxUsd: 0 },
      { item: 'Coins or bottle tops for weights', qty: '20+', where: 'home', approxUsd: 0 },
      { item: 'Sticky tape', qty: '1 roll', where: 'stationery shop', approxUsd: 0.5 },
    ],
    steps: ['Put the books 20 cm apart.', 'Lay one flat sheet across and add coins one at a time. How many before it falls?', 'Now fold a sheet like a fan (zig-zag) and test it again.', 'Try rolling paper into tubes, or folding triangles. Record every result.', 'Which shape won? Draw it.'],
    science: 'Folding paper into zig-zags and triangles makes it much stiffer, because the shape spreads the push of the weight along the folds. Real bridges use triangles for the same reason.',
    tryNext: 'Can you hold 50 coins with only 2 sheets of paper?',
  },
  {
    id: 'string-telephone', title: 'String telephone network', minAge: 6, topics: ['networking', 'sound', 'communication', 'internet', 'waves'], game: 'packets',
    goal: 'Talk to a friend through a string, then build a three-person network.',
    safety: { level: 'helper', rules: ['Ask an adult to make the holes in the cups.', 'Don’t pull the string near anyone’s neck.'] },
    materials: [
      { item: 'Paper or plastic cups', qty: '3', where: 'shop or kitchen', approxUsd: 0.3, substitute: 'Empty tins with smooth edges (adult checks them)' },
      { item: 'String', qty: '10 m', where: 'home or hardware shop', approxUsd: 0.5 },
      { item: 'Paper clips', qty: '3', where: 'stationery shop', approxUsd: 0.1 },
    ],
    steps: ['Make a small hole in the bottom of each cup.', 'Push the string through and tie it to a paper clip inside so it can’t slip out.', 'Stand far apart so the string is tight. One person talks into a cup, the other listens.', 'Now tie a third string to the middle so three people can listen. That is a network!', 'What happens if the string goes slack or touches something?'],
    science: 'Your voice makes the cup vibrate, the vibrations travel along the tight string, and the other cup turns them back into sound. Cables carry internet data in a similar way, as signals along wires or light in glass.',
  },
  {
    id: 'pinhole-camera', title: 'Pinhole camera', minAge: 8, topics: ['light', 'optics', 'camera', 'physics', 'eyes'],
    goal: 'See an upside-down picture of the world inside a box.',
    safety: { level: 'helper', rules: ['An adult makes the pinhole.', 'NEVER look at the Sun, even through the camera.'] },
    materials: [
      { item: 'Shoebox or long cardboard tube', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Aluminium foil', qty: 'a small piece', where: 'kitchen', approxUsd: 0.2 },
      { item: 'Greaseproof paper or tracing paper', qty: 'a small piece', where: 'kitchen or stationery shop', approxUsd: 0.2 },
      { item: 'A pin', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Sticky tape and a dark cloth', qty: '', where: 'home', approxUsd: 0 },
    ],
    steps: ['Cut a square hole at one end of the box and tape foil over it.', 'An adult pokes one tiny hole in the foil with the pin.', 'Cut away the other end and tape the greaseproof paper over it as a screen.', 'Cover your head and the screen end with the cloth.', 'Point the foil end at a bright window or tree. What do you see?'],
    science: 'Light travels in straight lines, so rays from the top of a tree cross through the tiny hole and land at the bottom of the screen. Your eye and phone camera both work this way, with a lens to make it brighter.',
  },
  {
    id: 'solar-oven', title: 'Solar oven', minAge: 9, topics: ['solar', 'energy', 'heat', 'sun', 'renewable'], game: 'circuit',
    goal: 'Use sunlight to melt chocolate or warm a snack.',
    safety: { level: 'adult', rules: ['An adult helps with the knife or blade.', 'The inside gets hot: use a cloth to take food out.', 'Never look straight at the Sun or its reflection.'] },
    materials: [
      { item: 'Pizza box or shoebox with a lid', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Aluminium foil', qty: '1 m', where: 'kitchen', approxUsd: 0.5 },
      { item: 'Clear plastic wrap', qty: '1 m', where: 'kitchen', approxUsd: 0.5 },
      { item: 'Black paper or a black plastic bag', qty: '1', where: 'home or stationery shop', approxUsd: 0.2 },
      { item: 'A stick to prop the flap', qty: '1', where: 'garden', approxUsd: 0 },
      { item: 'Chocolate or bread with cheese', qty: 'a little', where: 'kitchen', approxUsd: 1 },
    ],
    steps: ['An adult cuts a flap in the lid, leaving one side attached.', 'Cover the inside of the flap with foil, shiny side out.', 'Cover the hole under the flap with plastic wrap, tight.', 'Line the bottom of the box with black paper and put the food on it.', 'Prop the flap open to reflect sunlight in. Wait 30–60 minutes in strong sun.'],
    science: 'The foil reflects extra sunlight in, the black paper absorbs it and turns it into heat, and the plastic traps the warm air. It’s the same idea as a greenhouse.',
    tryNext: 'Put a thermometer inside. How hot does it get at 10 am compared with 1 pm?',
  },
  {
    id: 'water-filter', title: 'Water filter', minAge: 8, topics: ['water', 'environment', 'engineering', 'filters', 'science'],
    goal: 'Clean muddy water using sand, gravel and charcoal.',
    safety: { level: 'helper', rules: ['DO NOT drink the filtered water. It still has germs.', 'An adult cuts the bottle.'] },
    materials: [
      { item: 'Plastic bottle (2 L)', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Clean sand', qty: '2 cups', where: 'garden or hardware shop', approxUsd: 0.5 },
      { item: 'Small gravel or stones', qty: '2 cups', where: 'garden', approxUsd: 0 },
      { item: 'Charcoal (crushed)', qty: '1 cup', where: 'home or market', approxUsd: 0.5 },
      { item: 'Cotton wool or a clean cloth', qty: '1', where: 'pharmacy or home', approxUsd: 0.3 },
    ],
    steps: ['An adult cuts the bottom off the bottle. Turn it upside down.', 'Push cotton wool into the neck.', 'Add layers: charcoal, then sand, then gravel on top.', 'Pour muddy water in slowly and catch it in a cup.', 'Compare the water before and after.'],
    science: 'Each layer traps smaller and smaller bits of dirt. Charcoal also grabs some chemicals. Real water works use filters, then kill germs with chlorine or boiling, which this filter cannot do.',
  },
  {
    id: 'stick-catapult', title: 'Lolly-stick catapult', minAge: 7, topics: ['forces', 'motion', 'physics', 'projectiles', 'angles'], game: 'launch',
    goal: 'Build a mini catapult and find the best angle to hit a target.',
    safety: { level: 'easy', rules: ['Only launch soft things like paper balls or pom-poms.', 'Never aim at people or animals.'] },
    materials: [
      { item: 'Ice-lolly sticks', qty: '7', where: 'shop or craft shop', approxUsd: 0.5, substitute: 'Flat pieces of strong card' },
      { item: 'Rubber bands', qty: '4', where: 'stationery shop', approxUsd: 0.2 },
      { item: 'Bottle cap', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Glue', qty: '', where: 'stationery shop', approxUsd: 0.5 },
      { item: 'Paper balls', qty: '10', where: 'home', approxUsd: 0 },
    ],
    steps: ['Stack 5 sticks and wrap a band round each end.', 'Hold 2 sticks together and band one end.', 'Slide the stack between the 2 sticks to make a V.', 'Glue the bottle cap on the top stick.', 'Launch paper balls into a cup. Move the stack to change the angle.'],
    science: 'Bending the stick stores energy, which becomes movement when you let go. The launch angle changes how high and far it flies, just like in Launch Lab.',
  },
  {
    id: 'cardboard-hand', title: 'Robot hand', minAge: 8, topics: ['robotics', 'robots', 'engineering', 'body', 'tendons'], game: 'linebot',
    goal: 'Build a cardboard hand whose fingers bend when you pull strings.',
    safety: { level: 'helper', rules: ['An adult helps with sharp scissors.'] },
    materials: [
      { item: 'Thin cardboard (cereal box)', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Drinking straws', qty: '3', where: 'kitchen or shop', approxUsd: 0.2 },
      { item: 'String or wool', qty: '1 m', where: 'home', approxUsd: 0.2 },
      { item: 'Sticky tape and a pen', qty: '', where: 'home', approxUsd: 0 },
    ],
    steps: ['Draw round your hand on the cardboard and cut it out.', 'Draw lines where your finger joints bend and fold the card there.', 'Cut straws into short pieces and tape them along each finger, between the folds.', 'Thread a string through each finger’s straws and tape it at the fingertip.', 'Pull the strings: the fingers curl!'],
    science: 'The strings act like the tendons in your hand. Robot hands use motors to pull cables in the same way.',
  },
  {
    id: 'needle-compass', title: 'Floating compass', minAge: 8, topics: ['magnets', 'magnetism', 'earth', 'navigation', 'physics'],
    goal: 'Make a compass that points north using a needle and water.',
    safety: { level: 'helper', rules: ['An adult handles the needle.'] },
    materials: [
      { item: 'Sewing needle', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Magnet (fridge magnet works)', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Small piece of cork or leaf', qty: '1', where: 'home or garden', approxUsd: 0 },
      { item: 'Bowl of water', qty: '1', where: 'kitchen', approxUsd: 0 },
    ],
    steps: ['Stroke the needle with the magnet 30 times, always the same way.', 'Lay the needle on the cork or leaf.', 'Float it in the middle of the bowl.', 'Wait. Which way does it point? Check with the Sun: it rises in the east.'],
    science: 'Earth is like a giant magnet. Your magnetised needle lines up with Earth’s magnetic field, pointing north–south.',
  },
  {
    id: 'static-balloon', title: 'Static electricity tricks', minAge: 6, topics: ['electricity', 'static', 'charges', 'physics'],
    goal: 'Use a balloon to bend water and pick up paper without touching.',
    safety: { level: 'easy', rules: ['Keep balloons away from very small children.'] },
    materials: [
      { item: 'Balloon', qty: '1', where: 'shop', approxUsd: 0.2 },
      { item: 'Tiny pieces of paper', qty: '', where: 'home', approxUsd: 0 },
      { item: 'A thin stream from a tap', qty: '', where: 'kitchen', approxUsd: 0 },
    ],
    steps: ['Blow up the balloon and tie it.', 'Rub it fast on your hair or a woolly jumper for 20 seconds.', 'Hold it over the paper pieces. What happens?', 'Rub it again and bring it near a thin stream of tap water. Watch it bend!'],
    science: 'Rubbing moves tiny charged particles called electrons onto the balloon. The charge pulls on the paper and the water. Computers carefully control electrons to store every 1 and 0.',
  },
  {
    id: 'binary-bracelet', title: 'Binary bracelet', minAge: 7, topics: ['binary', 'computers', 'coding', 'numbers', 'data'], game: 'binary',
    goal: 'Write the first letter of your name in binary with beads.',
    safety: { level: 'easy', rules: ['Beads are small: keep them away from babies.'] },
    materials: [
      { item: 'Beads in two colours', qty: '20', where: 'craft shop or market', approxUsd: 0.5, substitute: 'Knots in string: one knot for 0, two for 1' },
      { item: 'String or wool', qty: '30 cm', where: 'home', approxUsd: 0 },
    ],
    steps: ['Choose one colour for 0 and one for 1.', 'Find your letter in the table: A = 01000001, B = 01000010, C = 01000011 (each letter adds 1).', 'Thread the 8 beads in order.', 'Tie it round your wrist. Can a friend decode it?'],
    science: 'Computers store every letter as 8 bits (one byte). Your bracelet is a byte you can wear!',
  },
  {
    id: 'toy-car-ramp', title: 'Ramp racers', minAge: 6, topics: ['forces', 'friction', 'gravity', 'motion', 'physics', 'slopes'], game: 'launch',
    goal: 'Find out how the height of a ramp changes how far a toy car rolls.',
    safety: { level: 'easy', rules: ['Keep the area clear so nobody trips.'] },
    materials: [
      { item: 'Toy car or a round tin', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Flat board or stiff cardboard', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Books to lift the ramp', qty: '5', where: 'home', approxUsd: 0 },
      { item: 'Tape measure or string and a ruler', qty: '1', where: 'home or stationery shop', approxUsd: 0.5 },
    ],
    steps: ['Lean the board on 1 book.', 'Let the car go from the top. Don’t push!', 'Measure how far it rolls past the bottom.', 'Repeat with 2, 3, 4 and 5 books. Do each test three times.', 'Draw a chart of height against distance.'],
    science: 'A higher ramp gives the car more stored (potential) energy, which turns into speed. Friction with the floor slowly takes that energy away.',
  },
  {
    id: 'sorting-robot-game', title: 'Be a sorting robot', minAge: 7, topics: ['algorithms', 'programming', 'computers', 'sorting', 'coding'], game: 'functions',
    goal: 'Act out a computer sorting algorithm with friends.',
    safety: { level: 'easy', rules: ['Play in a clear space.'] },
    materials: [
      { item: 'Paper cards with numbers 1–10', qty: '10', where: 'home', approxUsd: 0 },
      { item: 'Chalk or sticks to mark spots on the ground', qty: '', where: 'school or garden', approxUsd: 0 },
      { item: 'Friends', qty: '4–8', where: 'school or home', approxUsd: 0 },
    ],
    steps: ['Everyone takes a number card and stands in a line, mixed up.', 'The "robot" may only compare two neighbours at a time.', 'If the left number is bigger, they swap places.', 'Walk along the line again and again until no swaps are needed.', 'Count the swaps. Try again with a different starting order.'],
    science: 'You just ran bubble sort, a real algorithm. Computers follow simple rules like these millions of times a second.',
  },
  {
    id: 'seed-light-test', title: 'Do plants need light?', minAge: 6, topics: ['plants', 'biology', 'science', 'light', 'data', 'ai'], game: 'teachai',
    goal: 'Grow beans in light and in the dark and compare them.',
    safety: { level: 'easy', rules: ['Wash your hands after touching soil.'] },
    materials: [
      { item: 'Bean or maize seeds', qty: '6', where: 'kitchen or market', approxUsd: 0.3 },
      { item: 'Two cups with soil', qty: '2', where: 'garden', approxUsd: 0 },
      { item: 'A cupboard or box for the dark cup', qty: '1', where: 'home', approxUsd: 0 },
      { item: 'Ruler and notebook', qty: '', where: 'school', approxUsd: 0.5 },
    ],
    steps: ['Plant 3 seeds in each cup and water them the same amount.', 'Put one cup on a sunny windowsill and one in the dark.', 'Every day, measure the tallest shoot and note its colour.', 'After 10 days, compare. Make a table.'],
    science: 'Plants need light to make food (photosynthesis). In the dark they grow tall and pale looking for light, then weaken. Recording careful data like this is also how AI gets the examples it learns from.',
  },
];

export function searchExperiments(query: string, limit = 5): Experiment[] {
  const words = query.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
  if (!words.length) return EXPERIMENTS.slice(0, limit);
  return EXPERIMENTS.map((e) => {
    const hay = `${e.title} ${e.goal} ${e.topics.join(' ')} ${e.science}`.toLowerCase();
    const score = words.reduce((s, w) => s + (e.topics.some((t) => t.includes(w)) ? 3 : 0) + (hay.includes(w) ? 1 : 0), 0);
    return { e, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}

export const getExperiment = (id: string) => EXPERIMENTS.find((e) => e.id === id);
