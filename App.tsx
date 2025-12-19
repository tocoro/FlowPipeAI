import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel
} from 'reactflow';
// CSS is now loaded in index.html to prevent ESM loader errors
// import 'reactflow/dist/style.css';

import { Sparkles, Loader2, Github, Play, Pause } from 'lucide-react';
import { generateFlowFromPrompt } from './services/geminiService';
import { executeFlow } from './utils/flowEngine';
import { INITIAL_NODES, INITIAL_EDGES } from './constants';
import Inspector from './components/Inspector';
import { AppNode, AppEdge, NodeType } from './types';

const Flow: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Execution State
  const [executionResult, setExecutionResult] = useState<{ nodeResults: Record<string, any>, edgeResults: Record<string, any> }>({ nodeResults: {}, edgeResults: {} });
  
  // Use a ref to store previous results for stateful nodes (like SEQUENCE)
  // This allows the engine to know "what happened last time"
  const prevExecutionResultRef = useRef<Record<string, any>>({});

  // Selection State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // -- Event Handlers --

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#60a5fa' } }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  // -- Logic Engine --

  // Run the "pipe" logic whenever nodes or edges change
  useEffect(() => {
    // Debounce execution slightly to avoid rapid updates during dragging
    const timer = setTimeout(() => {
      // Pass the previous result to enable stateful processing
      const results = executeFlow(nodes as AppNode[], edges as AppEdge[], prevExecutionResultRef.current);
      
      setExecutionResult(results);
      prevExecutionResultRef.current = results.nodeResults; // Update ref for next tick
    }, 100); // Slightly faster logic tick
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  // -- Emitter Logic (Simulate Real-time Stream) --
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((currentNodes) => {
        let hasChanges = false;
        const newNodes = currentNodes.map(node => {
          if (node.data.type === NodeType.EMITTER) {
             // Check if active (default to true if undefined)
             if (node.data.isActive === false) return node;

             hasChanges = true;
             let newSegment = '';

             // Specialized "Infinite Monkey" Logic
             if (node.data.label === 'Monkey Typer') {
                const target = "私はプログラミングをする";
                // Charset includes the target + noise to ensure probability > 0 eventually
                const noise = "あいうえおかきくけこさしすせそなにぬねのハヒフヘホマミムメモヤユヨラリルレロワンxyz123!@#$";
                const charset = target + noise;
                
                // Emit a burst of random characters (a "typewriter burst")
                // We generate ~5 characters per tick to make it look like a stream
                for (let i = 0; i < 5; i++) {
                   newSegment += charset.charAt(Math.floor(Math.random() * charset.length));
                }

             } else {
                 // Default Log generation
                 const types = ['INFO', 'ERROR', 'WARN', 'DEBUG'];
                 const msgs = ['User login', 'Connection timeout', 'Data processed', 'Cache miss', 'Retrying request', 'Payment success', 'Upload failed'];
                 const type = types[Math.floor(Math.random() * types.length)];
                 const msg = msgs[Math.floor(Math.random() * msgs.length)];
                 const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
                 newSegment = `[${timestamp}] ${type}: ${msg}`;
             }
             
             // Update buffer (Keep last 80 chars for visual stream effect)
             const currentText = node.data.params?.pattern || '';
             // For monkey mode, we treat it as a continuous char stream, but limit buffer size
             const newText = (currentText + newSegment).slice(-80);
             
             return {
               ...node,
               data: {
                 ...node.data,
                 params: {
                   ...node.data.params,
                   pattern: newText
                 }
               }
             };
          }
          return node;
        });
        return hasChanges ? newNodes : currentNodes;
      });
    }, 150); // Fast typing speed

    return () => clearInterval(interval);
  }, [setNodes]);

  // -- AI Generation --

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const aiResponse = await generateFlowFromPrompt(prompt);
      
      const newNodes = aiResponse.nodes.map(n => ({
        ...n,
        // Ensure data defaults
        data: {
            ...n.data,
            isActive: true, // Default to active
            // If it's an input node, let's give it some dummy data if empty so the user sees something
            params: n.data.type === NodeType.INPUT && !n.data.params?.pattern 
                ? { pattern: "Item A\nItem B\nItem C\nError 404\nItem D" } 
                : n.data.params
        }
      }));

      const newEdges = aiResponse.edges.map(e => ({
        ...e,
        animated: true,
        style: { stroke: '#60a5fa' }
      }));

      // Reset state for new flow
      prevExecutionResultRef.current = {};
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err: any) {
      setError(err.message || "Failed to generate flow.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateInput = (text: string) => {
      // Find the selected node and update its input data
      if (selectedNodeId) {
          setNodes((nds) => nds.map(node => {
              if (node.id === selectedNodeId && (node.data.type === NodeType.INPUT || node.data.type === NodeType.EMITTER)) {
                  return {
                      ...node,
                      data: {
                          ...node.data,
                          params: { ...node.data.params, pattern: text }
                      }
                  };
              }
              return node;
          }));
      }
  };
  
  const handleToggleActive = () => {
      if (selectedNodeId) {
          setNodes((nds) => nds.map(node => {
              if (node.id === selectedNodeId) {
                  const isActive = node.data.isActive === undefined ? true : node.data.isActive;
                  return {
                      ...node,
                      data: {
                          ...node.data,
                          isActive: !isActive
                      }
                  };
              }
              return node;
          }));
      }
  };

  // Helper to find selected object
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find(e => e.id === selectedEdgeId), [edges, selectedEdgeId]);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-6 z-10 relative shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              FlowPipe AI
            </h1>
            <p className="text-xs text-gray-500">Visual Unix Pipes</p>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-8">
            <div className="relative group">
                <input 
                    type="text" 
                    placeholder="Describe a task (e.g., 'Separate logs into errors and info, then merge back and batch by 5')" 
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg pl-4 pr-12 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="absolute right-2 top-1.5 p-1 bg-blue-600 rounded text-white hover:bg-blue-500 disabled:bg-gray-700 transition-colors"
                >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                </button>
            </div>
            {error && <div className="absolute top-12 left-0 text-red-400 text-xs bg-red-900/20 px-2 py-1 rounded border border-red-800/50">{error}</div>}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-400">
             <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
                <Github size={16}/> GitHub
             </a>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          proOptions={{ hideAttribution: true }}
          fitView
          className="bg-gray-950"
        >
          <Background color="#334155" gap={20} size={1} />
          <Controls className="bg-gray-800 border-gray-700 fill-white text-white" />
          <MiniMap 
            className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden" 
            nodeColor={(n) => {
                switch(n.data.type) {
                    case NodeType.INPUT: return '#3b82f6'; // Blue
                    case NodeType.EMITTER: return '#f59e0b'; // Amber
                    case NodeType.BRANCH: return '#ec4899'; // Pink
                    case NodeType.MERGE: return '#22d3ee'; // Cyan
                    case NodeType.BATCH: return '#f97316'; // Orange
                    case NodeType.SEQUENCE: return '#84cc16'; // Lime
                    case NodeType.OUTPUT: return '#10b981'; // Green
                    default: return '#8b5cf6'; // Purple
                }
            }}
            maskColor="rgba(0,0,0, 0.4)"
          />

          <Panel position="top-left" className="bg-gray-800/80 backdrop-blur border border-gray-700 p-2 rounded-lg text-gray-300 text-xs flex gap-2">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Input
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div> Stream
            </div>
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pink-500"></div> Branch
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div> Merge
            </div>
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-400"></div> Batch
            </div>
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-lime-500"></div> Sequence
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div> Process
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> Output
            </div>
          </Panel>
        </ReactFlow>

        {/* Input/Emitter Editor Overlay */}
        {selectedNode && (selectedNode.data.type === NodeType.INPUT || selectedNode.data.type === NodeType.EMITTER) && (
             <div className="absolute top-4 right-4 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 animate-in slide-in-from-right-5 fade-in duration-200 z-20">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase">
                        {selectedNode.data.type === NodeType.EMITTER ? 'Live Stream Buffer' : 'Input Source Editor'}
                    </h3>
                    {selectedNode.data.type === NodeType.EMITTER && (
                        <button 
                            onClick={handleToggleActive}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold transition-colors ${
                                (selectedNode.data.isActive ?? true) 
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            }`}
                        >
                            {(selectedNode.data.isActive ?? true) ? <Play size={10} className="fill-current"/> : <Pause size={10} className="fill-current"/>}
                            {(selectedNode.data.isActive ?? true) ? 'RUNNING' : 'PAUSED'}
                        </button>
                    )}
                 </div>
                 
                 <textarea 
                    className="w-full h-40 bg-gray-900 border border-gray-700 rounded p-2 text-xs font-mono text-gray-300 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    value={selectedNode.data.params?.pattern || ''}
                    onChange={(e) => handleUpdateInput(e.target.value)}
                    placeholder={selectedNode.data.type === NodeType.EMITTER ? "Buffer is filling..." : "Enter raw text here..."}
                    readOnly={selectedNode.data.type === NodeType.EMITTER}
                 />
                 <div className="text-xs text-gray-500 mt-1 text-right">
                    {selectedNode.data.type === NodeType.EMITTER ? 'Auto-updates from stream' : 'Edit this text to test the flow'}
                 </div>
             </div>
        )}

        {/* Inspector (Bottom Right) */}
        <Inspector 
          selectedNode={selectedNode as AppNode || null}
          selectedEdge={selectedEdge as AppEdge || null}
          nodeData={executionResult.nodeResults}
          edgeData={executionResult.edgeResults}
          onClose={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
          }}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}