/** Reference solutions for every PostgreSQL challenge (verified by scripts/run-postgres.ts). */
export const POSTGRES_SOLUTIONS: Record<string, string> = {
  'pg-tables-cheap-instock': `SELECT name, price FROM products WHERE in_stock = true AND price < 20 ORDER BY price ASC;`,
  'pg-query-monthly': `SELECT date_trunc('month', ordered_at)::date AS month, count(order_id) AS orders FROM orders GROUP BY month ORDER BY month;`,
  'pg-joins-category-revenue': `
    SELECT c.name, sum(oi.quantity * p.price) AS revenue
    FROM categories c
    JOIN products p ON p.category_id = c.category_id
    JOIN order_items oi ON oi.product_id = p.product_id
    JOIN orders o ON o.order_id = oi.order_id AND o.status = 'delivered'
    GROUP BY c.name ORDER BY revenue DESC;`,
  'pg-window-top-per-category': `
    SELECT category, name, price FROM (
      SELECT c.name AS category, p.name, p.price,
             row_number() OVER (PARTITION BY c.name ORDER BY p.price DESC) AS rn
      FROM products p JOIN categories c USING (category_id)
    ) ranked WHERE rn = 1 ORDER BY category;`,
  'pg-jsonb-art': `SELECT name, price FROM products WHERE attributes->'tags' ? 'art' ORDER BY price DESC;`,
  'pg-vector-delivery': `SELECT title FROM documents ORDER BY embedding <=> '[0.1,0.9,0,0.2]'::vector LIMIT 2;`,
  'pg-rag-tenant': `SELECT title FROM documents WHERE body ILIKE '%sun%' ORDER BY embedding <=> '[0.2,0.1,0.9,0.1]' LIMIT 3;`,
  'pg-capstone-best-sellers': `
    WITH units AS (
      SELECT c.name AS category, p.name AS product, sum(oi.quantity) AS units,
             rank() OVER (PARTITION BY c.name ORDER BY sum(oi.quantity) DESC) AS r
      FROM orders o JOIN order_items oi USING (order_id) JOIN products p USING (product_id)
      JOIN categories c USING (category_id)
      WHERE o.status = 'delivered'
      GROUP BY c.name, p.name
    )
    SELECT category, product, units FROM units WHERE r = 1 ORDER BY category;`,
  'pg-capstone-hybrid': `
    WITH semantic AS (
      SELECT doc_id, row_number() OVER (ORDER BY embedding <=> '[0.8,0.4,0,0.1]') AS rank
      FROM documents ORDER BY embedding <=> '[0.8,0.4,0,0.1]' LIMIT 4
    ),
    keyword AS (
      SELECT doc_id, row_number() OVER (ORDER BY ts_rank(to_tsvector('english', title || ' ' || body), q) DESC) AS rank
      FROM documents, websearch_to_tsquery('english', 'late or refund') q
      WHERE to_tsvector('english', title || ' ' || body) @@ q LIMIT 4
    )
    SELECT d.title, round(coalesce(1.0/(60+s.rank),0) + coalesce(1.0/(60+k.rank),0), 4) AS score
    FROM semantic s FULL JOIN keyword k USING (doc_id) JOIN documents d USING (doc_id)
    ORDER BY score DESC, d.title;`,
};
