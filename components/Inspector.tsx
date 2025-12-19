import React, { useState, useRef, useEffect } from 'react';
import { AppNode, AppEdge, NodeData, NodeType } from '../types';
import { FileText, Activity, Terminal, ArrowRight, Radio, GitFork, Merge, Layers, ListChecks, GripHorizontal } from 'lucide-react';

interface InspectorProps {
  selectedNode: AppNode | null;
  selectedEdge: AppEdge | null;
  nodeData: Record<string, any>;
  edgeData: Record<string, any>;
  onClose: () => void;
}

const Inspector: React.FC<InspectorProps> = ({ selectedNode, selectedEdge, nodeData, edgeData, onClose }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging) return;
          const dx = e.clientX - dragStartRef.current.x;
          const dy = e.clientY - dragStartRef.current.y;
          setPosition({
              x: positionStartRef.current.x + dx,
              y: positionStartRef.current.y + dy
          });
      };

      const handleMouseUp = () => {
          setIsDragging(false);
      };

      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      positionStartRef.current = { ...position };
      e.preventDefault(); // Prevent text selection
  };

  if (!selectedNode && !selectedEdge) return null;

  return (
    <div 
      className="absolute bottom-4 right-4 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[500px] animate-in slide-in-from-bottom-5 fade-in duration-200 z-50"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div 
        className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center cursor-move select-none active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <h3 className="font-semibold text-blue-400 flex items-center gap-2 pointer-events-none">
          {selectedNode ? <Activity size={16} /> : <ArrowRight size={16} />}
          {selectedNode ? 'Node Inspector' : 'Pipe Inspector'}
        </h3>
        <div className="flex items-center gap-2">
            <GripHorizontal size={16} className="text-gray-600" />
            <button onClick={onClose} className="text-gray-500 hover:text-white" onMouseDown={(e) => e.stopPropagation()}>&times;</button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto custom-scrollbar bg-gray-800">
        {selectedNode && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Label</label>
              <div className="text-lg font-medium flex items-center gap-2">
                {selectedNode.data.type === NodeType.EMITTER && <Radio size={18} className="text-amber-500 animate-pulse" />}
                {selectedNode.data.type === NodeType.BRANCH && <GitFork size={18} className="text-pink-500" />}
                {selectedNode.data.type === NodeType.MERGE && <Merge size={18} className="text-cyan-400" />}
                {selectedNode.data.type === NodeType.BATCH && <Layers size={18} className="text-orange-400" />}
                {selectedNode.data.type === NodeType.SEQUENCE && <ListChecks size={18} className="text-lime-500" />}
                {selectedNode.data.label}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Operation</label>
              <div className="flex items-center gap-2 bg-gray-900 p-2 rounded mt-1 border border-gray-700">
                <Terminal size={14} className="text-green-500" />
                <code className="text-sm font-mono text-green-400">
                  {selectedNode.data.type === NodeType.EMITTER ? 'STREAM' : 
                   selectedNode.data.type === NodeType.MERGE ? 'MERGE (Fan-In)' :
                   selectedNode.data.type === NodeType.BATCH ? `BATCH (Size: ${selectedNode.data.params?.batchSize || 3})` :
                   selectedNode.data.type === NodeType.SEQUENCE ? `SEQ_MATCH: "${selectedNode.data.params?.pattern}"` :
                   (selectedNode.data.processType || 'N/A')} 
                  
                  {selectedNode.data.params?.pattern && selectedNode.data.type !== NodeType.SEQUENCE ? ` /${selectedNode.data.params.pattern.substring(0, 15)}${selectedNode.data.params.pattern.length > 15 ? '...' : ''}/` : ''}
                  {selectedNode.data.params?.replacement ? ` -> ${selectedNode.data.params.replacement}` : ''}
                </code>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Current Output</label>
              <DataViewer data={nodeData[selectedNode.id]} />
            </div>
          </div>
        )}

        {selectedEdge && (
          <div className="space-y-4">
             <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Flow ID</label>
              <div className="text-xs font-mono text-gray-400">{selectedEdge.id}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Data in Pipe</label>
              <DataViewer data={edgeData[selectedEdge.id]} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DataViewer: React.FC<{ data: any }> = ({ data }) => {
  if (data === undefined || data === null) {
    return <div className="text-gray-600 italic mt-1 text-sm">No data flowing</div>;
  }

  let displayContent;
  if (Array.isArray(data)) {
    displayContent = data.join('\n');
    if (data.length === 0) displayContent = "<Empty Array>";
  } else if (typeof data === 'object') {
    displayContent = JSON.stringify(data, null, 2);
  } else {
    displayContent = String(data);
  }

  return (
    <div className="mt-1 relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <FileText size={14} className="text-gray-500" />
      </div>
      <pre className="bg-black/50 p-3 rounded text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-40 border border-gray-700">
        {displayContent}
      </pre>
      <div className="text-xs text-right text-gray-600 mt-1">
        {Array.isArray(data) ? `${data.length} items` : `length: ${displayContent.length}`}
      </div>
    </div>
  );
};

export default Inspector;