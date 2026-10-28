import { describe, expect, it } from 'vitest';
import { Graph, runCypher, plain, fmtValue, resultGraph, CypherError, type Value } from '../src/features/graph/engine';
import { buildGraph, DATASETS, datasetFromCode } from '../src/features/graph/datasets';

const q = (g: Graph, src: string) => runCypher(g, src);
const col = (g: Graph, src: string) => q(g, src).rows.map((r) => plain(r[0] as Value));

describe('cypher engine: reading', () => {
  const g = buildGraph('skuru');

  it('builds every dataset without errors', () => {
    for (const d of DATASETS) expect(buildGraph(d.id).nodes.size, d.id).toBeGreaterThan(5);
  });

  it('matches labels and properties, filters and orders', () => {
    expect(col(g, "MATCH (s:Student {city: 'Harare'}) RETURN s.name ORDER BY s.name")).toEqual(['Farai', 'Tatenda', 'Tendai']);
    expect(col(g, 'MATCH (s:Student) WHERE s.year >= 3 RETURN s.name ORDER BY s.name DESC')).toEqual(['Tatenda', 'Sipho', 'Rudo']);
    expect(col(g, "MATCH (c:Course) WHERE c.title STARTS WITH 'R' OR c.code CONTAINS 'WEB' RETURN c.code ORDER BY c.code")).toEqual(['AI301', 'WEB101']);
  });

  it('follows relationships in either direction', () => {
    expect(col(g, "MATCH (:Teacher {name: 'Dr Moyo'})-[:TEACHES]->(c) RETURN c.code ORDER BY c.code")).toEqual(['AI301', 'AI310', 'ML201']);
    expect(col(g, "MATCH (c:Course {code: 'SQL101'})<-[:REQUIRES]-(next) RETURN next.code ORDER BY next.code")).toEqual(['DB220', 'ML201']);
    expect(col(g, "MATCH (a:Student {name: 'Tendai'})-[:FRIENDS_WITH]-(f) RETURN f.name ORDER BY f.name")).toEqual(['Farai', 'Nyasha', 'Tatenda']);
  });

  it('aggregates with implicit grouping, DISTINCT, and ordering by alias', () => {
    const r = q(g, 'MATCH (s:Student)-[:ENROLLED_IN]->(c:Course) RETURN c.code AS course, count(s) AS learners ORDER BY learners DESC, course LIMIT 3');
    expect(r.columns).toEqual(['course', 'learners']);
    expect(r.rows.map((x) => x.map((v) => plain(v)))).toEqual([['AI301', 3], ['ML201', 3], ['PY101', 3]]);
    expect(col(g, 'MATCH (s:Student) RETURN count(DISTINCT s.city)')).toEqual([4]);
    expect(col(g, "MATCH (s:Student {name: 'Rudo'})-[e:ENROLLED_IN]->() RETURN round(avg(e.progress), 1)")).toEqual([61.7]);
    expect(col(g, 'MATCH (s:Student) WHERE s.year = 9 RETURN count(*)')).toEqual([0]);
  });

  it('collects lists and supports WITH … WHERE', () => {
    const r = q(g, 'MATCH (s:Student)-[:ENROLLED_IN]->(c) WITH s, count(c) AS n WHERE n >= 3 RETURN s.name, n ORDER BY s.name');
    expect(r.rows.map((x) => x.map((v) => plain(v)))).toEqual([['Rudo', 3], ['Sipho', 3], ['Tatenda', 3], ['Tendai', 3]]);
    expect(col(g, "MATCH (t:Teacher {name: 'Ms Ncube'})-[:TEACHES]->(c) WITH t, collect(c.code) AS codes RETURN size(codes)")).toEqual([2]);
  });

  it('walks variable-length paths without repeating relationships', () => {
    expect(col(g, "MATCH (:Course {code: 'AI310'})-[:REQUIRES*]->(pre) RETURN DISTINCT pre.code ORDER BY pre.code")).toEqual(['AI301', 'DB220', 'ML201', 'PY101', 'SQL101']);
    expect(col(g, "MATCH (:Course {code: 'AI310'})-[:REQUIRES*2]->(pre) RETURN pre.code ORDER BY pre.code")).toEqual(['DB220', 'ML201']);
    expect(col(g, "MATCH p = (:Course {code: 'AI310'})-[:REQUIRES*]->(:Course {code: 'PY101'}) RETURN length(p)")).toEqual([3]);
  });

  it('finds shortest paths', () => {
    const t = buildGraph('transit');
    expect(col(t, "MATCH p = shortestPath((a:Stop {name: 'Fourth Street'})-[:ROUTE*]->(b:Stop {name: 'Budiriro'})) RETURN length(p)")).toEqual([4]);
    expect(col(t, "MATCH p = shortestPath((a:Stop {name: 'Fourth Street'})-[:ROUTE*]->(b:Stop {name: 'Budiriro'})) UNWIND nodes(p) AS s RETURN s.name")).toEqual(['Fourth Street', 'Copacabana', 'Mbare Musika', 'Glen View', 'Budiriro']);
  });

  it('handles OPTIONAL MATCH, CASE, coalesce and null logic', () => {
    expect(col(g, "MATCH (s:Student {name: 'Chipo'}) OPTIONAL MATCH (s)-[:FRIENDS_WITH]->(f) RETURN f")).toEqual([null]);
    expect(col(g, "MATCH (c:Course {code: 'PY101'}) RETURN CASE WHEN c.hours > 30 THEN 'long' ELSE 'short' END")).toEqual(['short']);
    expect(col(g, "MATCH (c:Course {code: 'PY101'}) RETURN coalesce(c.missing, 'n/a')")).toEqual(['n/a']);
    expect(col(g, 'RETURN null IS NULL')).toEqual([true]);
    expect(col(g, 'RETURN null = null')).toEqual([null]);
  });

  it('supports pattern predicates in WHERE', () => {
    expect(col(g, "MATCH (s:Student) WHERE NOT (s)-[:FRIENDS_WITH]-() RETURN s.name")).toEqual([]);
    expect(col(g, "MATCH (c:Course) WHERE NOT (c)-[:REQUIRES]->() RETURN c.code ORDER BY c.code")).toEqual(['PY101', 'SQL101', 'WEB101']);
    expect(col(g, "MATCH (s:Student {name: 'Tendai'}), (c:Course) WHERE (s)-[:ENROLLED_IN]->(c) AND (c.hours > 15) RETURN count(c)")).toEqual([2]);
    expect(col(g, "MATCH (s:Student {name: 'Tendai'}), (c:Course {code: 'ML201'}) RETURN exists((s)-[:ENROLLED_IN]->(c))")).toEqual([true]);
  });

  it('computes vector similarity like Neo4j (normalised cosine)', () => {
    const k = buildGraph('kg');
    const top = col(k, 'MATCH (c:Chunk) WITH c, vector.similarity.cosine(c.embedding, [0.85, 0.2, 0.0, 0.1]) AS score RETURN c.id ORDER BY score DESC LIMIT 2');
    expect(top).toEqual(['loans-1', 'loans-2']);
    expect(col(k, 'RETURN vector.similarity.cosine([1, 0], [1, 0])')).toEqual([1]);
    expect(col(k, 'RETURN vector.similarity.cosine([1, 0], [-1, 0])')).toEqual([0]);
  });

  it('finds the fraud ring: people sharing a phone, and money moving in a cycle', () => {
    const f = buildGraph('fraud');
    expect(col(f, 'MATCH (p:Person)-[:USES_PHONE]->(ph)<-[:USES_PHONE]-(other) WITH ph, count(DISTINCT p) AS people WHERE people >= 3 RETURN ph.number')).toEqual(['+263 71 555 0303']);
    const cycle = col(f, 'MATCH p = (a:Account)-[:SENT*3]->(a) RETURN DISTINCT a.number ORDER BY a.number');
    expect(cycle).toEqual(['ML-1002', 'ML-1003', 'ML-1004']);
  });
});

describe('cypher engine: writing', () => {
  it('creates, merges, sets and deletes', () => {
    const g = new Graph();
    const r = q(g, "CREATE (a:Person {name: 'Ana'})-[:KNOWS {since: 2020}]->(b:Person {name: 'Ben'}) RETURN a.name, b.name");
    expect(r.stats.nodesCreated).toBe(2);
    expect(r.stats.relationshipsCreated).toBe(1);
    q(g, "MERGE (p:Person {name: 'Ana'}) ON MATCH SET p.seen = true");
    q(g, "MERGE (p:Person {name: 'Cara'}) ON CREATE SET p.new = true");
    expect(col(g, 'MATCH (p:Person) RETURN count(p)')).toEqual([3]);
    expect(col(g, "MATCH (p:Person {name: 'Ana'}) RETURN p.seen")).toEqual([true]);
    expect(col(g, "MATCH (p:Person {name: 'Cara'}) RETURN p.new")).toEqual([true]);
    q(g, "MATCH (a:Person {name: 'Ana'}), (c:Person {name: 'Cara'}) MERGE (a)-[:KNOWS]->(c)");
    q(g, "MATCH (a:Person {name: 'Ana'}), (c:Person {name: 'Cara'}) MERGE (a)-[:KNOWS]->(c)");
    expect(col(g, "MATCH (:Person {name: 'Ana'})-[k:KNOWS]->() RETURN count(k)")).toEqual([2]);
    q(g, "MATCH (p:Person {name: 'Ben'}) SET p:Admin, p += {age: 30} REMOVE p.name");
    expect(col(g, 'MATCH (p:Admin) RETURN p.age')).toEqual([30]);
    expect(() => q(g, 'MATCH (p:Admin) DELETE p')).toThrow(CypherError);
    const d = q(g, 'MATCH (p:Admin) DETACH DELETE p');
    expect(d.stats.nodesDeleted).toBe(1);
    expect(d.stats.relationshipsDeleted).toBe(1);
  });

  it('runs several statements and UNWIND', () => {
    const g = new Graph();
    const r = q(g, "UNWIND ['a','b','c'] AS x CREATE (:Letter {v: x}); MATCH (l:Letter) RETURN collect(l.v) AS all");
    expect(plain(r.rows[0]![0]!)).toEqual(['a', 'b', 'c']);
  });
});

describe('cypher engine: helpful errors', () => {
  const g = buildGraph('skuru');
  const err = (src: string) => { try { q(g, src); return ''; } catch (e) { return (e as Error).message; } };
  it('explains mistakes in plain language', () => {
    expect(err('MATCH (s:Student) RETURN x')).toMatch(/Variable `x` is not defined/);
    expect(err('MATCH (s:Student)')).toMatch(/cannot end with MATCH/);
    expect(err("MATCH (s:Student RETURN s")).toMatch(/Expected "\)"/);
    expect(err('MATCH (s) RETURN foo(s)')).toMatch(/Unknown function foo/);
    expect(err("CREATE (a)-[:X]-(b)")).toMatch(/need a direction/);
    expect(err('MATCH (a), (b), (c), (d) RETURN count(*)')).toMatch(/more than/);
  });
});

describe('formatting and graph view', () => {
  it('prints values like Neo4j Browser and collects result graphs', () => {
    const g = buildGraph('skuru');
    const r = q(g, "MATCH (t:Teacher {name: 'Ms Ncube'})-[x:TEACHES]->(c) RETURN t, x, c");
    expect(fmtValue(r.rows[0]![0]!)).toBe('(:Teacher {name: "Ms Ncube"})');
    const view = resultGraph(g, r.rows);
    expect(view.nodes).toHaveLength(3);
    // Both TEACHES links plus DB220-[:REQUIRES]->SQL101, which connects two returned nodes.
    expect(view.rels).toHaveLength(3);
  });
  it('reads the dataset comment', () => {
    expect(datasetFromCode('// dataset: fraud\nMATCH (n) RETURN n')).toBe('fraud');
    expect(datasetFromCode('MATCH (n) RETURN n')).toBe('skuru');
  });
});

describe('Graph Lab scenarios', () => {
  it('every reference solution passes its own check and returns data', async () => {
    const { SCENARIOS, checkTask } = await import('../src/features/graph/scenarios');
    const ids = new Set<string>();
    for (const s of SCENARIOS) {
      expect(ids.has(s.id), s.id).toBe(false);
      ids.add(s.id);
      expect(s.freeTasks).toBeGreaterThan(0);
      for (const t of s.tasks) {
        const outcome = checkTask(s.dataset, t, t.solution);
        expect(outcome.passed, `${s.id}/${t.id}: ${outcome.message}`).toBe(true);
        const probe = t.check.kind === 'write' ? (() => { const g = buildGraph(s.dataset); runCypher(g, t.solution); return runCypher(g, t.check.verify); })() : runCypher(buildGraph(s.dataset), t.solution);
        expect(probe.rows.length, `${s.id}/${t.id} returns rows`).toBeGreaterThan(0);
      }
    }
  });

  it('rejects wrong answers with a useful message', async () => {
    const { SCENARIOS, checkTask } = await import('../src/features/graph/scenarios');
    const s = SCENARIOS[0]!;
    expect(checkTask(s.dataset, s.tasks[0]!, 'MATCH (c:Course) RETURN c.title').message).toMatch(/3 columns/);
    expect(checkTask(s.dataset, s.tasks[0]!, 'MATCH (c:Course) RETURN c.title, c.level, c.hours LIMIT 2').passed).toBe(false);
    const enrol = s.tasks.find((t) => t.id === 'enrol-kudzai')!;
    expect(checkTask(s.dataset, enrol, "MATCH (c:Course {code: 'PY101'}) CREATE (s:Student {name: 'Kudzai', city: 'Chitungwiza', year: 1})-[:ENROLLED_IN {progress: 0}]->(c)").message).toMatch(/duplicates/);
  });
});
