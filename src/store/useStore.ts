// ─── useStore.ts 에 추가할 sttStats 관련 코드 ───
//
// AppState 인터페이스에 추가:
//   sttStats: { total: number; done: number; results: number; stage: string } | null;
//   setSttStats: (stats: AppState['sttStats']) => void;
//
// 초기 state에 추가:
//   sttStats: null,
//
// actions에 추가:
//   setSttStats: (stats) => set({ sttStats: stats }),
//
// ──────────────────────────────────────────────
// 아래는 패치 후 useStore.ts 전체 파일입니다.

import { create } from 'zustand';
import type { Document, Quotation, Code, CodeGroup, AnalyticMemo, AppSettings, NVNode, NVEdge } from '../types';

const CODE_COLORS = [
  '#E07B54','#5B8FF9','#61D9A5','#F6BD16','#E96472',
  '#7B5EA7','#26C9C3','#F7A04B','#78B9EB','#A3CF62',
  '#C27BA0','#6D9EEB','#93C47D','#FFD966','#E06666',
];
let colorIndex = 0;
const getNextColor = () => CODE_COLORS[colorIndex++ % CODE_COLORS.length];

const LS_PROJECT  = 'qualcoder_project_v2';
const LS_SETTINGS = 'qualcoder_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  model: 'gemini-3.1-flash-lite-preview',
  autoSave: true,
  theme: 'light',
  interviewerLabel: '인터뷰어',
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}

interface SttStats {
  total: number;
  done: number;
  results: number;
  stage: string;
}

interface AppState {
  documents: Document[];
  quotations: Quotation[];
  codes: Code[];
  codeGroups: CodeGroup[];
  memos: AnalyticMemo[];
  activeDocumentId: string | null;
  selectedCodeId: string | null;
  activeView: string;
  projectName: string;
  settings: AppSettings;
  isDirty: boolean;
  lastSavedAt: number | null;
  networkNodes: NVNode[];
  networkEdges: NVEdge[];

  /** STT 탭이 TopBar에 실시간 통계를 공유하기 위한 슬라이스 */
  sttStats: SttStats | null;
  setSttStats: (stats: SttStats | null) => void;

  // Documents
  addDocument: (doc: Document) => void;
  setActiveDocument: (id: string) => void;
  removeDocument: (id: string) => void;

  // Quotations
  addQuotation: (q: Quotation) => void;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;

  // Codes
  addCode: (name: string, comment?: string) => Code;
  updateCode: (id: string, updates: Partial<Code>) => void;
  deleteCode: (id: string) => void;
  setSelectedCode: (id: string | null) => void;
  importCodes: (codes: Partial<Code>[]) => void;

  // Code-Quotation
  assignCodeToQuotation: (codeId: string, quotationId: string) => void;
  removeCodeFromQuotation: (codeId: string, quotationId: string) => void;

  // CodeGroups
  addCodeGroup: (codeId: string, name: string) => CodeGroup;
  updateCodeGroup: (id: string, updates: Partial<CodeGroup>) => void;
  deleteCodeGroup: (id: string) => void;

  // Memos
  addMemo: (title: string, body?: string) => AnalyticMemo;
  updateMemo: (id: string, updates: Partial<AnalyticMemo>) => void;
  deleteMemo: (id: string) => void;

  // Network
  setNetworkData: (nodes: NVNode[], edges: NVEdge[]) => void;
  updateNetworkNode: (id: string, updates: Partial<NVNode>) => void;
  addNetworkNode: (node: NVNode) => void;
  deleteNetworkNode: (id: string) => void;
  addNetworkEdge: (edge: NVEdge) => void;
  deleteNetworkEdge: (id: string) => void;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Project
  setActiveView: (view: string) => void;
  setProjectName: (name: string) => void;
  saveProject: () => void;
  loadProject: () => boolean;
  exportProject: () => string;
  importProjectData: (json: string) => boolean;
  clearProject: () => void;

  /** localStorage 전체 초기화 (설정 포함) */
  clearAllData: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  documents: [],
  quotations: [],
  codes: [],
  codeGroups: [],
  memos: [],
  networkNodes: [],
  networkEdges: [],
  activeDocumentId: null,
  selectedCodeId: null,
  activeView: 'documents',
  projectName: '새 프로젝트',
  settings: loadSettings(),
  isDirty: false,
  lastSavedAt: null,
  sttStats: null,

  setSttStats: (stats) => set({ sttStats: stats }),

  addDocument: (doc) => set(s => ({ documents: [...s.documents, doc], isDirty: true })),
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  removeDocument: (id) => set(s => ({
    documents: s.documents.filter(d => d.id !== id),
    quotations: s.quotations.filter(q => q.documentId !== id),
    activeDocumentId: s.activeDocumentId === id ? null : s.activeDocumentId,
    isDirty: true,
  })),

  addQuotation: (q) => set(s => ({ quotations: [...s.quotations, q], isDirty: true })),
  updateQuotation: (id, updates) => set(s => ({
    quotations: s.quotations.map(q => q.id === id ? { ...q, ...updates } : q), isDirty: true,
  })),
  deleteQuotation: (id) => set(s => ({ quotations: s.quotations.filter(q => q.id !== id), isDirty: true })),

  addCode: (name, comment = '') => {
    const code: Code = {
      id: crypto.randomUUID(), name, comment,
      color: getNextColor(),
      quotationIds: [], createdAt: Date.now(),
    };
    set(s => ({ codes: [...s.codes, code], isDirty: true }));
    return code;
  },
  updateCode: (id, updates) => set(s => ({
    codes: s.codes.map(c => c.id === id ? { ...c, ...updates } : c), isDirty: true,
  })),
  deleteCode: (id) => set(s => ({
    codes: s.codes.filter(c => c.id !== id),
    quotations: s.quotations.map(q => ({ ...q, codes: q.codes.filter(c => c !== id) })),
    codeGroups: s.codeGroups.filter(g => g.codeId !== id),
    isDirty: true,
  })),
  setSelectedCode: (id) => set({ selectedCodeId: id }),
  importCodes: (incoming) => {
    const existing = get().codes;
    const toAdd = incoming
      .filter(c => c.name && !existing.find(e => e.name === c.name))
      .map(c => ({
        id: c.id ?? crypto.randomUUID(),
        name: c.name!,
        comment: c.comment ?? '',
        color: c.color ?? getNextColor(),
        quotationIds: c.quotationIds ?? [],
        createdAt: c.createdAt ?? Date.now(),
      }));
    set(s => ({ codes: [...s.codes, ...toAdd], isDirty: true }));
  },

  assignCodeToQuotation: (codeId, quotationId) => {
    set(s => ({
      quotations: s.quotations.map(q =>
        q.id === quotationId && !q.codes.includes(codeId)
          ? { ...q, codes: [...q.codes, codeId] } : q
      ),
      codes: s.codes.map(c =>
        c.id === codeId && !c.quotationIds.includes(quotationId)
          ? { ...c, quotationIds: [...c.quotationIds, quotationId] } : c
      ),
      isDirty: true,
    }));
  },
  removeCodeFromQuotation: (codeId, quotationId) => {
    set(s => ({
      quotations: s.quotations.map(q =>
        q.id === quotationId ? { ...q, codes: q.codes.filter(c => c !== codeId) } : q
      ),
      codes: s.codes.map(c =>
        c.id === codeId ? { ...c, quotationIds: c.quotationIds.filter(id => id !== quotationId) } : c
      ),
      isDirty: true,
    }));
  },

  addCodeGroup: (codeId, name) => {
    const group: CodeGroup = { id: crypto.randomUUID(), codeId, name, color: '' };
    set(s => ({ codeGroups: [...s.codeGroups, group], isDirty: true }));
    return group;
  },
  updateCodeGroup: (id, updates) => set(s => ({
    codeGroups: s.codeGroups.map(g => g.id === id ? { ...g, ...updates } : g), isDirty: true,
  })),
  deleteCodeGroup: (id) => set(s => ({ codeGroups: s.codeGroups.filter(g => g.id !== id), isDirty: true })),

  addMemo: (title, body = '') => {
    const memo: AnalyticMemo = {
      id: crypto.randomUUID(), title, body,
      linkedCodeIds: [], linkedQuotationIds: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    set(s => ({ memos: [...s.memos, memo], isDirty: true }));
    return memo;
  },
  updateMemo: (id, updates) => set(s => ({
    memos: s.memos.map(m => m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m), isDirty: true,
  })),
  deleteMemo: (id) => set(s => ({ memos: s.memos.filter(m => m.id !== id), isDirty: true })),

  updateSettings: (updates) => {
    const next = { ...get().settings, ...updates };
    localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
    set({ settings: next });
  },

  setActiveView: (view) => set({ activeView: view }),
  setProjectName: (name) => set({ projectName: name, isDirty: true }),

  setNetworkData: (nodes, edges) => set({ networkNodes: nodes, networkEdges: edges, isDirty: true }),
  updateNetworkNode: (id, updates) => set(s => ({
    networkNodes: s.networkNodes.map(n => n.id === id ? { ...n, ...updates } : n),
    isDirty: true,
  })),
  addNetworkNode: (node) => set(s => ({ networkNodes: [...s.networkNodes, node], isDirty: true })),
  deleteNetworkNode: (id) => set(s => ({
    networkNodes: s.networkNodes.filter(n => n.id !== id),
    networkEdges: s.networkEdges.filter(e => e.from !== id && e.to !== id),
    isDirty: true,
  })),
  addNetworkEdge: (edge) => set(s => ({ networkEdges: [...s.networkEdges, edge], isDirty: true })),
  deleteNetworkEdge: (id) => set(s => ({ networkEdges: s.networkEdges.filter(e => e.id !== id), isDirty: true })),

  saveProject: () => {
    const s = get();
    const data = {
      version: '2.0', savedAt: Date.now(), projectName: s.projectName,
      documents: s.documents, quotations: s.quotations,
      codes: s.codes, codeGroups: s.codeGroups, memos: s.memos,
      networkNodes: s.networkNodes, networkEdges: s.networkEdges,
    };
    localStorage.setItem(LS_PROJECT, JSON.stringify(data));
    set({ isDirty: false, lastSavedAt: Date.now() });
  },
  loadProject: () => {
    try {
      const raw = localStorage.getItem(LS_PROJECT);
      if (!raw) return false;
      const data = JSON.parse(raw);
      set({
        documents: data.documents || [], quotations: data.quotations || [],
        codes: data.codes || [], codeGroups: data.codeGroups || [],
        memos: data.memos || [], projectName: data.projectName || '새 프로젝트',
        networkNodes: data.networkNodes || [], networkEdges: data.networkEdges || [],
        isDirty: false, lastSavedAt: data.savedAt || null,
      });
      return true;
    } catch { return false; }
  },
  exportProject: () => {
    const s = get();
    const data = {
      version: '2.0', savedAt: Date.now(), projectName: s.projectName,
      documents: s.documents, quotations: s.quotations,
      codes: s.codes, codeGroups: s.codeGroups, memos: s.memos,
      networkNodes: s.networkNodes, networkEdges: s.networkEdges,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${s.projectName}_${new Date().toISOString().slice(0, 10)}.qualcoder.json`;
    a.click();
    return json;
  },
  importProjectData: (json) => {
    try {
      const data = JSON.parse(json);
      set({
        documents: data.documents || [], quotations: data.quotations || [],
        codes: data.codes || [], codeGroups: data.codeGroups || [],
        memos: data.memos || [], projectName: data.projectName || '불러온 프로젝트',
        networkNodes: data.networkNodes || [], networkEdges: data.networkEdges || [],
        isDirty: false, lastSavedAt: data.savedAt || null,
      });
      colorIndex = (data.codes || []).length;
      return true;
    } catch { return false; }
  },
  clearProject: () => {
    localStorage.removeItem(LS_PROJECT);
    colorIndex = 0;
    set({
      documents: [], quotations: [], codes: [], codeGroups: [],
      memos: [], networkNodes: [], networkEdges: [], activeDocumentId: null, selectedCodeId: null,
      projectName: '새 프로젝트', isDirty: false, lastSavedAt: null,
    });
  },

  /** localStorage 전체 초기화 (프로젝트 + 설정 모두 삭제 후 리프레시) */
  clearAllData: () => {
    localStorage.removeItem(LS_PROJECT);
    localStorage.removeItem(LS_SETTINGS);
    colorIndex = 0;
    // 리프레시는 호출부에서 직접 처리 (confirm 2회 후)
    set({
      documents: [], quotations: [], codes: [], codeGroups: [],
      memos: [], activeDocumentId: null, selectedCodeId: null,
      projectName: '새 프로젝트', isDirty: false, lastSavedAt: null,
      settings: { ...DEFAULT_SETTINGS },
      sttStats: null,
    });
  },
}));