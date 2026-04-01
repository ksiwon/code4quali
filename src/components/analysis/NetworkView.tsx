import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';

import type { NVNode, NVNodeType } from '../../types';

interface DraftEdge {
  fromId: string;
  x1: number; y1: number;
  x2: number; y2: number;
}

// ─── Styled Components ────────────────────────────────────────────────────────

const Root = styled.div`
  display: flex; flex: 1; overflow: hidden;
  background: #EBEBEB; position: relative; user-select: none;

  .edge-group:hover .edge-line {
    stroke: var(--accent);
    stroke-width: 3;
    stroke-dasharray: none;
  }
  .edge-group:hover .edge-del {
    opacity: 1 !important;
  }
`;

const Sidebar = styled.div`
  width: 230px; flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--surface);
  display: flex; flex-direction: column; overflow: hidden; z-index: 2;
`;

const SidebarScroll = styled.div`flex: 1; overflow-y: auto; padding: 6px 8px;`;

const CodePill = styled.div<{ $color: string; $dim?: boolean }>`
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px; margin-bottom: 4px;
  cursor: grab;
  border: 2px solid ${p => p.$color};
  background: ${p => p.$color};
  font-size: 11.5px; font-weight: 700;
  color: white;
  opacity: ${p => p.$dim ? 0.4 : 1};
  transition: opacity 0.12s, transform 0.1s, box-shadow 0.1s;
  box-shadow: 0 2px 6px ${p => p.$color}66;
  &:hover { transform: translateX(2px) scale(1.02); box-shadow: 0 4px 12px ${p => p.$color}88; }
  &:active { cursor: grabbing; }
`;

const GroupPill = styled.div<{ $color: string; $dim?: boolean }>`
  display: flex; align-items: flex-start; gap: 8px;
  padding: 7px 10px; border-radius: 8px; margin-bottom: 4px;
  cursor: grab;
  border: 2px solid ${p => p.$color};
  background: white;
  font-size: 11px; font-weight: 700;
  color: #222;
  opacity: ${p => p.$dim ? 0.4 : 1};
  transition: opacity 0.12s, transform 0.1s, box-shadow 0.1s;
  box-shadow: 0 2px 6px ${p => p.$color}44;
  &:hover { transform: translateX(2px); box-shadow: 0 4px 12px ${p => p.$color}66; background: ${p => p.$color}0D; }
  &:active { cursor: grabbing; }
`;

const QuotPill = styled.div<{ $color: string; $dim?: boolean }>`
  display: flex; align-items: flex-start; gap: 8px;
  padding: 7px 10px; border-radius: 6px; margin-bottom: 4px;
  cursor: grab;
  border-left: 3px solid ${p => p.$color};
  border-top: 1px solid ${p => p.$color}55;
  border-right: 1px solid ${p => p.$color}33;
  border-bottom: 1px solid ${p => p.$color}33;
  background: white;
  font-size: 11px; font-weight: 500;
  color: var(--text);
  opacity: ${p => p.$dim ? 0.4 : 1};
  transition: opacity 0.12s, transform 0.1s, box-shadow 0.1s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  &:hover { transform: translateX(2px); box-shadow: 0 3px 10px rgba(0,0,0,0.1); }
  &:active { cursor: grabbing; }
`;

const MemoPill = styled.button<{ $color: string }>`
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px; margin-bottom: 4px;
  cursor: grab;
  border: 1.5px dashed ${p => p.$color + 'CC'};
  background: ${p => p.$color}18;
  font-size: 11.5px; font-weight: 700;
  color: ${p => p.$color};
  transition: all 0.12s;
  &:hover { background: ${p => p.$color}30; border-style: solid; }
  &:active { cursor: grabbing; }
`;

const SbSearchArea = styled.div`
  padding: 12px 12px 8px;
  border-bottom: 1px solid var(--border);
`;
const SbSearch = styled.input`
  width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border);
  font-size: 11px; outline: none; background: var(--surface2); color: var(--text);
  margin-bottom: 8px;
`;
const SbAddGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
`;
const SbAddBtn = styled.button`
  font-size: 10.5px; font-weight: 600; padding: 5px 0; border-radius: 4px;
  background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border);
  &:hover { background: var(--text); color: white; border-color: var(--text); }
`;

const CanvasWrap = styled.div`flex: 1; position: relative; overflow: hidden;`;

const Toolbar = styled.div`
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 4px;
  background: white; border: 1px solid var(--border);
  border-radius: 10px; padding: 5px 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12); z-index: 10;
`;

const TBtn = styled.button<{ $danger?: boolean }>`
  font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px;
  background: ${p => p.$danger ? '#FEE2E2' : 'transparent'};
  color: ${p => p.$danger ? '#DC2626' : 'var(--text-secondary)'};
  white-space: nowrap;
  &:hover {
    background: ${p => p.$danger ? '#FECACA' : 'var(--surface2)'};
    color: ${p => p.$danger ? '#B91C1C' : 'var(--text)'};
  }
`;
const TDiv = styled.div`width: 1px; height: 18px; background: var(--border); flex-shrink: 0;`;
const TZoom = styled.span`font-size: 11px; color: var(--text-muted); min-width: 34px; text-align: center;`;

const EmptyHint = styled.div`
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  text-align: center; color: var(--text-muted); pointer-events: none;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const CODE_W = 240;
const CODE_H = 70;
const GROUP_W = 200;
const GROUP_H = 70;
const QUOT_W = 140;
const QUOT_H = 60;
const MEMO_W = 160;
const MEMO_H = 160;
const PORT_R = 7;
const MEMO_COLORS = ['#4A6FA5', '#61A87B', '#E07B54', '#9B59B6', '#E67E22'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;

const getNodeHeight = (node: NVNode) => {
  if (node.type === 'code') {
    let lines = 1;
    let cur = 0;
    for (let i = 0; i < node.label.length; i++) {
      cur += node.label.charCodeAt(i) > 255 ? 1 : 0.55;
      if (cur > 17) { lines++; cur = 0; }
    }
    return Math.max(node.height, 40 + lines * 18);
  }
  if (node.type === 'group') {
    let lines = 1;
    let cur = 0;
    for (let i = 0; i < node.label.length; i++) {
      cur += node.label.charCodeAt(i) > 255 ? 1 : 0.55;
      if (cur > 15) { lines++; cur = 0; }
    }
    return Math.max(node.height, 44 + lines * 17);
  }
  if (node.type === 'quotation') {
    let lines = 1;
    let cur = 0;
    for (let i = 0; i < node.label.length; i++) {
      cur += node.label.charCodeAt(i) > 255 ? 1 : 0.55;
      if (cur > 10.2) { lines++; cur = 0; }
    }
    return Math.max(node.height, 22 + lines * 15.5 + (node.subLabel ? 16 : 0));
  }
  if (node.type === 'memo') {
    let lines = 1;
    let cur = 0;
    for (let i = 0; i < node.label.length; i++) {
      cur += node.label.charCodeAt(i) > 255 ? 1 : 0.55;
      if (cur > 12.5) { lines++; cur = 0; }
    }
    return Math.max(node.height, 35 + lines * 17);
  }
  return node.height;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const NetworkView = () => {
  const { 
    codes, quotations, documents, codeGroups,
    networkNodes: nodes, networkEdges: edges,
    addNetworkNode, updateNetworkNode, deleteNetworkNode,
    addNetworkEdge, deleteNetworkEdge, setNetworkData,
  } = useStore();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draftEdge, setDraftEdge] = useState<DraftEdge | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Sidebar tab
  const [sideTab, setSideTab] = useState<'code' | 'group' | 'quotation' | 'memo'>('code');
  const [search, setSearch] = useState('');

  // Refs to avoid stale closures in pointer handlers
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const nodeDrag = useRef<{
    startPX: number; startPY: number; nodes: { id: string; startNX: number; startNY: number }[];
  } | null>(null);
  const panDrag = useRef<{ startPX: number; startPY: number; startPanX: number; startPanY: number } | null>(null);
  const portDrag = useRef<{ fromId: string } | null>(null);
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  const panRef = useRef(pan);
  useEffect(() => { panRef.current = pan; }, [pan]);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const edgesRef = useRef(edges);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // ─── Screen → Canvas coords ────────────────────────────────────────────────
  const s2c = useCallback((sx: number, sy: number) => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return { x: sx, y: sy };
    const r = wrap.getBoundingClientRect();
    return {
      x: (sx - r.left - panRef.current.x) / zoomRef.current,
      y: (sy - r.top - panRef.current.y) / zoomRef.current,
    };
  }, []);

  // ─── Ctrl+wheel zoom (non-passive) ────────────────────────────────────────
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(z => Math.min(3, Math.max(0.15, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);

  // ─── Delete key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        selectedIds.forEach(id => deleteNetworkNode(id));
        setSelectedIds([]);
      }
      if (e.key === 'Escape') { setSelectedIds([]); setDraftEdge(null); portDrag.current = null; }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedIds, deleteNetworkNode]);

  // ─── Drop onto canvas ────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nv-type') as NVNodeType;
    const sourceId = e.dataTransfer.getData('nv-id');
    const color = e.dataTransfer.getData('nv-color') || '#888';
    const label = e.dataTransfer.getData('nv-label') || '';
    const subLabel = e.dataTransfer.getData('nv-sublabel') || '';
    const pt = s2c(e.clientX, e.clientY);

    if (type === 'memo') {
      addNetworkNode({
        id: crypto.randomUUID(), type: 'memo', label: label || '새 메모',
        color, x: pt.x - MEMO_W / 2, y: pt.y - MEMO_H / 2, width: MEMO_W, height: MEMO_H, sourceId
      });
      return;
    }
    if (type === 'code') {
      if (sourceId && nodesRef.current.some(n => n.sourceId === sourceId)) return;
      addNetworkNode({
        id: crypto.randomUUID(), type: 'code', label, color,
        x: pt.x - CODE_W / 2, y: pt.y - CODE_H / 2,
        width: CODE_W, height: CODE_H, sourceId,
      });
      return;
    }
    if (type === 'group') {
      if (sourceId && nodesRef.current.some(n => n.sourceId === sourceId)) return;
      addNetworkNode({
        id: crypto.randomUUID(), type: 'group', label, color, subLabel,
        x: pt.x - GROUP_W / 2, y: pt.y - GROUP_H / 2,
        width: GROUP_W, height: GROUP_H, sourceId,
      });
      return;
    }
    if (type === 'quotation') {
      if (sourceId && nodesRef.current.some(n => n.sourceId === sourceId)) return;
      addNetworkNode({
        id: crypto.randomUUID(), type: 'quotation', label, color, subLabel,
        x: pt.x - QUOT_W / 2, y: pt.y - QUOT_H / 2,
        width: QUOT_W, height: QUOT_H, sourceId,
      });
    }
  }, [s2c, addNetworkNode]);

  const handleAddBlock = useCallback((type: NVNodeType) => {
    const pt = { x: panRef.current.x * -1 / zoomRef.current + 200, y: panRef.current.y * -1 / zoomRef.current + 150 };
    if (type === 'code') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'code', label: '새 코드', color: '#E07B54', x: pt.x, y: pt.y, width: CODE_W, height: CODE_H });
    } else if (type === 'group') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'group', label: '새 그룹', color: '#A3CF62', x: pt.x + 10, y: pt.y + 10, width: GROUP_W, height: GROUP_H });
    } else if (type === 'quotation') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'quotation', label: '새 인용', color: '#61D9A5', x: pt.x + 20, y: pt.y + 20, width: QUOT_W, height: QUOT_H });
    } else {
      const color = MEMO_COLORS[Math.floor(Math.random() * MEMO_COLORS.length)];
      addNetworkNode({ id: crypto.randomUUID(), type: 'memo', label: '새 메모', color, x: pt.x + 40, y: pt.y + 40, width: MEMO_W, height: MEMO_H });
    }
  }, [addNetworkNode]);

  // ─── Node pointer down ────────────────────────────────────────────────────
  const handleNodePD = useCallback((e: React.PointerEvent, nodeId: string) => {
    if ((e.target as SVGElement).dataset.port) return;
    if ((e.target as SVGElement).dataset.del) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);

    let newSel = selectedIdsRef.current;
    if (e.shiftKey) {
      if (newSel.includes(nodeId)) {
        newSel = newSel.filter(id => id !== nodeId);
      } else {
        newSel = [...newSel, nodeId];
      }
    } else {
      if (!newSel.includes(nodeId)) {
        newSel = [nodeId];
      }
    }
    setSelectedIds(newSel);

    const activeIds = newSel.length > 0 ? newSel : [nodeId];
    const draggingNodes = nodesRef.current
      .filter(n => activeIds.includes(n.id))
      .map(n => ({ id: n.id, startNX: n.x, startNY: n.y }));

    nodeDrag.current = { startPX: e.clientX, startPY: e.clientY, nodes: draggingNodes };
  }, []);

  const handleNodePM = useCallback((e: React.PointerEvent) => {
    if (!nodeDrag.current) return;
    const { startPX, startPY, nodes } = nodeDrag.current;
    const dx = (e.clientX - startPX) / zoomRef.current;
    const dy = (e.clientY - startPY) / zoomRef.current;
    
    nodes.forEach(dn => {
      updateNetworkNode(dn.id, { x: dn.startNX + dx, y: dn.startNY + dy });
    });
  }, [updateNetworkNode]);

  const handleNodePU = useCallback(() => { nodeDrag.current = null; }, []);

  // ─── Canvas pointer events (pan + draft edge tracking) ───────────────────
  const handleSvgPD = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const tgt = e.target as Element;
    if (tgt.closest('[data-node]')) return;
    if (tgt.closest('[data-edge]')) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    panDrag.current = { startPX: e.clientX, startPY: e.clientY, startPanX: panRef.current.x, startPanY: panRef.current.y };
    setIsPanning(true);
    setSelectedIds([]);
  }, []);

  const handleSvgPM = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (panDrag.current) {
      setPan({ x: panDrag.current.startPanX + e.clientX - panDrag.current.startPX, y: panDrag.current.startPanY + e.clientY - panDrag.current.startPY });
    }
    if (portDrag.current) {
      const pt = s2c(e.clientX, e.clientY);
      setDraftEdge(prev => prev ? { ...prev, x2: pt.x, y2: pt.y } : null);
    }
  }, [s2c]);

  const handleSvgPU = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    panDrag.current = null;
    setIsPanning(false);
    if (portDrag.current && draftEdge) {
      const pt = s2c(e.clientX, e.clientY);
      const fromId = portDrag.current.fromId;
      const target = nodesRef.current.find(n =>
        pt.x >= n.x && pt.x <= n.x + n.width &&
        pt.y >= n.y && pt.y <= n.y + getNodeHeight(n) && n.id !== fromId
      );
      if (target) {
        const exists = edgesRef.current.some(ed =>
          (ed.from === fromId && ed.to === target.id) ||
          (ed.from === target.id && ed.to === fromId)
        );
        if (!exists) addNetworkEdge({ id: crypto.randomUUID(), from: fromId, to: target.id });
      }
      setDraftEdge(null);
      portDrag.current = null;
    }
  }, [draftEdge, s2c, addNetworkEdge]);

  // ─── Port pointer down (start drawing edge) ───────────────────────────────
  const handlePortPD = useCallback((e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;
    portDrag.current = { fromId: nodeId };
    const x1 = node.x + node.width / 2;
    const y1 = node.y + getNodeHeight(node);
    const pt = s2c(e.clientX, e.clientY);
    setDraftEdge({ fromId: nodeId, x1, y1, x2: pt.x, y2: pt.y });
  }, [s2c]);

  // ─── Double-click to rename ───────────────────────────────────────────────
  const handleNodeDbl = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;
    const v = window.prompt('노드 이름 수정', node.label);
    if (v !== null && v.trim()) updateNetworkNode(nodeId, { label: v.trim() });
  }, [updateNetworkNode]);

  // ─── Edge paths ──────────────────────────────────────────────────────────
  const edgePath = (a: NVNode, b: NVNode) => {
    const aH = getNodeHeight(a);
    const x1 = a.x + a.width / 2, y1 = a.y + aH;
    const x2 = b.x + b.width / 2, y2 = b.y;
    const cy = (y1 + y2) / 2;
    return `M${x1} ${y1} C${x1} ${cy},${x2} ${cy},${x2} ${y2}`;
  };
  const draftPath = (d: DraftEdge) => {
    const cy = (d.y1 + d.y2) / 2;
    return `M${d.x1} ${d.y1} C${d.x1} ${cy},${d.x2} ${cy},${d.x2} ${d.y2}`;
  };

  // ─── Fit view ─────────────────────────────────────────────────────────────
  const handleFit = useCallback(() => {
    if (!nodes.length || !canvasWrapRef.current) return;
    const r = canvasWrapRef.current.getBoundingClientRect();
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + n.width));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + getNodeHeight(n)));
    const gw = maxX - minX + 100, gh = maxY - minY + 100;
    const z = Math.min(3, Math.max(0.15, Math.min(r.width / gw, r.height / gh)));
    setZoom(z);
    setPan({ x: (r.width - gw * z) / 2 - minX * z + 50 * z, y: (r.height - gh * z) / 2 - minY * z + 50 * z });
  }, [nodes]);

  // ─── Derived data for sidebar ─────────────────────────────────────────────
  const onCanvasSourceIds = useMemo(() => new Set(nodes.map(n => n.sourceId).filter(Boolean)), [nodes]);

  const enrichedQuotations = useMemo(() =>
    quotations.map(q => ({
      ...q,
      docName: documents.find(d => d.id === q.documentId)?.name || '',
      codeColor: q.codes.length ? (codes.find(c => c.id === q.codes[0])?.color || '#888') : '#888',
    })),
  [quotations, documents, codes]);

  // ─── Node render helper ────────────────────────────────────────────────────
  const renderNode = (node: NVNode) => {
    const sel = selectedIds.includes(node.id);
    const c = node.color;

    // ── CODE ──
    if (node.type === 'code') {
      const actualHeight = getNodeHeight(node);
      return (
        <g key={node.id} data-node={node.id}
          transform={`translate(${node.x},${node.y})`}
          onPointerDown={e => handleNodePD(e, node.id)}
          onPointerMove={handleNodePM}
          onPointerUp={handleNodePU}
          onDoubleClick={e => handleNodeDbl(e, node.id)}
          style={{ cursor: 'grab' }}>
          {sel && <rect x={-4} y={-4} width={node.width + 8} height={actualHeight + 8} rx={14} fill="none" stroke={c} strokeWidth={2.5} opacity={0.4} />}
          <rect width={node.width} height={actualHeight} rx={10}
            fill={c} stroke={sel ? '#fff' : c} strokeWidth={sel ? 2.5 : 0}
            filter="drop-shadow(0 3px 8px rgba(0,0,0,0.25))" />
          <rect x={6} y={5} width={node.width - 12} height={4} rx={2} fill="rgba(255,255,255,0.25)" />
          <foreignObject x={10} y={15} width={node.width - 20} height={actualHeight - 30}>
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 800, color: 'white',
              lineHeight: '1.4', textAlign: 'center', letterSpacing: '0.2px',
              fontFamily: 'inherit', pointerEvents: 'none',
              wordBreak: 'keep-all'
            }}>
              {node.label}
            </div>
          </foreignObject>
          <text x={8} y={actualHeight - 7} fontSize={7.5} fontWeight={700} fill="rgba(255,255,255,0.6)"
            style={{ pointerEvents: 'none' }}>CODE</text>
          <circle cx={node.width / 2} cy={0} r={PORT_R}
            fill="white" stroke={c} strokeWidth={2.5}
            data-port="in" style={{ cursor: 'crosshair' }}
            onPointerDown={e => handlePortPD(e, node.id)} />
          <circle cx={node.width / 2} cy={actualHeight} r={PORT_R}
            fill={c} stroke="white" strokeWidth={2}
            data-port="out" style={{ cursor: 'crosshair' }}
            onPointerDown={e => handlePortPD(e, node.id)} />
          {sel && (
            <g transform={`translate(${node.width + 2}, -14)`}
              data-del="true"
              style={{ cursor: 'pointer' }}
              onPointerDown={e => { e.stopPropagation(); }}
              onPointerUp={e => { e.stopPropagation(); deleteNetworkNode(node.id); }}>
              <circle cx={10} cy={10} r={11} fill="#DC2626" stroke="white" strokeWidth={1.5}
                data-del="true"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
              <text x={10} y={10} textAnchor="middle" dominantBaseline="middle"
                data-del="true"
                fontSize={15} fill="white" fontWeight={700} style={{ pointerEvents: 'none' }}>×</text>
            </g>
          )}
        </g>
      );
    }

    // ── GROUP ──
    if (node.type === 'group') {
      const actualHeight = getNodeHeight(node);
      return (
        <g key={node.id} data-node={node.id}
          transform={`translate(${node.x},${node.y})`}
          onPointerDown={e => handleNodePD(e, node.id)}
          onPointerMove={handleNodePM}
          onPointerUp={handleNodePU}
          onDoubleClick={e => handleNodeDbl(e, node.id)}
          style={{ cursor: 'grab' }}>
          {/* 선택 글로우 */}
          {sel && <rect x={-4} y={-4} width={node.width + 8} height={actualHeight + 8} rx={14}
            fill="none" stroke={c} strokeWidth={2.5} opacity={0.5} />}
          {/* 흰색 카드 배경 */}
          <rect width={node.width} height={actualHeight} rx={10}
            fill="white" stroke={c} strokeWidth={sel ? 2.5 : 2}
            filter="drop-shadow(0 3px 10px rgba(0,0,0,0.18))" />
          {/* 좌측 컬러 악센트 바 */}
          <rect x={0} y={10} width={4} height={actualHeight - 20} fill={c + 'DD'} />
          <rect x={0} y={10} width={4} height={10} rx={0} fill={c + 'DD'} />
          <rect x={0} y={actualHeight - 20} width={4} height={10} rx={0} fill={c + 'DD'} />
          <rect x={0} y={10} width={4} height={actualHeight - 20} fill={c + 'DD'} />
          {/* 우측 상단 작은 GROUP 텍스트 */}
          <text x={node.width - 8} y={12} textAnchor="end" fontSize={7.5} fontWeight={700}
            fill={c + 'BB'} style={{ pointerEvents: 'none', letterSpacing: '0.5px' }}>GROUP</text>
          {/* 라벨 — 진한 텍스트 */}
          <foreignObject x={12} y={18} width={node.width - 20} height={actualHeight - 34}>
            <div style={{
              fontSize: '11.5px', fontWeight: 700, color: '#222',
              lineHeight: '1.5', pointerEvents: 'none', fontFamily: 'inherit',
              wordBreak: 'keep-all',
            }}>
              {node.label}
            </div>
          </foreignObject>
          {/* 부모 코드명 (우하단) */}
          {node.subLabel && (
            <text x={node.width - 8} y={actualHeight - 7} fontSize={8.5} fill={c}
              textAnchor="end" fontWeight={700} style={{ pointerEvents: 'none' }}>
              ↑ {truncate(node.subLabel, 18)}
            </text>
          )}
          {/* 포트 */}
          <circle cx={node.width / 2} cy={0} r={PORT_R}
            fill="white" stroke={c} strokeWidth={2.5}
            data-port="in" style={{ cursor: 'crosshair' }}
            onPointerDown={e => handlePortPD(e, node.id)} />
          <circle cx={node.width / 2} cy={actualHeight} r={PORT_R}
            fill={c} stroke="white" strokeWidth={2}
            data-port="out" style={{ cursor: 'crosshair' }}
            onPointerDown={e => handlePortPD(e, node.id)} />
          {/* 삭제 버튼 */}
          {sel && (
            <g transform={`translate(${node.width + 2}, -14)`}
              data-del="true"
              style={{ cursor: 'pointer' }}
              onPointerDown={e => { e.stopPropagation(); }}
              onPointerUp={e => { e.stopPropagation(); deleteNetworkNode(node.id); }}>
              <circle cx={10} cy={10} r={11} fill="#DC2626" stroke="white" strokeWidth={1.5}
                data-del="true"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
              <text x={10} y={10} textAnchor="middle" dominantBaseline="middle"
                data-del="true"
                fontSize={15} fill="white" fontWeight={700} style={{ pointerEvents: 'none' }}>×</text>
            </g>
          )}
        </g>
      );
    }

    // ── QUOTATION ──
    if (node.type === 'quotation') {
      const actualHeight = getNodeHeight(node);
      return (
        <g key={node.id} data-node={node.id}
          transform={`translate(${node.x},${node.y})`}
          onPointerDown={e => handleNodePD(e, node.id)}
          onPointerMove={handleNodePM}
          onPointerUp={handleNodePU}
          onDoubleClick={e => handleNodeDbl(e, node.id)}
          style={{ cursor: 'grab' }}>
          {sel && <rect x={-4} y={-4} width={node.width + 8} height={actualHeight + 8} rx={10} fill={c} opacity={0.15} />}
          <rect width={node.width} height={actualHeight} rx={7}
            fill="white" stroke={sel ? c : '#D0CDC9'} strokeWidth={sel ? 2 : 1.5}
            filter="drop-shadow(0 3px 10px rgba(0,0,0,0.15))" />
          <rect x={0} y={0} width={5} height={actualHeight} rx={7}
            fill={c} style={{ pointerEvents: 'none' }} />
          <rect x={0} y={actualHeight / 2} width={5} height={actualHeight / 2} rx={0}
            fill={c} style={{ pointerEvents: 'none' }} />
          <text x={14} y={22} fontSize={10.5} fontWeight={600} fill="#555" style={{ pointerEvents: 'none' }}>❝</text>
          <foreignObject x={22} y={14} width={node.width - 30} height={actualHeight - 30}>
            <div style={{
              fontSize: '10.5px', fontWeight: 500, color: '#333', lineHeight: '1.4',
              pointerEvents: 'none', fontFamily: 'inherit',
            }}>
              {node.label}
            </div>
          </foreignObject>
          {node.subLabel && (
            <text x={14} y={actualHeight - 11} fontSize={9} fill={c} fontWeight={700}
              style={{ pointerEvents: 'none' }}>
              📄 {truncate(node.subLabel, 22)}
            </text>
          )}
          <text x={node.width - 8} y={10} textAnchor="end" fontSize={7.5} fontWeight={700} fill={c}
            opacity={0.7} style={{ pointerEvents: 'none' }}>QUOT</text>
          <circle cx={node.width / 2} cy={0} r={PORT_R}
            fill="white" stroke={c} strokeWidth={2.5}
            data-port="in" style={{ cursor: 'crosshair' }}
            onPointerDown={e => handlePortPD(e, node.id)} />
          <circle cx={node.width / 2} cy={actualHeight} r={PORT_R}
            fill={c} stroke="white" strokeWidth={2}
            data-port="out" style={{ cursor: 'crosshair' }}
            onPointerDown={e => handlePortPD(e, node.id)} />
          {sel && (
            <g transform={`translate(${node.width + 2}, -14)`}
              data-del="true"
              style={{ cursor: 'pointer' }}
              onPointerDown={e => { e.stopPropagation(); }}
              onPointerUp={e => { e.stopPropagation(); deleteNetworkNode(node.id); }}>
              <circle cx={10} cy={10} r={11} fill="#DC2626" stroke="white" strokeWidth={1.5}
                data-del="true"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
              <text x={10} y={10} textAnchor="middle" dominantBaseline="middle"
                data-del="true"
                fontSize={15} fill="white" fontWeight={700} style={{ pointerEvents: 'none' }}>×</text>
            </g>
          )}
        </g>
      );
    }

    // ── MEMO ──
    const actualHeight = getNodeHeight(node);
    return (
      <g key={node.id} data-node={node.id}
        transform={`translate(${node.x},${node.y})`}
        onPointerDown={e => handleNodePD(e, node.id)}
        onPointerMove={handleNodePM}
        onPointerUp={handleNodePU}
        onDoubleClick={e => handleNodeDbl(e, node.id)}
        style={{ cursor: 'grab' }}>
        {sel && <rect x={-4} y={-4} width={node.width + 8} height={actualHeight + 8} rx={12} fill="none" stroke={c} strokeWidth={2} opacity={0.5} />}
        <rect width={node.width} height={actualHeight} rx={8}
          fill={c + '11'} stroke={sel ? c : c + '66'} strokeWidth={sel ? 2.5 : 1.5}
          strokeDasharray="6,4" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.06))" />
        <rect width={node.width} height={16} rx={8} fill={c + '33'} />
        <foreignObject x={10} y={20} width={node.width - 20} height={actualHeight - 30}>
          <div style={{
            fontSize: '11px', fontWeight: 600, color: '#444', lineHeight: '1.5',
            pointerEvents: 'none', fontFamily: 'inherit',
          }}>
            {node.label}
          </div>
        </foreignObject>
        <circle cx={node.width / 2} cy={0} r={PORT_R}
          fill="white" stroke={c} strokeWidth={2.5}
          data-port="in" style={{ cursor: 'crosshair' }}
          onPointerDown={e => handlePortPD(e, node.id)} />
        <circle cx={node.width / 2} cy={actualHeight} r={PORT_R}
          fill={c} stroke="white" strokeWidth={2}
          data-port="out" style={{ cursor: 'crosshair' }}
          onPointerDown={e => handlePortPD(e, node.id)} />
        {sel && (
          <g transform={`translate(${node.width + 2}, -14)`}
            data-del="true"
            style={{ cursor: 'pointer' }}
            onPointerDown={e => { e.stopPropagation(); }}
            onPointerUp={e => { e.stopPropagation(); deleteNetworkNode(node.id); }}>
            <circle cx={10} cy={10} r={11} fill="#DC2626" stroke="white" strokeWidth={1.5}
              data-del="true"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
            <text x={10} y={10} textAnchor="middle" dominantBaseline="middle"
              data-del="true"
              fontSize={15} fill="white" fontWeight={700} style={{ pointerEvents: 'none' }}>×</text>
          </g>
        )}
      </g>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Root>
      {/* ── Sidebar ── */}
      <Sidebar>
        <SbSearchArea>
          <SbSearch value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." />
          <SbAddGrid>
            <SbAddBtn onClick={() => handleAddBlock('code')}>+ 코드</SbAddBtn>
            <SbAddBtn onClick={() => handleAddBlock('group')}>+ 그룹</SbAddBtn>
            <SbAddBtn onClick={() => handleAddBlock('quotation')}>+ 인용</SbAddBtn>
            <SbAddBtn onClick={() => handleAddBlock('memo')}>+ 메모</SbAddBtn>
          </SbAddGrid>
        </SbSearchArea>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {(['code', 'group', 'quotation', 'memo'] as const).map(tab => (
            <button key={tab}
              onClick={() => setSideTab(tab)}
              style={{
                flex: 1, padding: '9px 2px', fontSize: 9.5, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.3px',
                borderBottom: sideTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                color: sideTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                background: 'transparent',
              }}
            >
              {tab === 'code' ? '코드' : tab === 'group' ? '그룹' : tab === 'quotation' ? '인용' : '메모'}
            </button>
          ))}
        </div>

        <SidebarScroll>
          {/* ── CODE TAB ── */}
          {sideTab === 'code' && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '6px 2px 8px', lineHeight: 1.5 }}>
                드래그하여 캔버스에 연결
              </div>
              {codes.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map(code => (
                <CodePill key={code.id} $color={code.color} $dim={onCanvasSourceIds.has(code.id)}
                  draggable onDragStart={e => {
                    e.dataTransfer.setData('nv-type', 'code');
                    e.dataTransfer.setData('nv-id', code.id);
                    e.dataTransfer.setData('nv-color', code.color);
                    e.dataTransfer.setData('nv-label', code.name);
                  }}>
                  <span style={{ flex: 1 }}>{code.name}</span>
                  {onCanvasSourceIds.has(code.id) && <span style={{ fontSize: 9, opacity: 0.7 }}>✓</span>}
                </CodePill>
              ))}
              {codes.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>코드가 없습니다.</div>}
            </>
          )}

          {/* ── GROUP TAB ── */}
          {sideTab === 'group' && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '6px 2px 8px', lineHeight: 1.5 }}>
                드래그하여 캔버스에 연결
              </div>
              {codeGroups
                .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
                .map(group => {
                  const parentCode = codes.find(c => c.id === group.codeId);
                  return (
                    <GroupPill key={group.id} $color={group.color} $dim={onCanvasSourceIds.has(group.id)}
                      draggable onDragStart={e => {
                        e.dataTransfer.setData('nv-type', 'group');
                        e.dataTransfer.setData('nv-id', group.id);
                        e.dataTransfer.setData('nv-color', group.color);
                        e.dataTransfer.setData('nv-label', group.name);
                        e.dataTransfer.setData('nv-sublabel', parentCode?.name || '');
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 11.5, fontWeight: 700, color: '#222', lineHeight: 1.4,
                          wordBreak: 'keep-all',
                        }}>
                          {group.name}
                        </div>
                        {parentCode && (
                          <div style={{
                            fontSize: 9.5, fontWeight: 700, marginTop: 3,
                            color: group.color,
                          }}>
                            ↑ {parentCode.name}
                          </div>
                        )}
                      </div>
                      {onCanvasSourceIds.has(group.id) && <span style={{ fontSize: 9, opacity: 0.6, flexShrink: 0 }}>✓</span>}
                    </GroupPill>
                  );
                })}
              {codeGroups.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>그룹이 없습니다.</div>}
            </>
          )}

          {/* ── QUOTATION TAB ── */}
          {sideTab === 'quotation' && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '6px 2px 8px', lineHeight: 1.5 }}>
                드래그하여 캔버스에 연결
              </div>
              {enrichedQuotations.filter(q => !search || q.text.toLowerCase().includes(search.toLowerCase())).map(q => (
                <QuotPill key={q.id} $color={q.codeColor} $dim={onCanvasSourceIds.has(q.id)}
                  draggable onDragStart={e => {
                    e.dataTransfer.setData('nv-type', 'quotation');
                    e.dataTransfer.setData('nv-id', q.id);
                    e.dataTransfer.setData('nv-color', q.codeColor);
                    e.dataTransfer.setData('nv-label', q.text);
                    e.dataTransfer.setData('nv-sublabel', q.docName);
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 500, lineHeight: 1.4 }}>
                      "{q.text}"
                    </div>
                    {q.docName && <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 3 }}>📄 {q.docName}</div>}
                  </div>
                  {onCanvasSourceIds.has(q.id) && <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>✓</span>}
                </QuotPill>
              ))}
              {enrichedQuotations.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>인용문이 없습니다.</div>}
            </>
          )}

          {/* ── MEMO TAB ── */}
          {sideTab === 'memo' && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '6px 2px 8px', lineHeight: 1.5 }}>
                저장된 메모 중 드래그
              </div>
              {MEMO_COLORS.map((color, i) => (
                <MemoPill key={color} $color={color}
                  draggable onDragStart={e => {
                    e.dataTransfer.setData('nv-type', 'memo');
                    e.dataTransfer.setData('nv-color', color);
                  }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                 기본 메모 {i + 1}
                </MemoPill>
              ))}
            </>
          )}
        </SidebarScroll>
      </Sidebar>

      {/* ── Canvas ── */}
      <CanvasWrap ref={canvasWrapRef}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}>

        {/* Toolbar */}
        <Toolbar>
          <TBtn onClick={handleFit}>⊡ 맞추기</TBtn>
          <TDiv />
          <TBtn onClick={() => setZoom(z => Math.min(3, z * 1.2))}>+</TBtn>
          <TZoom>{Math.round(zoom * 100)}%</TZoom>
          <TBtn onClick={() => setZoom(z => Math.max(0.15, z * 0.8))}>−</TBtn>
          <TDiv />
          <TBtn onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}>리셋</TBtn>
          <TDiv />
          <TBtn $danger onClick={() => {
            if (!nodes.length) return;
            if (window.confirm('캔버스를 모두 지우시겠습니까?')) {
              setNetworkData([], []); setSelectedIds([]);
            }
          }}>지우기</TBtn>
        </Toolbar>

        {/* Empty hint */}
        {nodes.length === 0 && (
          <EmptyHint>
            <div style={{ fontSize: 42 }}>🕸️</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)' }}>캔버스가 비어 있습니다</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-muted)' }}>
              왼쪽 패널에서 코드·그룹·인용문·메모를<br />
              드래그하여 캔버스에 배치하세요.<br />
              ● 포트를 드래그하면 연결선을 그릴 수 있습니다.
            </div>
          </EmptyHint>
        )}

        {/* SVG */}
        <svg style={{ width: '100%', height: '100%', display: 'block', cursor: isPanning ? 'grabbing' : 'default' }}
          onPointerDown={handleSvgPD}
          onPointerMove={handleSvgPM}
          onPointerUp={handleSvgPU}>
          <defs>
            <pattern id="nv-dots" width={20 * zoom} height={20 * zoom}
              x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)} patternUnits="userSpaceOnUse">
              <circle cx={1.5} cy={1.5} r={1} fill="#C8C5C0" />
            </pattern>
            <marker id="nv-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#888" />
            </marker>
            <marker id="nv-arr-d" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="var(--accent)" />
            </marker>
          </defs>

          <rect width="100%" height="100%" fill="url(#nv-dots)" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map(ed => {
              const a = nodes.find(n => n.id === ed.from);
              const b = nodes.find(n => n.id === ed.to);
              if (!a || !b) return null;
              const d = edgePath(a, b);
              
              const aH = getNodeHeight(a);
              const mx = (a.x + a.width/2 + b.x + b.width/2) / 2;
              const my = (a.y + aH + b.y) / 2;

              return (
                <g key={ed.id} className="edge-group" data-edge="true" style={{ cursor: 'pointer' }}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={16} 
                    onPointerDown={(e) => { e.stopPropagation(); deleteNetworkEdge(ed.id); }} />
                  <path d={d} fill="none" stroke="#999" strokeWidth={2}
                    className="edge-line"
                    strokeDasharray="7,4" markerEnd="url(#nv-arr)"
                    style={{ pointerEvents: 'none', transition: 'stroke 0.2s, stroke-width 0.2s' }} />
                  <g transform={`translate(${mx - 10}, ${my - 10})`} 
                    className="edge-del"
                    onPointerDown={(e) => { e.stopPropagation(); deleteNetworkEdge(ed.id); }}
                    style={{ opacity: 0, transition: 'opacity 0.2s' }}>
                    <circle cx={10} cy={10} r={9} fill="white" stroke="#DC2626" strokeWidth={1} />
                    <text x={10} y={10.5} textAnchor="middle" dominantBaseline="middle" 
                      fontSize={11} fill="#DC2626" fontWeight={900}>×</text>
                  </g>
                </g>
              );
            })}

            {/* Draft edge */}
            {draftEdge && (
              <path d={draftPath(draftEdge)} fill="none"
                stroke="var(--accent)" strokeWidth={2}
                strokeDasharray="5,3" markerEnd="url(#nv-arr-d)"
                style={{ pointerEvents: 'none' }} />
            )}

            {/* Nodes */}
            {nodes.map(renderNode)}
          </g>
        </svg>

        {/* Help */}
        {nodes.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 14, right: 14,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--border)', borderRadius: 10,
            padding: '8px 12px', fontSize: 10.5,
            color: 'var(--text-muted)', lineHeight: 1.8,
            boxShadow: '0 2px 14px rgba(0,0,0,0.08)',
          }}>
            <b style={{ color: 'var(--text-secondary)' }}>조작법</b><br />
            드래그 → 이동 &nbsp;|&nbsp; Ctrl+휠 → 줌<br />
            포트(●) 드래그 → 연결 &nbsp;|&nbsp; 선 클릭 → 삭제<br />
            더블클릭 → 이름 수정 &nbsp;|&nbsp; Delete → 삭제
          </div>
        )}
      </CanvasWrap>
    </Root>
  );
};