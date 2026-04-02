import { create } from 'zustand';
import type {
  Document, Quotation, QuotationMemo,
  Code, CodeGroup, AnalyticMemo, AppSettings, NVNode, NVEdge,
} from '../types';

const CODE_COLORS = [
  '#E07B54','#5B8FF9','#61D9A5','#F6BD16','#E96472',
  '#7B5EA7','#26C9C3','#F7A04B','#78B9EB','#A3CF62',
  '#C27BA0','#6D9EEB','#93C47D','#FFD966','#E06666',
];
let colorIndex = 0;
const getNextColor = () => CODE_COLORS[colorIndex++ % CODE_COLORS.length];

const LS_PROJECT  = 'code4quali_project_v2';
const LS_SETTINGS = 'code4quali_settings_v1';

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

/**
 * 구버전 호환 마이그레이션:
 *   v2.0 이전: comment(string), __group: 접두어 혼용
 *   v2.1:      comment(string) + groupId(string|null)
 *   v3.0:      memos(QuotationMemo[]) + groupId(string|null)
 */
function migrateQuotations(raw: unknown[]): Quotation[] {
  return (raw as Record<string, unknown>[]).map(q => {
    const comment = (q.comment as string | undefined) ?? '';
    const legacyGroup = comment.startsWith('__group:');

    // groupId 결정
    let groupId: string | null = (q.groupId as string | null) ?? null;
    if (!groupId && legacyGroup) {
      groupId = comment.replace('__group:', '');
    }

    // memos 결정: 이미 배열이면 그대로, 구버전 comment가 있으면 첫 메모로 변환
    let memos: QuotationMemo[];
    if (Array.isArray(q.memos)) {
      memos = q.memos as QuotationMemo[];
    } else {
      const body = legacyGroup ? '' : comment;
      memos = body.trim()
        ? [{ id: crypto.randomUUID(), body, createdAt: Date.now(), updatedAt: Date.now() }]
        : [];
    }

    const result: Quotation = {
      id: q.id as string,
      documentId: q.documentId as string,
      documentName: q.documentName as string,
      text: q.text as string,
      rowIndex: q.rowIndex as number,
      startOffset: q.startOffset as number,
      endOffset: q.endOffset as number,
      codes: (q.codes as string[]) ?? [],
      memos,
      groupId,
      color: (q.color as string) ?? '#E07B54',
      createdAt: q.createdAt as number,
    };
    return result;
  });
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

  // Quotation Memos
  addQuotationMemo: (quotationId: string, body: string) => QuotationMemo;
  updateQuotationMemo: (quotationId: string, memoId: string, body: string) => void;
  deleteQuotationMemo: (quotationId: string, memoId: string) => void;

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

  // Memos (Analytic)
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
    quotations: s.quotations.map(q => q.id === id ? { ...q, ...updates } : q),
    isDirty: true,
  })),
  deleteQuotation: (id) => set(s => ({
    quotations: s.quotations.filter(q => q.id !== id),
    isDirty: true,
  })),

  // ── Quotation Memo CRUD ──────────────────────────────────────────────────
  addQuotationMemo: (quotationId, body) => {
    const memo: QuotationMemo = {
      id: crypto.randomUUID(), body,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    set(s => ({
      quotations: s.quotations.map(q =>
        q.id === quotationId ? { ...q, memos: [...q.memos, memo] } : q
      ),
      isDirty: true,
    }));
    return memo;
  },
  updateQuotationMemo: (quotationId, memoId, body) => set(s => ({
    quotations: s.quotations.map(q =>
      q.id === quotationId
        ? { ...q, memos: q.memos.map(m => m.id === memoId ? { ...m, body, updatedAt: Date.now() } : m) }
        : q
    ),
    isDirty: true,
  })),
  deleteQuotationMemo: (quotationId, memoId) => set(s => ({
    quotations: s.quotations.map(q =>
      q.id === quotationId
        ? { ...q, memos: q.memos.filter(m => m.id !== memoId) }
        : q
    ),
    isDirty: true,
  })),

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
  deleteCodeGroup: (id) => set(s => ({
    quotations: s.quotations.map(q => q.groupId === id ? { ...q, groupId: null } : q),
    codeGroups: s.codeGroups.filter(g => g.id !== id),
    isDirty: true,
  })),

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
    memos: s.memos.map(m => m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m),
    isDirty: true,
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
  deleteNetworkEdge: (id) => set(s => ({
    networkEdges: s.networkEdges.filter(e => e.id !== id),
    isDirty: true,
  })),

  saveProject: () => {
    const s = get();
    const data = {
      version: '3.0', type: 'project', savedAt: Date.now(), projectName: s.projectName,
      documents: s.documents, quotations: s.quotations,
      codes: s.codes, codeGroups: s.codeGroups, memos: s.memos,
      networkNodes: s.networkNodes, networkEdges: s.networkEdges,
    };
    try {
      localStorage.setItem(LS_PROJECT, JSON.stringify(data));
      set({ isDirty: false, lastSavedAt: Date.now() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`⚠️ 저장 실패: 브라우저 저장 공간이 부족합니다.\n프로젝트를 JSON으로 내보내기(📤)하여 백업하세요.\n\n오류: ${msg}`);
    }
  },
  loadProject: () => {
    try {
      const raw = localStorage.getItem(LS_PROJECT);
      if (!raw) return false;
      const data = JSON.parse(raw);
      set({
        documents: data.documents || [],
        quotations: migrateQuotations(data.quotations || []),
        codes: data.codes || [],
        codeGroups: data.codeGroups || [],
        memos: data.memos || [],
        projectName: data.projectName || '새 프로젝트',
        networkNodes: data.networkNodes || [],
        networkEdges: data.networkEdges || [],
        isDirty: false,
        lastSavedAt: data.savedAt || null,
      });
      return true;
    } catch { return false; }
  },
  exportProject: () => {
    const s = get();
    const data = {
      version: '3.0', type: 'project', savedAt: Date.now(), projectName: s.projectName,
      documents: s.documents, quotations: s.quotations,
      codes: s.codes, codeGroups: s.codeGroups, memos: s.memos,
      networkNodes: s.networkNodes, networkEdges: s.networkEdges,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${s.projectName}_${new Date().toISOString().slice(0, 10)}.code4quali.json`;
    a.click();
    return json;
  },
  importProjectData: (json) => {
    try {
      const data = JSON.parse(json);
      set({
        documents: data.documents || [],
        quotations: migrateQuotations(data.quotations || []),
        codes: data.codes || [],
        codeGroups: data.codeGroups || [],
        memos: data.memos || [],
        projectName: data.projectName || '불러온 프로젝트',
        networkNodes: data.networkNodes || [],
        networkEdges: data.networkEdges || [],
        isDirty: false,
        lastSavedAt: data.savedAt || null,
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
      memos: [], networkNodes: [], networkEdges: [],
      activeDocumentId: null, selectedCodeId: null,
      projectName: '새 프로젝트', isDirty: false, lastSavedAt: null,
    });
  },
  clearAllData: () => {
    localStorage.removeItem(LS_PROJECT);
    localStorage.removeItem(LS_SETTINGS);
    colorIndex = 0;
    set({
      documents: [], quotations: [], codes: [], codeGroups: [],
      memos: [], activeDocumentId: null, selectedCodeId: null,
      projectName: '새 프로젝트', isDirty: false, lastSavedAt: null,
      settings: { ...DEFAULT_SETTINGS },
      sttStats: null,
    });
  },
}));