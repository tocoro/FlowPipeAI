import { AppNode, AppEdge, NodeType, ProcessType } from './types';

export const INITIAL_NODES: AppNode[] = [
  {
    id: '1',
    type: 'input',
    position: { x: 50, y: 100 },
    data: { 
      label: 'Monkey Typer', 
      type: NodeType.EMITTER,
      isActive: true,
      params: { pattern: "" } 
    },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 450, y: 100 },
    data: { 
      label: 'Sequence Matcher', 
      type: NodeType.SEQUENCE, 
      params: { pattern: '私はプログラミングをする' }
    },
  },
  {
    id: '3',
    type: 'output',
    position: { x: 850, y: 100 },
    data: { 
      label: 'Result', 
      type: NodeType.OUTPUT 
    },
  },
];

export const INITIAL_EDGES: AppEdge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#f59e0b' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#84cc16' } },
];