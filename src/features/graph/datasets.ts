import { Graph, runCypher } from './engine';

/**
 * Practice graphs. Every company and person here is fictional. Each dataset is a plain Cypher
 * script, so learners can read exactly how the data was built and rebuild it themselves.
 */

export interface Dataset {
  id: string;
  title: string;
  blurb: string;
  /** One-line schema shown above the editor. */
  schema: string[];
  script: string;
}

const skuru: Dataset = {
  id: 'skuru',
  title: 'Skuru Learning graph',
  blurb: 'Students, courses, skills and teachers at a coding school.',
  schema: [
    '(:Student {name, city, year})-[:ENROLLED_IN {progress}]->(:Course {code, title, level, hours})',
    '(:Teacher {name})-[:TEACHES]->(:Course)',
    '(:Course)-[:TEACHES_SKILL]->(:Skill {name})',
    '(:Course)-[:REQUIRES]->(:Course)',
    '(:Student)-[:FRIENDS_WITH]->(:Student)',
  ],
  script: `
CREATE (py:Course {code: 'PY101', title: 'Python Basics', level: 'beginner', hours: 20}),
       (sql:Course {code: 'SQL101', title: 'SQL for Data', level: 'beginner', hours: 15}),
       (ml:Course {code: 'ML201', title: 'Machine Learning', level: 'intermediate', hours: 40}),
       (rag:Course {code: 'AI301', title: 'RAG Systems', level: 'advanced', hours: 30}),
       (agents:Course {code: 'AI310', title: 'Agentic AI', level: 'advanced', hours: 45}),
       (graph:Course {code: 'DB220', title: 'Graph Databases', level: 'intermediate', hours: 25}),
       (web:Course {code: 'WEB101', title: 'HTML & CSS', level: 'beginner', hours: 18})
CREATE (ml)-[:REQUIRES]->(py), (ml)-[:REQUIRES]->(sql), (rag)-[:REQUIRES]->(ml),
       (agents)-[:REQUIRES]->(rag), (graph)-[:REQUIRES]->(sql), (rag)-[:REQUIRES]->(graph)
CREATE (s1:Skill {name: 'Python'}), (s2:Skill {name: 'SQL'}), (s3:Skill {name: 'Statistics'}),
       (s4:Skill {name: 'Embeddings'}), (s5:Skill {name: 'Cypher'}), (s6:Skill {name: 'Tool calling'}),
       (s7:Skill {name: 'Prompting'}), (s8:Skill {name: 'HTML'})
CREATE (py)-[:TEACHES_SKILL]->(s1), (sql)-[:TEACHES_SKILL]->(s2), (ml)-[:TEACHES_SKILL]->(s3),
       (ml)-[:TEACHES_SKILL]->(s1), (rag)-[:TEACHES_SKILL]->(s4), (rag)-[:TEACHES_SKILL]->(s7),
       (graph)-[:TEACHES_SKILL]->(s5), (agents)-[:TEACHES_SKILL]->(s6), (agents)-[:TEACHES_SKILL]->(s7),
       (web)-[:TEACHES_SKILL]->(s8)
CREATE (t1:Teacher {name: 'Mr Chikore'}), (t2:Teacher {name: 'Ms Ncube'}), (t3:Teacher {name: 'Dr Moyo'})
CREATE (t1)-[:TEACHES]->(py), (t1)-[:TEACHES]->(web), (t2)-[:TEACHES]->(sql), (t2)-[:TEACHES]->(graph),
       (t3)-[:TEACHES]->(ml), (t3)-[:TEACHES]->(rag), (t3)-[:TEACHES]->(agents)
CREATE (a:Student {name: 'Tendai', city: 'Harare', year: 2}), (b:Student {name: 'Rudo', city: 'Bulawayo', year: 3}),
       (c:Student {name: 'Farai', city: 'Harare', year: 1}), (d:Student {name: 'Nyasha', city: 'Mutare', year: 2}),
       (e:Student {name: 'Sipho', city: 'Bulawayo', year: 3}), (f:Student {name: 'Chipo', city: 'Gweru', year: 1}),
       (g:Student {name: 'Tatenda', city: 'Harare', year: 3})
CREATE (a)-[:ENROLLED_IN {progress: 100}]->(py), (a)-[:ENROLLED_IN {progress: 60}]->(sql), (a)-[:ENROLLED_IN {progress: 20}]->(ml),
       (b)-[:ENROLLED_IN {progress: 100}]->(ml), (b)-[:ENROLLED_IN {progress: 75}]->(rag), (b)-[:ENROLLED_IN {progress: 10}]->(agents),
       (c)-[:ENROLLED_IN {progress: 40}]->(py), (c)-[:ENROLLED_IN {progress: 90}]->(web),
       (d)-[:ENROLLED_IN {progress: 100}]->(sql), (d)-[:ENROLLED_IN {progress: 55}]->(graph),
       (e)-[:ENROLLED_IN {progress: 100}]->(rag), (e)-[:ENROLLED_IN {progress: 80}]->(agents), (e)-[:ENROLLED_IN {progress: 100}]->(graph),
       (f)-[:ENROLLED_IN {progress: 15}]->(web),
       (g)-[:ENROLLED_IN {progress: 100}]->(py), (g)-[:ENROLLED_IN {progress: 100}]->(ml), (g)-[:ENROLLED_IN {progress: 35}]->(rag)
CREATE (a)-[:FRIENDS_WITH]->(c), (a)-[:FRIENDS_WITH]->(g), (b)-[:FRIENDS_WITH]->(e), (c)-[:FRIENDS_WITH]->(f),
       (d)-[:FRIENDS_WITH]->(a), (e)-[:FRIENDS_WITH]->(g)
`,
};

const supply: Dataset = {
  id: 'supply',
  title: 'ZimFresh supply chain',
  blurb: 'A fictional grocery distributor: suppliers, warehouses, stores and the roads between them.',
  schema: [
    '(:Supplier {name, rating})-[:SUPPLIES {price}]->(:Product {sku, name, category})',
    '(:Supplier)-[:LOCATED_IN]->(:City {name, province})',
    '(:Warehouse {code})-[:LOCATED_IN]->(:City)',
    '(:Warehouse)-[:STOCKS {qty}]->(:Product)',
    '(:Supplier)-[:DELIVERS_TO]->(:Warehouse)',
    '(:Warehouse)-[:SHIPS_TO {km, days}]->(:Store {name})-[:LOCATED_IN]->(:City)',
  ],
  script: `
CREATE (hre:City {name: 'Harare', province: 'Harare'}), (byo:City {name: 'Bulawayo', province: 'Bulawayo'}),
       (mut:City {name: 'Mutare', province: 'Manicaland'}), (gwe:City {name: 'Gweru', province: 'Midlands'}),
       (mvo:City {name: 'Masvingo', province: 'Masvingo'}), (chi:City {name: 'Chinhoyi', province: 'Mashonaland West'})
CREATE (p1:Product {sku: 'RM10', name: 'Roller meal 10kg', category: 'Staples'}), (p2:Product {sku: 'OIL2', name: 'Cooking oil 2L', category: 'Staples'}),
       (p3:Product {sku: 'SUG2', name: 'Sugar 2kg', category: 'Staples'}), (p4:Product {sku: 'TOM1', name: 'Tomatoes 1kg', category: 'Fresh'}),
       (p5:Product {sku: 'MLK1', name: 'Milk 1L', category: 'Dairy'}), (p6:Product {sku: 'BRD1', name: 'Bread loaf', category: 'Bakery'})
CREATE (s1:Supplier {name: 'Mazowe Mills', rating: 4.6}), (s2:Supplier {name: 'Eastern Highlands Farms', rating: 4.1}),
       (s3:Supplier {name: 'Matabele Dairy', rating: 3.4}), (s4:Supplier {name: 'Kopje Bakers', rating: 4.8}),
       (s5:Supplier {name: 'Lowveld Sugar Co', rating: 3.9})
CREATE (s1)-[:LOCATED_IN]->(hre), (s2)-[:LOCATED_IN]->(mut), (s3)-[:LOCATED_IN]->(byo), (s4)-[:LOCATED_IN]->(hre), (s5)-[:LOCATED_IN]->(mvo)
CREATE (s1)-[:SUPPLIES {price: 7.10}]->(p1), (s1)-[:SUPPLIES {price: 3.60}]->(p2), (s2)-[:SUPPLIES {price: 0.90}]->(p4),
       (s2)-[:SUPPLIES {price: 3.80}]->(p2), (s3)-[:SUPPLIES {price: 0.85}]->(p5), (s4)-[:SUPPLIES {price: 0.95}]->(p6),
       (s5)-[:SUPPLIES {price: 2.10}]->(p3), (s1)-[:SUPPLIES {price: 2.30}]->(p3)
CREATE (w1:Warehouse {code: 'WH-HRE'}), (w2:Warehouse {code: 'WH-BYO'}), (w3:Warehouse {code: 'WH-MUT'})
CREATE (w1)-[:LOCATED_IN]->(hre), (w2)-[:LOCATED_IN]->(byo), (w3)-[:LOCATED_IN]->(mut)
CREATE (s1)-[:DELIVERS_TO]->(w1), (s4)-[:DELIVERS_TO]->(w1), (s2)-[:DELIVERS_TO]->(w3), (s2)-[:DELIVERS_TO]->(w1),
       (s3)-[:DELIVERS_TO]->(w2), (s5)-[:DELIVERS_TO]->(w2), (s1)-[:DELIVERS_TO]->(w2)
CREATE (w1)-[:STOCKS {qty: 1200}]->(p1), (w1)-[:STOCKS {qty: 300}]->(p2), (w1)-[:STOCKS {qty: 0}]->(p4), (w1)-[:STOCKS {qty: 450}]->(p6),
       (w2)-[:STOCKS {qty: 800}]->(p1), (w2)-[:STOCKS {qty: 40}]->(p5), (w2)-[:STOCKS {qty: 600}]->(p3),
       (w3)-[:STOCKS {qty: 900}]->(p4), (w3)-[:STOCKS {qty: 0}]->(p2)
CREATE (st1:Store {name: 'ZimFresh Avondale'}), (st2:Store {name: 'ZimFresh Borrowdale'}), (st3:Store {name: 'ZimFresh Hillside'}),
       (st4:Store {name: 'ZimFresh Sakubva'}), (st5:Store {name: 'ZimFresh Gweru Main'}), (st6:Store {name: 'ZimFresh Chinhoyi'})
CREATE (st1)-[:LOCATED_IN]->(hre), (st2)-[:LOCATED_IN]->(hre), (st3)-[:LOCATED_IN]->(byo), (st4)-[:LOCATED_IN]->(mut),
       (st5)-[:LOCATED_IN]->(gwe), (st6)-[:LOCATED_IN]->(chi)
CREATE (w1)-[:SHIPS_TO {km: 8, days: 1}]->(st1), (w1)-[:SHIPS_TO {km: 12, days: 1}]->(st2), (w1)-[:SHIPS_TO {km: 120, days: 1}]->(st6),
       (w1)-[:SHIPS_TO {km: 275, days: 2}]->(st5), (w2)-[:SHIPS_TO {km: 6, days: 1}]->(st3), (w2)-[:SHIPS_TO {km: 164, days: 2}]->(st5),
       (w3)-[:SHIPS_TO {km: 5, days: 1}]->(st4)
`,
};

const fraud: Dataset = {
  id: 'fraud',
  title: 'MoneyLink fraud investigation',
  blurb: 'A fictional mobile-money company. Some customers share phones and devices and pass money in circles.',
  schema: [
    '(:Person {name, joined})-[:OWNS]->(:Account {number, balance, flagged})',
    '(:Person)-[:USES_PHONE]->(:Phone {number})',
    '(:Person)-[:USES_DEVICE]->(:Device {imei, model})',
    '(:Account)-[:SENT {amount, day}]->(:Account)',
  ],
  script: `
CREATE (p1:Person {name: 'Kuda Mhlanga', joined: 2021}), (p2:Person {name: 'Blessing Sithole', joined: 2025}),
       (p3:Person {name: 'Tapiwa Gora', joined: 2025}), (p4:Person {name: 'Precious Zhou', joined: 2025}),
       (p5:Person {name: 'Lindiwe Dube', joined: 2019}), (p6:Person {name: 'Munashe Chari', joined: 2023}),
       (p7:Person {name: 'Rutendo Banda', joined: 2025}), (p8:Person {name: 'Simba Nyoni', joined: 2020})
CREATE (a1:Account {number: 'ML-1001', balance: 220.0, flagged: false}), (a2:Account {number: 'ML-1002', balance: 15.5, flagged: false}),
       (a3:Account {number: 'ML-1003', balance: 9.0, flagged: true}), (a4:Account {number: 'ML-1004', balance: 12.0, flagged: false}),
       (a5:Account {number: 'ML-1005', balance: 640.0, flagged: false}), (a6:Account {number: 'ML-1006', balance: 85.0, flagged: false}),
       (a7:Account {number: 'ML-1007', balance: 3.0, flagged: false}), (a8:Account {number: 'ML-1008', balance: 410.0, flagged: false}),
       (a9:Account {number: 'ML-1009', balance: 1.0, flagged: false})
CREATE (p1)-[:OWNS]->(a1), (p2)-[:OWNS]->(a2), (p3)-[:OWNS]->(a3), (p4)-[:OWNS]->(a4), (p5)-[:OWNS]->(a5),
       (p6)-[:OWNS]->(a6), (p7)-[:OWNS]->(a7), (p8)-[:OWNS]->(a8), (p7)-[:OWNS]->(a9)
CREATE (ph1:Phone {number: '+263 77 100 0001'}), (ph2:Phone {number: '+263 77 100 0002'}), (ph3:Phone {number: '+263 71 555 0303'}),
       (ph4:Phone {number: '+263 78 200 0404'}), (ph5:Phone {number: '+263 77 300 0505'})
CREATE (p1)-[:USES_PHONE]->(ph1), (p5)-[:USES_PHONE]->(ph2), (p2)-[:USES_PHONE]->(ph3), (p3)-[:USES_PHONE]->(ph3),
       (p4)-[:USES_PHONE]->(ph3), (p6)-[:USES_PHONE]->(ph4), (p7)-[:USES_PHONE]->(ph5), (p8)-[:USES_PHONE]->(ph4)
CREATE (d1:Device {imei: '35-209900-176148-1', model: 'Tecno Spark'}), (d2:Device {imei: '35-209900-176148-2', model: 'Samsung A15'}),
       (d3:Device {imei: '86-771200-554411-9', model: 'Itel P55'})
CREATE (p2)-[:USES_DEVICE]->(d3), (p3)-[:USES_DEVICE]->(d3), (p7)-[:USES_DEVICE]->(d3), (p1)-[:USES_DEVICE]->(d1),
       (p5)-[:USES_DEVICE]->(d2), (p6)-[:USES_DEVICE]->(d2)
CREATE (a2)-[:SENT {amount: 480, day: 3}]->(a3), (a3)-[:SENT {amount: 470, day: 3}]->(a4), (a4)-[:SENT {amount: 460, day: 4}]->(a2),
       (a7)-[:SENT {amount: 300, day: 5}]->(a9), (a9)-[:SENT {amount: 295, day: 5}]->(a3),
       (a1)-[:SENT {amount: 20, day: 1}]->(a5), (a5)-[:SENT {amount: 150, day: 2}]->(a6), (a6)-[:SENT {amount: 35, day: 6}]->(a8),
       (a8)-[:SENT {amount: 60, day: 7}]->(a6), (a5)-[:SENT {amount: 75, day: 8}]->(a8)
`,
};

const transit: Dataset = {
  id: 'transit',
  title: 'Harare commuter routes',
  blurb: 'Kombi stops around Harare and the minutes and fares between them (illustrative, not a real timetable).',
  schema: ['(:Stop {name, area})-[:ROUTE {mins, fare}]->(:Stop)'],
  script: `
CREATE (cbd:Stop {name: 'Copacabana', area: 'CBD'}), (fourth:Stop {name: 'Fourth Street', area: 'CBD'}),
       (avon:Stop {name: 'Avondale', area: 'North'}), (bor:Stop {name: 'Borrowdale', area: 'North'}),
       (mt:Stop {name: 'Mount Pleasant', area: 'North'}), (mbare:Stop {name: 'Mbare Musika', area: 'South'}),
       (glen:Stop {name: 'Glen View', area: 'South-West'}), (budiriro:Stop {name: 'Budiriro', area: 'South-West'}),
       (kuwadzana:Stop {name: 'Kuwadzana', area: 'West'}), (warren:Stop {name: 'Warren Park', area: 'West'}),
       (msasa:Stop {name: 'Msasa', area: 'East'}), (mabvuku:Stop {name: 'Mabvuku', area: 'East'})
CREATE (cbd)-[:ROUTE {mins: 15, fare: 1.0}]->(avon), (avon)-[:ROUTE {mins: 12, fare: 1.0}]->(mt), (avon)-[:ROUTE {mins: 18, fare: 1.0}]->(bor),
       (cbd)-[:ROUTE {mins: 25, fare: 1.0}]->(bor), (cbd)-[:ROUTE {mins: 10, fare: 0.5}]->(mbare), (fourth)-[:ROUTE {mins: 5, fare: 0.5}]->(cbd),
       (mbare)-[:ROUTE {mins: 20, fare: 1.0}]->(glen), (glen)-[:ROUTE {mins: 10, fare: 0.5}]->(budiriro), (cbd)-[:ROUTE {mins: 20, fare: 1.0}]->(warren),
       (warren)-[:ROUTE {mins: 15, fare: 1.0}]->(kuwadzana), (fourth)-[:ROUTE {mins: 20, fare: 1.0}]->(msasa), (msasa)-[:ROUTE {mins: 15, fare: 1.0}]->(mabvuku),
       (warren)-[:ROUTE {mins: 25, fare: 1.0}]->(glen), (mt)-[:ROUTE {mins: 22, fare: 1.0}]->(bor)
`,
};

/** Tiny 4-dimension "embeddings" so vector search is visible by eye. Real models use 768–3072 dimensions. */
const kg: Dataset = {
  id: 'kg',
  title: 'GraphRAG knowledge graph',
  blurb: 'Policy documents split into chunks with embeddings, plus the entities each chunk mentions.',
  schema: [
    '(:Document {title})<-[:PART_OF]-(:Chunk {id, text, embedding})',
    '(:Chunk)-[:NEXT]->(:Chunk)',
    '(:Chunk)-[:MENTIONS]->(:Entity {name, kind})',
    '(:Entity)-[:RELATED_TO {how}]->(:Entity)',
  ],
  script: `
CREATE (d1:Document {title: 'Student Loans Policy 2026'}), (d2:Document {title: 'Scholarship Handbook'}), (d3:Document {title: 'Campus IT Rules'})
CREATE (c1:Chunk {id: 'loans-1', text: 'Students in good standing may apply for a tuition loan of up to 1,500 USD per year.', embedding: [0.9, 0.1, 0.0, 0.1]}),
       (c2:Chunk {id: 'loans-2', text: 'Loans are repaid over 24 months after graduation at 4 percent interest.', embedding: [0.8, 0.3, 0.0, 0.0]}),
       (c3:Chunk {id: 'loans-3', text: 'A guarantor must sign the loan form; the Bursar approves every application.', embedding: [0.7, 0.2, 0.1, 0.4]}),
       (c4:Chunk {id: 'schol-1', text: 'The Zuva Scholarship covers full fees for top students in STEM tracks.', embedding: [0.3, 0.9, 0.1, 0.0]}),
       (c5:Chunk {id: 'schol-2', text: 'Scholarship holders cannot also hold a tuition loan in the same year.', embedding: [0.6, 0.7, 0.0, 0.1]}),
       (c6:Chunk {id: 'it-1', text: 'Campus Wi-Fi requires a student account; sharing passwords is not allowed.', embedding: [0.0, 0.1, 0.9, 0.2]}),
       (c7:Chunk {id: 'it-2', text: 'The IT Helpdesk resets passwords within one working day.', embedding: [0.1, 0.0, 0.8, 0.5]})
CREATE (c1)-[:PART_OF]->(d1), (c2)-[:PART_OF]->(d1), (c3)-[:PART_OF]->(d1), (c4)-[:PART_OF]->(d2), (c5)-[:PART_OF]->(d2),
       (c6)-[:PART_OF]->(d3), (c7)-[:PART_OF]->(d3), (c1)-[:NEXT]->(c2), (c2)-[:NEXT]->(c3), (c4)-[:NEXT]->(c5), (c6)-[:NEXT]->(c7)
CREATE (loan:Entity {name: 'Tuition loan', kind: 'Product'}), (bursar:Entity {name: 'Bursar', kind: 'Role'}),
       (guar:Entity {name: 'Guarantor', kind: 'Role'}), (zuva:Entity {name: 'Zuva Scholarship', kind: 'Product'}),
       (stem:Entity {name: 'STEM tracks', kind: 'Programme'}), (wifi:Entity {name: 'Campus Wi-Fi', kind: 'Service'}),
       (help:Entity {name: 'IT Helpdesk', kind: 'Team'})
CREATE (c1)-[:MENTIONS]->(loan), (c2)-[:MENTIONS]->(loan), (c3)-[:MENTIONS]->(loan), (c3)-[:MENTIONS]->(guar), (c3)-[:MENTIONS]->(bursar),
       (c4)-[:MENTIONS]->(zuva), (c4)-[:MENTIONS]->(stem), (c5)-[:MENTIONS]->(zuva), (c5)-[:MENTIONS]->(loan),
       (c6)-[:MENTIONS]->(wifi), (c7)-[:MENTIONS]->(help)
CREATE (bursar)-[:RELATED_TO {how: 'approves'}]->(loan), (guar)-[:RELATED_TO {how: 'signs for'}]->(loan),
       (zuva)-[:RELATED_TO {how: 'excludes'}]->(loan), (zuva)-[:RELATED_TO {how: 'targets'}]->(stem),
       (help)-[:RELATED_TO {how: 'supports'}]->(wifi)
`,
};

const memory: Dataset = {
  id: 'memory',
  title: 'Agent memory graph',
  blurb: 'How an AI tutor agent remembers a learner: conversations (short-term), facts and preferences (long-term) and reasoning traces.',
  schema: [
    '(:User {name})-[:HAD_SESSION]->(:Session {id, day})-[:FIRST]->(:Message {role, text, n})-[:NEXT]->(:Message)',
    '(:User)-[:PREFERS]->(:Preference {key, value})',
    '(:User)-[:KNOWS_FACT {confidence}]->(:Fact {text})',
    '(:Message)-[:MENTIONS]->(:Topic {name})',
    '(:Session)-[:HAS_TRACE]->(:Step {n, thought})-[:CALLED]->(:Tool {name})',
  ],
  script: `
CREATE (u:User {name: 'Rudo'})
CREATE (s1:Session {id: 'S1', day: 1}), (s2:Session {id: 'S2', day: 4})
CREATE (u)-[:HAD_SESSION]->(s1), (u)-[:HAD_SESSION]->(s2)
CREATE (m1:Message {role: 'user', text: 'I keep getting a KeyError in my pandas code', n: 1}),
       (m2:Message {role: 'assistant', text: 'Check the column name: df.columns lists the exact spelling.', n: 2}),
       (m3:Message {role: 'user', text: 'Fixed! Can you explain it with shorter answers next time?', n: 3}),
       (m4:Message {role: 'user', text: 'Now I want to learn embeddings for my RAG project', n: 1}),
       (m5:Message {role: 'assistant', text: 'Embeddings turn text into vectors; similar meanings sit close together.', n: 2})
CREATE (s1)-[:FIRST]->(m1), (m1)-[:NEXT]->(m2), (m2)-[:NEXT]->(m3), (s2)-[:FIRST]->(m4), (m4)-[:NEXT]->(m5)
CREATE (t1:Topic {name: 'pandas'}), (t2:Topic {name: 'KeyError'}), (t3:Topic {name: 'embeddings'}), (t4:Topic {name: 'RAG'})
CREATE (m1)-[:MENTIONS]->(t1), (m1)-[:MENTIONS]->(t2), (m2)-[:MENTIONS]->(t1), (m4)-[:MENTIONS]->(t3), (m4)-[:MENTIONS]->(t4), (m5)-[:MENTIONS]->(t3)
CREATE (u)-[:PREFERS]->(:Preference {key: 'answer_length', value: 'short'}),
       (u)-[:PREFERS]->(:Preference {key: 'language', value: 'Python'})
CREATE (u)-[:KNOWS_FACT {confidence: 0.9}]->(:Fact {text: 'Is building a RAG project'}),
       (u)-[:KNOWS_FACT {confidence: 0.6}]->(:Fact {text: 'Has used pandas before'})
CREATE (st1:Step {n: 1, thought: 'Recall what Rudo is working on'}), (st2:Step {n: 2, thought: 'Search course notes for embeddings'})
CREATE (tool1:Tool {name: 'memory_search'}), (tool2:Tool {name: 'course_search'})
CREATE (s2)-[:HAS_TRACE]->(st1), (s2)-[:HAS_TRACE]->(st2), (st1)-[:CALLED]->(tool1), (st2)-[:CALLED]->(tool2), (st1)-[:NEXT]->(st2)
`,
};

export const DATASETS: Dataset[] = [skuru, supply, fraud, transit, kg, memory];
const byId = new Map(DATASETS.map((d) => [d.id, d]));
export const getDataset = (id: string) => byId.get(id);

/** Build a fresh graph for a dataset ('empty' gives a blank database). */
export function buildGraph(id: string): Graph {
  const g = new Graph();
  if (id === 'empty') return g;
  const d = byId.get(id);
  if (!d) throw new Error(`Unknown dataset "${id}". Available: ${DATASETS.map((x) => x.id).join(', ')}, empty`);
  runCypher(g, d.script);
  return g;
}

/** A query can choose its dataset with a first-line comment:  // dataset: fraud */
export function datasetFromCode(code: string, fallback = 'skuru'): string {
  const m = /^\s*\/\/\s*dataset:\s*([a-z-]+)/m.exec(code);
  return m?.[1] ?? fallback;
}
