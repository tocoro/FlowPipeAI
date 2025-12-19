import { AppNode, AppEdge, ProcessType, NodeType, FlowExecutionResult } from '../types';

/**
 * Executes the data flow graph.
 * This is a simplified topological sort & execution engine.
 * Now supports prevNodeResults to handle stateful nodes like SEQUENCE.
 */
export const executeFlow = (
  nodes: AppNode[],
  edges: AppEdge[],
  prevNodeResults: Record<string, any> = {}
): FlowExecutionResult => {
  const nodeResults: Record<string, any> = {};
  const edgeResults: Record<string, any> = {};

  // Build adjacency list
  const adjacency: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  nodes.forEach(node => {
    adjacency[node.id] = [];
    inDegree[node.id] = 0;
    // Initialize inputs and emitters
    if (node.data.type === NodeType.INPUT || node.data.type === NodeType.EMITTER) {
      nodeResults[node.id] = node.data.params?.pattern || ""; 
    }
  });

  edges.forEach(edge => {
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  // Kahn's Algorithm for execution order
  const queue: string[] = nodes
    .filter(n => inDegree[n.id] === 0)
    .map(n => n.id);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) continue;

    // Get Input Data for this node
    const incomingEdges = edges.filter(e => e.target === nodeId);
    let inputData: any = null;

    if (incomingEdges.length > 0) {
      // Aggregate inputs (Fan-in)
      const inputs = incomingEdges.map(e => nodeResults[e.source]).filter(d => d !== undefined);
      
      if (inputs.length === 1) {
        inputData = inputs[0];
      } else if (inputs.length > 1) {
        // Flatten logic
        const allArrays = inputs.every(i => Array.isArray(i));
        if (allArrays) {
             inputData = inputs.flat();
        } else {
             inputData = inputs.map(i => Array.isArray(i) ? i : [String(i)]).flat();
        }
      }
      
      incomingEdges.forEach(e => {
        edgeResults[e.id] = nodeResults[e.source];
      });
    } else if (node.data.type === NodeType.INPUT || node.data.type === NodeType.EMITTER) {
        inputData = nodeResults[node.id];
    }

    // Process Data
    if (inputData !== null && inputData !== undefined) {
      if (node.data.type === NodeType.PROCESS || node.data.type === NodeType.BRANCH) {
         const config = { 
           ...node.data, 
           processType: node.data.processType || ProcessType.GREP 
         };
         nodeResults[node.id] = processData(inputData, config);

      } else if (node.data.type === NodeType.BATCH) {
         nodeResults[node.id] = processBatch(inputData, node.data.params?.batchSize || 3);

      } else if (node.data.type === NodeType.MERGE) {
         nodeResults[node.id] = inputData;

      } else if (node.data.type === NodeType.SEQUENCE) {
         // SEQUENCE Logic (Stateful)
         // It looks for the next character in the target pattern from the input stream
         const targetPattern = node.data.params?.pattern || "";
         const prevOutput = prevNodeResults[node.id] || ""; // Get state from previous tick
         
         // If we haven't finished the sequence yet
         if (prevOutput.length < targetPattern.length) {
            const nextCharNeeded = targetPattern[prevOutput.length];
            // Scan input data (which is a window/buffer) for the character
            // We loosely check if the *buffer* contains the char. 
            // In a real stream, we'd pop chars, but here we scan the noisy buffer.
            const inputStr = Array.isArray(inputData) ? inputData.join('') : String(inputData);
            
            if (inputStr.includes(nextCharNeeded)) {
                nodeResults[node.id] = prevOutput + nextCharNeeded;
            } else {
                nodeResults[node.id] = prevOutput; // No progress
            }
         } else {
            nodeResults[node.id] = prevOutput; // Sequence complete
         }

      } else if (node.data.type === NodeType.OUTPUT) {
         nodeResults[node.id] = inputData;

      } else {
         nodeResults[node.id] = inputData; 
      }
    }

    // Trigger neighbors
    if (adjacency[nodeId]) {
      adjacency[nodeId].forEach(neighborId => {
        inDegree[neighborId]--;
        if (inDegree[neighborId] === 0) {
          queue.push(neighborId);
        }
      });
    }
  }

  return { nodeResults, edgeResults };
};

const processBatch = (input: any, batchSize: number): string[] => {
    let lines: string[] = [];
    if (typeof input === 'string') {
        lines = input.split(/\r?\n/).filter(Boolean);
    } else if (Array.isArray(input)) {
        lines = input.map(String);
    } else {
        lines = [String(input)];
    }

    const batches: string[] = [];
    for (let i = 0; i < lines.length; i += batchSize) {
        const chunk = lines.slice(i, i + batchSize);
        batches.push(`[Batch of ${chunk.length}]: ${chunk.join(', ')}`);
    }
    return batches;
};

const processData = (input: any, config: AppNode['data']): any => {
  const { processType, params } = config;

  let lines: string[] = [];
  if (typeof input === 'string') {
    lines = input.split(/\r?\n/);
  } else if (Array.isArray(input)) {
    lines = input.map(String);
  } else {
    lines = [String(input)];
  }

  switch (processType) {
    case ProcessType.SPLIT:
      if (typeof input === 'string') {
          return input.split(params?.delimiter || ',');
      }
      return lines;

    case ProcessType.GREP:
      const pattern = params?.pattern || '';
      try {
        const regex = new RegExp(pattern, 'i');
        return lines.filter(l => regex.test(l));
      } catch (e) {
        return lines.filter(l => l.includes(pattern));
      }

    case ProcessType.REPLACE:
      const search = params?.pattern || '';
      const replace = params?.replacement || '';
      try {
        const regex = new RegExp(search, 'g');
        return lines.map(l => l.replace(regex, replace));
      } catch {
        return lines.map(l => l.split(search).join(replace));
      }

    case ProcessType.MAP:
       const fieldIdx = (params?.fieldIndex || 1) - 1;
       const delimiter = params?.delimiter || ' ';
       return lines.map(l => {
           const parts = l.split(delimiter).filter(Boolean);
           return parts[fieldIdx] || '';
       });

    case ProcessType.SORT:
      return [...lines].sort();

    case ProcessType.UNIQ:
        return Array.from(new Set(lines));

    case ProcessType.JOIN:
        return lines.join(params?.delimiter || '\n');

    case ProcessType.COUNT:
        return `Lines: ${lines.length}\nCharacters: ${lines.join('').length}`;
    
    case ProcessType.UPPER:
        return lines.map(l => l.toUpperCase());

    case ProcessType.LOWER:
        return lines.map(l => l.toLowerCase());

    default:
      return lines;
  }
};