/** Serializable graph snapshot shared by the Cypher runner, RunResult and the graph view. */
export interface ViewNode { id: number; labels: string[]; props: Record<string, unknown> }
export interface ViewRel { id: number; type: string; start: number; end: number; props: Record<string, unknown> }
export interface ViewGraph { nodes: ViewNode[]; rels: ViewRel[] }
