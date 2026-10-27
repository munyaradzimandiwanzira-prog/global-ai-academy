import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import type { RunOptions, RunResult } from './types';

/**
 * In-browser SQLite (sql.js). Every run starts from a fresh copy of the sample
 * "Zim Traders" database so learners can experiment freely (DROP TABLE included).
 */
export const SAMPLE_SCHEMA = `
CREATE TABLE Customers (CustomerID INTEGER PRIMARY KEY, CustomerName TEXT, ContactName TEXT, City TEXT, Province TEXT, Phone TEXT);
INSERT INTO Customers VALUES
 (1,'Mbare Fresh Produce','Tendai Moyo','Harare','Harare','0771 234 567'),
 (2,'Bulawayo Bakers','Sipho Ndlovu','Bulawayo','Bulawayo','0712 345 678'),
 (3,'Vic Falls Tours','Rudo Chikore','Victoria Falls','Matabeleland North','0783 456 789'),
 (4,'Mutare Timber Co','Farai Mutasa','Mutare','Manicaland','0774 567 890'),
 (5,'Gweru Hardware','Nyasha Dube','Gweru','Midlands','0715 678 901'),
 (6,'Masvingo Crafts','Chipo Gumbo','Masvingo','Masvingo','0786 789 012'),
 (7,'Kariba Fisheries','Tatenda Phiri','Kariba','Mashonaland West','0777 890 123'),
 (8,'Chitungwiza Tech Hub','Kudzai Mapfumo','Chitungwiza','Harare','0718 901 234'),
 (9,'Hwange Solar','Thabo Sibanda','Hwange','Matabeleland North','0789 012 345'),
 (10,'Avondale Books','Nokuthula Khumalo','Harare','Harare','0770 123 456');
CREATE TABLE Categories (CategoryID INTEGER PRIMARY KEY, CategoryName TEXT, Description TEXT);
INSERT INTO Categories VALUES (1,'Groceries','Maize meal, cooking oil, sugar'),(2,'Electronics','Phones, solar kits, laptops'),(3,'Hardware','Cement, roofing, tools'),(4,'Crafts','Stone sculpture, baskets, fabrics');
CREATE TABLE Products (ProductID INTEGER PRIMARY KEY, ProductName TEXT, CategoryID INTEGER, Unit TEXT, Price REAL);
INSERT INTO Products VALUES
 (1,'Roller Meal 10kg',1,'bag',8.50),(2,'Cooking Oil 2L',1,'bottle',4.20),(3,'Sugar 2kg',1,'pack',2.80),
 (4,'Solar Lantern',2,'unit',15.00),(5,'Smartphone 64GB',2,'unit',120.00),(6,'Laptop 14"',2,'unit',450.00),
 (7,'Cement 50kg',3,'bag',11.00),(8,'Roofing Sheet 3m',3,'sheet',14.50),(9,'Hammer',3,'unit',6.00),
 (10,'Serpentine Sculpture',4,'piece',75.00),(11,'Ilala Basket',4,'piece',18.00),(12,'Batik Fabric',4,'metre',9.00);
CREATE TABLE Orders (OrderID INTEGER PRIMARY KEY, CustomerID INTEGER, OrderDate TEXT, Status TEXT);
INSERT INTO Orders VALUES
 (1001,1,'2026-01-05','Delivered'),(1002,2,'2026-01-09','Delivered'),(1003,1,'2026-02-02','Delivered'),(1004,4,'2026-02-14','Cancelled'),
 (1005,8,'2026-03-01','Delivered'),(1006,3,'2026-03-11','Pending'),(1007,9,'2026-03-20','Delivered'),(1008,5,'2026-04-02','Pending'),
 (1009,10,'2026-04-15','Delivered'),(1010,2,'2026-05-01','Delivered');
CREATE TABLE OrderDetails (OrderDetailID INTEGER PRIMARY KEY, OrderID INTEGER, ProductID INTEGER, Quantity INTEGER);
INSERT INTO OrderDetails VALUES
 (1,1001,1,20),(2,1001,2,10),(3,1002,3,15),(4,1003,1,30),(5,1004,7,40),(6,1005,5,3),(7,1005,6,2),(8,1006,10,1),
 (9,1007,4,25),(10,1008,9,12),(11,1008,8,30),(12,1009,12,8),(13,1010,2,6),(14,1010,3,12),(15,1007,6,1);
CREATE TABLE Employees (EmployeeID INTEGER PRIMARY KEY, FirstName TEXT, LastName TEXT, Role TEXT, City TEXT, Salary REAL, ManagerID INTEGER);
INSERT INTO Employees VALUES
 (1,'Rumbi','Nyathi','CEO','Harare',4200,NULL),(2,'Blessing','Mhlanga','Sales Lead','Bulawayo',2100,1),
 (3,'Tafadzwa','Zhou','Sales Rep','Harare',1300,2),(4,'Lindiwe','Moyo','Sales Rep','Bulawayo',1250,2),
 (5,'Takudzwa','Chirwa','Data Analyst','Harare',1900,1),(6,'Precious','Ncube','Software Engineer','Harare',2400,1);
`;

let sqlPromise: Promise<SqlJsStatic> | null = null;
const loadSql = () => (sqlPromise ??= initSqlJs({ locateFile: () => wasmUrl }));

function execAll(db: Database, sql: string) {
  return db.exec(sql).map((r) => ({ columns: r.columns, rows: r.values as unknown[][] }));
}

export async function runSql(code: string, opts: RunOptions): Promise<RunResult> {
  const started = performance.now();
  const SQL = await loadSql();
  const db = new SQL.Database();
  try {
    db.run(SAMPLE_SCHEMA);
    let table: RunResult['table'];
    let error: string | undefined;
    try {
      table = execAll(db, code);
    } catch (e) {
      error = `SQL error: ${(e as Error).message}`;
    }
    let test: RunResult['test'];
    if (opts.tests) {
      if (error) test = { passed: false, message: error };
      else {
        // Tests are an expected query; compare result sets on a fresh database.
        const ref = new SQL.Database();
        try {
          ref.run(SAMPLE_SCHEMA);
          const expected = execAll(ref, opts.tests);
          const last = (t?: { rows: unknown[][] }[]) => JSON.stringify(t?.[t.length - 1]?.rows ?? []);
          test = last(table) === last(expected)
            ? { passed: true }
            : { passed: false, message: `Your query returned ${table?.[table.length - 1]?.rows.length ?? 0} row(s); the expected result has ${expected[expected.length - 1]?.rows.length ?? 0}. Compare the columns, filters and ORDER BY.` };
        } finally {
          ref.close();
        }
      }
    }
    const changes = db.getRowsModified();
    const lines = !error && !table?.length ? [{ kind: 'info' as const, text: changes ? `Done. ${changes} row(s) affected.` : 'Query ran. No rows returned.' }] : [];
    return { ok: !error, error, table, test, lines, durationMs: Math.round(performance.now() - started) };
  } finally {
    db.close();
  }
}
