import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { generateMindMap } from '../../services/aiService';
import AiLoadingState from '../common/AiLoadingState';
import { FiX, FiRotateCw, FiShare2 } from 'react-icons/fi';

const LEVEL_COLORS = [
  { bg: 'linear-gradient(135deg, #6366f1, #a855f7)', border: '#a855f7', text: '#fff', glow: 'rgba(168,85,247,0.35)' },
  { bg: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: '#6366f1', text: '#fff', glow: 'rgba(99,102,241,0.25)' },
  { bg: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: '#3b82f6', text: '#fff', glow: 'rgba(59,130,246,0.25)' },
  { bg: 'linear-gradient(135deg, #10b981, #06b6d4)', border: '#06b6d4', text: '#fff', glow: 'rgba(6,182,212,0.25)' },
  { bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: '#f59e0b', text: '#fff', glow: 'rgba(245,158,11,0.25)' },
];

const getColorForDepth = (depth) => LEVEL_COLORS[Math.min(depth, LEVEL_COLORS.length - 1)];

const MindMapNode = ({ data, id }) => {
  const depth = data.depth ?? 0;
  const isRoot = depth === 0;
  const colors = getColorForDepth(depth);

  return (
    <div
      style={{
        padding: isRoot ? '16px 32px' : '10px 22px',
        borderRadius: isRoot ? '20px' : '14px',
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        boxShadow: `0 4px 20px ${colors.glow}, 0 1px 4px rgba(0,0,0,0.3)`,
        color: colors.text,
        fontSize: isRoot ? '16px' : '13px',
        fontWeight: isRoot ? 700 : 600,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        letterSpacing: isRoot ? '0.03em' : '0.01em',
        textAlign: 'center',
        maxWidth: isRoot ? '240px' : '190px',
        lineHeight: 1.45,
        cursor: 'grab',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
      {data.label}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
    </div>
  );
};

const nodeTypes = { mindmapNode: MindMapNode };

const MINDMAP_AI_MESSAGES = [
  'Mapping concepts from your notes...',
  'Building graph edges with LangGraph...',
  'Vectorizing knowledge graph...',
  'Consulting community RAG...',
  'Laying out nodes for clarity...',
];

function computeDepths(nodes, edges) {
  const childMap = {};
  const parentSet = new Set();

  edges.forEach((e) => {
    if (!childMap[e.source]) childMap[e.source] = [];
    childMap[e.source].push(e.target);
    parentSet.add(e.target);
  });

  const roots = nodes.filter((n) => !parentSet.has(n.id));
  const depthMap = {};

  const bfs = (startIds, depth) => {
    const next = [];
    startIds.forEach((id) => {
      if (depthMap[id] !== undefined) return;
      depthMap[id] = depth;
      (childMap[id] || []).forEach((childId) => next.push(childId));
    });
    if (next.length) bfs(next, depth + 1);
  };

  bfs(roots.map((n) => n.id), 0);

  nodes.forEach((n) => {
    if (depthMap[n.id] === undefined) depthMap[n.id] = 1;
  });

  return depthMap;
}

const MindMapViewer = ({ topicId, onClose, refreshUser }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMindMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateMindMap(topicId);

      const depthMap = computeDepths(data.nodes, data.edges);

      const styledNodes = data.nodes.map((node) => ({
        ...node,
        type: 'mindmapNode',
        draggable: true,
        data: {
          ...node.data,
          depth: depthMap[node.id] ?? 0,
        },
      }));

      const styledEdges = data.edges.map((edge) => ({
        ...edge,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: 'url(#edge-gradient)',
          strokeWidth: 2.5,
        },
      }));

      setNodes(styledNodes);
      setEdges(styledEdges);

      if (refreshUser) refreshUser();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.response?.data?.detail || '';

      if (status === 403) {
        setError('Not enough credits to generate a mind map. Upload more notes to earn credits.');
      } else if (status === 429 || status === 500) {
        setError('AI is cooling down. Please wait 30 seconds and try again.');
      } else if (status === 404) {
        setError(msg || 'No notes found for this topic. Upload notes first to generate a mind map.');
      } else if (!err.isRateLimit) {
        setError(msg || 'Failed to generate mind map. Please try again.');
      } else {
        setError('AI is cooling down. Please wait 30 seconds and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchMindMap();
  }, [fetchMindMap]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <div className="glass-card border border-purple-500/20 overflow-hidden animate-fadeInUp">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-purple-500/5">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <FiShare2 className="text-purple-400" /> Visual Knowledge Graph
        </h2>
        <div className="flex items-center gap-3">
          {!loading && !error && (
            <button
              onClick={fetchMindMap}
              className="text-text-muted hover:text-purple-400 transition-colors flex items-center gap-1.5 text-sm"
            >
              <FiRotateCw size={14} /> Regenerate (2 ⚡)
            </button>
          )}
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <FiX size={18} />
          </button>
        </div>
      </div>

      {!loading && !error && nodes.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5 flex items-center gap-4 text-[11px] text-text-muted overflow-x-auto">
          <span className="font-medium text-text-muted/70 shrink-0">Depth:</span>
          {['Root', 'Branch', 'Sub-Branch', 'Detail'].map((label, i) => (
            <span key={i} className="flex items-center gap-1.5 shrink-0">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: getColorForDepth(i).bg,
                  border: `1.5px solid ${getColorForDepth(i).border}`,
                  display: 'inline-block',
                }}
              />
              {label}
            </span>
          ))}
        </div>
      )}

      <div
        className="mindmap-canvas"
        style={{
          height: '600px',
          maxHeight: '75vh',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.08) 0%, rgba(15,15,35,0) 70%)',
        }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center px-6">
            <AiLoadingState
              isLoading={loading}
              messages={MINDMAP_AI_MESSAGES}
              label="Generating mind map"
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
            <p className="text-danger text-center">{error}</p>
            <button onClick={fetchMindMap} className="btn-gradient text-sm flex items-center gap-2">
              <FiRotateCw size={14} /> Retry
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            proOptions={proOptions}
            fitView
            fitViewOptions={{ padding: 0.4, maxZoom: 1.1 }}
            minZoom={0.15}
            maxZoom={2.5}
            style={{ width: '100%', height: '100%' }}
          >
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
                </linearGradient>
              </defs>
            </svg>
            <Background
              color="rgba(168,85,247,0.06)"
              gap={28}
              size={1}
              variant="dots"
            />
            <Controls
              position="bottom-right"
              showInteractive={false}
              className="mindmap-controls"
            />
          </ReactFlow>
        )}
      </div>

      <style>{`
        .mindmap-canvas .react-flow__node {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          font-size: inherit !important;
          color: inherit !important;
          width: auto !important;
        }
        .mindmap-canvas .react-flow__node.selected {
          box-shadow: none !important;
        }
        .mindmap-canvas .react-flow__node:focus,
        .mindmap-canvas .react-flow__node:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        .mindmap-canvas .react-flow__edge-path {
          stroke-linecap: round;
        }
        .mindmap-canvas .react-flow__edge.animated path {
          animation: mindmap-dash 1.5s linear infinite;
        }
        @keyframes mindmap-dash {
          to { stroke-dashoffset: -12; }
        }

        .mindmap-controls {
          background: rgba(15,15,35,0.85) !important;
          backdrop-filter: blur(12px) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          overflow: hidden !important;
        }
        .mindmap-controls button {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          color: rgba(255,255,255,0.6) !important;
          width: 32px !important;
          height: 32px !important;
        }
        .mindmap-controls button:hover {
          background: rgba(255,255,255,0.08) !important;
          color: #fff !important;
        }
        .mindmap-controls button svg {
          fill: currentColor !important;
        }
        .mindmap-controls button:last-child {
          border-bottom: none !important;
        }

        .react-flow__attribution { display: none !important; }
      `}</style>
    </div>
  );
};

export default MindMapViewer;
