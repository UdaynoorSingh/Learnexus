import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { academicCatalogParams } from '../utils/academicCatalog';
import api from '../services/api';
import DigitalGraph3D from '../components/reactbits/DigitalGraph3D';
import { FiChevronLeft, FiLayers, FiBookOpen, FiFileText, FiGrid, FiArrowRight, FiInfo } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const NODE_COLORS = {
  root: '#ffffff',
  degree: '#7c3aed',   
  branch: '#3b82f6',   
  semester: '#f59e0b', 
  subject: '#ef4444',
  topic: '#10b981',    
};

const KnowledgeGraphPage = () => {
  const { user } = useAuth();
  const catalogParams = useMemo(() => academicCatalogParams(user), [user]);
  const navigate = useNavigate();
  const fgRef = useRef();

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [activePath, setActivePath] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initGraph();
  }, [catalogParams]);

  const initGraph = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/degrees', { params: catalogParams });
      const degrees = res.data;

      const rootNode = { id: 'root', name: user?.name ? `${user.name}'s Universe` : 'My Learning Universe', type: 'root', color: NODE_COLORS.root, val: 2 };
      const nodes = [rootNode];
      const links = [];

      degrees.forEach(deg => {
        const degNodeId = `degree-${deg.id}`;
        nodes.push({ id: degNodeId, name: deg.name, type: 'degree', rawId: deg.id, color: NODE_COLORS.degree, val: 1.5 });
        links.push({ source: 'root', target: degNodeId, weight: 0.5 });
      });

      setGraphData({ nodes, links });
      setActivePath([rootNode]);

      if (degrees.length === 1) {
        handleNodeClick(nodes[1]);
      }
    } catch (err) {
      console.error('Failed to init graph', err);
    } finally {
      setIsLoading(false);
    }
  };

  const expandNode = async (node) => {
    setIsLoading(true);

    try {
      let endpoint = '';
      let childrenType = '';
      
      if (node.type === 'root') {
        endpoint = `/degrees`;
        childrenType = 'degree';
      } else if (node.type === 'degree') {
        endpoint = `/degrees/${node.rawId}/branches`;
        childrenType = 'branch';
      } else if (node.type === 'branch') {
        endpoint = `/branches/${node.rawId}/semesters`;
        childrenType = 'semester';
      } else if (node.type === 'semester') {
        endpoint = `/semesters/${node.rawId}/subjects`;
        childrenType = 'subject';
      } else if (node.type === 'subject') {
        endpoint = `/subjects/${node.rawId}/topics`;
        childrenType = 'topic';
      } else {
        setIsLoading(false);
        return; 
      }

      const res = await api.get(endpoint, { params: catalogParams });
      const children = res.data;

      const pathIndex = activePath.findIndex(p => p.id === node.id);
      let newPath = [];
      if (pathIndex >= 0) {
        newPath = activePath.slice(0, pathIndex + 1);
      } else {
        newPath = [...activePath, node];
      }
      setActivePath(newPath);

      const newNodes = [...newPath];
      const newLinks = [];

      for (let i = 0; i < newPath.length - 1; i++) {
        newLinks.push({ source: newPath[i].id, target: newPath[i+1].id, weight: 0.8 });
      }

      children.forEach(child => {
        const childId = `${childrenType}-${child.id}`;
        newNodes.push({
          id: childId,
          name: childrenType === 'semester' ? `Sem ${child.number}` : child.name,
          type: childrenType,
          rawId: child.id,
          color: NODE_COLORS[childrenType] || '#ffffff',
          val: childrenType === 'topic' ? 0.8 : 1.2
        });
        newLinks.push({ source: node.id, target: childId, weight: 0.3 });
      });

      setGraphData({ nodes: newNodes, links: newLinks });

      setTimeout(() => {
        if (fgRef.current) {
          const distance = 80;
          const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
          fgRef.current.cameraPosition(
            { x: (node.x||0) * distRatio, y: (node.y||0) * distRatio, z: (node.z||0) * distRatio },
            node,
            1500
          );
        }
      }, 300);

    } catch (err) {
      console.error(`Failed to expand ${node.type}`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    
    if (fgRef.current) {
      const distance = 120;
      const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
      fgRef.current.cameraPosition(
        { x: (node.x||0) * distRatio, y: (node.y||0) * distRatio, z: (node.z||0) * distRatio }, 
        node, 
        1000  
      );
    }

    if (node.type !== 'topic') {
      expandNode(node);
    }
  }, [activePath, catalogParams]);

  const getIconForType = (type) => {
    switch (type) {
      case 'degree': return <FiLayers className="text-purple-500" />;
      case 'branch': return <FiGrid className="text-blue-500" />;
      case 'semester': return <FiGrid className="text-orange-500" />;
      case 'subject': return <FiBookOpen className="text-red-500" />;
      case 'topic': return <FiFileText className="text-green-500" />;
      default: return <FiInfo className="text-slate-400" />;
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-900 rounded-2xl border border-black/10 shadow-2xl">
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-2 pr-4 rounded-full text-white shadow-lg">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <FiChevronLeft size={18} />
          </button>
          <div className="font-['Outfit'] font-bold tracking-wide">Curriculum Universe</div>
        </div>

        {isLoading && (
          <div className="pointer-events-auto bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-white text-xs font-semibold tracking-widest uppercase flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Expanding...
          </div>
        )}
      </div>

      <div className="absolute inset-0 w-full h-full">
        {graphData.nodes.length > 0 && (
          <DigitalGraph3D
            ref={fgRef}
            graph={graphData}
            onNodeClick={handleNodeClick}
            speed={0} 
            cameraDistance={6.0}
            pointSize={30}
          />
        )}
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-20 right-6 z-20 w-80 bg-white/95 backdrop-blur-xl border border-black/10 p-6 rounded-3xl shadow-2xl"
          >
            <button 
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl shadow-sm">
                {getIconForType(selectedNode.type)}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  {selectedNode.type === 'root' ? 'Start' : selectedNode.type}
                </p>
                <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-2">
                  {selectedNode.name}
                </h3>
              </div>
            </div>

            <div className="text-sm text-slate-600 mb-6 leading-relaxed">
              {selectedNode.type === 'root' 
                ? "Your learning journey starts here. Click the nodes to expand your curriculum tree."
                : selectedNode.type === 'topic'
                ? "Dive into this specific topic to read notes, generate flashcards, and test your knowledge."
                : `Expand this ${selectedNode.type} to discover its internal structure and components.`}
            </div>

            {selectedNode.type === 'topic' ? (
              <button 
                onClick={() => navigate(`/topic/${selectedNode.rawId}`)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-violet-500/25 transition-all active:scale-95"
              >
                Go to Topic <FiArrowRight size={16} />
              </button>
            ) : selectedNode.type !== 'root' ? (
              <button 
                onClick={() => expandNode(selectedNode)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Focus on this Node
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 left-6 z-10 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Graph Legend</p>
        {Object.entries(NODE_COLORS).filter(([k]) => k !== 'root').map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: color }} />
            <span className="text-xs font-medium text-white/80 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;
