/** Reference solutions for Cypher challenges. Verified by tests/cypher-content.test.ts; never shipped. */
export const CYPHER_SOLUTIONS: Record<string, string> = {
  'neo4j-match-harare': "// dataset: skuru\nMATCH (s:Student {city: 'Harare'})-[:ENROLLED_IN]->(c:Course)\nRETURN s.name, c.title\nORDER BY s.name, c.title",
  'neo4j-skill-demand': '// dataset: skuru\nMATCH (s:Student)-[:ENROLLED_IN]->(:Course)-[:TEACHES_SKILL]->(k:Skill)\nWITH k, count(DISTINCT s) AS n\nWHERE n >= 2\nRETURN k.name, n\nORDER BY n DESC, k.name',
  'neo4j-two-hop-friends': "// dataset: skuru\nMATCH (me:Student {name: 'Farai'})-[:FRIENDS_WITH]-(:Student)-[:FRIENDS_WITH]-(fof:Student)\nWHERE fof <> me AND NOT (me)-[:FRIENDS_WITH]-(fof)\nRETURN DISTINCT fof.name\nORDER BY fof.name",
  'neo4j-fraud-ring': '// dataset: fraud\nMATCH (a:Account)-[:SENT*3]->(a)\nWITH DISTINCT a\nMATCH (p:Person)-[:OWNS]->(a)\nOPTIONAL MATCH (p)-[:USES_PHONE|USES_DEVICE]->()<-[:USES_PHONE|USES_DEVICE]-(o:Person)\nWHERE o <> p\nRETURN p.name, count(DISTINCT o)\nORDER BY p.name',
};
