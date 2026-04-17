/* ────────────────────────────────────────────────────────────
  DigitalGraph3D — lightweight 3D node/edge graph (OGL)
  Purpose: “HD digital graph” feel for dashboards without adding deps.
  ──────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { Renderer, Camera, Geometry, Program, Mesh, Transform } from 'ogl';

const hexToRgb = (hex) => {
  const h = hex.replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(full, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const makeSpherePoints = (count) => {
  const pts = [];
  for (let i = 0; i < count; i++) {
    let x, y, z, len;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      len = x * x + y * y + z * z;
    } while (len > 1 || len === 0);
    const r = Math.cbrt(Math.random());
    pts.push([x * r, y * r, z * r]);
  }
  return pts;
};

const nearestLinks = (pts, k = 3, maxDist = 0.8) => {
  const links = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay, az] = pts[i];
    const dists = [];
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      const [bx, by, bz] = pts[j];
      const dx = ax - bx;
      const dy = ay - by;
      const dz = az - bz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      dists.push([d, j]);
    }
    dists.sort((a, b) => a[0] - b[0]);
    for (let n = 0; n < k; n++) {
      const [d, j] = dists[n] || [];
      if (!j && j !== 0) continue;
      if (d > maxDist) continue;
      // store undirected without duplicates
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      const key = `${a}-${b}`;
      links.push([a, b, d, key]);
    }
  }
  const seen = new Set();
  return links.filter((l) => {
    if (seen.has(l[3])) return false;
    seen.add(l[3]);
    return true;
  });
};

const pointsVertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uWobble;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = random;
    vColor = color;

    vec3 pos = position * uSpread;
    float t = uTime;
    pos.x += sin(t * 1.2 + random.x * 6.28) * uWobble * (0.6 + random.z);
    pos.y += cos(t * 1.0 + random.y * 6.28) * uWobble * (0.6 + random.w);
    pos.z += sin(t * 0.9 + random.z * 6.28) * uWobble * (0.6 + random.x);

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    vec4 mvPos = viewMatrix * mPos;
    gl_PointSize = uBaseSize / max(1.0, length(mvPos.xyz));
    gl_Position = projectionMatrix * mvPos;
  }
`;

const pointsFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    float circle = smoothstep(0.5, 0.35, d);
    float glow = smoothstep(0.5, 0.0, d) * 0.35;
    float pulse = 0.85 + 0.15 * sin(uTime * 1.6 + vRandom.y * 6.28);
    vec3 col = vColor * pulse;
    gl_FragColor = vec4(col, circle * 0.85 + glow);
  }
`;

const linesVertex = /* glsl */ `
  attribute vec3 position;
  attribute vec3 color;
  attribute float strength;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uWobble;

  varying vec3 vColor;
  varying float vStrength;

  void main() {
    vColor = color;
    vStrength = strength;

    vec3 pos = position;
    float t = uTime;
    // mild wave along edges
    pos.x += sin(t * 1.1 + position.y * 2.0) * uWobble * 0.08;
    pos.y += cos(t * 1.0 + position.x * 2.0) * uWobble * 0.06;

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewMatrix * mPos;
  }
`;

const linesFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying vec3 vColor;
  varying float vStrength;

  void main() {
    float pulse = 0.6 + 0.4 * sin(uTime * 1.2 + vStrength * 6.28);
    float a = 0.18 + 0.22 * pulse;
    gl_FragColor = vec4(vColor, a * vStrength);
  }
`;

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ dpr: pixelRatio, alpha: true, depth: false });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 22 });
    camera.position.set(0, 0, cameraDistance);

    const scene = new Transform();

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener('resize', resize, false);
    resize();

    const graphNodes = Array.isArray(graph?.nodes) ? graph.nodes : null;
    const graphEdges = Array.isArray(graph?.edges) ? graph.edges : null;

    const effectiveNodeCount = graphNodes?.length >= 2 ? graphNodes.length : nodeCount;
    const pts = makeSpherePoints(effectiveNodeCount);

    let links = null;
    if (graphNodes?.length >= 2 && graphEdges?.length) {
      const idToIndex = new Map();
      graphNodes.forEach((n, idx) => {
        const id = n?.id != null ? String(n.id) : null;
        if (id) idToIndex.set(id, idx);
      });
      const out = [];
      const seen = new Set();
      for (const e of graphEdges) {
        const aId = e?.source != null ? String(e.source) : null;
        const bId = e?.target != null ? String(e.target) : null;
        const a = aId != null ? idToIndex.get(aId) : undefined;
        const b = bId != null ? idToIndex.get(bId) : undefined;
        if (a == null || b == null || a === b) continue;
        const x = Math.min(a, b);
        const y = Math.max(a, b);
        const key = `${x}-${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const w = clamp(Number(e?.weight ?? 0.55) || 0.55, 0.1, 1.0);
        const dist = maxLinkDistance * (1.0 - w);
        out.push([x, y, dist, key]);
      }
      links = out;
    }
    if (!links) links = nearestLinks(pts, linksPerNode, maxLinkDistance);

    // Points geometry
    const positions = new Float32Array(effectiveNodeCount * 3);
    const randoms = new Float32Array(effectiveNodeCount * 4);
    const colors = new Float32Array(effectiveNodeCount * 3);
    for (let i = 0; i < effectiveNodeCount; i++) {
      positions.set(pts[i], i * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      colors.set(hexToRgb(pick(palette)), i * 3);
    }

    const pointsGeo = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors },
    });

    const pointsProg = new Program(gl, {
      vertex: pointsVertex,
      fragment: pointsFragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: spread },
        uBaseSize: { value: pointSize * pixelRatio },
        uWobble: { value: wobble },
      },
      transparent: true,
      depthTest: false,
    });

    const pointsMesh = new Mesh(gl, { mode: gl.POINTS, geometry: pointsGeo, program: pointsProg });
    pointsMesh.setParent(scene);

    // Lines geometry (two vertices per link)
    const segCount = links.length * 2;
    const linePos = new Float32Array(segCount * 3);
    const lineCol = new Float32Array(segCount * 3);
    const lineStrength = new Float32Array(segCount);

    for (let i = 0; i < links.length; i++) {
      const [a, b, dist] = links[i];
      const s = clamp(1.0 - dist / maxLinkDistance, 0.25, 1.0);
      const col = hexToRgb(pick(palette));
      linePos.set(pts[a], (i * 2 + 0) * 3);
      linePos.set(pts[b], (i * 2 + 1) * 3);
      lineCol.set(col, (i * 2 + 0) * 3);
      lineCol.set(col, (i * 2 + 1) * 3);
      lineStrength[i * 2 + 0] = s;
      lineStrength[i * 2 + 1] = s;
    }

    const linesGeo = new Geometry(gl, {
      position: { size: 3, data: linePos },
      color: { size: 3, data: lineCol },
      strength: { size: 1, data: lineStrength },
    });

    const linesProg = new Program(gl, {
      vertex: linesVertex,
      fragment: linesFragment,
      uniforms: {
        uTime: { value: 0 },
        uWobble: { value: wobble },
      },
      transparent: true,
      depthTest: false,
    });

    const linesMesh = new Mesh(gl, { mode: gl.LINES, geometry: linesGeo, program: linesProg });
    linesMesh.setParent(scene);

    let raf = 0;
    let last = performance.now();
    let time = 0;

    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      const dt = t - last;
      last = t;
      time += dt * 0.001 * speed;

      pointsProg.uniforms.uTime.value = time;
      linesProg.uniforms.uTime.value = time;

      scene.rotation.y = time * 0.25;
      scene.rotation.x = Math.sin(time * 0.6) * 0.18;

      renderer.render({ scene, camera });
    };

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
    };
  }, [graph, nodeCount, spread, linksPerNode, maxLinkDistance, pointSize, wobble, speed, cameraDistance, pixelRatio, palette]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />;
};

export default DigitalGraph3D;

