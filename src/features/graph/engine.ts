/**
 * A small, honest in-memory property-graph database with a Cypher subset.
 *
 * Built so learners can practise Neo4j-style graph work in the browser with no install:
 *   MATCH / OPTIONAL MATCH / WHERE / RETURN / WITH / ORDER BY / SKIP / LIMIT / DISTINCT
 *   CREATE / MERGE (ON CREATE SET, ON MATCH SET) / SET / REMOVE / DELETE / DETACH DELETE / UNWIND
 *   variable-length paths  -[:R*1..3]->,  p = shortestPath((a)-[*]-(b)),  path variables
 *   aggregation (count, sum, avg, min, max, collect, with DISTINCT) with implicit grouping
 *   CASE expressions, list/map literals, IN, STARTS WITH, ENDS WITH, CONTAINS, =~, IS [NOT] NULL
 *   functions incl. labels, type, id, properties, size, length, nodes, relationships, coalesce,
 *   toLower/toUpper, split, substring, round, range, vector.similarity.cosine / .euclidean
 *
 * Several statements can be separated with ';'. It is not Neo4j: no indexes, no transactions
 * and no APOC/GDS. Errors are written for learners.
 */

// ─── Values ─────────────────────────────────────────────────────────────────

export class GNode {
  constructor(public id: number, public labels: string[], public props: Record<string, Value>) {}
}
export class GRel {
  constructor(public id: number, public type: string, public start: number, public end: number, public props: Record<string, Value>) {}
}
export class GPath {
  constructor(public nodes: GNode[], public rels: GRel[]) {}
}
export type Value = null | boolean | number | string | Value[] | { [k: string]: Value } | GNode | GRel | GPath;
type Row = Record<string, Value>;

export class CypherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CypherError';
  }
}

// ─── Graph store ────────────────────────────────────────────────────────────

export class Graph {
  nodes = new Map<number, GNode>();
  rels = new Map<number, GRel>();
  private out = new Map<number, Set<number>>();
  private in = new Map<number, Set<number>>();
  private nextId = 0;

  addNode(labels: string[], props: Record<string, Value>): GNode {
    const n = new GNode(this.nextId++, [...new Set(labels)], stripNulls(props));
    this.nodes.set(n.id, n);
    this.out.set(n.id, new Set());
    this.in.set(n.id, new Set());
    return n;
  }
  addRel(type: string, start: GNode, end: GNode, props: Record<string, Value>): GRel {
    const r = new GRel(this.nextId++, type, start.id, end.id, stripNulls(props));
    this.rels.set(r.id, r);
    this.out.get(start.id)!.add(r.id);
    this.in.get(end.id)!.add(r.id);
    return r;
  }
  relsOf(node: GNode, dir: 'out' | 'in' | 'both'): GRel[] {
    const ids = dir === 'out' ? this.out.get(node.id)! : dir === 'in' ? this.in.get(node.id)! : new Set([...this.out.get(node.id)!, ...this.in.get(node.id)!]);
    return [...ids].map((id) => this.rels.get(id)!);
  }
  degree(node: GNode): number {
    return this.out.get(node.id)!.size + this.in.get(node.id)!.size;
  }
  deleteRel(r: GRel) {
    if (!this.rels.delete(r.id)) return false;
    this.out.get(r.start)?.delete(r.id);
    this.in.get(r.end)?.delete(r.id);
    return true;
  }
  deleteNode(n: GNode, detach: boolean): { node: boolean; rels: number } {
    if (!this.nodes.has(n.id)) return { node: false, rels: 0 };
    const attached = this.relsOf(n, 'both');
    if (attached.length && !detach) {
      throw new CypherError(`Cannot delete node ${fmtValue(n)} because it still has ${attached.length} relationship(s). Use DETACH DELETE to delete it together with its relationships.`);
    }
    for (const r of attached) this.deleteRel(r);
    this.nodes.delete(n.id);
    this.out.delete(n.id);
    this.in.delete(n.id);
    return { node: true, rels: attached.length };
  }
  other(r: GRel, from: GNode): GNode {
    return this.nodes.get(r.start === from.id ? r.end : r.start)!;
  }
  labels(): string[] {
    return [...new Set([...this.nodes.values()].flatMap((n) => n.labels))].sort();
  }
  relTypes(): string[] {
    return [...new Set([...this.rels.values()].map((r) => r.type))].sort();
  }
}

function stripNulls(props: Record<string, Value>): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const [k, v] of Object.entries(props)) if (v !== null && v !== undefined) out[k] = v;
  return out;
}

// ─── Lexer ──────────────────────────────────────────────────────────────────

type Tok =
  | { t: 'id'; v: string; quoted?: boolean; pos: number }
  | { t: 'num'; v: number; pos: number }
  | { t: 'str'; v: string; pos: number }
  | { t: 'op'; v: string; pos: number }
  | { t: 'eof'; pos: number };

const OPS = ['<>', '<=', '>=', '=~', '+=', '..', '->', '<-', '(', ')', '[', ']', '{', '}', ',', ':', '.', '*', '-', '>', '<', '=', '+', '/', '%', '|', ';', '^'];

function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e === -1 ? src.length : e + 2; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? '') && src[i - 1] !== '.')) {
      const m = /^\d*\.?\d+(?:[eE][-+]?\d+)?/.exec(src.slice(i))!;
      // "1..3" must lex as 1 .. 3, not 1. .3
      let text = m[0];
      const dots = src.slice(i).match(/^\d+\.\./);
      if (dots) text = dots[0].slice(0, -2);
      toks.push({ t: 'num', v: Number(text), pos: i });
      i += text.length;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\' && j + 1 < src.length) {
          const n = src[j + 1]!;
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n;
          j += 2;
        } else s += src[j++];
      }
      if (j >= src.length) throw new CypherError(`A text value that starts at position ${i + 1} is never closed — add the missing ${c}.`);
      toks.push({ t: 'str', v: s, pos: i });
      i = j + 1;
      continue;
    }
    if (c === '`') {
      const j = src.indexOf('`', i + 1);
      if (j === -1) throw new CypherError('A `backtick` name is never closed.');
      toks.push({ t: 'id', v: src.slice(i + 1, j), quoted: true, pos: i });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(src.slice(i))!;
      toks.push({ t: 'id', v: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new CypherError(`Unexpected character "${c}" at position ${i + 1}.`);
    toks.push({ t: 'op', v: op, pos: i });
    i += op.length;
  }
  toks.push({ t: 'eof', pos: src.length });
  return toks;
}

// ─── AST ────────────────────────────────────────────────────────────────────

type Expr =
  | { k: 'lit'; v: Value }
  | { k: 'var'; name: string }
  | { k: 'prop'; obj: Expr; key: string }
  | { k: 'index'; obj: Expr; index: Expr; to?: Expr | null; slice?: boolean }
  | { k: 'list'; items: Expr[] }
  | { k: 'map'; entries: [string, Expr][] }
  | { k: 'bin'; op: string; a: Expr; b: Expr }
  | { k: 'not'; a: Expr }
  | { k: 'neg'; a: Expr }
  | { k: 'isnull'; a: Expr; not: boolean }
  | { k: 'call'; name: string; args: Expr[]; distinct: boolean; star: boolean }
  | { k: 'case'; subject: Expr | null; whens: [Expr, Expr][]; else: Expr | null }
  | { k: 'labels'; a: Expr; labels: string[] }
  | { k: 'pattern'; pattern: Pattern };

interface NodePat { var: string | null; labels: string[]; props: [string, Expr][] }
interface RelPat {
  var: string | null;
  types: string[];
  dir: 'out' | 'in' | 'both';
  props: [string, Expr][];
  varLen: { min: number; max: number } | null;
}
interface Pattern { pathVar: string | null; shortest: null | 'one' | 'all'; nodes: NodePat[]; rels: RelPat[] }

interface ProjItem { expr: Expr; alias: string }
interface Projection { distinct: boolean; star: boolean; items: ProjItem[]; order: { expr: Expr; desc: boolean }[]; skip: Expr | null; limit: Expr | null }

type SetItem =
  | { k: 'prop'; target: string; key: string; value: Expr }
  | { k: 'merge'; target: string; value: Expr; replace: boolean }
  | { k: 'label'; target: string; labels: string[] };

type Clause =
  | { k: 'match'; optional: boolean; patterns: Pattern[]; where: Expr | null }
  | { k: 'create'; patterns: Pattern[] }
  | { k: 'merge'; pattern: Pattern; onCreate: SetItem[]; onMatch: SetItem[] }
  | { k: 'set'; items: SetItem[] }
  | { k: 'remove'; items: ({ k: 'prop'; target: string; key: string } | { k: 'label'; target: string; labels: string[] })[] }
  | { k: 'delete'; detach: boolean; exprs: Expr[] }
  | { k: 'unwind'; expr: Expr; as: string }
  | { k: 'with'; proj: Projection; where: Expr | null }
  | { k: 'return'; proj: Projection };

const AGGREGATES = new Set(['count', 'sum', 'avg', 'min', 'max', 'collect', 'stdev']);
const CLAUSE_WORDS = new Set(['MATCH', 'OPTIONAL', 'WHERE', 'RETURN', 'WITH', 'CREATE', 'MERGE', 'SET', 'DELETE', 'DETACH', 'REMOVE', 'UNWIND', 'ORDER', 'SKIP', 'LIMIT', 'ON', 'UNION']);

// ─── Parser ─────────────────────────────────────────────────────────────────

class Parser {
  private i = 0;
  constructor(private toks: Tok[], private src: string) {}

  private peek(o = 0): Tok { return this.toks[Math.min(this.i + o, this.toks.length - 1)]!; }
  private next(): Tok { return this.toks[this.i++]!; }
  private near(): string {
    const t = this.peek();
    if (t.t === 'eof') return 'at the end of the query';
    const line = this.src.slice(0, t.pos).split('\n').length;
    const snippet = this.src.slice(t.pos, t.pos + 18).split('\n')[0];
    return `near "${snippet}" (line ${line})`;
  }
  private fail(msg: string): never { throw new CypherError(`${msg} ${this.near()}.`); }
  private isKw(word: string, o = 0): boolean { const t = this.peek(o); return t.t === 'id' && !t.quoted && t.v.toUpperCase() === word; }
  private isOp(op: string, o = 0): boolean { const t = this.peek(o); return t.t === 'op' && t.v === op; }
  private eatKw(word: string): boolean { if (this.isKw(word)) { this.i++; return true; } return false; }
  private eatOp(op: string): boolean { if (this.isOp(op)) { this.i++; return true; } return false; }
  private kw(word: string) { if (!this.eatKw(word)) this.fail(`Expected ${word}`); }
  private op(op: string) { if (!this.eatOp(op)) this.fail(`Expected "${op}"`); }
  private ident(what = 'a name'): string {
    const t = this.peek();
    if (t.t !== 'id') this.fail(`Expected ${what}`);
    this.i++;
    return (t as { v: string }).v;
  }

  parseStatements(): Clause[][] {
    const out: Clause[][] = [];
    while (this.peek().t !== 'eof') {
      if (this.eatOp(';')) continue;
      out.push(this.parseQuery());
      if (!this.eatOp(';') && this.peek().t !== 'eof') this.fail('Unexpected input');
    }
    if (!out.length) throw new CypherError('The query is empty. Try: MATCH (n) RETURN n LIMIT 10');
    return out;
  }

  private parseQuery(): Clause[] {
    const clauses: Clause[] = [];
    for (;;) {
      const t = this.peek();
      if (t.t === 'eof' || this.isOp(';')) break;
      if (this.eatKw('OPTIONAL')) { this.kw('MATCH'); clauses.push(this.parseMatch(true)); }
      else if (this.eatKw('MATCH')) clauses.push(this.parseMatch(false));
      else if (this.eatKw('CREATE')) clauses.push({ k: 'create', patterns: this.parsePatterns() });
      else if (this.eatKw('MERGE')) clauses.push(this.parseMerge());
      else if (this.eatKw('SET')) clauses.push({ k: 'set', items: this.parseSetItems() });
      else if (this.eatKw('REMOVE')) clauses.push(this.parseRemove());
      else if (this.isKw('DETACH') || this.isKw('DELETE')) {
        const detach = this.eatKw('DETACH');
        this.kw('DELETE');
        const exprs = [this.parseExpr()];
        while (this.eatOp(',')) exprs.push(this.parseExpr());
        clauses.push({ k: 'delete', detach, exprs });
      } else if (this.eatKw('UNWIND')) {
        const expr = this.parseExpr();
        this.kw('AS');
        clauses.push({ k: 'unwind', expr, as: this.ident('a variable name after AS') });
      } else if (this.eatKw('WITH')) {
        const proj = this.parseProjection(true);
        const where = this.eatKw('WHERE') ? this.parseExpr() : null;
        clauses.push({ k: 'with', proj, where });
      } else if (this.eatKw('RETURN')) {
        clauses.push({ k: 'return', proj: this.parseProjection(false) });
        break;
      } else if (this.isKw('WHERE')) this.fail('WHERE must follow MATCH, OPTIONAL MATCH or WITH');
      else this.fail(t.t === 'id' ? `Unknown clause "${(t as { v: string }).v}"` : 'Expected a clause such as MATCH, CREATE or RETURN');
    }
    if (!clauses.length) this.fail('Expected a clause');
    const last = clauses[clauses.length - 1]!;
    if (['match', 'with', 'unwind'].includes(last.k)) {
      throw new CypherError(`A query cannot end with ${last.k.toUpperCase()}. Add RETURN (for example: RETURN *) or an update clause such as SET or CREATE.`);
    }
    return clauses;
  }

  private parseMatch(optional: boolean): Clause {
    const patterns = this.parsePatterns();
    const where = this.eatKw('WHERE') ? this.parseExpr() : null;
    return { k: 'match', optional, patterns, where };
  }

  private parseMerge(): Clause {
    const pattern = this.parsePattern();
    const onCreate: SetItem[] = [];
    const onMatch: SetItem[] = [];
    while (this.isKw('ON')) {
      this.next();
      if (this.eatKw('CREATE')) { this.kw('SET'); onCreate.push(...this.parseSetItems()); }
      else if (this.eatKw('MATCH')) { this.kw('SET'); onMatch.push(...this.parseSetItems()); }
      else this.fail('Expected ON CREATE SET or ON MATCH SET');
    }
    return { k: 'merge', pattern, onCreate, onMatch };
  }

  private parseSetItems(): SetItem[] {
    const items: SetItem[] = [];
    do {
      const target = this.ident('a variable to SET');
      if (this.eatOp('.')) {
        const key = this.ident('a property name');
        this.op('=');
        items.push({ k: 'prop', target, key, value: this.parseExpr() });
      } else if (this.eatOp('+=')) items.push({ k: 'merge', target, value: this.parseExpr(), replace: false });
      else if (this.eatOp('=')) items.push({ k: 'merge', target, value: this.parseExpr(), replace: true });
      else if (this.isOp(':')) items.push({ k: 'label', target, labels: this.parseLabels() });
      else this.fail('Expected n.property = value, n += {map} or n:Label');
    } while (this.eatOp(','));
    return items;
  }

  private parseRemove(): Clause {
    const items: Extract<Clause, { k: 'remove' }>['items'] = [];
    do {
      const target = this.ident('a variable to REMOVE from');
      if (this.eatOp('.')) items.push({ k: 'prop', target, key: this.ident('a property name') });
      else items.push({ k: 'label', target, labels: this.parseLabels() });
    } while (this.eatOp(','));
    return { k: 'remove', items };
  }

  private parseLabels(): string[] {
    const labels: string[] = [];
    while (this.eatOp(':')) labels.push(this.ident('a label'));
    return labels;
  }

  private parseProjection(isWith: boolean): Projection {
    const distinct = this.eatKw('DISTINCT');
    let star = false;
    const items: ProjItem[] = [];
    if (this.eatOp('*')) { star = true; if (!this.eatOp(',')) return this.parseTail({ distinct, star, items }); }
    do {
      const start = this.peek().pos;
      const expr = this.parseExpr();
      const end = this.peek().pos;
      let alias: string;
      if (this.eatKw('AS')) alias = this.ident('an alias after AS');
      else {
        if (isWith && expr.k !== 'var') this.fail('Expressions in WITH need an alias, e.g. WITH count(*) AS total');
        alias = this.src.slice(start, end).trim();
      }
      items.push({ expr, alias });
    } while (this.eatOp(','));
    return this.parseTail({ distinct, star, items });
  }

  private parseTail(p: { distinct: boolean; star: boolean; items: ProjItem[] }): Projection {
    const order: { expr: Expr; desc: boolean }[] = [];
    if (this.eatKw('ORDER')) {
      this.kw('BY');
      do {
        const expr = this.parseExpr();
        let desc = false;
        if (this.eatKw('DESC') || this.eatKw('DESCENDING')) desc = true;
        else if (this.eatKw('ASC') || this.eatKw('ASCENDING')) desc = false;
        order.push({ expr, desc });
      } while (this.eatOp(','));
    }
    const skip = this.eatKw('SKIP') ? this.parseExpr() : null;
    const limit = this.eatKw('LIMIT') ? this.parseExpr() : null;
    return { ...p, order, skip, limit };
  }

  private parsePatterns(): Pattern[] {
    const ps = [this.parsePattern()];
    while (this.eatOp(',')) ps.push(this.parsePattern());
    return ps;
  }

  private parsePattern(): Pattern {
    let pathVar: string | null = null;
    if (this.peek().t === 'id' && this.isOp('=', 1)) { pathVar = this.ident(); this.op('='); }
    let shortest: Pattern['shortest'] = null;
    if (this.isKw('SHORTESTPATH') || this.isKw('ALLSHORTESTPATHS')) {
      shortest = (this.next() as { v: string }).v.toUpperCase() === 'SHORTESTPATH' ? 'one' : 'all';
      this.op('(');
    }
    const nodes = [this.parseNodePat()];
    const rels: RelPat[] = [];
    while (this.isOp('-') || this.isOp('<-')) {
      rels.push(this.parseRelPat());
      nodes.push(this.parseNodePat());
    }
    if (shortest) {
      this.op(')');
      if (rels.length !== 1) throw new CypherError('shortestPath needs exactly one relationship, e.g. shortestPath((a)-[*..6]-(b))');
      if (!rels[0]!.varLen) rels[0]!.varLen = { min: 1, max: 1 };
    }
    return { pathVar, shortest, nodes, rels };
  }

  private parseNodePat(): NodePat {
    if (!this.isOp('(')) this.fail('Expected a node pattern like (n) or (p:Person)');
    this.next();
    let v: string | null = null;
    if (this.peek().t === 'id') v = this.ident();
    const labels = this.parseLabels();
    const props = this.isOp('{') ? this.parseMapEntries() : [];
    this.op(')');
    return { var: v, labels, props };
  }

  private parseRelPat(): RelPat {
    let left = false;
    if (this.eatOp('<-')) left = true;
    else this.op('-');
    let v: string | null = null;
    const types: string[] = [];
    let props: [string, Expr][] = [];
    let varLen: RelPat['varLen'] = null;
    if (this.eatOp('[')) {
      if (this.peek().t === 'id') v = this.ident();
      if (this.eatOp(':')) {
        types.push(this.ident('a relationship type'));
        while (this.eatOp('|')) { this.eatOp(':'); types.push(this.ident('a relationship type')); }
      }
      if (this.eatOp('*')) {
        // *  → 1..15   *3 → exactly 3   *2.. → 2..15   *..4 → 1..4   *1..3 → 1..3
        let min = 1;
        let max = 15;
        const t = this.peek();
        if (t.t === 'num') { this.next(); min = t.v; max = t.v; }
        if (this.eatOp('..')) { const u = this.peek(); max = u.t === 'num' ? (this.next(), u.v) : 15; }
        if (min > max) throw new CypherError(`Variable-length range *${min}..${max} is empty.`);
        varLen = { min, max: Math.min(max, 15) };
      }
      if (this.isOp('{')) props = this.parseMapEntries();
      this.op(']');
    }
    let right = false;
    if (this.eatOp('->')) right = true;
    else this.op('-');
    if (left && right) throw new CypherError('A relationship cannot point both ways (<-[]->). Use -[]- for either direction.');
    return { var: v, types, dir: right ? 'out' : left ? 'in' : 'both', props, varLen };
  }

  private parseMapEntries(): [string, Expr][] {
    this.op('{');
    const entries: [string, Expr][] = [];
    if (!this.isOp('}')) {
      do {
        const t = this.peek();
        const key = t.t === 'str' ? (this.next(), t.v) : this.ident('a property key');
        this.op(':');
        entries.push([key, this.parseExpr()]);
      } while (this.eatOp(','));
    }
    this.op('}');
    return entries;
  }

  // Expressions, lowest precedence first.
  parseExpr(): Expr { return this.parseOr(); }
  private parseOr(): Expr {
    let a = this.parseXor();
    while (this.eatKw('OR')) a = { k: 'bin', op: 'OR', a, b: this.parseXor() };
    return a;
  }
  private parseXor(): Expr {
    let a = this.parseAnd();
    while (this.eatKw('XOR')) a = { k: 'bin', op: 'XOR', a, b: this.parseAnd() };
    return a;
  }
  private parseAnd(): Expr {
    let a = this.parseNot();
    while (this.eatKw('AND')) a = { k: 'bin', op: 'AND', a, b: this.parseNot() };
    return a;
  }
  private parseNot(): Expr {
    if (this.eatKw('NOT')) return { k: 'not', a: this.parseNot() };
    return this.parseComparison();
  }
  private parseComparison(): Expr {
    let a = this.parseAdd();
    for (;;) {
      const t = this.peek();
      if (t.t === 'op' && ['=', '<>', '<', '>', '<=', '>=', '=~'].includes(t.v)) { this.next(); a = { k: 'bin', op: t.v, a, b: this.parseAdd() }; }
      else if (this.eatKw('IN')) a = { k: 'bin', op: 'IN', a, b: this.parseAdd() };
      else if (this.isKw('STARTS')) { this.next(); this.kw('WITH'); a = { k: 'bin', op: 'STARTS WITH', a, b: this.parseAdd() }; }
      else if (this.isKw('ENDS')) { this.next(); this.kw('WITH'); a = { k: 'bin', op: 'ENDS WITH', a, b: this.parseAdd() }; }
      else if (this.eatKw('CONTAINS')) a = { k: 'bin', op: 'CONTAINS', a, b: this.parseAdd() };
      else if (this.isKw('IS')) {
        this.next();
        const not = this.eatKw('NOT');
        this.kw('NULL');
        a = { k: 'isnull', a, not };
      } else return a;
    }
  }
  private parseAdd(): Expr {
    let a = this.parseMul();
    for (;;) {
      if (this.isOp('+') || this.isOp('-')) { const op = (this.next() as { v: string }).v; a = { k: 'bin', op, a, b: this.parseMul() }; }
      else return a;
    }
  }
  private parseMul(): Expr {
    let a = this.parsePow();
    for (;;) {
      if (this.isOp('*') || this.isOp('/') || this.isOp('%')) { const op = (this.next() as { v: string }).v; a = { k: 'bin', op, a, b: this.parsePow() }; }
      else return a;
    }
  }
  private parsePow(): Expr {
    const a = this.parseUnary();
    if (this.eatOp('^')) return { k: 'bin', op: '^', a, b: this.parsePow() };
    return a;
  }
  private parseUnary(): Expr {
    if (this.eatOp('-')) return { k: 'neg', a: this.parseUnary() };
    if (this.eatOp('+')) return this.parseUnary();
    return this.parsePostfix();
  }
  private parsePostfix(): Expr {
    let e = this.parseAtom();
    for (;;) {
      if (this.isOp('.') && this.peek(1).t === 'id') { this.next(); e = { k: 'prop', obj: e, key: this.ident() }; }
      else if (this.isOp('[')) {
        this.next();
        if (this.eatOp('..')) { const to = this.isOp(']') ? null : this.parseExpr(); this.op(']'); e = { k: 'index', obj: e, index: { k: 'lit', v: 0 }, to, slice: true }; continue; }
        const index = this.parseExpr();
        if (this.eatOp('..')) { const to = this.isOp(']') ? null : this.parseExpr(); this.op(']'); e = { k: 'index', obj: e, index, to, slice: true }; continue; }
        this.op(']');
        e = { k: 'index', obj: e, index };
      } else if (this.isOp(':') && e.k === 'var') {
        e = { k: 'labels', a: e, labels: this.parseLabels() };
      } else return e;
    }
  }
  private parseAtom(): Expr {
    const t = this.peek();
    if (t.t === 'num') { this.next(); return { k: 'lit', v: t.v }; }
    if (t.t === 'str') { this.next(); return { k: 'lit', v: t.v }; }
    if (t.t === 'op' && t.v === '(') {
      // A pattern predicate such as (a)-[:KNOWS]->(b) is true when at least one match exists.
      const save = this.i;
      try {
        const node = this.parseNodePat();
        if (this.isOp('-') || this.isOp('<-')) {
          const nodes = [node];
          const rels: RelPat[] = [];
          while (this.isOp('-') || this.isOp('<-')) { rels.push(this.parseRelPat()); nodes.push(this.parseNodePat()); }
          return { k: 'pattern', pattern: { pathVar: null, shortest: null, nodes, rels } };
        }
      } catch (err) {
        if (!(err instanceof CypherError)) throw err;
      }
      this.i = save;
      this.next();
      const e = this.parseExpr();
      this.op(')');
      return e;
    }
    if (t.t === 'op' && t.v === '[') {
      this.next();
      const items: Expr[] = [];
      if (!this.isOp(']')) do items.push(this.parseExpr()); while (this.eatOp(','));
      this.op(']');
      return { k: 'list', items };
    }
    if (t.t === 'op' && t.v === '{') return { k: 'map', entries: this.parseMapEntries() };
    if (t.t === 'id') {
      const up = t.v.toUpperCase();
      if (!t.quoted && up === 'TRUE') { this.next(); return { k: 'lit', v: true }; }
      if (!t.quoted && up === 'FALSE') { this.next(); return { k: 'lit', v: false }; }
      if (!t.quoted && up === 'NULL') { this.next(); return { k: 'lit', v: null }; }
      if (!t.quoted && up === 'CASE') return this.parseCase();
      // Function call, possibly namespaced: vector.similarity.cosine(...)
      let j = 1;
      while (this.isOp('.', j) && this.peek(j + 1).t === 'id') j += 2;
      if (this.isOp('(', j)) {
        const parts: string[] = [];
        for (let k = 0; k < j; k += 2) parts.push((this.toks[this.i + k] as { v: string }).v);
        this.i += j;
        this.op('(');
        const name = parts.join('.').toLowerCase();
        let star = false;
        let distinct = false;
        const args: Expr[] = [];
        if (this.eatOp('*')) star = true;
        else if (!this.isOp(')')) {
          distinct = this.eatKw('DISTINCT');
          do args.push(this.parseExpr()); while (this.eatOp(','));
        }
        this.op(')');
        return { k: 'call', name, args, distinct, star };
      }
      if (!t.quoted && CLAUSE_WORDS.has(up)) this.fail(`Expected a value but found the keyword ${up}`);
      this.next();
      return { k: 'var', name: t.v };
    }
    return this.fail('Expected a value');
  }
  private parseCase(): Expr {
    this.kw('CASE');
    const subject = this.isKw('WHEN') ? null : this.parseExpr();
    const whens: [Expr, Expr][] = [];
    while (this.eatKw('WHEN')) {
      const w = this.parseExpr();
      this.kw('THEN');
      whens.push([w, this.parseExpr()]);
    }
    if (!whens.length) this.fail('CASE needs at least one WHEN … THEN …');
    const els = this.eatKw('ELSE') ? this.parseExpr() : null;
    this.kw('END');
    return { k: 'case', subject, whens, else: els };
  }

}

// ─── Evaluation helpers ─────────────────────────────────────────────────────

const isEntity = (v: Value): v is GNode | GRel => v instanceof GNode || v instanceof GRel;

function equals(a: Value, b: Value): boolean | null {
  if (a === null || b === null) return null;
  if (isEntity(a) || isEntity(b)) return a === b;
  if (a instanceof GPath || b instanceof GPath) return a instanceof GPath && b instanceof GPath && a.rels.length === b.rels.length && a.rels.every((r, i) => r === b.rels[i]) && a.nodes[0] === b.nodes[0];
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    let unknown = false;
    for (let i = 0; i < a.length; i++) {
      const e = equals(a[i]!, b[i]!);
      if (e === false) return false;
      if (e === null) unknown = true;
    }
    return unknown ? null : true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => equals((a as Record<string, Value>)[k]!, (b as Record<string, Value>)[k] ?? null) === true);
  }
  if (typeof a !== typeof b) return false;
  return a === b;
}

function compare(a: Value, b: Value): number | null {
  if (a === null || b === null) return null;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const c = compare(a[i]!, b[i]!);
      if (c === null) return null;
      if (c !== 0) return c;
    }
    return a.length - b.length;
  }
  return null;
}

/** Total order for ORDER BY (nulls last ascending, like Neo4j). */
function sortCompare(a: Value, b: Value): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const c = compare(a, b);
  if (c !== null) return c;
  const rank = (v: Value) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : Array.isArray(v) ? 3 : v instanceof GNode ? 4 : v instanceof GRel ? 5 : 6);
  const r = rank(a) - rank(b);
  if (r) return r;
  if (isEntity(a) && isEntity(b)) return a.id - b.id;
  return 0;
}

function truthy(v: Value): boolean | null {
  if (v === null) return null;
  if (typeof v === 'boolean') return v;
  throw new CypherError(`Expected true or false but got ${fmtValue(v)}.`);
}

function typeName(v: Value): string {
  if (v === null) return 'null';
  if (v instanceof GNode) return 'a node';
  if (v instanceof GRel) return 'a relationship';
  if (v instanceof GPath) return 'a path';
  if (Array.isArray(v)) return 'a list';
  if (typeof v === 'object') return 'a map';
  return `a ${typeof v === 'number' ? 'number' : typeof v === 'string' ? 'string' : 'boolean'}`;
}

function containsAggregate(e: Expr): boolean {
  switch (e.k) {
    case 'call': return AGGREGATES.has(e.name) || e.args.some(containsAggregate);
    case 'bin': return containsAggregate(e.a) || containsAggregate(e.b);
    case 'not': case 'neg': case 'isnull': case 'labels': return containsAggregate(e.a);
    case 'prop': return containsAggregate(e.obj);
    case 'index': return containsAggregate(e.obj) || containsAggregate(e.index) || (!!e.to && containsAggregate(e.to));
    case 'list': return e.items.some(containsAggregate);
    case 'map': return e.entries.some(([, v]) => containsAggregate(v));
    case 'case': return (!!e.subject && containsAggregate(e.subject)) || e.whens.some(([w, t]) => containsAggregate(w) || containsAggregate(t)) || (!!e.else && containsAggregate(e.else));
    default: return false;
  }
}

/** Stable identity key for grouping and DISTINCT. */
function keyOf(v: Value): string {
  if (v === null) return 'null';
  if (v instanceof GNode) return `n${v.id}`;
  if (v instanceof GRel) return `r${v.id}`;
  if (v instanceof GPath) return `p${v.nodes[0]?.id}:${v.rels.map((r) => r.id).join(',')}`;
  if (Array.isArray(v)) return `[${v.map(keyOf).join(',')}]`;
  if (typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${k}:${keyOf((v as Record<string, Value>)[k]!)}`).join(',')}}`;
  return `${typeof v}:${String(v)}`;
}

const toNum = (v: Value, fn: string): number | null => {
  if (v === null) return null;
  if (typeof v !== 'number') throw new CypherError(`${fn}() expects a number but got ${typeName(v)}.`);
  return v;
};
const toStr = (v: Value, fn: string): string | null => {
  if (v === null) return null;
  if (typeof v !== 'string') throw new CypherError(`${fn}() expects a string but got ${typeName(v)}.`);
  return v;
};
const toList = (v: Value, fn: string): Value[] | null => {
  if (v === null) return null;
  if (!Array.isArray(v)) throw new CypherError(`${fn}() expects a list but got ${typeName(v)}.`);
  return v;
};

function vectorArgs(a: Value, b: Value, fn: string): [number[], number[]] | null {
  const x = toList(a, fn);
  const y = toList(b, fn);
  if (!x || !y) return null;
  if (x.length !== y.length) throw new CypherError(`${fn}() needs two vectors of the same length (got ${x.length} and ${y.length}).`);
  return [x.map((n) => toNum(n, fn) ?? 0), y.map((n) => toNum(n, fn) ?? 0)];
}

// ─── Executor ───────────────────────────────────────────────────────────────

export interface QueryStats {
  nodesCreated: number;
  nodesDeleted: number;
  relationshipsCreated: number;
  relationshipsDeleted: number;
  propertiesSet: number;
  labelsAdded: number;
}

export interface QueryResult {
  columns: string[];
  rows: Value[][];
  stats: QueryStats;
  /** True when the last statement ended in RETURN. */
  returned: boolean;
}

const emptyStats = (): QueryStats => ({ nodesCreated: 0, nodesDeleted: 0, relationshipsCreated: 0, relationshipsDeleted: 0, propertiesSet: 0, labelsAdded: 0 });
const MAX_ROWS = 20000;

class Executor {
  stats = emptyStats();
  constructor(private g: Graph) {}

  run(clauses: Clause[]): { columns: string[]; rows: Value[][]; returned: boolean } {
    let rows: Row[] = [{}];
    for (const c of clauses) {
      switch (c.k) {
        case 'match': rows = this.match(rows, c); break;
        case 'create': rows = rows.map((r) => this.create(r, c.patterns)); break;
        case 'merge': rows = rows.map((r) => this.merge(r, c)); break;
        case 'set': for (const r of rows) this.applySet(r, c.items); break;
        case 'remove': for (const r of rows) this.remove(r, c.items); break;
        case 'delete': this.delete(rows, c); break;
        case 'unwind': rows = rows.flatMap((r) => {
          const v = this.eval(c.expr, r);
          if (v === null) return [];
          return (Array.isArray(v) ? v : [v]).map((item) => ({ ...r, [c.as]: item }));
        }); break;
        case 'with': {
          const projected = this.project(rows, c.proj);
          rows = projected.rows.map((vals) => Object.fromEntries(projected.columns.map((col, i) => [col, vals[i]!])));
          if (c.where) rows = rows.filter((r) => truthy(this.eval(c.where!, r)) === true);
          break;
        }
        case 'return': {
          const p = this.project(rows, c.proj);
          return { ...p, returned: true };
        }
      }
      if (rows.length > MAX_ROWS) throw new CypherError(`This query produced more than ${MAX_ROWS.toLocaleString()} rows. Add a WHERE filter or LIMIT, or check for an accidental cartesian product (two unconnected patterns).`);
    }
    return { columns: [], rows: [], returned: false };
  }

  // MATCH ---------------------------------------------------------------
  private match(rows: Row[], c: Extract<Clause, { k: 'match' }>): Row[] {
    const out: Row[] = [];
    const newVars = new Set<string>();
    for (const p of c.patterns) {
      if (p.pathVar) newVars.add(p.pathVar);
      p.nodes.forEach((n) => n.var && newVars.add(n.var));
      p.rels.forEach((r) => r.var && newVars.add(r.var));
    }
    for (const row of rows) {
      let partials: { row: Row; used: Set<number> }[] = [{ row, used: new Set() }];
      for (const p of c.patterns) {
        const next: typeof partials = [];
        for (const pr of partials) {
          for (const m of this.matchPattern(p, pr.row, pr.used)) next.push(m);
          if (next.length > MAX_ROWS) throw new CypherError(`MATCH produced more than ${MAX_ROWS.toLocaleString()} rows. Connect your patterns or add a WHERE filter — unconnected patterns multiply (a cartesian product).`);
        }
        partials = next;
      }
      let found = partials.map((pr) => pr.row);
      if (c.where) found = found.filter((r) => truthy(this.eval(c.where!, r)) === true);
      if (!found.length && c.optional) {
        const nulls: Row = { ...row };
        for (const v of newVars) if (!(v in row)) nulls[v] = null;
        out.push(nulls);
      } else for (const f of found) out.push(f);
      if (out.length > MAX_ROWS) throw new CypherError(`MATCH produced more than ${MAX_ROWS.toLocaleString()} rows. Make the pattern more specific.`);
    }
    return out;
  }

  private nodeMatches(n: GNode, pat: NodePat, row: Row): boolean {
    for (const l of pat.labels) if (!n.labels.includes(l)) return false;
    for (const [k, e] of pat.props) if (equals(n.props[k] ?? null, this.eval(e, row)) !== true) return false;
    return true;
  }
  private relMatches(r: GRel, pat: RelPat, row: Row): boolean {
    if (pat.types.length && !pat.types.includes(r.type)) return false;
    for (const [k, e] of pat.props) if (equals(r.props[k] ?? null, this.eval(e, row)) !== true) return false;
    return true;
  }

  private candidates(pat: NodePat, row: Row): GNode[] {
    if (pat.var && pat.var in row) {
      const v = row[pat.var]!;
      if (v === null) return [];
      if (!(v instanceof GNode)) throw new CypherError(`Variable \`${pat.var}\` is ${typeName(v)}, not a node.`);
      return this.nodeMatches(v, pat, row) ? [v] : [];
    }
    return [...this.g.nodes.values()].filter((n) => this.nodeMatches(n, pat, row));
  }

  private matchPattern(p: Pattern, row: Row, used: Set<number>): { row: Row; used: Set<number> }[] {
    if (p.shortest) return this.matchShortest(p, row, used);
    type State = { row: Row; used: Set<number>; nodes: GNode[]; rels: GRel[] };
    let states: State[] = this.candidates(p.nodes[0]!, row).map((n) => ({ row: p.nodes[0]!.var ? { ...row, [p.nodes[0]!.var]: n } : row, used, nodes: [n], rels: [] }));
    p.rels.forEach((rp, i) => {
      const np = p.nodes[i + 1]!;
      const next: State[] = [];
      for (const s of states) {
        const from = s.nodes[s.nodes.length - 1]!;
        for (const step of this.expand(from, rp, s.row, s.used)) {
          const to = step.end;
          if (!this.nodeMatches(to, np, s.row)) continue;
          if (np.var && np.var in s.row && s.row[np.var] !== to) continue;
          const r: Row = { ...s.row };
          if (np.var) r[np.var] = to;
          if (rp.var) {
            if (rp.var in s.row) {
              const bound = s.row[rp.var];
              if (rp.varLen ? keyOf(bound ?? null) !== keyOf(step.rels) : bound !== step.rels[0]) continue;
            }
            r[rp.var] = rp.varLen ? step.rels : step.rels[0]!;
          }
          const u = new Set(s.used);
          step.rels.forEach((x) => u.add(x.id));
          next.push({ row: r, used: u, nodes: [...s.nodes, ...step.via, to], rels: [...s.rels, ...step.rels] });
        }
      }
      states = next;
    });
    return states.map((s) => ({ row: p.pathVar ? { ...s.row, [p.pathVar]: new GPath(s.nodes, s.rels) } : s.row, used: s.used }));
  }

  /** All ways to walk from `from` along one relationship pattern (fixed or variable length). */
  private expand(from: GNode, rp: RelPat, row: Row, used: Set<number>): { end: GNode; rels: GRel[]; via: GNode[] }[] {
    const step = (n: GNode, taken: Set<number>) => this.g.relsOf(n, rp.dir).filter((r) => !taken.has(r.id) && !used.has(r.id) && this.relMatches(r, rp, row));
    const nextNode = (r: GRel, n: GNode) => (rp.dir === 'out' ? this.g.nodes.get(r.end)! : rp.dir === 'in' ? this.g.nodes.get(r.start)! : this.g.other(r, n));
    if (!rp.varLen) return step(from, new Set()).map((r) => ({ end: nextNode(r, from), rels: [r], via: [] }));
    const { min, max } = rp.varLen;
    const out: { end: GNode; rels: GRel[]; via: GNode[] }[] = [];
    if (min === 0) out.push({ end: from, rels: [], via: [] });
    const walk = (n: GNode, rels: GRel[], via: GNode[], taken: Set<number>) => {
      if (rels.length >= max) return;
      for (const r of step(n, taken)) {
        const m = nextNode(r, n);
        const rr = [...rels, r];
        if (rr.length >= min) out.push({ end: m, rels: rr, via });
        if (out.length > MAX_ROWS) throw new CypherError('This variable-length pattern explodes into too many paths. Lower the maximum (e.g. *1..3) or add labels and relationship types.');
        const t = new Set(taken);
        t.add(r.id);
        walk(m, rr, [...via, m], t);
      }
    };
    // `via` holds the intermediate nodes between `from` and `end` (never `end` itself).
    walk(from, [], [], new Set());
    return out;
  }

  private matchShortest(p: Pattern, row: Row, used: Set<number>): { row: Row; used: Set<number> }[] {
    const [aPat, bPat] = p.nodes as [NodePat, NodePat];
    const rp = p.rels[0]!;
    const out: { row: Row; used: Set<number> }[] = [];
    for (const a of this.candidates(aPat, row)) {
      const ra: Row = aPat.var ? { ...row, [aPat.var]: a } : row;
      for (const b of this.candidates(bPat, ra)) {
        if (a === b) continue;
        const paths = this.bfs(a, b, rp, ra, p.shortest === 'all');
        for (const path of paths) {
          const r: Row = { ...ra };
          if (bPat.var) r[bPat.var] = b;
          if (rp.var) r[rp.var] = path.rels;
          if (p.pathVar) r[p.pathVar] = path;
          out.push({ row: r, used });
        }
      }
    }
    return out;
  }

  private bfs(a: GNode, b: GNode, rp: RelPat, row: Row, all: boolean): GPath[] {
    const max = rp.varLen?.max ?? 15;
    let frontier: GPath[] = [new GPath([a], [])];
    const seenAt = new Map<number, number>([[a.id, 0]]);
    for (let depth = 1; depth <= max; depth++) {
      const next: GPath[] = [];
      const hits: GPath[] = [];
      for (const path of frontier) {
        const end = path.nodes[path.nodes.length - 1]!;
        for (const r of this.g.relsOf(end, rp.dir)) {
          if (!this.relMatches(r, rp, row) || path.rels.includes(r)) continue;
          const m = rp.dir === 'out' ? this.g.nodes.get(r.end)! : rp.dir === 'in' ? this.g.nodes.get(r.start)! : this.g.other(r, end);
          const seen = seenAt.get(m.id);
          if (seen !== undefined && seen < depth) continue;
          seenAt.set(m.id, depth);
          const np = new GPath([...path.nodes, m], [...path.rels, r]);
          if (m === b) hits.push(np);
          else next.push(np);
        }
      }
      if (hits.length && depth >= (rp.varLen?.min ?? 1)) return all ? hits : [hits[0]!];
      frontier = next;
      if (!frontier.length) break;
    }
    return [];
  }

  // CREATE / MERGE ------------------------------------------------------
  private props(entries: [string, Expr][], row: Row): Record<string, Value> {
    const out: Record<string, Value> = {};
    for (const [k, e] of entries) {
      const v = this.eval(e, row);
      if (v instanceof GNode || v instanceof GRel || v instanceof GPath || (v !== null && typeof v === 'object' && !Array.isArray(v))) {
        throw new CypherError(`Property "${k}" cannot store ${typeName(v)}. Properties hold numbers, strings, booleans or lists of them.`);
      }
      out[k] = v;
    }
    this.stats.propertiesSet += Object.values(out).filter((v) => v !== null).length;
    return out;
  }

  private create(row: Row, patterns: Pattern[]): Row {
    const r: Row = { ...row };
    for (const p of patterns) {
      if (p.shortest) throw new CypherError('shortestPath cannot be used in CREATE.');
      const nodes = p.nodes.map((np) => {
        if (np.var && np.var in r) {
          const v = r[np.var];
          if (!(v instanceof GNode)) throw new CypherError(`Cannot CREATE using \`${np.var}\` because it is ${typeName(v ?? null)}, not a node.`);
          if (np.labels.length || np.props.length) throw new CypherError(`\`${np.var}\` already exists — do not repeat its labels or properties in CREATE. Write (${np.var}) instead.`);
          return v;
        }
        const n = this.g.addNode(np.labels, this.props(np.props, r));
        this.stats.nodesCreated++;
        this.stats.labelsAdded += np.labels.length;
        if (np.var) r[np.var] = n;
        return n;
      });
      const rels = p.rels.map((rp, i) => {
        if (rp.types.length !== 1) throw new CypherError('Each relationship in CREATE needs exactly one type, e.g. -[:KNOWS]->.');
        if (rp.dir === 'both') throw new CypherError('Relationships in CREATE need a direction: use -[:TYPE]-> or <-[:TYPE]-.');
        if (rp.varLen) throw new CypherError('Variable-length relationships cannot be created.');
        const [s, e] = rp.dir === 'out' ? [nodes[i]!, nodes[i + 1]!] : [nodes[i + 1]!, nodes[i]!];
        const rel = this.g.addRel(rp.types[0]!, s, e, this.props(rp.props, r));
        this.stats.relationshipsCreated++;
        if (rp.var) r[rp.var] = rel;
        return rel;
      });
      if (p.pathVar) r[p.pathVar] = new GPath(nodes, rels);
    }
    return r;
  }

  private merge(row: Row, c: Extract<Clause, { k: 'merge' }>): Row {
    const found = this.matchPattern(c.pattern, row, new Set());
    if (found.length) {
      const r = found[0]!.row;
      this.applySet(r, c.onMatch);
      return r;
    }
    const r = this.create(row, [c.pattern]);
    this.applySet(r, c.onCreate);
    return r;
  }

  private entity(r: Row, name: string, verb: string): GNode | GRel | null {
    if (!(name in r)) throw new CypherError(`Variable \`${name}\` is not defined, so it cannot be used in ${verb}.`);
    const v = r[name]!;
    if (v === null) return null;
    if (!isEntity(v)) throw new CypherError(`\`${name}\` is ${typeName(v)}; ${verb} works on nodes and relationships.`);
    return v;
  }

  private applySet(r: Row, items: SetItem[]) {
    for (const it of items) {
      const target = this.entity(r, it.target, 'SET');
      if (!target) continue;
      if (it.k === 'prop') {
        const v = this.eval(it.value, r);
        if (v === null) delete target.props[it.key];
        else target.props[it.key] = v;
        this.stats.propertiesSet++;
      } else if (it.k === 'merge') {
        const v = this.eval(it.value, r);
        const map = v instanceof GNode || v instanceof GRel ? v.props : v;
        if (map === null || typeof map !== 'object' || Array.isArray(map)) throw new CypherError('SET n = … and SET n += … need a map such as {name: "Rudo"}.');
        if (it.replace) target.props = {};
        for (const [k, val] of Object.entries(map)) {
          if (val === null) delete target.props[k];
          else target.props[k] = val as Value;
          this.stats.propertiesSet++;
        }
      } else {
        if (!(target instanceof GNode)) throw new CypherError('Only nodes have labels.');
        for (const l of it.labels) if (!target.labels.includes(l)) { target.labels.push(l); this.stats.labelsAdded++; }
      }
    }
  }

  private remove(r: Row, items: Extract<Clause, { k: 'remove' }>['items']) {
    for (const it of items) {
      const target = this.entity(r, it.target, 'REMOVE');
      if (!target) continue;
      if (it.k === 'prop') { if (it.key in target.props) { delete target.props[it.key]; this.stats.propertiesSet++; } }
      else if (target instanceof GNode) target.labels = target.labels.filter((l) => !it.labels.includes(l));
    }
  }

  private delete(rows: Row[], c: Extract<Clause, { k: 'delete' }>) {
    const nodes = new Map<number, GNode>();
    const rels = new Map<number, GRel>();
    const collect = (v: Value) => {
      if (v === null) return;
      if (v instanceof GNode) nodes.set(v.id, v);
      else if (v instanceof GRel) rels.set(v.id, v);
      else if (v instanceof GPath) { v.nodes.forEach(collect); v.rels.forEach(collect); }
      else if (Array.isArray(v)) v.forEach(collect);
      else throw new CypherError(`DELETE works on nodes, relationships and paths, not ${typeName(v)}.`);
    };
    for (const r of rows) for (const e of c.exprs) collect(this.eval(e, r));
    for (const r of rels.values()) if (this.g.deleteRel(r)) this.stats.relationshipsDeleted++;
    for (const n of nodes.values()) {
      const res = this.g.deleteNode(n, c.detach);
      if (res.node) this.stats.nodesDeleted++;
      this.stats.relationshipsDeleted += res.rels;
    }
  }

  // Projection ------------------------------------------------------------
  private project(rows: Row[], p: Projection): { columns: string[]; rows: Value[][] } {
    let items = p.items;
    if (p.star) {
      const vars = rows.length ? Object.keys(rows[0]!) : [];
      items = [...vars.sort().map((v) => ({ expr: { k: 'var', name: v } as Expr, alias: v })), ...items];
      if (!items.length) throw new CypherError('RETURN * needs at least one variable in scope.');
    }
    const aliases = new Set<string>();
    for (const it of items) {
      if (aliases.has(it.alias)) throw new CypherError(`Two columns are both called "${it.alias}". Give one a different name with AS.`);
      aliases.add(it.alias);
    }
    const aggregating = items.some((it) => containsAggregate(it.expr));
    // Each output row keeps an environment so ORDER BY can use aliases and (without aggregation) original variables.
    let out: { vals: Value[]; env: Row }[];
    if (!aggregating) {
      out = rows.map((r) => {
        const vals = items.map((it) => this.eval(it.expr, r));
        return { vals, env: { ...r, ...Object.fromEntries(items.map((it, i) => [it.alias, vals[i]!])) } };
      });
    } else {
      const keyItems = items.filter((it) => !containsAggregate(it.expr));
      const groups = new Map<string, Row[]>();
      for (const r of rows) {
        const k = keyItems.map((it) => keyOf(this.eval(it.expr, r))).join('|');
        const g = groups.get(k);
        if (g) g.push(r);
        else groups.set(k, [r]);
      }
      // Aggregation with no grouping keys over zero rows still returns one row (count = 0).
      if (!groups.size && !keyItems.length) groups.set('', []);
      out = [...groups.values()].map((g) => {
        const vals = items.map((it) => this.evalAgg(it.expr, g));
        const env: Row = { ...(g[0] ?? {}) };
        items.forEach((it, i) => { env[it.alias] = vals[i]!; });
        return { vals, env };
      });
    }
    if (p.distinct) {
      const seen = new Set<string>();
      out = out.filter((o) => { const k = o.vals.map(keyOf).join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
    }
    if (p.order.length) {
      const keyed = out.map((o) => ({ o, keys: p.order.map((ob) => this.evalOrder(ob.expr, o.env, items, aggregating)) }));
      keyed.sort((a, b) => {
        for (let i = 0; i < p.order.length; i++) {
          const c = sortCompare(a.keys[i]!, b.keys[i]!);
          if (c) return p.order[i]!.desc ? -c : c;
        }
        return 0;
      });
      out = keyed.map((k) => k.o);
    }
    const skip = p.skip ? this.intArg(p.skip, 'SKIP') : 0;
    const limit = p.limit ? this.intArg(p.limit, 'LIMIT') : Infinity;
    out = out.slice(skip, skip + limit);
    return { columns: items.map((it) => it.alias), rows: out.map((o) => o.vals) };
  }

  private evalOrder(e: Expr, env: Row, items: ProjItem[], aggregating: boolean): Value {
    // ORDER BY count(*) after an aggregating RETURN refers to the projected column with that text.
    if (aggregating && containsAggregate(e)) {
      const match = items.find((it) => JSON.stringify(it.expr) === JSON.stringify(e));
      if (match) return env[match.alias] ?? null;
      throw new CypherError('ORDER BY can only sort by an aggregate that is also returned. Return it with an alias and order by the alias.');
    }
    return this.eval(e, env);
  }

  private intArg(e: Expr, what: string): number {
    const v = this.eval(e, {});
    if (typeof v !== 'number' || v < 0 || !Number.isInteger(v)) throw new CypherError(`${what} needs a whole number of 0 or more.`);
    return v;
  }

  private evalAgg(e: Expr, group: Row[]): Value {
    if (e.k === 'call' && AGGREGATES.has(e.name)) {
      let vals: Value[];
      if (e.star) vals = group.map(() => 1);
      else {
        if (e.args.length !== 1) throw new CypherError(`${e.name}() takes exactly one argument.`);
        vals = group.map((r) => this.eval(e.args[0]!, r)).filter((v) => v !== null);
      }
      if (e.distinct) {
        const seen = new Set<string>();
        vals = vals.filter((v) => { const k = keyOf(v); if (seen.has(k)) return false; seen.add(k); return true; });
      }
      switch (e.name) {
        case 'count': return vals.length;
        case 'collect': return vals;
        case 'sum': return vals.reduce<number>((s, v) => s + (toNum(v, 'sum') ?? 0), 0);
        case 'avg': return vals.length ? vals.reduce<number>((s, v) => s + (toNum(v, 'avg') ?? 0), 0) / vals.length : null;
        case 'stdev': {
          if (vals.length < 2) return 0;
          const xs = vals.map((v) => toNum(v, 'stdev') ?? 0);
          const m = xs.reduce((a, b) => a + b, 0) / xs.length;
          return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
        }
        case 'min': return vals.length ? vals.reduce((a, b) => (sortCompare(b, a) < 0 ? b : a)) : null;
        case 'max': return vals.length ? vals.reduce((a, b) => (sortCompare(b, a) > 0 ? b : a)) : null;
      }
    }
    if (!containsAggregate(e)) return group.length ? this.eval(e, group[0]!) : null;
    // Expression that wraps aggregates, e.g. round(avg(x), 2) or count(*) * 2: evaluate aggregates first.
    const sub = (x: Expr): Expr => (containsAggregate(x) ? { k: 'lit', v: this.evalAgg(x, group) } : x);
    switch (e.k) {
      case 'bin': return this.eval({ ...e, a: sub(e.a), b: sub(e.b) }, group[0] ?? {});
      case 'call': return this.eval({ ...e, args: e.args.map(sub) }, group[0] ?? {});
      case 'not': case 'neg': return this.eval({ ...e, a: sub(e.a) }, group[0] ?? {});
      case 'list': return this.eval({ ...e, items: e.items.map(sub) }, group[0] ?? {});
      case 'map': return this.eval({ ...e, entries: e.entries.map(([k, v]) => [k, sub(v)] as [string, Expr]) }, group[0] ?? {});
      case 'prop': return this.eval({ ...e, obj: sub(e.obj) }, group[0] ?? {});
      case 'index': return this.eval({ ...e, obj: sub(e.obj), index: sub(e.index) }, group[0] ?? {});
      case 'case': return this.eval({ ...e, subject: e.subject && sub(e.subject), whens: e.whens.map(([w, t]) => [sub(w), sub(t)] as [Expr, Expr]), else: e.else && sub(e.else) }, group[0] ?? {});
      default: throw new CypherError('Aggregations cannot be used here.');
    }
  }

  // Expressions -----------------------------------------------------------
  eval(e: Expr, r: Row): Value {
    switch (e.k) {
      case 'lit': return e.v;
      case 'var':
        if (!(e.name in r)) throw new CypherError(`Variable \`${e.name}\` is not defined. Did you name it in a MATCH, WITH or UNWIND before using it?`);
        return r[e.name]!;
      case 'prop': {
        const o = this.eval(e.obj, r);
        if (o === null) return null;
        if (o instanceof GNode || o instanceof GRel) return o.props[e.key] ?? null;
        if (typeof o === 'object' && !Array.isArray(o) && !(o instanceof GPath)) return (o as Record<string, Value>)[e.key] ?? null;
        throw new CypherError(`Cannot read .${e.key} from ${typeName(o)}.`);
      }
      case 'index': {
        const o = this.eval(e.obj, r);
        if (o === null) return null;
        if (e.slice) {
          if (!Array.isArray(o) && typeof o !== 'string') throw new CypherError(`Cannot slice ${typeName(o)}.`);
          const len = o.length;
          const fix = (v: Value, d: number) => { if (v === null) return d; const n = toNum(v, 'slice')!; return n < 0 ? len + n : n; };
          const from = fix(this.eval(e.index, r), 0);
          const to = e.to ? fix(this.eval(e.to, r), len) : len;
          return Array.isArray(o) ? o.slice(from, to) : o.slice(from, to);
        }
        const idx = this.eval(e.index, r);
        if (idx === null) return null;
        if (Array.isArray(o)) {
          const n = toNum(idx, 'list index')!;
          const i = n < 0 ? o.length + n : n;
          return o[i] ?? null;
        }
        if (typeof idx === 'string') {
          if (o instanceof GNode || o instanceof GRel) return o.props[idx] ?? null;
          if (typeof o === 'object' && !(o instanceof GPath)) return (o as Record<string, Value>)[idx] ?? null;
        }
        throw new CypherError(`Cannot index into ${typeName(o)}.`);
      }
      case 'list': return e.items.map((x) => this.eval(x, r));
      case 'map': return Object.fromEntries(e.entries.map(([k, v]) => [k, this.eval(v, r)]));
      case 'not': { const v = truthy(this.eval(e.a, r)); return v === null ? null : !v; }
      case 'neg': { const v = this.eval(e.a, r); return v === null ? null : -toNum(v, 'negation')!; }
      case 'isnull': { const isNull = this.eval(e.a, r) === null; return e.not ? !isNull : isNull; }
      case 'labels': { const v = this.eval(e.a, r); if (v === null) return null; if (!(v instanceof GNode)) throw new CypherError('Label checks like n:Person only work on nodes.'); return e.labels.every((l) => v.labels.includes(l)); }
      case 'case': {
        const subject = e.subject ? this.eval(e.subject, r) : undefined;
        for (const [w, t] of e.whens) {
          const hit = subject === undefined ? truthy(this.eval(w, r)) === true : equals(subject, this.eval(w, r)) === true;
          if (hit) return this.eval(t, r);
        }
        return e.else ? this.eval(e.else, r) : null;
      }
      case 'bin': return this.binary(e, r);
      case 'call': return this.call(e, r);
      case 'pattern': {
        for (const n of e.pattern.nodes) if (n.var && !(n.var in r)) throw new CypherError(`Pattern predicates can only use variables that already exist; \`${n.var}\` is new here. Use MATCH to introduce it.`);
        return this.matchPattern(e.pattern, r, new Set()).length > 0;
      }
    }
  }

  private binary(e: Extract<Expr, { k: 'bin' }>, r: Row): Value {
    if (e.op === 'AND' || e.op === 'OR' || e.op === 'XOR') {
      const a = truthy(this.eval(e.a, r));
      if (e.op === 'AND' && a === false) return false;
      if (e.op === 'OR' && a === true) return true;
      const b = truthy(this.eval(e.b, r));
      if (e.op === 'AND') return a === null || b === null ? (a === false || b === false ? false : null) : a && b;
      if (e.op === 'OR') return a === null || b === null ? (a === true || b === true ? true : null) : a || b;
      return a === null || b === null ? null : a !== b;
    }
    const a = this.eval(e.a, r);
    const b = this.eval(e.b, r);
    switch (e.op) {
      case '=': return equals(a, b);
      case '<>': { const q = equals(a, b); return q === null ? null : !q; }
      case '<': case '>': case '<=': case '>=': {
        const c = compare(a, b);
        if (c === null) return null;
        return e.op === '<' ? c < 0 : e.op === '>' ? c > 0 : e.op === '<=' ? c <= 0 : c >= 0;
      }
      case 'IN': {
        if (b === null) return null;
        const list = toList(b, 'IN')!;
        let unknown = false;
        for (const x of list) { const q = equals(a, x); if (q === true) return true; if (q === null) unknown = true; }
        return unknown ? null : false;
      }
      case 'STARTS WITH': case 'ENDS WITH': case 'CONTAINS': {
        if (a === null || b === null) return null;
        if (typeof a !== 'string' || typeof b !== 'string') return null;
        return e.op === 'STARTS WITH' ? a.startsWith(b) : e.op === 'ENDS WITH' ? a.endsWith(b) : a.includes(b);
      }
      case '=~': {
        if (a === null || b === null) return null;
        try { return new RegExp(`^(?:${toStr(b, '=~')})$`).test(String(a)); } catch { throw new CypherError(`Invalid regular expression: ${String(b)}`); }
      }
      case '+': {
        if (a === null || b === null) return null;
        if (Array.isArray(a)) return Array.isArray(b) ? [...a, ...b] : [...a, b];
        if (Array.isArray(b)) return [a, ...b];
        if (typeof a === 'string' || typeof b === 'string') return `${fmtScalar(a)}${fmtScalar(b)}`;
        return toNum(a, '+')! + toNum(b, '+')!;
      }
      case '-': case '*': case '/': case '%': case '^': {
        if (a === null || b === null) return null;
        const x = toNum(a, e.op)!;
        const y = toNum(b, e.op)!;
        if ((e.op === '/' || e.op === '%') && y === 0) throw new CypherError('Division by zero.');
        return e.op === '-' ? x - y : e.op === '*' ? x * y : e.op === '/' ? x / y : e.op === '%' ? x % y : x ** y;
      }
    }
    throw new CypherError(`Unknown operator ${e.op}.`);
  }

  private call(e: Extract<Expr, { k: 'call' }>, r: Row): Value {
    if (AGGREGATES.has(e.name)) throw new CypherError(`${e.name}() is an aggregation and can only be used in RETURN or WITH.`);
    const args = e.args.map((a) => this.eval(a, r));
    const need = (n: number) => { if (args.length !== n) throw new CypherError(`${e.name}() takes ${n} argument${n === 1 ? '' : 's'}.`); };
    const a0 = args[0] ?? null;
    switch (e.name) {
      case 'id': case 'elementid': need(1); return isEntity(a0) ? (e.name === 'id' ? a0.id : `4:skuru:${a0.id}`) : null;
      case 'labels': need(1); if (a0 === null) return null; if (!(a0 instanceof GNode)) throw new CypherError('labels() needs a node.'); return [...a0.labels];
      case 'type': need(1); if (a0 === null) return null; if (!(a0 instanceof GRel)) throw new CypherError('type() needs a relationship.'); return a0.type;
      case 'properties': need(1); return isEntity(a0) ? { ...a0.props } : a0;
      case 'keys': need(1); return isEntity(a0) ? Object.keys(a0.props).sort() : a0 && typeof a0 === 'object' && !Array.isArray(a0) ? Object.keys(a0).sort() : null;
      case 'startnode': need(1); return a0 instanceof GRel ? this.g.nodes.get(a0.start) ?? null : null;
      case 'endnode': need(1); return a0 instanceof GRel ? this.g.nodes.get(a0.end) ?? null : null;
      case 'degree': need(1); return a0 instanceof GNode ? this.g.degree(a0) : null;
      case 'nodes': need(1); return a0 instanceof GPath ? [...a0.nodes] : null;
      case 'relationships': case 'rels': need(1); return a0 instanceof GPath ? [...a0.rels] : Array.isArray(a0) ? a0 : null;
      case 'length': need(1); if (a0 instanceof GPath) return a0.rels.length; if (typeof a0 === 'string' || Array.isArray(a0)) return a0.length; return null;
      case 'size': need(1); if (a0 === null) return null; if (typeof a0 === 'string' || Array.isArray(a0)) return a0.length; throw new CypherError('size() needs a string or a list.');
      case 'exists': need(1); return typeof a0 === 'boolean' && e.args[0]!.k === 'pattern' ? a0 : a0 !== null;
      case 'coalesce': return args.find((v) => v !== null) ?? null;
      case 'head': need(1); return toList(a0, 'head')?.[0] ?? null;
      case 'last': { need(1); const l = toList(a0, 'last'); return l ? l[l.length - 1] ?? null : null; }
      case 'tail': need(1); return toList(a0, 'tail')?.slice(1) ?? null;
      case 'reverse': need(1); return Array.isArray(a0) ? [...a0].reverse() : typeof a0 === 'string' ? [...a0].reverse().join('') : null;
      case 'range': {
        const [s, en, st = 1] = args.map((v) => toNum(v, 'range') ?? 0);
        if (st === 0) throw new CypherError('range() step cannot be 0.');
        const out: number[] = [];
        for (let i = s!; st! > 0 ? i <= en! : i >= en!; i += st!) { out.push(i); if (out.length > 10000) break; }
        return out;
      }
      case 'tolower': need(1); return toStr(a0, 'toLower')?.toLowerCase() ?? null;
      case 'toupper': need(1); return toStr(a0, 'toUpper')?.toUpperCase() ?? null;
      case 'trim': need(1); return toStr(a0, 'trim')?.trim() ?? null;
      case 'split': need(2); { const s = toStr(a0, 'split'); return s === null ? null : s.split(toStr(args[1]!, 'split') ?? ''); }
      case 'replace': need(3); { const s = toStr(a0, 'replace'); return s === null ? null : s.split(toStr(args[1]!, 'replace')!).join(toStr(args[2]!, 'replace')!); }
      case 'substring': { const s = toStr(a0, 'substring'); if (s === null) return null; const st = toNum(args[1] ?? 0, 'substring')!; const len = args[2] != null ? toNum(args[2], 'substring')! : undefined; return s.substr(st, len); }
      case 'left': need(2); return toStr(a0, 'left')?.slice(0, toNum(args[1]!, 'left')!) ?? null;
      case 'right': need(2); { const s = toStr(a0, 'right'); return s === null ? null : s.slice(Math.max(0, s.length - toNum(args[1]!, 'right')!)); }
      case 'tostring': need(1); return a0 === null ? null : fmtScalar(a0);
      case 'tointeger': need(1); { if (a0 === null) return null; const n = typeof a0 === 'string' ? Number(a0) : typeof a0 === 'number' ? a0 : NaN; return Number.isFinite(n) ? Math.trunc(n) : null; }
      case 'tofloat': need(1); { if (a0 === null) return null; const n = Number(a0); return Number.isFinite(n) ? n : null; }
      case 'toboolean': need(1); return a0 === null ? null : typeof a0 === 'boolean' ? a0 : a0 === 'true' ? true : a0 === 'false' ? false : null;
      case 'abs': need(1); { const n = toNum(a0, 'abs'); return n === null ? null : Math.abs(n); }
      case 'ceil': need(1); { const n = toNum(a0, 'ceil'); return n === null ? null : Math.ceil(n); }
      case 'floor': need(1); { const n = toNum(a0, 'floor'); return n === null ? null : Math.floor(n); }
      case 'sqrt': need(1); { const n = toNum(a0, 'sqrt'); return n === null ? null : Math.sqrt(n); }
      case 'log': need(1); { const n = toNum(a0, 'log'); return n === null ? null : Math.log(n); }
      case 'exp': need(1); { const n = toNum(a0, 'exp'); return n === null ? null : Math.exp(n); }
      case 'sign': need(1); { const n = toNum(a0, 'sign'); return n === null ? null : Math.sign(n); }
      case 'round': {
        const n = toNum(a0, 'round');
        if (n === null) return null;
        const p = args[1] != null ? toNum(args[1], 'round')! : 0;
        const f = 10 ** p;
        return Math.round(n * f) / f;
      }
      case 'rand': return Math.random();
      case 'vector.similarity.cosine': {
        need(2);
        const v = vectorArgs(a0, args[1]!, e.name);
        if (!v) return null;
        const [x, y] = v;
        const dot = x.reduce((s, xi, i) => s + xi * y[i]!, 0);
        const nx = Math.hypot(...x);
        const ny = Math.hypot(...y);
        if (!nx || !ny) return null;
        // Neo4j normalises cosine similarity into [0, 1]: (1 + cos) / 2.
        return (1 + dot / (nx * ny)) / 2;
      }
      case 'vector.similarity.euclidean': {
        need(2);
        const v = vectorArgs(a0, args[1]!, e.name);
        if (!v) return null;
        const [x, y] = v;
        const d2 = x.reduce((s, xi, i) => s + (xi - y[i]!) ** 2, 0);
        return 1 / (1 + d2);
      }
      default:
        throw new CypherError(`Unknown function ${e.name}(). This practice database supports common Cypher functions; APOC and GDS procedures are not available here.`);
    }
  }
}

// ─── Formatting ─────────────────────────────────────────────────────────────

function fmtScalar(v: Value): string {
  if (typeof v === 'string') return v;
  return fmtValue(v);
}

const fmtProps = (props: Record<string, Value>) => {
  const entries = Object.entries(props);
  return entries.length ? ` {${entries.map(([k, v]) => `${k}: ${fmtValue(v, true)}`).join(', ')}}` : '';
};

/** Human-readable value, close to how Neo4j Browser prints results. */
export function fmtValue(v: Value, quoteStrings = false): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return quoteStrings ? JSON.stringify(v) : v;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  if (typeof v === 'boolean') return String(v);
  if (v instanceof GNode) return `(${v.labels.map((l) => `:${l}`).join('')}${fmtProps(v.props)})`;
  if (v instanceof GRel) return `[:${v.type}${fmtProps(v.props)}]`;
  if (v instanceof GPath) {
    let s = fmtValue(v.nodes[0]!);
    v.rels.forEach((r, i) => {
      const a = v.nodes[i]!;
      const forward = r.start === a.id;
      s += `${forward ? '-' : '<-'}[:${r.type}]${forward ? '->' : '-'}${fmtValue(v.nodes[i + 1]!)}`;
    });
    return s;
  }
  if (Array.isArray(v)) return `[${v.map((x) => fmtValue(x, true)).join(', ')}]`;
  return `{${Object.entries(v).map(([k, x]) => `${k}: ${fmtValue(x, true)}`).join(', ')}}`;
}

/** Plain JSON-able copy of a value, for comparing results in checks and tests. */
export function plain(v: Value): unknown {
  if (v instanceof GNode) return { labels: [...v.labels].sort(), props: v.props };
  if (v instanceof GRel) return { type: v.type, props: v.props };
  if (v instanceof GPath) return { path: v.nodes.map(plain), rels: v.rels.map(plain) };
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  return v;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function parseCypher(src: string) {
  return new Parser(lex(src), src).parseStatements();
}

/** Run one or more ';'-separated statements. Returns the result of the last one plus combined write stats. */
export function runCypher(graph: Graph, src: string): QueryResult {
  const statements = parseCypher(src);
  const ex = new Executor(graph);
  let last: { columns: string[]; rows: Value[][]; returned: boolean } = { columns: [], rows: [], returned: false };
  for (const s of statements) last = ex.run(s);
  return { ...last, stats: ex.stats };
}

export function describeStats(s: QueryStats): string {
  const parts: string[] = [];
  const add = (n: number, one: string, many: string) => n && parts.push(`${n} ${n === 1 ? one : many}`);
  add(s.nodesCreated, 'node created', 'nodes created');
  add(s.relationshipsCreated, 'relationship created', 'relationships created');
  add(s.propertiesSet, 'property set', 'properties set');
  add(s.labelsAdded, 'label added', 'labels added');
  add(s.nodesDeleted, 'node deleted', 'nodes deleted');
  add(s.relationshipsDeleted, 'relationship deleted', 'relationships deleted');
  return parts.join(', ');
}

/** Nodes and relationships to draw for a result: everything it returned, plus links between those nodes. */
export function resultGraph(graph: Graph, rows: Value[][]): { nodes: GNode[]; rels: GRel[] } {
  const nodes = new Map<number, GNode>();
  const rels = new Map<number, GRel>();
  const visit = (v: Value) => {
    if (v instanceof GNode) nodes.set(v.id, v);
    else if (v instanceof GRel) {
      rels.set(v.id, v);
      const s = graph.nodes.get(v.start);
      const e = graph.nodes.get(v.end);
      if (s) nodes.set(s.id, s);
      if (e) nodes.set(e.id, e);
    } else if (v instanceof GPath) { v.nodes.forEach(visit); v.rels.forEach(visit); }
    else if (Array.isArray(v)) v.forEach(visit);
  };
  rows.forEach((r) => r.forEach(visit));
  for (const r of graph.rels.values()) if (nodes.has(r.start) && nodes.has(r.end)) rels.set(r.id, r);
  return { nodes: [...nodes.values()], rels: [...rels.values()].filter((r) => nodes.has(r.start) && nodes.has(r.end)) };
}
