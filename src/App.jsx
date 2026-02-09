import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Share2, Circle, MousePointer2, ArrowRight, Minus, Download, Crop, X, Check } from 'lucide-react';

const App = () => {
  // State for Graph Data
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Sidebar Inputs
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');

  const [edgeType, setEdgeType] = useState('directed');
  const [edgeWeight, setEdgeWeight] = useState('');
  const [useWeight, setUseWeight] = useState(false);

  // Crop State
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState(null); // null, 'nw', 'ne', 'sw', 'se'
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialCropRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

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
      weight: useWeight ? (Number(edgeWeight) || 1) : null,
    };
    setEdges([...edges, newEdge]);
    setEdgeSource('');
    setEdgeTarget('');
    setEdgeWeight('');
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

  // Export to PNG with Crop
  const startCropMode = () => {
    let box;

    if (nodes.length === 0) {
      // Default to container size or 800x600 if no nodes
      const w = containerRef.current ? containerRef.current.clientWidth : 800;
      const h = containerRef.current ? containerRef.current.clientHeight : 600;
      box = { x: 0, y: 0, width: w, height: h };
    } else {
      // Calculate bounding box of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
      });

      // Add padding
      const padding = 50;
      box = {
        x: minX - padding,
        y: minY - padding,
        width: (maxX - minX) + (padding * 2),
        height: (maxY - minY) + (padding * 2)
      };
    }

    // Ensure box has minimum dimensions
    box.width = Math.max(100, box.width);
    box.height = Math.max(100, box.height);

    setCropRect(box);
    setIsCropMode(true);
  };

  const cancelCrop = () => {
    setIsCropMode(false);
  };

  const confirmSavePNG = () => {
    if (!svgRef.current) return;

    // Clone and cleanup SVG
    const clone = svgRef.current.cloneNode(true);
    const foreignObjects = clone.querySelectorAll('foreignObject');
    foreignObjects.forEach(fo => fo.remove());

    const svgData = new XMLSerializer().serializeToString(clone);
    const canvas = document.createElement('canvas');

    // Set canvas size to crop size
    canvas.width = cropRect.width;
    canvas.height = cropRect.height;
    const ctx = canvas.getContext('2d');

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Draw the image shifted by crop coordinates
      ctx.drawImage(img, -cropRect.x, -cropRect.y);

      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'graph-export-cropped.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setIsCropMode(false);
    };
    img.src = url;
  };

  // Crop Interaction Handlers
  const handleCropMouseDown = (e, handle = null) => {
    e.stopPropagation();
    e.preventDefault();

    if (handle) {
      setResizeHandle(handle);
    } else {
      setIsDraggingCrop(true);
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialCropRectRef.current = { ...cropRect };
  };

  const handleCropMouseMove = (e) => {
    if (!isDraggingCrop && !resizeHandle) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const init = initialCropRectRef.current;

    if (isDraggingCrop) {
      setCropRect({
        ...init,
        x: init.x + dx,
        y: init.y + dy
      });
    } else if (resizeHandle) {
      let newRect = { ...init };

      if (resizeHandle.includes('e')) newRect.width = Math.max(50, init.width + dx);
      if (resizeHandle.includes('w')) {
        const w = Math.max(50, init.width - dx);
        newRect.x = init.x + (init.width - w);
        newRect.width = w;
      }
      if (resizeHandle.includes('s')) newRect.height = Math.max(50, init.height + dy);
      if (resizeHandle.includes('n')) {
        const h = Math.max(50, init.height - dy);
        newRect.y = init.y + (init.height - h);
        newRect.height = h;
      }

      setCropRect(newRect);
    }
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
    setResizeHandle(null);
  };

  // Attach global mouse listeners for crop
  useEffect(() => {
    if (isCropMode && (isDraggingCrop || resizeHandle)) {
      window.addEventListener('mousemove', handleCropMouseMove);
      window.addEventListener('mouseup', handleCropMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleCropMouseMove);
      window.removeEventListener('mouseup', handleCropMouseUp);
    };
  }, [isCropMode, isDraggingCrop, resizeHandle]);

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

              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  id="useWeight"
                  checked={useWeight}
                  onChange={(e) => setUseWeight(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="useWeight" className="text-sm text-slate-600 cursor-pointer select-none">가중치 사용</label>
              </div>

              {useWeight && (
                <input
                  type="number"
                  placeholder="가중치 (기본: 1)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white"
                  value={edgeWeight}
                  onChange={(e) => setEdgeWeight(e.target.value)}
                />
              )}

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
                      {edge.weight != null && <span className="text-slate-400 ml-1">(w: {edge.weight})</span>}
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
            onClick={startCropMode}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 shadow-sm transition-all active:scale-95"
          >
            <Crop size={18} /> 저장
          </button>
        </div>
      </aside>

      {/* Canvas Area */}
      <main className="flex-1 relative bg-slate-100 overflow-hidden" ref={containerRef}>
        <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm pointer-events-none text-xs font-semibold text-slate-500 uppercase tracking-tighter">
          Canvas View
        </div>

        {/* Crop Overlay */}
        {isCropMode && (
          <div className="absolute inset-0 z-30 bg-black/40 overflow-hidden">
            <div
              style={{
                position: 'absolute',
                left: cropRect.x,
                top: cropRect.y,
                width: cropRect.width,
                height: cropRect.height,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
              }}
              className="border-2 border-indigo-500 cursor-move group"
              onMouseDown={(e) => handleCropMouseDown(e)}
            >
              {/* Resize Handles */}
              {/* NW */}
              <div
                className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-indigo-500 cursor-nw-resize"
                onMouseDown={(e) => handleCropMouseDown(e, 'nw')}
              />
              {/* NE */}
              <div
                className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-indigo-500 cursor-ne-resize"
                onMouseDown={(e) => handleCropMouseDown(e, 'ne')}
              />
              {/* SW */}
              <div
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-indigo-500 cursor-sw-resize"
                onMouseDown={(e) => handleCropMouseDown(e, 'sw')}
              />
              {/* SE */}
              <div
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-indigo-500 cursor-se-resize"
                onMouseDown={(e) => handleCropMouseDown(e, 'se')}
              />

              {/* Action Buttons */}
              <div className="absolute -top-12 left-0 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); confirmSavePNG(); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md shadow-lg text-xs font-bold hover:bg-indigo-700 transition-colors pointer-events-auto"
                >
                  <Check size={14} /> 저장
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); cancelCrop(); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-md shadow-lg text-xs font-bold hover:bg-slate-50 transition-colors pointer-events-auto"
                >
                  <X size={14} /> 취소
                </button>
              </div>
            </div>
          </div>
        )}

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

            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;

            return (
              <g key={edge.id}>
                <line
                  x1={sourceNode.x} y1={sourceNode.y}
                  x2={targetNode.x} y2={targetNode.y}
                  stroke={edge.type === 'directed' ? "#6366f1" : "#94a3b8"}
                  strokeWidth="2"
                  markerEnd={edge.type === 'directed' ? "url(#arrowhead)" : ""}
                />
                {edge.weight != null && (
                  <>
                    <circle cx={midX} cy={midY} r="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <text
                      x={midX}
                      y={midY}
                      dy=".3em"
                      textAnchor="middle"
                      style={{ fontSize: '10px', fill: '#334155', fontWeight: 'bold', userSelect: 'none' }}
                    >
                      {edge.weight}
                    </text>
                  </>
                )}
              </g>
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