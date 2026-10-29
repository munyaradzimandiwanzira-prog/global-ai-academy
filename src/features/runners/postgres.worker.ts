/// <reference lib="webworker" />
/**
 * Real PostgreSQL (PGlite: Postgres compiled to WebAssembly) with the pgvector extension, in a
 * dedicated worker so a long query never freezes the page — the host can terminate us on timeout.
 *
 * Every run starts from a clean `public` schema with the sample data loaded, so learners can
 * DROP, ALTER and DELETE freely. Only SQL runs here (no learner JavaScript), so this worker
 * needs no network guard; it fetches its own .wasm/.data files from this site.
 */
import { PGlite, type Results } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { resetDatabase as reset, type PgDataset } from './postgres-seed';

declare const self: DedicatedWorkerGlobalScope;

export interface PgRequest { id: number; code: string; tests?: string; dataset: PgDataset }
export interface PgTable { columns: string[]; rows: unknown[][] }
export interface PgResponse { id: number; tables?: PgTable[]; affected?: number; error?: string; expected?: PgTable[]; expectedError?: string }

let dbPromise: Promise<PGlite> | null = null;
const db = () => (dbPromise ??= PGlite.create({ extensions: { vector } }));


function plain(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Uint8Array) return `\\x${[...v].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function toTables(results: Results[]): { tables: PgTable[]; affected: number } {
  const tables: PgTable[] = [];
  let affected = 0;
  for (const r of results) {
    // Rows come back as arrays (rowMode 'array') so two columns with the same name both survive.
    if (r.fields.length) tables.push({ columns: r.fields.map((f) => f.name), rows: (r.rows as unknown[][]).map((row) => row.map(plain)) });
    affected += r.affectedRows ?? 0;
  }
  return { tables, affected };
}

self.onmessage = async (e: MessageEvent<PgRequest>) => {
  const { id, code, tests, dataset } = e.data;
  const out: PgResponse = { id };
  try {
    const pg = await db();
    await reset(pg, dataset);
    try {
      const { tables, affected } = toTables(await pg.exec(code, { rowMode: 'array' }));
      out.tables = tables;
      out.affected = affected;
    } catch (err) {
      out.error = (err as Error).message;
    }
    if (tests) {
      await reset(pg, dataset);
      try {
        out.expected = toTables(await pg.exec(tests, { rowMode: 'array' })).tables;
      } catch (err) {
        out.expectedError = (err as Error).message;
      }
    }
  } catch (err) {
    out.error = `PostgreSQL could not start: ${(err as Error).message}`;
  }
  self.postMessage(out);
};
