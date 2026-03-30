/**
 * Tab Exchange Utilities
 * 각 탭의 결과를 표준화된 포맷으로 내보내고 다음 탭에서 불러올 수 있게 합니다.
 *
 * 파이프라인:
 *   [STT → .qualcsv]  →  [Docs → .qualproject]  →  [Codes/Board → .qualcodes]  →  [XLSX 최종]
 */

import * as XLSX from 'xlsx';
import type { Document, Code, Quotation, CodeGroup, AnalyticMemo } from '../types';

/* ── STT 결과 → CSV 다운로드 ── */
export function downloadTranscriptCSV(
  rows: { time: string; speaker: string; content: string }[],
  filename: string
) {
  const header = '시간,화자,내용\n';
  const body = rows.map(r =>
    `${r.time},${r.speaker},"${r.content.replace(/"/g,'""')}"`
  ).join('\n');
  downloadText('\uFEFF' + header + body, filename.replace(/\..*$/, '') + '_전사결과.csv', 'text/csv');
}

/* ── 코드북 내보내기 (Codes → JSON) ── */
export function downloadCodebook(codes: Code[], codeGroups: CodeGroup[]) {
  const data = { version: '1.0', type: 'codebook', savedAt: Date.now(), codes, codeGroups };
  downloadText(JSON.stringify(data, null, 2), `codebook_${today()}.json`, 'application/json');
}

/* ── 코딩 결과 내보내기 (Codes + Quotations) ── */
export function downloadCodingResult(
  codes: Code[], quotations: Quotation[],
  codeGroups: CodeGroup[], memos: AnalyticMemo[]
) {
  const data = { version: '1.0', type: 'coding', savedAt: Date.now(), codes, quotations, codeGroups, memos };
  downloadText(JSON.stringify(data, null, 2), `coding_result_${today()}.json`, 'application/json');
}

/* ── 전체 프로젝트 내보내기 ── */
export function downloadFullProject(
  documents: Document[], codes: Code[], quotations: Quotation[],
  codeGroups: CodeGroup[], memos: AnalyticMemo[], projectName: string
) {
  const data = {
    version: '3.0', type: 'project', savedAt: Date.now(), projectName,
    documents, codes, quotations, codeGroups, memos,
  };
  downloadText(JSON.stringify(data, null, 2), `${projectName}_${today()}.qualcoder.json`, 'application/json');
}

/** Quotation의 memos를 세미콜론으로 이어 붙인 단일 문자열로 반환 (XLSX/CSV 출력용) */
function joinMemos(q: Quotation): string {
  return q.memos.map(m => m.body).filter(Boolean).join(' ; ');
}

/* ── XLSX 최종 내보내기 ── */
export function downloadXLSX(codes: Code[], quotations: Quotation[], documents: Document[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: 코드북
  const codesData = [
    ['키워드(Keyword)', '설명(Description)', '색상', 'Quotation 수'],
    ...codes.map(c => [c.name, c.comment, c.color, c.quotationIds.length])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(codesData), 'codes');

  // Sheet 2: Quotations
  const qData = [
    ['문서', '시간', '텍스트', '코드들', '메모'],
    ...quotations.map(q => {
      const doc = documents.find(d => d.id === q.documentId);
      const row = doc?.rows[q.rowIndex];
      return [
        q.documentName,
        row?.time || '',
        q.text,
        q.codes.map(cid => codes.find(c => c.id === cid)?.name || cid).join('; '),
        joinMemos(q),
      ];
    })
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qData), 'quotations');

  // Sheet 3: 코드-Quotation 매핑
  const mapData = [['코드', '문서', 'Quotation 텍스트', '메모']];
  for (const code of codes) {
    for (const qid of code.quotationIds) {
      const q = quotations.find(q => q.id === qid);
      if (!q) continue;
      mapData.push([code.name, q.documentName, q.text, joinMemos(q)]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mapData), 'code-quotation');

  // Sheet 4: 문서별 통계
  const statData: (string|number)[][] = [['문서명', '총 행수', '코드수', 'Quotation수', '상태']];
  for (const d of documents) statData.push([d.name, d.rows.length, d.codes, d.quotations, d.status]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statData), 'documents');

  XLSX.writeFile(wb, `qualcoder_export_${today()}.xlsx`);
}

/* ── 코드북 JSON 파싱 ── */
export function parseCodebookJSON(json: string): { codes: Partial<Code>[]; codeGroups: Partial<CodeGroup>[] } | null {
  try {
    const data = JSON.parse(json);
    if (data.type === 'codebook' || data.codes) {
      return { codes: data.codes || [], codeGroups: data.codeGroups || [] };
    }
    // MEDial-codes.xlsx style: array of {name, comment}
    if (Array.isArray(data)) {
      return {
        codes: data.map((d: Record<string, unknown>) => ({
          name: String(d.name || d['name'] || ''),
          comment: String(d.comment || d['comment'] || ''),
        })),
        codeGroups: [],
      };
    }
    return null;
  } catch { return null; }
}

/* ── CSV 텍스트 파싱 (STT 결과 → Document) ── */
export function parseTranscriptCSV(text: string): { time: string; speaker: string; content: string }[] {
  const lines = text.replace(/^\uFEFF/, '').split('\n');
  const rows: { time: string; speaker: string; content: string }[] = [];
  let headerSkipped = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!headerSkipped && trimmed.includes('시간') && trimmed.includes('화자')) { headerSkipped = true; continue; }
    const m = trimmed.match(/^([^,]*),([^,]*),"?(.*?)"?$/);
    if (m) rows.push({ time: m[1].trim(), speaker: m[2].trim(), content: m[3].replace(/""/g, '"').trim() });
  }
  return rows;
}

/* ── helpers ── */
function downloadText(text: string, filename: string, type: string) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** ── Query 결과 CSV 다운로드 ── */
export function downloadQueryCSV(results: Quotation[], filename: string) {
  const header = '문서,텍스트,코드들,메모\n';
  const body = results.map(q => {
    const codesStr = q.codes.join('; ');
    const memosStr = joinMemos(q);
    return `"${q.documentName.replace(/"/g,'""')}","${q.text.replace(/"/g,'""')}","${codesStr.replace(/"/g,'""')}","${memosStr.replace(/"/g,'""')}"`;
  }).join('\n');
  downloadText('\uFEFF' + header + body, filename, 'text/csv');
}

/** ── 행렬 결과 CSV 다운로드 ── */
export function downloadMatrixCSV(matrix: string[][], filename: string) {
  const body = matrix.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')
  ).join('\n');
  downloadText('\uFEFF' + body, filename, 'text/csv');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function readFileText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target?.result as string);
    reader.onerror = rej;
    reader.readAsText(file, 'utf-8');
  });
}