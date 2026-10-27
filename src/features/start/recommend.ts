/** Pure recommendation logic for the “Where to start” pathfinder (kept out of React for testing). */
export type Age = 'child' | 'teen' | 'adult';
export type Goal = 'fun' | 'web' | 'data' | 'ai' | 'mobile' | 'hardware' | 'job';
export type Experience = 'none' | 'some' | 'working';
export type Time = 'light' | 'steady' | 'serious';

export interface Answers { age?: Age; goal?: Goal; experience?: Experience; time?: Time }

export interface Plan { first: string[]; career?: string; plan: 'free' | 'plus' | 'academy'; kids?: boolean; why: string }

export function recommend(a: Required<Answers>): Plan {
  if (a.age === 'child') return { first: ['kids-coding'], kids: true, plan: 'free', why: 'Children learn sequences, loops and logic fastest through games. The Kids Zone is free and needs no account.' };
  const careerByGoal: Record<Goal, string> = {
    fun: 'python-engineer', web: 'web-developer', data: 'data-scientist', ai: a.experience === 'working' ? 'agentic-ai-engineer' : 'ai-engineer',
    mobile: 'android-engineer', hardware: 'mechatronics-engineer', job: 'python-engineer',
  };
  const career = careerByGoal[a.goal];
  const tools = a.experience === 'none' ? ['start-here', 'vscode'] : [];
  const firstByGoal: Record<Goal, string[]> = {
    fun: ['python'], web: ['html', 'css'], data: ['python', 'sql'], ai: a.experience === 'working' ? ['llm-apis', 'rag'] : ['python', 'ai-fundamentals'],
    mobile: ['kotlin'], hardware: ['python', 'mechatronics'], job: ['python', 'git'],
  };
  const plan: Plan['plan'] = a.time === 'serious' || a.goal === 'job' ? 'academy' : a.time === 'steady' ? 'plus' : 'free';
  const why = [
    a.experience === 'none' ? 'You start with how computers and editors work, so nothing later feels like magic.' : 'You can skip the set-up lessons and go straight to the language.',
    plan === 'academy' ? 'With this much time, a teacher, graded assignments and a capstone will turn hours into a portfolio.' : plan === 'plus' ? 'At a few hours a week, goals, the AI tutor and certificates keep you moving.' : 'Everything you need to begin is free; upgrade only if you want more support.',
  ].join(' ');
  return { first: [...tools, ...firstByGoal[a.goal]], career, plan, why };
}

