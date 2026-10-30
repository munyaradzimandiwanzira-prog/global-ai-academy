/** Terminal Treasure: a tiny, safe pretend Linux shell. Nothing here touches a real computer. */
export type FsNode = { type: 'dir'; children: Record<string, FsNode> } | { type: 'file'; content: string };
export interface Shell { fs: FsNode; cwd: string[]; home: string[] }

export const dir = (children: Record<string, FsNode> = {}): FsNode => ({ type: 'dir', children });
export const file = (content: string): FsNode => ({ type: 'file', content });

export const pathString = (parts: string[]) => '/' + parts.join('/');

function clone(n: FsNode): FsNode {
  return n.type === 'file' ? { ...n } : { type: 'dir', children: Object.fromEntries(Object.entries(n.children).map(([k, v]) => [k, clone(v)])) };
}

export function resolve(shell: Shell, path: string): string[] | null {
  if (!path || path === '~') return [...shell.home];
  let parts = path.startsWith('/') ? [] : path.startsWith('~') ? [...shell.home] : [...shell.cwd];
  const rest = path.startsWith('~') ? path.slice(1) : path;
  for (const seg of rest.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts = parts.slice(0, -1);
    else parts.push(seg);
  }
  return parts;
}

export function nodeAt(fs: FsNode, parts: string[]): FsNode | null {
  let n: FsNode = fs;
  for (const p of parts) {
    if (n.type !== 'dir') return null;
    const next: FsNode | undefined = n.children[p];
    if (!next) return null;
    n = next;
  }
  return n;
}

const HELP = [
  'pwd          show where you are',
  'ls           list what is here (ls -a shows hidden things)',
  'cd NAME      go into a folder   (cd .. goes back up, cd ~ goes home)',
  'cat NAME     read a file',
  'mkdir NAME   make a new folder',
  'touch NAME   make a new empty file',
  'echo WORDS   say something',
  'clear        clean the screen',
];

/** Runs one command line. Returns the new shell and the lines to print. `clear` returns null output. */
export function run(shell: Shell, line: string): { shell: Shell; out: string[] | null } {
  const words = line.trim().split(/\s+/).filter(Boolean);
  const [cmd, ...args] = words;
  if (!cmd) return { shell, out: [] };
  const flags = args.filter((a) => a.startsWith('-'));
  const operands = args.filter((a) => !a.startsWith('-'));
  const target = operands[0];

  switch (cmd) {
    case 'help':
      return { shell, out: HELP };
    case 'clear':
      return { shell, out: null };
    case 'pwd':
      return { shell, out: [pathString(shell.cwd)] };
    case 'echo':
      return { shell, out: [args.join(' ')] };
    case 'ls': {
      const parts = target ? resolve(shell, target) : shell.cwd;
      const n = parts && nodeAt(shell.fs, parts);
      if (!n) return { shell, out: [`ls: cannot find '${target}'`] };
      if (n.type === 'file') return { shell, out: [target!] };
      const showHidden = flags.some((f) => f.includes('a'));
      const names = Object.keys(n.children)
        .filter((k) => showHidden || !k.startsWith('.'))
        .sort()
        .map((k) => (n.children[k]!.type === 'dir' ? `${k}/` : k));
      return { shell, out: names.length ? [names.join('   ')] : ['(empty)'] };
    }
    case 'cd': {
      const parts = resolve(shell, target ?? '~');
      const n = parts && nodeAt(shell.fs, parts);
      if (!n) return { shell, out: [`cd: there is no folder called '${target}'`] };
      if (n.type !== 'dir') return { shell, out: [`cd: '${target}' is a file, not a folder. Try: cat ${target}`] };
      return { shell: { ...shell, cwd: parts! }, out: [] };
    }
    case 'cat': {
      if (!target) return { shell, out: ['cat: which file? Example: cat note.txt'] };
      const parts = resolve(shell, target);
      const n = parts && nodeAt(shell.fs, parts);
      if (!n) return { shell, out: [`cat: there is no file called '${target}'`] };
      if (n.type === 'dir') return { shell, out: [`cat: '${target}' is a folder. Try: cd ${target}`] };
      return { shell, out: n.content.split('\n') };
    }
    case 'mkdir':
    case 'touch': {
      if (!target || target.includes('/')) return { shell, out: [`${cmd}: give a simple name, like: ${cmd} camp`] };
      if (!/^[a-zA-Z0-9._-]{1,24}$/.test(target)) return { shell, out: [`${cmd}: use letters, numbers, dots or dashes`] };
      const fs = clone(shell.fs);
      const here = nodeAt(fs, shell.cwd);
      if (!here || here.type !== 'dir') return { shell, out: [`${cmd}: cannot write here`] };
      if (here.children[target]) return { shell, out: cmd === 'touch' ? [] : [`mkdir: '${target}' already exists`] };
      here.children[target] = cmd === 'mkdir' ? dir() : file('');
      return { shell: { ...shell, fs }, out: [] };
    }
    case 'rm':
      return { shell, out: ['rm deletes things for ever, so Zuva keeps it switched off in this game.'] };
    case 'sudo':
      return { shell, out: ['Nice try! sudo means "do this as the boss". Real admins use it very carefully.'] };
    default:
      return { shell, out: [`${cmd}: command not found. Type help to see the commands.`] };
  }
}
