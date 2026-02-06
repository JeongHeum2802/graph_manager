import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Share2, Circle, MousePointer2, ArrowRight, Minus, Download } from 'lucide-react';

const App = () => {
  // State for Graph Data
  const [nodes, setNodes] = useState([
    { id: '1', label: 'Node 1', x: 400, y: 100 },
    { id: '2', label: 'Node 2', x: 300, y: 300 },
    { id: '3', label: 'Node 3', x: 500, y: 300 },
  ]);
  const [edges, setEdges] = useState([
    { id: 'e1-2', source: '1', target: '2', type: 'directed' },
    { id: 'e1-3', source: '1', target: '3', type: 'undirected' },
  ]);

  // Sidebar Inputs
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');
  const [edgeType, setEdgeType] = useState('directed');

  // Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Add Node
  const addNode = () => {
    const id = Date.now().toString();
    const newNode = {
      id,
      label: newNodeLabel || `Node ${nodes.length + 1}`,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    };
    setNodes([...nodes, newNode]);
    setNewNodeLabel('');
  };

  // Delete Node
  const deleteNode = (id) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.source !== id && e.target !== id));
  };

  // Add Edge
  const addEdge = () => {
    if (!edgeSource || !edgeTarget || edgeSource === edgeTarget) return;
    const exists = edges.find(
      (e) => (e.source === edgeSource && e.target === edgeTarget) ||
        (e.type === 'undirected' && e.source === edgeTarget && e.target === edgeSource)
    );
    if (exists) return;

    const newEdge = {
      id: `e${Date.now()}`,
      source: edgeSource,
      target: edgeTarget,
      type: edgeType,
    };
    setEdges([...edges, newEdge]);
    setEdgeSource('');
    setEdgeTarget('');
  };

  const deleteEdge = (id) => {
    setEdges(edges.filter((e) => e.id !== id));
  };

  // Drag Handlers
  const handleMouseDown = (id) => (e) => {
    setDraggingNodeId(id);
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggingNodeId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === draggingNodeId ? { ...node, x, y } : node
      )
    );
  }, [draggingNodeId]);

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  useEffect(() => {
    if (draggingNodeId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNodeId, handleMouseMove]);

  // Export to PNG
  const saveAsPNG = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const svgRect = svgRef.current.getBoundingClientRect();

    canvas.width = svgRect.width;
    canvas.height = svgRect.height;
    const ctx = canvas.getContext('2d');

    // 1. Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'graph-export.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = url;
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <Share2 size={24} /> Graph Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">노드와 간선을 관리하세요</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <Circle size={14} /> 노드 추가
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="노드 이름"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
              />
              <button onClick={addNode} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus size={20} />
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <MousePointer2 size={14} /> 간선 연결
            </h2>
            <div className="space-y-3">
              <div className="flex p-1 bg-slate-100 rounded-lg mb-2">
                <button
                  onClick={() => setEdgeType('directed')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${edgeType === 'directed' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <ArrowRight size={14} /> 방향
                </button>
                <button
                  onClick={() => setEdgeType('undirected')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${edgeType === 'undirected' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Minus size={14} /> 무방향
                </button>
              </div>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white" value={edgeSource} onChange={(e) => setEdgeSource(e.target.value)}>
                <option value="">출발 노드 선택</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white" value={edgeTarget} onChange={(e) => setEdgeTarget(e.target.value)}>
                <option value="">도착 노드 선택</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
              <button onClick={addEdge} disabled={!edgeSource || !edgeTarget} className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50 transition-colors">
                간선 추가하기
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">현재 간선 목록</h2>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {edges.length === 0 && <p className="text-xs text-slate-400 italic">연결된 간선이 없습니다.</p>}
              {edges.map((edge) => {
                const s = nodes.find(n => n.id === edge.source);
                const t = nodes.find(n => n.id === edge.target);
                return (
                  <div key={edge.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md border border-slate-100">
                    <span className="text-xs font-medium text-slate-600">
                      {s?.label || '?'} {edge.type === 'directed' ? '→' : '—'} {t?.label || '?'}
                    </span>
                    <button onClick={() => deleteEdge(edge.id)} className="text-rose-400 hover:text-rose-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <button
            onClick={saveAsPNG}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 shadow-sm transition-all active:scale-95"
          >
            <Download size={18} /> PNG로 저장하기
          </button>
        </div>
      </aside>

      {/* Canvas Area */}
      <main className="flex-1 relative bg-slate-100 overflow-hidden" ref={containerRef}>
        <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm pointer-events-none text-xs font-semibold text-slate-500 uppercase tracking-tighter">
          Canvas View
        </div>

        <svg className="w-full h-full cursor-crosshair" ref={svgRef} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="21" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;
            return (
              <line
                key={edge.id}
                x1={sourceNode.x} y1={sourceNode.y}
                x2={targetNode.x} y2={targetNode.y}
                stroke={edge.type === 'directed' ? "#6366f1" : "#94a3b8"}
                strokeWidth="2"
                markerEnd={edge.type === 'directed' ? "url(#arrowhead)" : ""}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onMouseDown={handleMouseDown(node.id)} className="cursor-grab active:cursor-grabbing group">
              <circle r="22" fill="white" stroke={draggingNodeId === node.id ? "#4f46e5" : "#e2e8f0"} strokeWidth="3" />
              <text textAnchor="middle" dy=".3em" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#334155', pointerEvents: 'none', userSelect: 'none' }}>
                {node.label}
              </text>
              <foreignObject x="15" y="-30" width="20" height="20" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-sm">
                  <Trash2 size={10} />
                </button>
              </foreignObject>
            </g>
          ))}
        </svg>
      </main>
    </div>
  );
};

export default App;