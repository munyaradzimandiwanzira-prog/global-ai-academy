/** Bug Hunt levels: one bug per program, from picture steps to real Python. */
export interface BugLevel {
  goal: string;
  code: boolean;
  lines: string[];
  bug: number;
  fixes: string[];
  answer: number;
  why: string;
}

export const BUG_LEVELS: BugLevel[] = [
  {
    goal: 'Zuva should walk 3 steps straight to the mango.', code: false,
    lines: ['Step forward', 'Step forward', 'Turn left', 'Step forward'], bug: 2,
    fixes: ['Turn right', 'Step forward', 'Jump'], answer: 1,
    why: 'The mango is straight ahead, so every instruction must be “Step forward”. Turning sends Zuva the wrong way.',
  },
  {
    goal: 'Make a cup of tea.', code: false,
    lines: ['Fill the kettle with water', 'Pour the water into the cup', 'Boil the kettle', 'Add a tea bag'], bug: 1,
    fixes: ['Drink the tea', 'Put a tea bag in the cup', 'Wait until the kettle boils first'], answer: 2,
    why: 'Order matters! Computers follow steps exactly in order. The water must boil before you pour it.',
  },
  {
    goal: 'The turtle should draw a square.', code: false,
    lines: ['Repeat 4 times:', '    Move forward 50', '    Turn right 60'], bug: 2,
    fixes: ['Turn right 90', 'Turn left 60', 'Move back 50'], answer: 0,
    why: 'A square has 4 corners of 90 degrees. 4 × 90 = 360, a full turn back to the start.',
  },
  {
    goal: 'Print the numbers 1 to 5.', code: true,
    lines: ['for n in range(1, 5):', '    print(n)'], bug: 0,
    fixes: ['for n in range(1, 6):', 'for n in range(0, 5):', 'for n in range(5):'], answer: 0,
    why: 'range stops just before the second number. To include 5 you write range(1, 6).',
  },
  {
    goal: 'Say “Mhoro Tariro”.', code: true,
    lines: ['name = "Tariro"', 'print("Mhoro " + Name)'], bug: 1,
    fixes: ['print("Mhoro " + "name")', 'print("Mhoro " + name)', 'print(Mhoro + name)'], answer: 1,
    why: 'Python cares about capital letters. The box is called name, not Name.',
  },
  {
    goal: 'Work out the cost of 3 buns at $0.50 each.', code: true,
    lines: ['buns = 3', 'price = 0.50', 'total = buns + price', 'print(total)'], bug: 2,
    fixes: ['total = buns - price', 'total = buns * price', 'total = price / buns'], answer: 1,
    why: 'Three buns at 50 cents is 3 × 0.50 = 1.50. Adding gives 3.50, which is wrong.',
  },
  {
    goal: 'Say “Hot!” when it is over 30 degrees.', code: true,
    lines: ['temp = 34', 'if temp < 30:', '    print("Hot!")'], bug: 1,
    fixes: ['if temp > 30:', 'if temp = 30:', 'if 30:'], answer: 0,
    why: '< means “less than”. We want “greater than”, which is >.',
  },
  {
    goal: 'Print every fruit in the list.', code: true,
    lines: ['fruits = ["mango", "banana", "masau"]', 'for fruit in fruits', '    print(fruit)'], bug: 1,
    fixes: ['for fruit in fruits:', 'for fruits in fruit:', 'loop fruit in fruits'], answer: 0,
    why: 'Lines that start a block in Python (for, if, def) end with a colon :',
  },
  {
    goal: 'Find the average of three marks.', code: true,
    lines: ['marks = [70, 80, 90]', 'average = sum(marks) / 2', 'print(average)'], bug: 1,
    fixes: ['average = sum(marks) * 3', 'average = sum(marks) / len(marks)', 'average = max(marks)'], answer: 1,
    why: 'The average is the total divided by how many marks there are. len(marks) counts them for you (3).',
  },
];

