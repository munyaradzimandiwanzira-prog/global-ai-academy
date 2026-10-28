import { plain, runCypher, type Value } from './engine';
import { buildGraph } from './datasets';

/**
 * The Graph Lab: a simulated job. Each scenario drops the learner into a fictional company with
 * a manager, a real-feeling ticket queue and a live graph. Tasks are checked by running the
 * learner's query and a reference query on fresh copies of the same data and comparing results.
 */

export type TaskCheck =
  /** Compare returned rows (order matters only when `ordered`). Column names are ignored. */
  | { kind: 'rows'; ordered?: boolean }
  /** Run the learner's write query, then `verify`, and compare with the reference doing the same. */
  | { kind: 'write'; verify: string };

export interface LabTask {
  id: string;
  title: string;
  /** The ticket text, written as the manager would write it. */
  brief: string;
  hint: string;
  solution: string;
  check: TaskCheck;
  /** Skills practised, shown as tags. */
  skills: string[];
}

export interface Scenario {
  id: string;
  company: string;
  role: string;
  manager: { name: string; title: string };
  dataset: string;
  summary: string;
  /** Number of tasks open to free accounts. The rest need Plus or Academy. */
  freeTasks: number;
  tasks: LabTask[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'skuru-onboarding',
    company: 'Skuru Learning',
    role: 'Junior data analyst',
    manager: { name: 'Ms Ncube', title: 'Head of Academics' },
    dataset: 'skuru',
    summary: 'Your first week. Answer questions about students, courses and prerequisites, then recommend courses and enrol a new learner.',
    freeTasks: 6,
    tasks: [
      {
        id: 'courses-by-hours',
        title: 'List the course catalogue',
        brief: 'Welcome aboard! To get to know the data, list every **Course** with its `title`, `level` and `hours`, longest course first.',
        hint: 'MATCH (c:Course) RETURN … ORDER BY c.hours DESC',
        solution: 'MATCH (c:Course)\nRETURN c.title, c.level, c.hours\nORDER BY c.hours DESC, c.title',
        check: { kind: 'rows' },
        skills: ['MATCH', 'RETURN', 'ORDER BY'],
      },
      {
        id: 'who-teaches-graph',
        title: 'Who teaches Graph Databases?',
        brief: 'A parent called asking who teaches **Graph Databases**. Return the teacher\'s `name`.',
        hint: 'Follow TEACHES from a Teacher to the Course whose title is "Graph Databases".',
        solution: "MATCH (t:Teacher)-[:TEACHES]->(:Course {title: 'Graph Databases'})\nRETURN t.name",
        check: { kind: 'rows' },
        skills: ['relationships', 'property filters'],
      },
      {
        id: 'completions',
        title: 'Count completed courses per student',
        brief: 'For the newsletter: for each student who has **completed** at least one course (`progress` = 100 on ENROLLED_IN), return their `name` and how many courses they completed, most first.',
        hint: 'Filter the relationship property in WHERE, then count. Name the count so you can ORDER BY it.',
        solution: 'MATCH (s:Student)-[e:ENROLLED_IN]->(c:Course)\nWHERE e.progress = 100\nRETURN s.name AS student, count(c) AS completed\nORDER BY completed DESC, student',
        check: { kind: 'rows' },
        skills: ['relationship properties', 'aggregation'],
      },
      {
        id: 'prereq-chain',
        title: 'Everything you need before Agentic AI',
        brief: 'Learners keep asking what to study before **Agentic AI** (code `AI310`). Return the `code` of every course it requires, directly or indirectly, each listed once, sorted by code.',
        hint: 'A variable-length pattern -[:REQUIRES*]-> follows the chain any number of steps. Use DISTINCT.',
        solution: "MATCH (:Course {code: 'AI310'})-[:REQUIRES*]->(pre:Course)\nRETURN DISTINCT pre.code\nORDER BY pre.code",
        check: { kind: 'rows', ordered: true },
        skills: ['variable-length paths', 'DISTINCT'],
      },
      {
        id: 'stuck-learners',
        title: 'Find learners at risk',
        brief: 'Find students who are enrolled in an **advanced** course but have **not completed** (progress < 100) every one of its **direct** prerequisites. Return the student name and the advanced course title.',
        hint: 'MATCH the student, the advanced course and its direct prerequisite, then use a pattern predicate to check whether a completed enrolment exists: WHERE NOT (s)-[:ENROLLED_IN {progress: 100}]->(pre)',
        solution: "MATCH (s:Student)-[:ENROLLED_IN]->(c:Course {level: 'advanced'})-[:REQUIRES]->(pre:Course)\nWHERE NOT (s)-[:ENROLLED_IN {progress: 100}]->(pre)\nRETURN DISTINCT s.name, c.title",
        check: { kind: 'rows' },
        skills: ['pattern predicates', 'NOT'],
      },
      {
        id: 'recommend',
        title: 'Recommend courses from friends',
        brief: 'Product wants a "your friends are taking" widget. For **Tendai**, return the titles of courses Tendai\'s friends (in either direction) are enrolled in that Tendai is **not** enrolled in, each once.',
        hint: 'FRIENDS_WITH without an arrow matches both directions. Exclude courses with WHERE NOT (t)-[:ENROLLED_IN]->(c).',
        solution: "MATCH (t:Student {name: 'Tendai'})-[:FRIENDS_WITH]-(f:Student)-[:ENROLLED_IN]->(c:Course)\nWHERE NOT (t)-[:ENROLLED_IN]->(c)\nRETURN DISTINCT c.title",
        check: { kind: 'rows' },
        skills: ['recommendations', 'undirected patterns'],
      },
      {
        id: 'enrol-kudzai',
        title: 'Enrol a new student',
        brief: 'Kudzai from **Chitungwiza** (year 1) just paid. Create the Student and enrol them in **Python Basics** (`PY101`) with `progress: 0`. Use MERGE for the student so running it twice does not create duplicates.',
        hint: "MATCH the course first, then MERGE (s:Student {name: 'Kudzai'}) ON CREATE SET … and CREATE or MERGE the relationship.",
        solution: "MATCH (c:Course {code: 'PY101'})\nMERGE (s:Student {name: 'Kudzai'})\n  ON CREATE SET s.city = 'Chitungwiza', s.year = 1\nMERGE (s)-[:ENROLLED_IN {progress: 0}]->(c)",
        check: { kind: 'write', verify: "MATCH (s:Student {name: 'Kudzai'})-[e:ENROLLED_IN]->(c:Course) RETURN s.city, s.year, c.code, e.progress" },
        skills: ['MERGE', 'writes'],
      },
    ],
  },
  {
    id: 'zimfresh-ops',
    company: 'ZimFresh Distribution',
    role: 'Supply-chain analyst',
    manager: { name: 'Tinashe Gumbo', title: 'Operations Manager' },
    dataset: 'supply',
    summary: 'Shelves are empty in two cities. Trace stock-outs back to suppliers, find the cheapest source, spot single points of failure and restock.',
    freeTasks: 2,
    tasks: [
      {
        id: 'stockouts',
        title: 'Which warehouses are out of stock?',
        brief: 'Urgent: stores are complaining. Return each **warehouse code** and **product name** where the STOCKS `qty` is 0.',
        hint: 'Filter on the STOCKS relationship property.',
        solution: 'MATCH (w:Warehouse)-[s:STOCKS]->(p:Product)\nWHERE s.qty = 0\nRETURN w.code, p.name',
        check: { kind: 'rows' },
        skills: ['relationship properties'],
      },
      {
        id: 'who-can-restock',
        title: 'Who can restock them?',
        brief: 'For each stock-out, which suppliers **both** supply that product **and** deliver to that warehouse? Return warehouse code, product name and supplier name.',
        hint: 'Start from the stock-out, then find (sup)-[:SUPPLIES]->(p) and (sup)-[:DELIVERS_TO]->(w) for the same sup.',
        solution: 'MATCH (w:Warehouse)-[s:STOCKS {qty: 0}]->(p:Product)\nMATCH (sup:Supplier)-[:SUPPLIES]->(p), (sup)-[:DELIVERS_TO]->(w)\nRETURN w.code, p.name, sup.name',
        check: { kind: 'rows' },
        skills: ['multiple patterns', 'joins without JOIN'],
      },
      {
        id: 'cheapest-oil',
        title: 'Cheapest cooking oil',
        brief: 'Finance asks: who sells **Cooking oil 2L** cheapest? Return the supplier name and price of the single cheapest offer.',
        hint: 'ORDER BY the SUPPLIES price and LIMIT 1.',
        solution: "MATCH (s:Supplier)-[o:SUPPLIES]->(:Product {name: 'Cooking oil 2L'})\nRETURN s.name, o.price\nORDER BY o.price\nLIMIT 1",
        check: { kind: 'rows', ordered: true },
        skills: ['ORDER BY', 'LIMIT'],
      },
      {
        id: 'single-source',
        title: 'Single points of failure',
        brief: 'Risk review: list products supplied by **only one** supplier, with that supplier\'s name.',
        hint: 'WITH p, collect(s) AS sups WHERE size(sups) = 1 … then RETURN p.name, sups[0].name',
        solution: 'MATCH (s:Supplier)-[:SUPPLIES]->(p:Product)\nWITH p, collect(s) AS sups\nWHERE size(sups) = 1\nRETURN p.name, sups[0].name',
        check: { kind: 'rows' },
        skills: ['WITH', 'collect', 'list indexing'],
      },
      {
        id: 'next-day-stores',
        title: 'Next-day delivery from Harare',
        brief: 'Marketing wants to promise next-day delivery. Which stores does **WH-HRE** ship to in **1 day**? Return store name and km, nearest first.',
        hint: 'Filter SHIPS_TO on days = 1 and sort by km.',
        solution: "MATCH (:Warehouse {code: 'WH-HRE'})-[r:SHIPS_TO {days: 1}]->(s:Store)\nRETURN s.name, r.km\nORDER BY r.km",
        check: { kind: 'rows', ordered: true },
        skills: ['filters', 'sorting'],
      },
      {
        id: 'low-rated-exposure',
        title: 'Exposure to low-rated suppliers',
        brief: 'Which **stores** could be affected if suppliers rated **below 4.0** fail? Follow supplier → warehouse → store. Return each store name once, sorted.',
        hint: 'One pattern: (s:Supplier)-[:DELIVERS_TO]->(:Warehouse)-[:SHIPS_TO]->(st:Store) with WHERE s.rating < 4.0',
        solution: 'MATCH (s:Supplier)-[:DELIVERS_TO]->(:Warehouse)-[:SHIPS_TO]->(st:Store)\nWHERE s.rating < 4.0\nRETURN DISTINCT st.name\nORDER BY st.name',
        check: { kind: 'rows', ordered: true },
        skills: ['multi-hop', 'impact analysis'],
      },
      {
        id: 'restock-mutare',
        title: 'Record the Mutare restock',
        brief: '500 bottles of **Cooking oil 2L** arrived at **WH-MUT**. Update the STOCKS `qty` to 500.',
        hint: 'MATCH the relationship with a variable, then SET r.qty = 500.',
        solution: "MATCH (:Warehouse {code: 'WH-MUT'})-[r:STOCKS]->(:Product {name: 'Cooking oil 2L'})\nSET r.qty = 500",
        check: { kind: 'write', verify: "MATCH (:Warehouse {code: 'WH-MUT'})-[r:STOCKS]->(p:Product) RETURN p.name, r.qty" },
        skills: ['SET', 'updates'],
      },
    ],
  },
  {
    id: 'moneylink-fraud',
    company: 'MoneyLink',
    role: 'Fraud analyst',
    manager: { name: 'Rudo Mapfumo', title: 'Head of Risk' },
    dataset: 'fraud',
    summary: 'A flagged account sent money in a suspicious loop. Use shared phones, shared devices and money cycles to uncover the whole ring, then flag it.',
    freeTasks: 2,
    tasks: [
      {
        id: 'shared-phones',
        title: 'Phones shared by many people',
        brief: 'Legitimate customers rarely share a phone number. Return each **phone number** used by **3 or more** people, with the count.',
        hint: 'MATCH (p:Person)-[:USES_PHONE]->(ph) WITH ph, count(p) AS people WHERE people >= 3',
        solution: 'MATCH (p:Person)-[:USES_PHONE]->(ph:Phone)\nWITH ph, count(p) AS people\nWHERE people >= 3\nRETURN ph.number, people',
        check: { kind: 'rows' },
        skills: ['WITH … WHERE', 'aggregation'],
      },
      {
        id: 'flagged-neighbours',
        title: 'Who shares a device with a flagged account owner?',
        brief: 'Account `ML-1003` is already flagged. Return the names of **other** people who use the **same device** as its owner.',
        hint: '(:Account {flagged: true})<-[:OWNS]-(o)-[:USES_DEVICE]->(d)<-[:USES_DEVICE]-(p) WHERE p <> o',
        solution: 'MATCH (:Account {flagged: true})<-[:OWNS]-(o:Person)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(p:Person)\nWHERE p <> o\nRETURN DISTINCT p.name',
        check: { kind: 'rows' },
        skills: ['shared identifiers', 'entity resolution'],
      },
      {
        id: 'money-cycles',
        title: 'Money moving in a circle',
        brief: 'Money that leaves an account and returns to it in **exactly 3** transfers is a classic layering pattern. Return the account numbers that sit on such a cycle, each once, sorted.',
        hint: 'A path can start and end at the same node: (a:Account)-[:SENT*3]->(a)',
        solution: 'MATCH (a:Account)-[:SENT*3]->(a)\nRETURN DISTINCT a.number\nORDER BY a.number',
        check: { kind: 'rows', ordered: true },
        skills: ['cycles', 'variable-length paths'],
      },
      {
        id: 'cycle-volume',
        title: 'How much flowed around the ring?',
        brief: 'Return the **total amount** sent between accounts that are on a 3-step cycle (each transfer counted once).',
        hint: 'MATCH p = (a)-[:SENT*3]->(a), UNWIND relationships(p) AS t, then sum(DISTINCT … ) is wrong for equal amounts. Collect distinct transfers first: WITH DISTINCT t RETURN sum(t.amount).',
        solution: 'MATCH p = (a:Account)-[:SENT*3]->(a)\nUNWIND relationships(p) AS t\nWITH DISTINCT t\nRETURN sum(t.amount) AS total',
        check: { kind: 'rows' },
        skills: ['paths', 'UNWIND', 'DISTINCT rows'],
      },
      {
        id: 'new-in-ring',
        title: 'Recently joined ring members',
        brief: 'The regulator wants to know if the ring uses **new** customers. Return names of people who own an account on a 3-step cycle **and** joined in **2025**.',
        hint: 'Find ring accounts, then (p:Person)-[:OWNS]->(a) WHERE p.joined = 2025',
        solution: 'MATCH (a:Account)-[:SENT*3]->(a)\nWITH DISTINCT a\nMATCH (p:Person)-[:OWNS]->(a)\nWHERE p.joined = 2025\nRETURN DISTINCT p.name',
        check: { kind: 'rows' },
        skills: ['chaining with WITH'],
      },
      {
        id: 'flag-ring',
        title: 'Flag the ring',
        brief: 'Decision made. Set `flagged = true` on **every account on a 3-step money cycle** and on **every account owned by someone who uses device `86-771200-554411-9`**.',
        hint: 'Two statements separated by ; work. Or MATCH each set and SET a.flagged = true.',
        solution: "MATCH (a:Account)-[:SENT*3]->(a) SET a.flagged = true;\nMATCH (:Device {imei: '86-771200-554411-9'})<-[:USES_DEVICE]-(:Person)-[:OWNS]->(a:Account) SET a.flagged = true",
        check: { kind: 'write', verify: 'MATCH (a:Account) WHERE a.flagged = true RETURN a.number ORDER BY a.number' },
        skills: ['bulk updates', 'investigation'],
      },
    ],
  },
  {
    id: 'harare-transit',
    company: 'City Transit Lab',
    role: 'Route planning engineer',
    manager: { name: 'Eng. Chiweshe', title: 'Transport Planner' },
    dataset: 'transit',
    summary: 'Plan journeys across Harare: direct routes, fewest-stop paths, journey time and coverage gaps.',
    freeTasks: 2,
    tasks: [
      {
        id: 'from-copa',
        title: 'Direct routes from Copacabana',
        brief: 'List every stop you can reach **directly** from **Copacabana**, with minutes and fare, quickest first.',
        hint: 'One ROUTE hop, ORDER BY r.mins',
        solution: "MATCH (:Stop {name: 'Copacabana'})-[r:ROUTE]->(s:Stop)\nRETURN s.name, r.mins, r.fare\nORDER BY r.mins",
        check: { kind: 'rows', ordered: true },
        skills: ['one hop'],
      },
      {
        id: 'fewest-stops',
        title: 'Fewest stops to Budiriro',
        brief: 'A commuter at **Fourth Street** needs to get to **Budiriro** with as few kombis as possible. Return the number of rides (relationships) on the shortest path.',
        hint: 'p = shortestPath((a)-[:ROUTE*]->(b)) and RETURN length(p)',
        solution: "MATCH p = shortestPath((:Stop {name: 'Fourth Street'})-[:ROUTE*]->(:Stop {name: 'Budiriro'}))\nRETURN length(p)",
        check: { kind: 'rows' },
        skills: ['shortestPath'],
      },
      {
        id: 'journey-stops',
        title: 'List the journey',
        brief: 'Now list the **stop names in order** along that shortest path, one per row.',
        hint: 'UNWIND nodes(p) AS s RETURN s.name',
        solution: "MATCH p = shortestPath((:Stop {name: 'Fourth Street'})-[:ROUTE*]->(:Stop {name: 'Budiriro'}))\nUNWIND nodes(p) AS s\nRETURN s.name",
        check: { kind: 'rows', ordered: true },
        skills: ['nodes()', 'UNWIND'],
      },
      {
        id: 'journey-time',
        title: 'Journey time and fare',
        brief: 'Return the **total minutes** and **total fare** for that journey.',
        hint: 'UNWIND relationships(p) AS r RETURN sum(r.mins), sum(r.fare)',
        solution: "MATCH p = shortestPath((:Stop {name: 'Fourth Street'})-[:ROUTE*]->(:Stop {name: 'Budiriro'}))\nUNWIND relationships(p) AS r\nRETURN sum(r.mins) AS minutes, sum(r.fare) AS fare",
        check: { kind: 'rows' },
        skills: ['relationships()', 'sum'],
      },
      {
        id: 'coverage-gap',
        title: 'Coverage gap',
        brief: 'Which stops **cannot** be reached from **Copacabana** at all (following route direction)? Exclude Copacabana itself. Sorted by name.',
        hint: 'Collect everything reachable with -[:ROUTE*]->, then MATCH all stops and keep those NOT IN the list.',
        solution: "MATCH (:Stop {name: 'Copacabana'})-[:ROUTE*]->(r:Stop)\nWITH collect(DISTINCT r) AS reachable\nMATCH (s:Stop)\nWHERE NOT s IN reachable AND s.name <> 'Copacabana'\nRETURN s.name\nORDER BY s.name",
        check: { kind: 'rows', ordered: true },
        skills: ['reachability', 'lists'],
      },
    ],
  },
  {
    id: 'graphrag-retriever',
    company: 'Skuru Learning AI team',
    role: 'GraphRAG engineer',
    manager: { name: 'Dr Moyo', title: 'AI Lead' },
    dataset: 'kg',
    summary: 'Build the retrieval step of a GraphRAG chatbot for student policies: vector search, then graph expansion to gather the right context.',
    freeTasks: 1,
    tasks: [
      {
        id: 'vector-top3',
        title: 'Vector search',
        brief: 'The question "How do I get a loan to pay fees?" embeds to `[0.85, 0.2, 0.0, 0.1]`. Return the **ids** and **scores** of the **3 most similar** chunks using `vector.similarity.cosine`, best first.',
        hint: 'MATCH (c:Chunk) WITH c, vector.similarity.cosine(c.embedding, [0.85, 0.2, 0.0, 0.1]) AS score RETURN … ORDER BY score DESC LIMIT 3',
        solution: 'MATCH (c:Chunk)\nWITH c, vector.similarity.cosine(c.embedding, [0.85, 0.2, 0.0, 0.1]) AS score\nRETURN c.id, round(score, 4) AS score\nORDER BY score DESC\nLIMIT 3',
        check: { kind: 'rows', ordered: true },
        skills: ['vector similarity', 'top-k'],
      },
      {
        id: 'entities-of-top',
        title: 'Expand to entities',
        brief: 'For the **top 2** chunks, return the **distinct entity names** they mention. This is the graph part of GraphRAG: it pulls in connected facts the vector search alone would miss.',
        hint: 'Keep the top 2 with ORDER BY … LIMIT 2 inside a WITH, then MATCH (c)-[:MENTIONS]->(e).',
        solution: 'MATCH (c:Chunk)\nWITH c, vector.similarity.cosine(c.embedding, [0.85, 0.2, 0.0, 0.1]) AS score\nORDER BY score DESC\nLIMIT 2\nMATCH (c)-[:MENTIONS]->(e:Entity)\nRETURN DISTINCT e.name',
        check: { kind: 'rows' },
        skills: ['graph expansion', 'WITH … LIMIT'],
      },
      {
        id: 'multi-hop',
        title: 'Answer a multi-hop question',
        brief: 'A student asks: "I have the Zuva Scholarship. Can I also get a tuition loan?" Find **every RELATED_TO relationship** that connects the entity **Zuva Scholarship** to **Tuition loan** and return the `how` property.',
        hint: "(:Entity {name: 'Zuva Scholarship'})-[r:RELATED_TO]->(:Entity {name: 'Tuition loan'})",
        solution: "MATCH (:Entity {name: 'Zuva Scholarship'})-[r:RELATED_TO]->(:Entity {name: 'Tuition loan'})\nRETURN r.how",
        check: { kind: 'rows' },
        skills: ['knowledge graph', 'multi-hop reasoning'],
      },
      {
        id: 'evidence',
        title: 'Collect the evidence text',
        brief: 'Return the **text** of every chunk that mentions **both** Zuva Scholarship **and** Tuition loan, so the LLM can quote its source.',
        hint: '(e1)<-[:MENTIONS]-(c:Chunk)-[:MENTIONS]->(e2)',
        solution: "MATCH (:Entity {name: 'Zuva Scholarship'})<-[:MENTIONS]-(c:Chunk)-[:MENTIONS]->(:Entity {name: 'Tuition loan'})\nRETURN c.text",
        check: { kind: 'rows' },
        skills: ['grounding', 'citations'],
      },
      {
        id: 'window',
        title: 'Context window with neighbours',
        brief: 'Chunks are small, so retrievers often add the **next chunk** for context. For chunk `loans-1`, return its text and the text of the chunk directly after it (NEXT), in reading order.',
        hint: "MATCH (c:Chunk {id: 'loans-1'})-[:NEXT*0..1]->(w) RETURN w.text — *0..1 includes the chunk itself.",
        solution: "MATCH p = (c:Chunk {id: 'loans-1'})-[:NEXT*0..1]->(w:Chunk)\nRETURN w.text\nORDER BY length(p)",
        check: { kind: 'rows', ordered: true },
        skills: ['parent/neighbour retrieval'],
      },
    ],
  },
  {
    id: 'agent-memory',
    company: 'Skuru Learning AI team',
    role: 'Memory engineer',
    manager: { name: 'Dr Moyo', title: 'AI Lead' },
    dataset: 'memory',
    summary: 'Give Professor Zuva, the AI tutor, a memory. Read short-term conversation history, long-term preferences and facts, and write new memories safely.',
    freeTasks: 1,
    tasks: [
      {
        id: 'preferences',
        title: 'Load preferences into the prompt',
        brief: 'Before every reply the agent loads the learner\'s preferences. Return the `key` and `value` of each Preference for **Rudo**.',
        hint: "(:User {name: 'Rudo'})-[:PREFERS]->(p)",
        solution: "MATCH (:User {name: 'Rudo'})-[:PREFERS]->(p:Preference)\nRETURN p.key, p.value",
        check: { kind: 'rows' },
        skills: ['long-term memory'],
      },
      {
        id: 'last-session',
        title: 'Rebuild the last conversation',
        brief: 'Return the `role` and `text` of every message in Rudo\'s **most recent** session (highest `day`), in conversation order.',
        hint: 'Find the latest session with ORDER BY s.day DESC LIMIT 1 in a WITH, then follow -[:FIRST]->()-[:NEXT*0..]->(m) and order by m.n.',
        solution: "MATCH (:User {name: 'Rudo'})-[:HAD_SESSION]->(s:Session)\nWITH s ORDER BY s.day DESC LIMIT 1\nMATCH (s)-[:FIRST]->(:Message)-[:NEXT*0..]->(m:Message)\nRETURN m.role, m.text\nORDER BY m.n",
        check: { kind: 'rows', ordered: true },
        skills: ['short-term memory', 'linked lists in graphs'],
      },
      {
        id: 'topic-frequency',
        title: 'What does Rudo talk about?',
        brief: 'Return each Topic mentioned in **any** of Rudo\'s messages and how many messages mention it, most first (ties by name).',
        hint: 'Messages hang off sessions via FIRST and NEXT. -[:FIRST]->()-[:NEXT*0..]->(m) reaches all of them.',
        solution: "MATCH (:User {name: 'Rudo'})-[:HAD_SESSION]->(:Session)-[:FIRST]->(:Message)-[:NEXT*0..]->(m:Message)-[:MENTIONS]->(t:Topic)\nRETURN t.name AS topic, count(DISTINCT m) AS mentions\nORDER BY mentions DESC, topic",
        check: { kind: 'rows', ordered: true },
        skills: ['memory summarisation'],
      },
      {
        id: 'reasoning-trace',
        title: 'Audit the reasoning trace',
        brief: 'For session `S2`, return each reasoning Step\'s `n`, `thought` and the **tool** it called, in order. This is "reasoning memory": it lets you debug and improve an agent later.',
        hint: '(:Session {id: \'S2\'})-[:HAS_TRACE]->(st:Step)-[:CALLED]->(t:Tool)',
        solution: "MATCH (:Session {id: 'S2'})-[:HAS_TRACE]->(st:Step)-[:CALLED]->(t:Tool)\nRETURN st.n, st.thought, t.name\nORDER BY st.n",
        check: { kind: 'rows', ordered: true },
        skills: ['reasoning memory', 'observability'],
      },
      {
        id: 'remember-preference',
        title: 'Write a new memory, idempotently',
        brief: 'Rudo said "please use examples from football". Store a Preference with key `examples` and value `football` for Rudo. Running it twice must **not** create two.',
        hint: "MATCH (u:User {name: 'Rudo'}) MERGE (u)-[:PREFERS]->(:Preference {key: 'examples', value: 'football'})",
        solution: "MATCH (u:User {name: 'Rudo'})\nMERGE (u)-[:PREFERS]->(:Preference {key: 'examples', value: 'football'})",
        check: { kind: 'write', verify: "MATCH (:User {name: 'Rudo'})-[:PREFERS]->(p:Preference) RETURN p.key, p.value ORDER BY p.key" },
        skills: ['memory writes', 'MERGE'],
      },
    ],
  },
];

export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id);

export interface CheckOutcome {
  passed: boolean;
  message: string;
}

const canon = (rows: Value[][]) => rows.map((r) => JSON.stringify(r.map((v) => plain(v))));

/** Run `code` and the task's reference on fresh graphs and compare. Never throws. */
export function checkTask(dataset: string, task: LabTask, code: string): CheckOutcome {
  try {
    let mine: Value[][];
    let expected: Value[][];
    if (task.check.kind === 'write') {
      const g1 = buildGraph(dataset);
      runCypher(g1, code);
      // Idempotency matters for memory and MERGE tasks: run twice when the reference is MERGE-based.
      if (/\bMERGE\b/i.test(task.solution)) runCypher(g1, code);
      mine = runCypher(g1, task.check.verify).rows;
      const g2 = buildGraph(dataset);
      runCypher(g2, task.solution);
      expected = runCypher(g2, task.check.verify).rows;
    } else {
      const res = runCypher(buildGraph(dataset), code);
      if (!res.returned) return { passed: false, message: 'Your query did not RETURN anything. End it with RETURN.' };
      mine = res.rows;
      expected = runCypher(buildGraph(dataset), task.solution).rows;
      if (res.rows[0] && expected[0] && res.rows[0].length !== expected[0].length) {
        return { passed: false, message: `Return ${expected[0].length} column${expected[0].length === 1 ? '' : 's'} (you returned ${res.rows[0].length}).` };
      }
    }
    let a = canon(mine);
    let b = canon(expected);
    if (task.check.kind === 'write' || !task.check.ordered) { a = [...a].sort(); b = [...b].sort(); }
    if (a.length !== b.length) {
      return { passed: false, message: task.check.kind === 'write' && /\bMERGE\b/i.test(task.solution) && a.length > b.length
        ? 'Running your query twice created duplicates. Use MERGE so repeated runs are safe.'
        : `Expected ${b.length} row${b.length === 1 ? '' : 's'} but got ${a.length}.` };
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return { passed: false, message: task.check.kind !== 'write' && task.check.ordered ? `Row ${i + 1} differs. Check the values and the sort order.` : 'Some rows differ from the expected answer. Check your filters.' };
    }
    return { passed: true, message: 'Ticket resolved. The numbers match.' };
  } catch (e) {
    return { passed: false, message: (e as Error).message };
  }
}
