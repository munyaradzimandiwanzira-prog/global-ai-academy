/**
 * The sample database every PostgreSQL run starts from ("Zim Traders", Postgres edition).
 * Same shops and products as the SQL track, but written the Postgres way: snake_case names,
 * real types (numeric, date, timestamptz, boolean), JSONB attributes, and a small documents
 * table with 4-dimensional embeddings so pgvector queries stay readable.
 * (Real embeddings have hundreds of dimensions; the maths is identical.)
 */
import type { PGlite } from '@electric-sql/pglite';

export type PgDataset = 'zim' | 'empty';

/** Learners may change schemas, roles and settings freely; this puts everything back. */
export async function resetDatabase(pg: PGlite, dataset: PgDataset): Promise<void> {
  // An unfinished transaction (BEGIN without COMMIT) must be closed before anything else.
  await pg.exec('ROLLBACK').catch(() => {});
  // Back to the owner role first (RESET ALL does not undo SET ROLE), then default settings.
  await pg.exec('RESET ROLE; RESET SESSION AUTHORIZATION; RESET ALL;');
  // Recreate public like a fresh install: every role may use it (needed for SET ROLE demos).
  await pg.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO PUBLIC;');
  const schemas = await pg.query<{ nspname: string }>(
    `SELECT nspname FROM pg_namespace
     WHERE nspname NOT IN ('public','pg_catalog','information_schema','pg_toast')
       AND nspname NOT LIKE 'pg_temp%' AND nspname NOT LIKE 'pg_toast_temp%'`,
  );
  for (const { nspname } of schemas.rows) await pg.exec(`DROP SCHEMA IF EXISTS ${quoteIdent(nspname)} CASCADE`);
  // Roles are cluster-wide, so a previous run's CREATE ROLE would otherwise make this one fail.
  const roles = await pg.query<{ rolname: string }>(`SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg\\_%' AND rolname <> current_user`);
  for (const { rolname } of roles.rows) await pg.exec(`DROP OWNED BY ${quoteIdent(rolname)}; DROP ROLE IF EXISTS ${quoteIdent(rolname)};`);
  await pg.exec(`SET search_path TO public; SET timezone = 'Africa/Harare';`);
  await pg.exec(dataset === 'empty' ? 'CREATE EXTENSION IF NOT EXISTS vector;' : POSTGRES_SEED);
}

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

export const POSTGRES_SEED = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE customers (
  customer_id   integer PRIMARY KEY,
  name          text NOT NULL,
  contact_name  text,
  city          text NOT NULL,
  province      text NOT NULL,
  phone         text,
  joined_on     date NOT NULL
);
INSERT INTO customers VALUES
 (1,'Mbare Fresh Produce','Tendai Moyo','Harare','Harare','0771 234 567','2025-02-11'),
 (2,'Bulawayo Bakers','Sipho Ndlovu','Bulawayo','Bulawayo','0712 345 678','2025-03-02'),
 (3,'Vic Falls Tours','Rudo Chikore','Victoria Falls','Matabeleland North','0783 456 789','2025-04-18'),
 (4,'Mutare Timber Co','Farai Mutasa','Mutare','Manicaland','0774 567 890','2025-05-27'),
 (5,'Gweru Hardware','Nyasha Dube','Gweru','Midlands','0715 678 901','2025-07-09'),
 (6,'Masvingo Crafts','Chipo Gumbo','Masvingo','Masvingo','0786 789 012','2025-08-21'),
 (7,'Kariba Fisheries','Tatenda Phiri','Kariba','Mashonaland West','0777 890 123','2025-09-30'),
 (8,'Chitungwiza Tech Hub','Kudzai Mapfumo','Chitungwiza','Harare','0718 901 234','2025-11-14'),
 (9,'Hwange Solar','Thabo Sibanda','Hwange','Matabeleland North','0789 012 345','2026-01-06'),
 (10,'Avondale Books','Nokuthula Khumalo','Harare','Harare',NULL,'2026-02-19');

CREATE TABLE categories (
  category_id integer PRIMARY KEY,
  name        text NOT NULL UNIQUE
);
INSERT INTO categories VALUES (1,'Groceries'),(2,'Electronics'),(3,'Hardware'),(4,'Crafts');

CREATE TABLE products (
  product_id  integer PRIMARY KEY,
  name        text NOT NULL,
  category_id integer NOT NULL REFERENCES categories,
  price       numeric(10,2) NOT NULL CHECK (price > 0),
  in_stock    boolean NOT NULL DEFAULT true,
  attributes  jsonb NOT NULL DEFAULT '{}'
);
INSERT INTO products VALUES
 (1,'Roller Meal 10kg',1,8.50,true,'{"weight_kg": 10, "brand": "Gold Leaf"}'),
 (2,'Cooking Oil 2L',1,4.20,true,'{"volume_l": 2, "brand": "Pure Drop"}'),
 (3,'Sugar 2kg',1,2.80,false,'{"weight_kg": 2}'),
 (4,'Solar Lantern',2,15.00,true,'{"watts": 3, "battery_hours": 12, "tags": ["solar", "lighting"]}'),
 (5,'Smartphone 64GB',2,120.00,true,'{"storage_gb": 64, "dual_sim": true, "tags": ["phone"]}'),
 (6,'Laptop 14"',2,450.00,true,'{"ram_gb": 8, "storage_gb": 256, "tags": ["computer", "school"]}'),
 (7,'Cement 50kg',3,11.00,true,'{"weight_kg": 50}'),
 (8,'Roofing Sheet 3m',3,14.50,true,'{"length_m": 3, "material": "zinc"}'),
 (9,'Hammer',3,6.00,true,'{"material": "steel"}'),
 (10,'Serpentine Sculpture',4,75.00,true,'{"artist": "Tapiwa", "stone": "serpentine", "tags": ["art"]}'),
 (11,'Ilala Basket',4,18.00,true,'{"weave": "ilala palm", "tags": ["art", "home"]}'),
 (12,'Batik Fabric',4,9.00,false,'{"unit": "metre"}');

CREATE TABLE orders (
  order_id    integer PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers,
  ordered_at  timestamptz NOT NULL,
  status      text NOT NULL CHECK (status IN ('pending','delivered','cancelled'))
);
INSERT INTO orders VALUES
 (1001,1,'2026-01-05 09:12+02','delivered'),(1002,2,'2026-01-09 14:30+02','delivered'),
 (1003,1,'2026-02-02 08:05+02','delivered'),(1004,4,'2026-02-14 11:47+02','cancelled'),
 (1005,8,'2026-03-01 16:20+02','delivered'),(1006,3,'2026-03-11 10:00+02','pending'),
 (1007,9,'2026-03-20 13:15+02','delivered'),(1008,5,'2026-04-02 09:40+02','pending'),
 (1009,10,'2026-04-15 15:55+02','delivered'),(1010,2,'2026-05-01 07:30+02','delivered');

CREATE TABLE order_items (
  order_id   integer NOT NULL REFERENCES orders,
  product_id integer NOT NULL REFERENCES products,
  quantity   integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
);
INSERT INTO order_items VALUES
 (1001,1,20),(1001,2,10),(1002,3,15),(1003,1,30),(1004,7,40),(1005,5,3),(1005,6,2),(1006,10,1),
 (1007,4,25),(1007,6,1),(1008,9,12),(1008,8,30),(1009,12,8),(1010,2,6),(1010,3,12);

-- Help-centre articles with toy 4-dimensional embeddings. Dimensions, roughly:
-- [payments, delivery, solar & power, accounts & login]
CREATE TABLE documents (
  doc_id    integer PRIMARY KEY,
  title     text NOT NULL,
  body      text NOT NULL,
  embedding vector(4) NOT NULL
);
INSERT INTO documents VALUES
 (1,'Paying with EcoCash','Choose EcoCash at checkout, enter your number and approve the prompt on your phone.','[0.95,0.10,0.02,0.15]'),
 (2,'Card payments','We accept Visa and Mastercard. Your card is charged when the order is confirmed.','[0.90,0.05,0.00,0.20]'),
 (3,'Delivery times','Harare and Bulawayo orders arrive in 1-2 days; other towns in 3-5 days.','[0.05,0.95,0.05,0.02]'),
 (4,'Tracking a delivery','Open My Orders and tap Track to see where your parcel is.','[0.08,0.88,0.00,0.25]'),
 (5,'Solar lantern care','Charge the lantern in direct sun for 8 hours before first use.','[0.02,0.05,0.97,0.01]'),
 (6,'Choosing a solar kit','Add up the watts of every device to size panels and batteries.','[0.10,0.02,0.93,0.05]'),
 (7,'Resetting your password','Tap Forgot password and follow the link we send to your email.','[0.05,0.00,0.00,0.98]'),
 (8,'Refunds','Cancelled orders are refunded to the original payment method within 5 days.','[0.80,0.35,0.00,0.10]');
`;
