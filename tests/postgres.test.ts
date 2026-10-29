import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { POSTGRES_SEED } from '../src/features/runners/postgres-seed';

describe('PostgreSQL sample database (PGlite + pgvector)', () => {
  it('loads, joins, reads JSONB and ranks by vector distance', async () => {
    const pg = await PGlite.create({ extensions: { vector } });
    await pg.exec(POSTGRES_SEED);
    const counts = await pg.query<{ n: number }>('SELECT count(*)::int AS n FROM order_items');
    expect(counts.rows[0].n).toBe(15);
    const brand = await pg.query<{ brand: string }>("SELECT attributes->>'brand' AS brand FROM products WHERE product_id = 1");
    expect(brand.rows[0].brand).toBe('Gold Leaf');
    // "How do I pay with my phone?" ≈ mostly payments.
    const nearest = await pg.query<{ title: string }>("SELECT title FROM documents ORDER BY embedding <=> '[0.9,0.1,0,0.1]' LIMIT 2");
    expect(nearest.rows.map((r) => r.title)).toEqual(['Paying with EcoCash', 'Card payments']);
    const revenue = await pg.query<{ total: string }>(`
      SELECT sum(oi.quantity * p.price) AS total FROM order_items oi JOIN products p USING (product_id)
      JOIN orders o USING (order_id) WHERE o.status = 'delivered'`);
    expect(Number(revenue.rows[0].total)).toBeGreaterThan(0);
    await pg.close();
  }, 60_000);
});
