import { Edge, Node } from 'reactflow';

export enum NodeType {
  INPUT = 'INPUT',
  PROCESS = 'PROCESS',
  OUTPUT = 'OUTPUT',
  EMITTER = 'EMITTER',
  BRANCH = 'BRANCH',
  MERGE = 'MERGE',
  BATCH = 'BATCH',
  SEQUENCE = 'SEQUENCE'
}

export enum ProcessType {
  SPLIT = 'split',       // split by delimiter
  GREP = 'grep',         // filter includes/regex
  REPLACE = 'sed',       // string replace
  MAP = 'awk',           // extract column/field
  SORT = 'sort',         // sort lines
  UNIQ = 'uniq',         // unique lines
  JOIN = 'join',         // join array to string
  COUNT = 'wc',          // count lines/chars
  UPPER = 'upper',       // to uppercase
  LOWER = 'lower',       // to lowercase
}

export interface NodeData {
  label: string;
  type: NodeType;
  processType?: ProcessType;
  params?: {
    pattern?: string;
    replacement?: string;
    delimiter?: string;
    fieldIndex?: number;
    batchSize?: number;
  };
  isActive?: boolean;
  // The actual data content currently residing at this node (output of this node)
  currentValue?: any;
  isResult?: boolean;
}

export type AppNode = Node<NodeData>;
export type AppEdge = Edge;

export interface FlowExecutionResult {
  nodeResults: Record<string, any>; // NodeID -> Output Data
  edgeResults: Record<string, any>; // EdgeID -> Data flowing through edge
}

export interface AIModelResponse {
  nodes: {
    id: string;
    type: 'default' | 'input' | 'output'; // ReactFlow types
    position: { x: number; y: number };
    data: NodeData;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
  }[];
  summary: string;
}