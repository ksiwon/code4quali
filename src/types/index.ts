export interface TranscriptRow {
  time: string;
  speaker: string;
  content: string;
}

export type NVNodeType = 'code' | 'quotation' | 'memo';

export interface NVNode {
  id: string;
  type: NVNodeType;
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceId?: string; // codeId or quotationId
  subLabel?: string; // e.g. document name for quotation
}

export interface NVEdge {
  id: string;
  from: string;
  to: string;
}

export interface Document {
  id: string;
  name: string;
  rows: TranscriptRow[];
  codes: number;
  quotations: number;
  status: string;
}

/** Quotation 산하 개별 메모 */
export interface QuotationMemo {
  id: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface Quotation {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  rowIndex: number;
  startOffset: number;
  endOffset: number;
  codes: string[];
  memos: QuotationMemo[];  // Quotation 산하 복수 메모 (comment 대체)
  groupId: string | null;  // 코드 그룹 소속
  color: string;
  createdAt: number;
}

export interface Code {
  id: string;
  name: string;
  comment: string;   // 코드 설명(Description)
  color: string;
  quotationIds: string[];
  createdAt?: number;
}

export interface CodeGroup {
  id: string;
  name: string;
  color: string;
  codeId: string;
}

export interface AnalyticMemo {
  id: string;
  title: string;
  body: string;
  linkedCodeIds: string[];
  linkedQuotationIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  geminiApiKey: string;
  model: string;
  autoSave: boolean;
  theme: 'light' | 'dark';
  interviewerLabel: string;
}

export interface ProjectData {
  version: string;
  savedAt: number;
  projectName: string;
  documents: Document[];
  quotations: Quotation[];
  codes: Code[];
  codeGroups: CodeGroup[];
  memos: AnalyticMemo[];
  networkNodes?: NVNode[];
  networkEdges?: NVEdge[];
}

export type ActiveView =
  | 'documents' | 'codes' | 'board' | 'network'
  | 'query' | 'matrix' | 'memos' | 'transcribe' | 'settings';