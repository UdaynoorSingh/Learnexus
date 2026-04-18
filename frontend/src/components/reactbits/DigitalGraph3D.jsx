import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

const generateRandomGraph = (nodeCount = 72, linksPerNode = 3) => {
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: String(i),
      name: `Node ${i}`,
      color: ['#ef4444', '#f97316', '#0f172a'][Math.floor(Math.random() * 3)],
    });
  }

  const links = [];
  for (let i = 0; i < nodeCount; i++) {
    const numLinks = Math.floor(Math.random() * linksPerNode) + 1;
    for (let j = 0; j < numLinks; j++) {
      const target = Math.floor(Math.random() * nodeCount);
      if (target !== i) {
        links.push({
          source: String(i),
          target: String(target),
          weight: Math.random() * 0.5 + 0.5,
        });
      }
    }
  }

  return { nodes, edges: links };
};

const DigitalGraph3D = ({
  graph = null,
  nodeCount = 72,
  spread = 1.0,
  linksPerNode = 3,
  maxLinkDistance = 0.78,
  pointSize = 26,
  wobble = 0.22,
  speed = 0.7,
  cameraDistance = 4.0,
  palette = ['#ef4444', '#f97316', '#0f172a'],
  pixelRatio = 1,
  className = '',
}) => {
  const containerRef = useRef(null);
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Generate fallback graph if none provided
  const processedGraph = useMemo(() => {
    let data = { nodes: [], links: [] };
    if (graph?.nodes && graph?.nodes.length >= 2) {
      data.nodes = graph.nodes;
      data.links = (graph.edges || []).map(e => ({
        source: e.source != null ? String(e.source) : '',
        target: e.target != null ? String(e.target) : '',
        weight: e.weight || 0.55
      }));
    } else {
      const randomData = generateRandomGraph(nodeCount, linksPerNode);
      data.nodes = randomData.nodes;
      data.links = randomData.edges;
    }
    
    // Assign random palette color if node doesn't have one
    data.nodes.forEach(node => {
      if (!node.color) {
        node.color = palette[Math.floor(Math.random() * palette.length)];
      }
    });

    return data;
  }, [graph, nodeCount, linksPerNode, palette]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set physics and rotation
  useEffect(() => {
    if (fgRef.current) {
      // Adjust the d3Force charge to -200 so the nodes cluster closer together
      fgRef.current.d3Force('charge').strength(-200);

      // We scale camera distance based on the old cameraDistance prop
      const dist = cameraDistance * 100;

      let angle = 0;
      let animationFrame;
      const animate = () => {
        angle += 0.002 * speed;
        if (fgRef.current) {
          fgRef.current.cameraPosition({
            x: dist * Math.sin(angle),
            z: dist * Math.cos(angle)
          });
        }
        animationFrame = requestAnimationFrame(animate);
      };
      
      animate();

      return () => {
        cancelAnimationFrame(animationFrame);
      };
    }
  }, [processedGraph, cameraDistance, speed]);

  const renderNode = (node) => {
    // Implement nodeCanvasObject style text rendering directly on a 2d canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const cx = 128;
    const cy = 128;
    const r = pointSize * 1.5; // Scale according to pointSize

    // Custom Three.js Sprite that uses a circular gradient (glowing neon pulse)
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const color = node.color || '#0ea5e9'; 
    gradient.addColorStop(0, '#ffffff'); // Bright core
    gradient.addColorStop(0.3, color); // Neon color
    gradient.addColorStop(1, 'transparent'); // Fade out

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fill();

    // Render the name of the 'Degree' or 'Course' in a clean JetBrains Mono font just above the node
    const label = node.name || node.title || node.id || 'Node';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Add text shadow for clarity
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, cx, cy - r + 10); 

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      depthWrite: false, 
      blending: THREE.AdditiveBlending 
    });
    
    const sprite = new THREE.Sprite(material);
    // Base sprite scale on spread/distance
    sprite.scale.set(60, 60, 1);
    
    return sprite;
  };

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }}>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={processedGraph}
          nodeThreeObject={renderNode}
          // Increase the linkWidth to 1.5
          linkWidth={1.5}
          linkColor={() => 'rgba(200, 200, 255, 0.25)'}
          // Add linkDirectionalParticles(2) so small light pulses constantly travel along the lines
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.015}
          linkDirectionalParticleColor={() => '#ffffff'}
          backgroundColor="rgba(0,0,0,0)" // Transparent background since it's an overlay
          showNavInfo={false}
        />
      )}
    </div>
  );
};

export default DigitalGraph3D;
