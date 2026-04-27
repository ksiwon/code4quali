import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';

import type { NVNode, NVNodeType } from '../../types';

interface DraftEdge {
  fromId: string;
  x1: number; y1: number;
  x2: number; y2: number;
}

interface SelectionBox {
  startX: number; startY: number;
  currentX: number; currentY: number;
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

const SidebarScroll = styled.div`
  flex: 1; overflow-y: auto; padding: 6px 8px;
`;

const SideTabBar = styled.div`
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
`;

const SideTabBtn = styled.button<{ $active: boolean }>`
  flex: 1; padding: 9px 2px; font-size: 9.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.3px;
  border-bottom: 2px solid ${p => p.$active ? 'var(--accent)' : 'transparent'};
  color: ${p => p.$active ? 'var(--accent)' : 'var(--text-muted)'};
  background: transparent;
`;

const TabHint = styled.div`
  font-size: 10px; color: var(--text-muted);
  padding: 6px 2px 8px; line-height: 1.5;
`;

const TabEmpty = styled.div`
  font-size: 11px; color: var(--text-muted); line-height: 1.6;
`;

const CodePill = styled.div<{ $color: string; $highlighted?: boolean }>`
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px; margin-bottom: 4px;
  cursor: grab;
  border: 2px solid ${p => p.$color};
  background: ${p => p.$color};
  font-size: 11.5px; font-weight: 700;
  color: white;
  transition: opacity 0.12s, transform 0.1s, box-shadow 0.1s;
  box-shadow: ${p => p.$highlighted
    ? `0 0 0 3px white, 0 0 20px 8px ${p.$color}, 0 0 40px 16px ${p.$color}99`
    : `0 2px 6px ${p.$color}66`};
  &:hover { transform: translateX(2px) scale(1.02); box-shadow: 0 4px 12px ${p => p.$color}88; }
  &:active { cursor: grabbing; }
`;

const CodePillLabel = styled.span`flex: 1;`;

const GroupPill = styled.div<{ $color: string; $highlighted?: boolean }>`
  display: flex; align-items: flex-start; gap: 8px;
  padding: 7px 10px; border-radius: 8px; margin-bottom: 4px;
  cursor: grab;
  border: 2px solid ${p => p.$color};
  background: white;
  font-size: 11px; font-weight: 700;
  color: #222;
  transition: opacity 0.12s, transform 0.1s, box-shadow 0.1s;
  box-shadow: ${p => p.$highlighted
    ? `0 0 0 3px white, 0 0 20px 8px ${p.$color}, 0 0 40px 16px ${p.$color}99`
    : `0 2px 6px ${p.$color}44`};
  &:hover { transform: translateX(2px); box-shadow: 0 4px 12px ${p => p.$color}66; background: ${p => p.$color}0D; }
  &:active { cursor: grabbing; }
`;

const GroupPillBody = styled.div`flex: 1; min-width: 0;`;

const GroupPillName = styled.div`
  font-size: 11.5px; font-weight: 700; color: #222;
  line-height: 1.4; word-break: keep-all;
`;

const GroupPillParent = styled.div<{ $color: string }>`
  font-size: 9.5px; font-weight: 700; margin-top: 3px;
  color: ${p => p.$color};
`;

const QuotPill = styled.div<{ $color: string; $highlighted?: boolean }>`
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
  transition: opacity 0.12s, transform 0.1s, box-shadow 0.1s;
  box-shadow: ${p => p.$highlighted
    ? `0 0 0 3px white, 0 0 20px 8px ${p.$color}, 0 0 40px 16px ${p.$color}99`
    : `0 1px 4px rgba(0,0,0,0.06)`};
  &:hover { transform: translateX(2px); box-shadow: 0 3px 10px rgba(0,0,0,0.1); }
  &:active { cursor: grabbing; }
`;

const QuotPillBody = styled.div`flex: 1; min-width: 0;`;

const QuotPillText = styled.div`
  font-size: 10.5px; font-weight: 500; line-height: 1.4;
`;

const QuotPillDoc = styled.div`
  font-size: 9.5px; color: var(--text-muted); margin-top: 3px;
`;

const MemoPill = styled.button<{ $color: string; $highlighted?: boolean }>`
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px; margin-bottom: 4px;
  cursor: grab;
  border: 1.5px dashed ${p => p.$color + 'CC'};
  background: ${p => p.$color}18;
  font-size: 11.5px; font-weight: 700;
  color: ${p => p.$color};
  transition: all 0.12s;
  box-shadow: ${p => p.$highlighted
    ? `0 0 0 3px white, 0 0 20px 8px ${p.$color}, 0 0 40px 16px ${p.$color}99`
    : 'none'};
  &:hover { background: ${p => p.$color}30; border-style: solid; }
  &:active { cursor: grabbing; }
`;

const MemoDot = styled.span<{ $color: string }>`
  width: 10px; height: 10px; border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0; display: inline-block;
`;

const CountBadge = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px;
  background: rgba(255,255,255,0.3);
  color: white;
  font-size: 10px; font-weight: 800;
  flex-shrink: 0;
`;

const CountBadgeDark = styled.span<{ $color: string }>`
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px;
  background: ${p => p.$color}22;
  color: ${p => p.$color};
  font-size: 10px; font-weight: 800;
  flex-shrink: 0;
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

const CanvasSvg = styled.svg<{ $panning: boolean; $selecting: boolean }>`
  width: 100%; height: 100%; display: block;
  cursor: ${p => p.$panning ? 'grabbing' : p.$selecting ? 'crosshair' : 'default'};
`;

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

const TDiv = styled.div`
  width: 1px; height: 18px; background: var(--border); flex-shrink: 0;
`;

const TZoom = styled.span`
  font-size: 11px; color: var(--text-muted); min-width: 34px; text-align: center;
`;

const EmptyHint = styled.div`
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  text-align: center; color: var(--text-muted); pointer-events: none;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
`;

const EmptyIcon = styled.div`font-size: 42px;`;

const EmptyTitle = styled.div`
  font-size: 15px; font-weight: 800; color: var(--text-secondary);
`;

const EmptyBody = styled.div`
  font-size: 12px; line-height: 1.7; color: var(--text-muted);
`;

// ─── Color Picker Modal ───────────────────────────────────────────────────────

const ModalOverlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
`;

const ModalBox = styled.div`
  background: white; border-radius: 14px; padding: 24px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.2); min-width: 280px;
`;

const ModalTitle = styled.div`
  font-weight: 800; font-size: 14px; margin-bottom: 4px;
`;

const ModalSubtitle = styled.div`
  font-size: 11.5px; color: var(--text-muted); margin-bottom: 8px;
`;

const ColorGrid = styled.div`
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 14px 0;
`;

const ColorDot = styled.button<{ $color: string; $selected: boolean }>`
  width: 32px; height: 32px; border-radius: 50%;
  background: ${p => p.$color};
  border: ${p => p.$selected ? '3px solid #222' : '2px solid transparent'};
  box-shadow: ${p => p.$selected ? `0 0 0 2px white, 0 0 0 4px ${p.$color}` : '0 2px 6px rgba(0,0,0,0.15)'};
  transition: all 0.12s;
  &:hover { transform: scale(1.15); }
`;

const ColorPickerRow = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
`;

const ColorPickerLabel = styled.label`
  font-size: 11.5px; color: var(--text-muted);
`;

const ColorPickerInput = styled.input`
  width: 36px; height: 28px; border: none; padding: 0;
  cursor: pointer; border-radius: 4px;
`;

const ColorPreviewSwatch = styled.span<{ $color: string }>`
  flex: 1; height: 28px; border-radius: 6px;
  background: ${p => p.$color};
  box-shadow: ${p => `0 2px 8px ${p.$color}88`};
`;

const ModalActions = styled.div`
  display: flex; gap: 8px; justify-content: flex-end;
`;

const ModalCancelBtn = styled.button`
  padding: 7px 16px; border-radius: 6px;
  border: 1px solid var(--border); font-size: 12px;
  cursor: pointer; background: var(--surface2);
`;

const ModalConfirmBtn = styled.button<{ $color: string }>`
  padding: 7px 16px; border-radius: 6px;
  border: none; font-size: 12px; cursor: pointer;
  background: ${p => p.$color}; color: white; font-weight: 700;
`;

// ─── Help Tooltip ─────────────────────────────────────────────────────────────

const HelpTooltip = styled.div`
  position: absolute; bottom: 44px; right: 0;
  width: 280px;
  background: rgba(255,255,255,0.98); backdrop-filter: blur(12px);
  border: 1px solid var(--border); border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
  overflow: hidden;
  opacity: 0; pointer-events: none;
  transform: translateY(6px) scale(0.97);
  transition: opacity 0.18s ease, transform 0.18s ease;
`;

const HelpBtn = styled.div`
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,255,255,0.95); backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 800; color: var(--text-secondary);
  cursor: default; user-select: none;
  transition: box-shadow 0.15s, background 0.15s;
`;

const HelpWrap = styled.div`
  position: absolute; bottom: 14px; right: 14px; z-index: 20;
  &:hover ${HelpTooltip} {
    opacity: 1; pointer-events: auto;
    transform: translateY(0) scale(1);
  }
  &:hover ${HelpBtn} {
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    background: white;
  }
`;

const HelpHeader = styled.div`
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border);
  font-size: 11.5px; font-weight: 800; color: var(--text-secondary);
  letter-spacing: 0.3px; display: flex; align-items: center; gap: 6px;
`;

const HelpSection = styled.div`padding: 8px 14px 6px;`;

const HelpSectionTitle = styled.div`
  font-size: 9.5px; font-weight: 800; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.6px;
  margin-bottom: 5px; display: flex; align-items: center; gap: 5px;
`;

const HelpRow = styled.div`
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 8px; padding: 2.5px 0;
  border-bottom: 1px solid #f0eeec;
`;

const HelpKey = styled.span`
  font-size: 10.5px; color: #444; font-family: monospace;
  background: #f4f3f1; border-radius: 4px; padding: 1px 5px;
  white-space: nowrap; flex-shrink: 0;
`;

const HelpDesc = styled.span`
  font-size: 10.5px; color: var(--text-muted);
  text-align: right; line-height: 1.4;
`;

const HelpSpacer = styled.div`height: 6px;`;

// ─── Node foreignObject inner divs ────────────────────────────────────────────
// (used inside SVG foreignObject — needs pointer-events: none)

const NodeLabelDiv = styled.div`
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; color: white;
  line-height: 1.4; text-align: center; letter-spacing: 0.2px;
  font-family: inherit; pointer-events: none;
  word-break: keep-all;
`;

const GroupLabelDiv = styled.div`
  font-size: 11.5px; font-weight: 700; color: #222;
  line-height: 1.5; pointer-events: none; font-family: inherit;
  word-break: keep-all;
`;

const QuotLabelDiv = styled.div`
  font-size: 10.5px; font-weight: 500; color: #333;
  line-height: 1.4; pointer-events: none; font-family: inherit;
`;

const MemoLabelDiv = styled.div`
  font-size: 11px; font-weight: 600; color: #444;
  line-height: 1.5; pointer-events: none; font-family: inherit;
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

const PRESET_COLORS = [
  '#E07B54', '#4A6FA5', '#61A87B', '#9B59B6', '#E67E22', '#E74C3C',
  '#1ABC9C', '#3498DB', '#F1C40F', '#34495E', '#E91E63', '#00BCD4',
  '#FF5722', '#607D8B', '#8BC34A', '#FF9800', '#673AB7', '#009688',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;

const getNodeHeight = (node: NVNode) => {
  if (node.type === 'code') {
    let lines = 1; let cur = 0;
    for (let i = 0; i < node.label.length; i++) {
      cur += node.label.charCodeAt(i) > 255 ? 1 : 0.55;
      if (cur > 17) { lines++; cur = 0; }
    }
    return Math.max(node.height, 40 + lines * 18);
  }
  if (node.type === 'group') {
    let lines = 1; let cur = 0;
    for (let i = 0; i < node.label.length; i++) {
      cur += node.label.charCodeAt(i) > 255 ? 1 : 0.55;
      if (cur > 15) { lines++; cur = 0; }
    }
    return Math.max(node.height, 44 + lines * 17);
  }
  if (node.type === 'quotation') {
    let lines = 1; let cur = 0;
    for (let i = 0; i < node.label.length; i++) {
      cur += node.label.charCodeAt(i) > 255 ? 1 : 0.55;
      if (cur > 10.2) { lines++; cur = 0; }
    }
    return Math.max(node.height, 22 + lines * 15.5 + (node.subLabel ? 16 : 0));
  }
  if (node.type === 'memo') {
    let lines = 1; let cur = 0;
    for (let i = 0; i < node.label.length; i++) {
      cur += node.label.charCodeAt(i) > 255 ? 1 : 0.55;
      if (cur > 12.5) { lines++; cur = 0; }
    }
    return Math.max(node.height, 35 + lines * 17);
  }
  return node.height;
};

// ─── Help Sections Data ───────────────────────────────────────────────────────

const HELP_SECTIONS: { title: string; icon: string; rows: [string, string][] }[] = [
  {
    title: '캔버스', icon: '🖱️',
    rows: [
      ['드래그 (빈 배경)', '범위 선택 (marquee)'],
      ['Shift + 드래그 (빈 배경)', '캔버스 패닝'],
      ['Ctrl + 휠', '줌 인 / 아웃'],
      ['Esc', '선택 해제 · 연결선 취소'],
    ],
  },
  {
    title: '노드', icon: '⬜',
    rows: [
      ['클릭', '단일 선택'],
      ['Shift + 클릭', '다중 선택 추가 / 해제'],
      ['드래그 (노드)', '노드 이동'],
      ['Shift + 드래그 (노드)', '다중 선택 노드 이동'],
      ['더블클릭', '이름 수정'],
      ['Delete / Backspace', '선택 노드 삭제'],
      ['노드 우상단 ×', '해당 노드 단독 삭제'],
    ],
  },
  {
    title: '연결선', icon: '↗️',
    rows: [
      ['포트(●) 드래그', '연결선 그리기'],
      ['연결선 호버', '중간 × 버튼 표시'],
      ['연결선 / × 클릭', '연결선 삭제'],
    ],
  },
  {
    title: '사이드바', icon: '📋',
    rows: [
      ['아이템 드래그 → 캔버스 드롭', '노드 추가 (중복 가능)'],
      ['아이템 호버', '캔버스 내 해당 노드 glow'],
      ['숫자 뱃지', '캔버스에 올라간 개수'],
      ['+ 코드 / 그룹 / 인용 / 메모', '색상 선택 후 빈 노드 추가'],
    ],
  },
  {
    title: '툴바', icon: '🔧',
    rows: [
      ['⊡ 맞추기', '모든 노드 화면에 맞게 조정'],
      ['+ / −', '줌 인 / 아웃'],
      ['리셋', '줌 · 패닝 초기화'],
      ['지우기', '캔버스 전체 삭제'],
    ],
  },
];

// ─── SVG element style constants (pointer-events / cursor — SVG attr only) ───
// SVG native attributes cannot use styled-components; these are minimal and intentional.
const SVG_NO_EVENTS = { pointerEvents: 'none' } as const;
const SVG_CROSSHAIR  = { cursor: 'crosshair' }  as const;
const SVG_GRAB       = { cursor: 'grab' }        as const;
const SVG_POINTER    = { cursor: 'pointer' }     as const;
const SVG_NO_EVENTS_LETTER  = { pointerEvents: 'none', letterSpacing: '0.5px' }         as const;
const SVG_EDGE_LINE         = { pointerEvents: 'none', transition: 'stroke 0.2s, stroke-width 0.2s' } as const;
const SVG_EDGE_DEL          = { opacity: 0, transition: 'opacity 0.2s' }                as const;

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

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const selectionBoxRef = useRef<SelectionBox | null>(null);

  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);

  const [colorPickerModal, setColorPickerModal] = useState<{
    type: NVNodeType;
    resolve: (color: string | null) => void;
  } | null>(null);
  const [pickerColor, setPickerColor] = useState(PRESET_COLORS[0]);

  const [sideTab, setSideTab] = useState<'code' | 'group' | 'quotation' | 'memo'>('code');
  const [search, setSearch] = useState('');

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const nodeDrag = useRef<{
    startPX: number; startPY: number;
    nodes: { id: string; startNX: number; startNY: number }[];
    moved: boolean;
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

  const autoPanRef = useRef<{ dx: number; dy: number } | null>(null);
  const autoPanRafRef = useRef<number | null>(null);

  // ─── Screen → Canvas coords ────────────────────────────────────────────────
  const s2c = useCallback((sx: number, sy: number) => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return { x: sx, y: sy };
    const r = wrap.getBoundingClientRect();
    return {
      x: (sx - r.left - panRef.current.x) / zoomRef.current,
      y: (sy - r.top  - panRef.current.y) / zoomRef.current,
    };
  }, []);

  const handleZoom = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();

    // Default to center if no point provided
    const sx = clientX ?? (r.left + r.width / 2);
    const sy = clientY ?? (r.top + r.height / 2);

    const oldZoom = zoomRef.current;
    const newZoom = Math.min(3, Math.max(0.15, oldZoom * factor));
    if (newZoom === oldZoom) return;

    // Canvas point under the cursor (screen space -> canvas space)
    const cx = (sx - r.left - panRef.current.x) / oldZoom;
    const cy = (sy - r.top - panRef.current.y) / oldZoom;

    setZoom(newZoom);
    setPan({
      x: (sx - r.left) - cx * newZoom,
      y: (sy - r.top) - cy * newZoom,
    });
  }, []);

  // ─── Ctrl+wheel zoom ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? 0.9 : 1.1, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [handleZoom]);

  // ─── Delete key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        selectedIds.forEach(id => deleteNetworkNode(id));
        setSelectedIds([]);
      }
      if (e.key === 'Escape') {
        setSelectedIds([]); setDraftEdge(null); portDrag.current = null;
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedIds, deleteNetworkNode]);

  // ─── Auto-pan loop ────────────────────────────────────────────────────────
  const startAutoPan = useCallback(() => {
    if (autoPanRafRef.current) return;
    const loop = () => {
      const ap = autoPanRef.current;
      if (!ap || (ap.dx === 0 && ap.dy === 0)) {
        autoPanRafRef.current = null;
        return;
      }
      setPan(p => ({ x: p.x + ap.dx, y: p.y + ap.dy }));
      if (selectionBoxRef.current) {
        setSelectionBox(sb => sb ? {
          ...sb,
          startX: sb.startX - ap.dx / zoomRef.current,
          startY: sb.startY - ap.dy / zoomRef.current,
        } : null);
      }
      autoPanRafRef.current = requestAnimationFrame(loop);
    };
    autoPanRafRef.current = requestAnimationFrame(loop);
  }, []);

  // ─── Color picker helper ──────────────────────────────────────────────────
  const askColor = useCallback((type: NVNodeType): Promise<string | null> => {
    const defaultColor = type === 'code' ? '#E07B54'
      : type === 'group' ? '#A3CF62'
      : type === 'quotation' ? '#61D9A5'
      : MEMO_COLORS[Math.floor(Math.random() * MEMO_COLORS.length)];
    setPickerColor(defaultColor);
    return new Promise(resolve => { setColorPickerModal({ type, resolve }); });
  }, []);

  // ─── Drop onto canvas ────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nv-type') as NVNodeType;
    const sourceId = e.dataTransfer.getData('nv-id');
    const color    = e.dataTransfer.getData('nv-color')    || '#888';
    const label    = e.dataTransfer.getData('nv-label')    || '';
    const subLabel = e.dataTransfer.getData('nv-sublabel') || '';
    const pt = s2c(e.clientX, e.clientY);

    if (type === 'memo') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'memo', label: label || '새 메모',
        color, x: pt.x - MEMO_W / 2, y: pt.y - MEMO_H / 2, width: MEMO_W, height: MEMO_H, sourceId });
      return;
    }
    if (type === 'code') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'code', label, color,
        x: pt.x - CODE_W / 2, y: pt.y - CODE_H / 2, width: CODE_W, height: CODE_H, sourceId });
      return;
    }
    if (type === 'group') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'group', label, color, subLabel,
        x: pt.x - GROUP_W / 2, y: pt.y - GROUP_H / 2, width: GROUP_W, height: GROUP_H, sourceId });
      return;
    }
    if (type === 'quotation') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'quotation', label, color, subLabel,
        x: pt.x - QUOT_W / 2, y: pt.y - QUOT_H / 2, width: QUOT_W, height: QUOT_H, sourceId });
    }
  }, [s2c, addNetworkNode]);

  // ─── Add block button ─────────────────────────────────────────────────────
  const handleAddBlock = useCallback(async (type: NVNodeType) => {
    const color = await askColor(type);
    if (color === null) return;
    const pt = { x: panRef.current.x * -1 / zoomRef.current + 200, y: panRef.current.y * -1 / zoomRef.current + 150 };
    if (type === 'code') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'code', label: '새 코드', color, x: pt.x, y: pt.y, width: CODE_W, height: CODE_H });
    } else if (type === 'group') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'group', label: '새 그룹', color, x: pt.x + 10, y: pt.y + 10, width: GROUP_W, height: GROUP_H });
    } else if (type === 'quotation') {
      addNetworkNode({ id: crypto.randomUUID(), type: 'quotation', label: '새 인용', color, x: pt.x + 20, y: pt.y + 20, width: QUOT_W, height: QUOT_H });
    } else {
      addNetworkNode({ id: crypto.randomUUID(), type: 'memo', label: '새 메모', color, x: pt.x + 40, y: pt.y + 40, width: MEMO_W, height: MEMO_H });
    }
  }, [addNetworkNode, askColor]);

  // ─── Node pointer down ────────────────────────────────────────────────────
  const handleNodePD = useCallback((e: React.PointerEvent, nodeId: string) => {
    if ((e.target as SVGElement).dataset.port) return;
    if ((e.target as SVGElement).dataset.del)  return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);

    let newSel = selectedIdsRef.current;
    if (e.shiftKey) {
      newSel = newSel.includes(nodeId) ? newSel.filter(id => id !== nodeId) : [...newSel, nodeId];
    } else {
      if (!newSel.includes(nodeId)) newSel = [nodeId];
    }
    setSelectedIds(newSel);

    const activeIds = newSel.length > 0 ? newSel : [nodeId];
    const draggingNodes = nodesRef.current
      .filter(n => activeIds.includes(n.id))
      .map(n => ({ id: n.id, startNX: n.x, startNY: n.y }));
    nodeDrag.current = { startPX: e.clientX, startPY: e.clientY, nodes: draggingNodes, moved: false };
  }, []);

  const handleNodePM = useCallback((e: React.PointerEvent) => {
    if (!nodeDrag.current) return;
    const { startPX, startPY, nodes } = nodeDrag.current;
    const dx = (e.clientX - startPX) / zoomRef.current;
    const dy = (e.clientY - startPY) / zoomRef.current;
    if (!nodeDrag.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      nodeDrag.current.moved = true;
    }
    nodes.forEach(dn => updateNetworkNode(dn.id, { x: dn.startNX + dx, y: dn.startNY + dy }));
  }, [updateNetworkNode]);

  const handleNodePU = useCallback(() => { nodeDrag.current = null; }, []);

  // ─── Canvas pointer events ────────────────────────────────────────────────
  const handleSvgPD = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const tgt = e.target as Element;
    if (tgt.closest('[data-node]')) return;
    if (tgt.closest('[data-edge]')) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);

    if (e.shiftKey) {
      panDrag.current = { startPX: e.clientX, startPY: e.clientY, startPanX: panRef.current.x, startPanY: panRef.current.y };
      setIsPanning(true);
    } else {
      const pt = s2c(e.clientX, e.clientY);
      const box: SelectionBox = { startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y };
      selectionBoxRef.current = box;
      setSelectionBox(box);
      setSelectedIds([]);
    }
  }, [s2c]);

  const handleSvgPM = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (panDrag.current) {
      setPan({ x: panDrag.current.startPanX + e.clientX - panDrag.current.startPX,
               y: panDrag.current.startPanY + e.clientY - panDrag.current.startPY });
    }
    if (selectionBoxRef.current) {
      const wrap = canvasWrapRef.current;
      if (wrap) {
        const r = wrap.getBoundingClientRect();
        const EDGE = 40; const SPEED = 8;
        let dx = 0; let dy = 0;
        if      (e.clientX - r.left  < EDGE) dx =  SPEED;
        else if (r.right  - e.clientX < EDGE) dx = -SPEED;
        if      (e.clientY - r.top   < EDGE) dy =  SPEED;
        else if (r.bottom - e.clientY < EDGE) dy = -SPEED;
        if (dx !== 0 || dy !== 0) { autoPanRef.current = { dx, dy }; startAutoPan(); }
        else                        autoPanRef.current = null;
      }
      const pt = s2c(e.clientX, e.clientY);
      const updated = { ...selectionBoxRef.current, currentX: pt.x, currentY: pt.y };
      selectionBoxRef.current = updated;
      setSelectionBox(updated);

      const sb = selectionBoxRef.current;
      const minX = Math.min(sb.startX, sb.currentX);
      const maxX = Math.max(sb.startX, sb.currentX);
      const minY = Math.min(sb.startY, sb.currentY);
      const maxY = Math.max(sb.startY, sb.currentY);
      setSelectedIds(nodesRef.current
        .filter(n => { const h = getNodeHeight(n); return n.x < maxX && n.x + n.width > minX && n.y < maxY && n.y + h > minY; })
        .map(n => n.id));
    }
    if (portDrag.current) {
      const pt = s2c(e.clientX, e.clientY);
      setDraftEdge(prev => prev ? { ...prev, x2: pt.x, y2: pt.y } : null);
    }
  }, [s2c, startAutoPan]);

  const handleSvgPU = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    panDrag.current = null;
    setIsPanning(false);
    autoPanRef.current = null;
    if (autoPanRafRef.current) { cancelAnimationFrame(autoPanRafRef.current); autoPanRafRef.current = null; }
    selectionBoxRef.current = null;
    setSelectionBox(null);

    if (portDrag.current && draftEdge) {
      const pt = s2c(e.clientX, e.clientY);
      const fromId = portDrag.current.fromId;
      const target = nodesRef.current.find(n =>
        pt.x >= n.x && pt.x <= n.x + n.width &&
        pt.y >= n.y && pt.y <= n.y + getNodeHeight(n) && n.id !== fromId
      );
      if (target) {
        const exists = edgesRef.current.some(ed =>
          (ed.from === fromId && ed.to === target.id) || (ed.from === target.id && ed.to === fromId));
        if (!exists) addNetworkEdge({ id: crypto.randomUUID(), from: fromId, to: target.id });
      }
      setDraftEdge(null);
      portDrag.current = null;
    }
  }, [draftEdge, s2c, addNetworkEdge]);

  // ─── Port pointer down ────────────────────────────────────────────────────
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

  // ─── Double-click rename ──────────────────────────────────────────────────
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

  // ─── Derived data ─────────────────────────────────────────────────────────
  const canvasSourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    nodes.forEach(n => { if (n.sourceId) map.set(n.sourceId, (map.get(n.sourceId) || 0) + 1); });
    return map;
  }, [nodes]);

  const enrichedQuotations = useMemo(() =>
    quotations.map(q => ({
      ...q,
      docName: documents.find(d => d.id === q.documentId)?.name || '',
      codeColor: q.codes.length ? (codes.find(c => c.id === q.codes[0])?.color || '#888') : '#888',
    })),
  [quotations, documents, codes]);

  const highlightedNodeIds = useMemo(() => {
    if (!hoveredSourceId) return new Set<string>();
    return new Set(nodes.filter(n => n.sourceId === hoveredSourceId).map(n => n.id));
  }, [hoveredSourceId, nodes]);

  // ─── Node render helper ────────────────────────────────────────────────────
  const renderNode = (node: NVNode) => {
    const sel    = selectedIds.includes(node.id);
    const glowing = highlightedNodeIds.has(node.id);
    const c = node.color;
    const glowFilter = glowing
      ? `drop-shadow(0 0 8px ${c}) drop-shadow(0 0 20px ${c}BB) drop-shadow(0 0 40px ${c}88)`
      : undefined;

    const commonG = {
      onPointerDown: (e: React.PointerEvent) => handleNodePD(e, node.id),
      onPointerMove: handleNodePM,
      onPointerUp:   handleNodePU,
      onDoubleClick: (e: React.MouseEvent) => handleNodeDbl(e, node.id),
      style: SVG_GRAB,
    };

    const delBtn = sel && (
      <g transform={`translate(${node.width + 2}, -14)`}
        data-del="true"
        style={SVG_POINTER}
        onPointerDown={e => { e.stopPropagation(); }}
        onPointerUp={e => { e.stopPropagation(); deleteNetworkNode(node.id); }}>
        <circle cx={10} cy={10} r={11} fill="#DC2626" stroke="white" strokeWidth={1.5}
          data-del="true" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
        <text x={10} y={10} textAnchor="middle" dominantBaseline="middle"
          data-del="true" fontSize={15} fill="white" fontWeight={700}
          style={SVG_NO_EVENTS}>×</text>
      </g>
    );

    const ports = (
      <>
        <circle cx={node.width / 2} cy={0} r={PORT_R}
          fill="white" stroke={c} strokeWidth={2.5}
          data-port="in" style={SVG_CROSSHAIR}
          onPointerDown={e => handlePortPD(e, node.id)} />
        <circle cx={node.width / 2} cy={getNodeHeight(node)} r={PORT_R}
          fill={c} stroke="white" strokeWidth={2}
          data-port="out" style={SVG_CROSSHAIR}
          onPointerDown={e => handlePortPD(e, node.id)} />
      </>
    );

    // ── CODE ──
    if (node.type === 'code') {
      const h = getNodeHeight(node);
      return (
        <g key={node.id} data-node={node.id} transform={`translate(${node.x},${node.y})`} {...commonG}>
          {sel && <rect x={-4} y={-4} width={node.width + 8} height={h + 8} rx={14}
            fill="none" stroke={c} strokeWidth={2.5} opacity={0.4} />}
          <rect width={node.width} height={h} rx={10}
            fill={c} stroke={sel ? '#fff' : c} strokeWidth={sel ? 2.5 : 0}
            filter={glowFilter || 'drop-shadow(0 3px 8px rgba(0,0,0,0.25))'} />
          <rect x={6} y={5} width={node.width - 12} height={4} rx={2} fill="rgba(255,255,255,0.25)" />
          <foreignObject x={10} y={15} width={node.width - 20} height={h - 30}>
            <NodeLabelDiv>{node.label}</NodeLabelDiv>
          </foreignObject>
          <text x={8} y={h - 7} fontSize={7.5} fontWeight={700}
            fill="rgba(255,255,255,0.6)" style={SVG_NO_EVENTS}>CODE</text>
          {ports}
          {delBtn}
        </g>
      );
    }

    // ── GROUP ──
    if (node.type === 'group') {
      const h = getNodeHeight(node);
      return (
        <g key={node.id} data-node={node.id} transform={`translate(${node.x},${node.y})`} {...commonG}>
          {sel && <rect x={-4} y={-4} width={node.width + 8} height={h + 8} rx={14}
            fill="none" stroke={c} strokeWidth={2.5} opacity={0.5} />}
          <rect width={node.width} height={h} rx={10}
            fill="white" stroke={c} strokeWidth={sel ? 2.5 : 2}
            filter={glowFilter || 'drop-shadow(0 3px 10px rgba(0,0,0,0.18))'} />
          <rect x={0} y={10} width={4} height={h - 20} fill={c + 'DD'} />
          <rect x={0} y={10} width={4} height={10} fill={c + 'DD'} />
          <rect x={0} y={h - 20} width={4} height={10} fill={c + 'DD'} />
          <text x={node.width - 8} y={12} textAnchor="end" fontSize={7.5} fontWeight={700}
            fill={c + 'BB'} style={SVG_NO_EVENTS_LETTER}>GROUP</text>
          <foreignObject x={12} y={18} width={node.width - 20} height={h - 34}>
            <GroupLabelDiv>{node.label}</GroupLabelDiv>
          </foreignObject>
          {node.subLabel && (
            <text x={node.width - 8} y={h - 7} fontSize={8.5} fill={c}
              textAnchor="end" fontWeight={700} style={SVG_NO_EVENTS}>
              ↑ {truncate(node.subLabel, 18)}
            </text>
          )}
          {ports}
          {delBtn}
        </g>
      );
    }

    // ── QUOTATION ──
    if (node.type === 'quotation') {
      const h = getNodeHeight(node);
      return (
        <g key={node.id} data-node={node.id} transform={`translate(${node.x},${node.y})`} {...commonG}>
          {sel && <rect x={-4} y={-4} width={node.width + 8} height={h + 8} rx={10}
            fill={c} opacity={0.15} />}
          <rect width={node.width} height={h} rx={7}
            fill="white" stroke={sel ? c : '#D0CDC9'} strokeWidth={sel ? 2 : 1.5}
            filter={glowFilter || 'drop-shadow(0 3px 10px rgba(0,0,0,0.15))'} />
          <rect x={0} y={0} width={5} height={h} rx={7} fill={c} style={SVG_NO_EVENTS} />
          <rect x={0} y={h / 2} width={5} height={h / 2} fill={c} style={SVG_NO_EVENTS} />
          <text x={14} y={22} fontSize={10.5} fontWeight={600} fill="#555" style={SVG_NO_EVENTS}>❝</text>
          <foreignObject x={22} y={14} width={node.width - 30} height={h - 30}>
            <QuotLabelDiv>{node.label}</QuotLabelDiv>
          </foreignObject>
          {node.subLabel && (
            <text x={14} y={h - 11} fontSize={9} fill={c} fontWeight={700} style={SVG_NO_EVENTS}>
              📄 {truncate(node.subLabel, 22)}
            </text>
          )}
          <text x={node.width - 8} y={10} textAnchor="end" fontSize={7.5} fontWeight={700}
            fill={c} opacity={0.7} style={SVG_NO_EVENTS}>QUOT</text>
          {ports}
          {delBtn}
        </g>
      );
    }

    // ── MEMO ──
    const h = getNodeHeight(node);
    return (
      <g key={node.id} data-node={node.id} transform={`translate(${node.x},${node.y})`} {...commonG}>
        {sel && <rect x={-4} y={-4} width={node.width + 8} height={h + 8} rx={12}
          fill="none" stroke={c} strokeWidth={2} opacity={0.5} />}
        <rect width={node.width} height={h} rx={8}
          fill={c + '11'} stroke={sel ? c : c + '66'} strokeWidth={sel ? 2.5 : 1.5}
          strokeDasharray="6,4" filter={glowFilter || 'drop-shadow(0 4px 12px rgba(0,0,0,0.06))'} />
        <rect width={node.width} height={16} rx={8} fill={c + '33'} />
        <foreignObject x={10} y={20} width={node.width - 20} height={h - 30}>
          <MemoLabelDiv>{node.label}</MemoLabelDiv>
        </foreignObject>
        {ports}
        {delBtn}
      </g>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const typeLabel = colorPickerModal
    ? (colorPickerModal.type === 'code' ? '코드'
      : colorPickerModal.type === 'group' ? '그룹'
      : colorPickerModal.type === 'quotation' ? '인용' : '메모')
    : '';

  return (
    <Root>
      {/* ── Color Picker Modal ── */}
      {colorPickerModal && (
        <ModalOverlay onClick={() => { colorPickerModal.resolve(null); setColorPickerModal(null); }}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>색상 선택</ModalTitle>
            <ModalSubtitle>새 {typeLabel}의 색상을 선택하세요</ModalSubtitle>
            <ColorGrid>
              {PRESET_COLORS.map(col => (
                <ColorDot key={col} $color={col} $selected={pickerColor === col}
                  onClick={() => setPickerColor(col)} />
              ))}
            </ColorGrid>
            <ColorPickerRow>
              <ColorPickerLabel>직접 입력:</ColorPickerLabel>
              <ColorPickerInput type="color" value={pickerColor}
                onChange={e => setPickerColor(e.target.value)} />
              <ColorPreviewSwatch $color={pickerColor} />
            </ColorPickerRow>
            <ModalActions>
              <ModalCancelBtn onClick={() => { colorPickerModal.resolve(null); setColorPickerModal(null); }}>
                취소
              </ModalCancelBtn>
              <ModalConfirmBtn $color={pickerColor}
                onClick={() => { colorPickerModal.resolve(pickerColor); setColorPickerModal(null); }}>
                추가
              </ModalConfirmBtn>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

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

        <SideTabBar>
          {(['code', 'group', 'quotation', 'memo'] as const).map(tab => (
            <SideTabBtn key={tab} $active={sideTab === tab} onClick={() => setSideTab(tab)}>
              {tab === 'code' ? '코드' : tab === 'group' ? '그룹' : tab === 'quotation' ? '인용' : '메모'}
            </SideTabBtn>
          ))}
        </SideTabBar>

        <SidebarScroll>
          {/* ── CODE TAB ── */}
          {sideTab === 'code' && (
            <>
              <TabHint>드래그하여 캔버스에 추가 (여러 번 추가 가능)</TabHint>
              {codes.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map(code => {
                const count = canvasSourceCounts.get(code.id) || 0;
                return (
                  <CodePill key={code.id} $color={code.color}
                    $highlighted={hoveredSourceId === code.id}
                    onMouseEnter={() => setHoveredSourceId(code.id)}
                    onMouseLeave={() => setHoveredSourceId(null)}
                    draggable onDragStart={e => {
                      e.dataTransfer.setData('nv-type', 'code');
                      e.dataTransfer.setData('nv-id', code.id);
                      e.dataTransfer.setData('nv-color', code.color);
                      e.dataTransfer.setData('nv-label', code.name);
                    }}>
                    <CodePillLabel>{code.name}</CodePillLabel>
                    {count > 0 && <CountBadge>{count}</CountBadge>}
                  </CodePill>
                );
              })}
              {codes.length === 0 && <TabEmpty>코드가 없습니다.</TabEmpty>}
            </>
          )}

          {/* ── GROUP TAB ── */}
          {sideTab === 'group' && (
            <>
              <TabHint>드래그하여 캔버스에 추가 (여러 번 추가 가능)</TabHint>
              {codeGroups
                .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
                .map(group => {
                  const parentCode = codes.find(c => c.id === group.codeId);
                  const count = canvasSourceCounts.get(group.id) || 0;
                  return (
                    <GroupPill key={group.id} $color={group.color}
                      $highlighted={hoveredSourceId === group.id}
                      onMouseEnter={() => setHoveredSourceId(group.id)}
                      onMouseLeave={() => setHoveredSourceId(null)}
                      draggable onDragStart={e => {
                        e.dataTransfer.setData('nv-type', 'group');
                        e.dataTransfer.setData('nv-id', group.id);
                        e.dataTransfer.setData('nv-color', group.color);
                        e.dataTransfer.setData('nv-label', group.name);
                        e.dataTransfer.setData('nv-sublabel', parentCode?.name || '');
                      }}>
                      <GroupPillBody>
                        <GroupPillName>{group.name}</GroupPillName>
                        {parentCode && (
                          <GroupPillParent $color={group.color}>↑ {parentCode.name}</GroupPillParent>
                        )}
                      </GroupPillBody>
                      {count > 0 && <CountBadgeDark $color={group.color}>{count}</CountBadgeDark>}
                    </GroupPill>
                  );
                })}
              {codeGroups.length === 0 && <TabEmpty>그룹이 없습니다.</TabEmpty>}
            </>
          )}

          {/* ── QUOTATION TAB ── */}
          {sideTab === 'quotation' && (
            <>
              <TabHint>드래그하여 캔버스에 추가 (여러 번 추가 가능)</TabHint>
              {enrichedQuotations.filter(q => !search || q.text.toLowerCase().includes(search.toLowerCase())).map(q => {
                const count = canvasSourceCounts.get(q.id) || 0;
                return (
                  <QuotPill key={q.id} $color={q.codeColor}
                    $highlighted={hoveredSourceId === q.id}
                    onMouseEnter={() => setHoveredSourceId(q.id)}
                    onMouseLeave={() => setHoveredSourceId(null)}
                    draggable onDragStart={e => {
                      e.dataTransfer.setData('nv-type', 'quotation');
                      e.dataTransfer.setData('nv-id', q.id);
                      e.dataTransfer.setData('nv-color', q.codeColor);
                      e.dataTransfer.setData('nv-label', q.text);
                      e.dataTransfer.setData('nv-sublabel', q.docName);
                    }}>
                    <QuotPillBody>
                      <QuotPillText>"{q.text}"</QuotPillText>
                      {q.docName && <QuotPillDoc>📄 {q.docName}</QuotPillDoc>}
                    </QuotPillBody>
                    {count > 0 && <CountBadgeDark $color={q.codeColor}>{count}</CountBadgeDark>}
                  </QuotPill>
                );
              })}
              {enrichedQuotations.length === 0 && <TabEmpty>인용문이 없습니다.</TabEmpty>}
            </>
          )}

          {/* ── MEMO TAB ── */}
          {sideTab === 'memo' && (
            <>
              <TabHint>저장된 메모 중 드래그</TabHint>
              {MEMO_COLORS.map((color, i) => (
                <MemoPill key={color} $color={color}
                  $highlighted={hoveredSourceId === color}
                  onMouseEnter={() => setHoveredSourceId(color)}
                  onMouseLeave={() => setHoveredSourceId(null)}
                  draggable onDragStart={e => {
                    e.dataTransfer.setData('nv-type', 'memo');
                    e.dataTransfer.setData('nv-color', color);
                  }}>
                  <MemoDot $color={color} />
                  기본 메모 {i + 1}
                </MemoPill>
              ))}
            </>
          )}
        </SidebarScroll>
      </Sidebar>

      {/* ── Canvas ── */}
      <CanvasWrap ref={canvasWrapRef} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>

        <Toolbar>
          <TBtn onClick={handleFit}>⊡ 맞추기</TBtn>
          <TDiv />
          <TBtn onClick={() => handleZoom(1.2)}>+</TBtn>
          <TZoom>{Math.round(zoom * 100)}%</TZoom>
          <TBtn onClick={() => handleZoom(0.8)}>−</TBtn>
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

        {nodes.length === 0 && (
          <EmptyHint>
            <EmptyIcon>🕸️</EmptyIcon>
            <EmptyTitle>캔버스가 비어 있습니다</EmptyTitle>
            <EmptyBody>
              왼쪽 패널에서 코드·그룹·인용문·메모를<br />
              드래그하여 캔버스에 배치하세요.<br />
              ● 포트를 드래그하면 연결선을 그릴 수 있습니다.
            </EmptyBody>
          </EmptyHint>
        )}

        <CanvasSvg $panning={isPanning} $selecting={!!selectionBox}
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
              const mx = (a.x + a.width / 2 + b.x + b.width / 2) / 2;
              const my = (a.y + aH + b.y) / 2;
              return (
                <g key={ed.id} className="edge-group" data-edge="true" style={SVG_POINTER}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={16}
                    onPointerDown={e => { e.stopPropagation(); deleteNetworkEdge(ed.id); }} />
                  <path d={d} fill="none" stroke="#999" strokeWidth={2}
                    className="edge-line" strokeDasharray="7,4" markerEnd="url(#nv-arr)"
                    style={SVG_EDGE_LINE} />
                  <g transform={`translate(${mx - 10}, ${my - 10})`}
                    className="edge-del"
                    onPointerDown={e => { e.stopPropagation(); deleteNetworkEdge(ed.id); }}
                    style={SVG_EDGE_DEL}>
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
                style={SVG_NO_EVENTS} />
            )}

            {/* Nodes */}
            {nodes.map(renderNode)}

            {/* Marquee */}
            {selectionBox && (() => {
              const x = Math.min(selectionBox.startX, selectionBox.currentX);
              const y = Math.min(selectionBox.startY, selectionBox.currentY);
              const w = Math.abs(selectionBox.currentX - selectionBox.startX);
              const h = Math.abs(selectionBox.currentY - selectionBox.startY);
              return (
                <rect x={x} y={y} width={w} height={h}
                  fill="rgba(99,102,241,0.08)"
                  stroke="rgba(99,102,241,0.7)"
                  strokeWidth={1.5 / zoom}
                  strokeDasharray={`${6 / zoom},${3 / zoom}`}
                  style={SVG_NO_EVENTS} />
              );
            })()}
          </g>
        </CanvasSvg>

        {/* Help ? */}
        <HelpWrap>
          <HelpTooltip>
            <HelpHeader>
              <span>🕸️</span> Graph 조작법
            </HelpHeader>
            {HELP_SECTIONS.map(section => (
              <HelpSection key={section.title}>
                <HelpSectionTitle>
                  <span>{section.icon}</span> {section.title}
                </HelpSectionTitle>
                {section.rows.map(([action, result]) => (
                  <HelpRow key={action}>
                    <HelpKey>{action}</HelpKey>
                    <HelpDesc>{result}</HelpDesc>
                  </HelpRow>
                ))}
              </HelpSection>
            ))}
            <HelpSpacer />
          </HelpTooltip>
          <HelpBtn>?</HelpBtn>
        </HelpWrap>

      </CanvasWrap>
    </Root>
  );
};