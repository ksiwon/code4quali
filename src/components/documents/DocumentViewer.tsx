import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';
import type { Quotation } from '../../types';
import { getSpeakerColor, getSpeakerBadgeColor } from '../../utils/fileParser';

/* ─── Styled ─────────────────────────── */
const Outer = styled.div`flex:1; display:flex; flex-direction:column; overflow:hidden; background:var(--surface);`;
const DocHeader = styled.div`
  padding:10px 16px; border-bottom:1px solid var(--border);
  display:flex; align-items:center; gap:10px; flex-shrink:0; background:var(--surface2);
`;
const DocTitle = styled.div`font-size:13px; font-weight:700; color:var(--text);`;
const Wrap = styled.div`flex:1; display:flex; overflow:hidden; position:relative;`;
const TranscriptArea = styled.div`flex:1; overflow-y:auto; padding:20px 16px 20px 20px;`;

const RowWrap = styled.div`
  display:flex; margin-bottom:2px; border-radius:6px;
  &:hover{background:var(--surface2);}
`;
const TimeCell = styled.div`width:48px; flex-shrink:0; font-size:10.5px; color:var(--text-muted); padding-top:9px; font-variant-numeric:tabular-nums; user-select:none;`;
const SpeakerCell = styled.div`width:68px; flex-shrink:0; padding:7px 5px;`;
const SpeakerBadge = styled.span<{color:string;bg:string}>`
  font-size:10px; font-weight:700; color:${p=>p.color}; background:${p=>p.bg};
  padding:2px 6px; border-radius:99px; white-space:nowrap; display:inline-block;
  max-width:64px; overflow:hidden; text-overflow:ellipsis;
`;
const ContentCell = styled.div<{isQ?:boolean}>`
  flex:1; padding:7px 8px; font-size:13.5px; line-height:1.75; cursor:text; user-select:text;
  font-weight:${p=>p.isQ?'600':'400'}; color:var(--text);
`;
const Mark = styled.mark<{color:string;active?:boolean}>`
  background:${p=>p.color}28; border-bottom:2.5px solid ${p=>p.color};
  border-radius:2px; padding:0 1px; cursor:pointer;
  outline:${p=>p.active?`2px solid ${p.color}`:'none'};
  &:hover{background:${p=>p.color}44;}
`;

/* ── Margin ── */
const MarginArea = styled.div`
  width:240px; flex-shrink:0; overflow-y:auto; border-left:1px solid var(--border);
  padding:20px 10px; background:#FAFAF8;
`;
const QTag = styled.div<{color:string;active?:boolean}>`
  background:${p=>p.color}14; border:1.5px solid ${p=>p.active?p.color:p.color+'44'};
  border-left:3px solid ${p=>p.color}; border-radius:7px;
  padding:6px 9px; margin-bottom:7px; cursor:pointer; transition:all 0.15s;
  &:hover{background:${p=>p.color}28; border-color:${p=>p.color};}
`;
const QTagText = styled.div`font-size:11px; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;`;
const QTagCode = styled.div<{color:string}>`font-size:10px; font-weight:700; color:${p=>p.color}; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`;

/* ── Popup ── */
const Popup = styled.div<{x:number;y:number}>`
  position:fixed; left:${p=>p.x}px; top:${p=>p.y}px;
  background:white; border:1.5px solid var(--border); border-radius:12px;
  box-shadow:0 12px 40px rgba(0,0,0,0.18); padding:14px; z-index:500;
  width:340px; max-height:75vh; overflow-y:auto;
`;
const PopupTitle = styled.div`font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:10px;`;
const PopupPreview = styled.div`
  font-size:12px; background:var(--surface2); padding:7px 9px; border-radius:7px;
  border:1px solid var(--border); color:var(--text); line-height:1.5; margin-bottom:10px;
  font-style:italic; overflow:hidden; text-overflow:ellipsis;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
`;
const SearchInput = styled.input`
  width:100%; border:1px solid var(--border); border-radius:7px; padding:6px 9px;
  font-size:12px; outline:none; background:var(--surface2); color:var(--text); margin-bottom:7px;
  &:focus{border-color:var(--accent);}
  &::placeholder{color:var(--text-muted);}
`;
const CodeRow = styled.div<{on?:boolean;color:string}>`
  display:flex; align-items:center; gap:7px; padding:6px 9px; border-radius:6px; cursor:pointer;
  background:${p=>p.on?p.color+'18':'transparent'}; transition:background 0.1s;
  &:hover{background:${p=>p.color}18;}
`;
const Dot = styled.div<{color:string}>`width:10px;height:10px;border-radius:50%;background:${p=>p.color};flex-shrink:0;`;
const CodeName = styled.div`font-size:12px; color:var(--text); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`;
const ToggleSwitch = styled.div<{on?:boolean}>`
  width:30px; height:17px; border-radius:99px; background:${p=>p.on?'var(--accent)':'var(--border2)'}; position:relative; flex-shrink:0;
  &::after{content:''; position:absolute; left:${p=>p.on?'15px':'2px'}; top:2px; width:13px; height:13px; border-radius:50%; background:white; transition:left 0.15s;}
`;
const NewCodeRow = styled.div`display:flex; gap:6px; margin-top:7px;`;
const NewCodeInput = styled.input`
  flex:1; border:1px solid var(--border); border-radius:6px; padding:6px 9px;
  font-size:12px; outline:none; background:white; color:var(--text);
  &:focus{border-color:var(--accent);}
  &::placeholder{color:var(--text-muted);}
`;
const PopBtn = styled.button<{v?:'accent'|'danger'|'ghost'}>`
  font-size:11.5px; font-weight:700; padding:6px 12px; border-radius:7px; white-space:nowrap;
  background:${p=>p.v==='accent'?'var(--accent)':p.v==='danger'?'#FEE2E2':'var(--surface2)'};
  color:${p=>p.v==='accent'?'white':p.v==='danger'?'#DC2626':'var(--text-secondary)'};
  border:1px solid ${p=>p.v==='danger'?'#FECACA':'transparent'};
  &:hover{opacity:0.8;}
`;
const ActionRow = styled.div`display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:9px;`;

/* ── Memo Section ── */
const MemoSection = styled.div`
  border-top:1px solid var(--border); margin-top:10px; padding-top:10px;
`;
const MemoSectionTitle = styled.div`
  font-size:10px; font-weight:800; color:var(--text-muted);
  text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;
`;
const MemoItem = styled.div`
  background:var(--surface2); border:1px solid var(--border); border-radius:7px;
  padding:7px 9px; margin-bottom:6px;
`;
const MemoBody = styled.div`font-size:12px; color:var(--text); line-height:1.5; white-space:pre-wrap;`;
const MemoMeta = styled.div`font-size:10px; color:var(--text-muted); margin-top:4px; display:flex; justify-content:space-between;`;
const MemoEditArea = styled.textarea`
  width:100%; border:1px solid var(--border); border-radius:7px; padding:7px 9px;
  font-size:12px; resize:none; outline:none; min-height:54px;
  background:var(--surface2); color:var(--text); font-family:inherit; line-height:1.5;
  &:focus{border-color:var(--accent);}
  &::placeholder{color:var(--text-muted);}
`;
const MemoAddRow = styled.div`display:flex; gap:6px; margin-top:6px;`;
const IconBtn = styled.button`
  font-size:10px; color:var(--text-muted); background:none; border:none; cursor:pointer; padding:2px 4px;
  &:hover{color:var(--accent);}
`;

/* ── AI Suggest ── */
const AiBox = styled.div`
  border:1.5px solid var(--accent); border-radius:9px; padding:10px 12px; margin:9px 0;
  background:var(--accent-light); display:flex; flex-direction:column; gap:7px;
`;
const AiTitle = styled.div`font-size:10px; font-weight:800; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;`;
const AiChip = styled.button<{color:string}>`
  display:flex; align-items:center; gap:6px; padding:5px 9px; border-radius:99px;
  background:${p=>p.color}18; border:1.5px solid ${p=>p.color}55; cursor:pointer;
  font-size:11.5px; font-weight:600; color:${p=>p.color}; transition:background 0.1s;
  text-align:left;
  &:hover{background:${p=>p.color}33;}
`;
const AiChips = styled.div`display:flex; flex-wrap:wrap; gap:5px;`;
const Spinner = styled.div`
  width:12px;height:12px;border:2px solid transparent;border-top-color:var(--accent);
  border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;

/* ── Empty ── */
const Empty = styled.div`flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text-muted);`;

interface Sel {
  text:string; rowIndex:number; startOffset:number; endOffset:number; x:number; y:number;
}

export const DocumentViewer: React.FC = () => {
  const {
    documents, activeDocumentId, quotations, codes,
    addQuotation, deleteQuotation,
    addCode, assignCodeToQuotation, removeCodeFromQuotation,
    addQuotationMemo, updateQuotationMemo, deleteQuotationMemo,
    settings,
  } = useStore();

  const [sel, setSel] = useState<Sel|null>(null);
  const [editingQId, setEditingQId] = useState<string|null>(null);
  const [codeSearch, setCodeSearch] = useState('');
  const [newCodeName, setNewCodeName] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<{name:string;reason:string}[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  // 메모 입력 상태
  const [newMemoBody, setNewMemoBody] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<string|null>(null);
  const [editingMemoBody, setEditingMemoBody] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const quotationCounter = useRef(0);

  const doc = documents.find(d => d.id === activeDocumentId);
  const docQuotations = quotations.filter(q => q.documentId === activeDocumentId);
  const currentQ = editingQId ? quotations.find(q => q.id === editingQId) : null;

  const filteredCodes = codes.filter(c =>
    !codeSearch || c.name.toLowerCase().includes(codeSearch.toLowerCase())
  );

  /* ── AI suggest ── */
  const fetchAiSuggestions = useCallback(async (text: string) => {
    if (!settings.geminiApiKey || !text.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const existingCodes = codes.map(c => c.name).slice(0, 30).join(', ');
      const prompt = `당신은 질적 연구(qualitative research)의 인터뷰 코딩 전문가입니다.
다음 인터뷰 발화에 적합한 분석 코드(코드명)를 추천해주세요.

[발화]
"${text}"

[현재 프로젝트의 기존 코드들]
${existingCodes || '(없음)'}

[지시사항]
1. 기존 코드 중 적합한 것이 있으면 반드시 포함하세요
2. 새 코드가 필요하면 간결한 한국어 코드명으로 제안하세요 (예: [Capability] 진료 대기 시간 과다)
3. 최대 4개, 각 코드에 이유를 한 문장으로 설명
4. JSON 배열만 출력 (다른 텍스트 없이):
[{"name":"코드명","reason":"이유"}]`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.geminiApiKey}`,
        {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            contents:[{parts:[{text:prompt}]}],
            generationConfig:{temperature:0.3,maxOutputTokens:512}
          })
        }
      );
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const clean = raw.replace(/```json|```/g,'').trim();
      const parsed = JSON.parse(clean);
      setAiSuggestions(Array.isArray(parsed) ? parsed.slice(0,4) : []);
    } catch { setAiSuggestions([]); }
    setAiLoading(false);
  }, [settings, codes]);

  /* ── handle mouse up ── */
  const handleMouseUp = useCallback((e: React.MouseEvent, rowIndex: number) => {
    const s = window.getSelection();
    if (!s || s.isCollapsed || !s.toString().trim()) return;
    const text = s.toString().trim();
    const range = s.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // DOM Range 기반 offset 계산
    const container = e.currentTarget as HTMLElement;
    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;

    setSel({
      text, rowIndex, startOffset, endOffset: startOffset + text.length,
      x: Math.min(rect.left + 10, window.innerWidth - 360),
      y: Math.min(rect.bottom + 8, window.innerHeight - 300),
    });
    setNewCodeName(''); setCodeSearch(''); setEditingQId(null);
    setAiSuggestions([]);
    if (settings.geminiApiKey) fetchAiSuggestions(text);
  }, [settings.geminiApiKey, fetchAiSuggestions]);

  /* ── create quotation ── */
  const handleCreate = () => {
    if (!sel || !doc) return;
    const newQ: Quotation = {
      id: crypto.randomUUID(),
      documentId: doc.id, documentName: doc.name,
      text: sel.text, rowIndex: sel.rowIndex,
      startOffset: sel.startOffset, endOffset: sel.endOffset,
      codes: [], memos: [], groupId: null,
      color: '#E07B54', createdAt: ++quotationCounter.current,
    };
    addQuotation(newQ);
    setEditingQId(newQ.id);
    setSel(null);
    if (settings.geminiApiKey && !aiSuggestions.length) fetchAiSuggestions(newQ.text);
  };

  const handleDone = useCallback(() => {
    setSel(null); setEditingQId(null);
    setNewCodeName(''); setCodeSearch('');
    setNewMemoBody(''); setEditingMemoId(null); setEditingMemoBody('');
    setAiSuggestions([]);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleAddNewCode = () => {
    if (!newCodeName.trim() || !editingQId) return;
    const existing = codes.find(c => c.name.toLowerCase() === newCodeName.trim().toLowerCase());
    const code = existing || addCode(newCodeName.trim());
    assignCodeToQuotation(code.id, editingQId);
    setNewCodeName('');
  };

  const handleApplyAiSuggestion = (name: string) => {
    if (!editingQId) return;
    const existing = codes.find(c => c.name.toLowerCase() === name.toLowerCase());
    const code = existing || addCode(name);
    assignCodeToQuotation(code.id, editingQId);
    setAiSuggestions(prev => prev.filter(s => s.name !== name));
  };

  /* ── memo handlers ── */
  const handleAddMemo = () => {
    if (!newMemoBody.trim() || !editingQId) return;
    addQuotationMemo(editingQId, newMemoBody.trim());
    setNewMemoBody('');
  };

  const handleSaveMemoEdit = () => {
    if (!editingMemoId || !editingQId) return;
    updateQuotationMemo(editingQId, editingMemoId, editingMemoBody);
    setEditingMemoId(null); setEditingMemoBody('');
  };

  /* ── click outside close ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) handleDone();
    };
    if (sel || editingQId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sel, editingQId, handleDone]);

  /* ── render highlighted text (offset 기반) ── */
  const renderContent = (content: string, rowIndex: number) => {
    const rowQs = docQuotations
      .filter(q => q.rowIndex === rowIndex)
      .sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);

    if (!rowQs.length) return content;

    const result: React.ReactNode[] = [];
    let cursor = 0;

    for (const q of rowQs) {
      const start = q.startOffset;
      const end = q.endOffset;
      if (start < cursor) continue;
      if (start > content.length || end > content.length) continue;

      const codeColor = q.codes.length
        ? (codes.find(c => c.id === q.codes[0])?.color || '#E07B54')
        : '#E07B54';

      if (start > cursor) result.push(content.slice(cursor, start));
      result.push(
        <Mark key={q.id} color={codeColor} active={q.id === editingQId}
          onClick={e => {
            e.stopPropagation();
            setEditingQId(q.id);
            setNewMemoBody(''); setEditingMemoId(null); setEditingMemoBody('');
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            setSel({ text: q.text, rowIndex, startOffset: q.startOffset, endOffset: q.endOffset,
              x: Math.min(rect.left, window.innerWidth - 360), y: rect.bottom + 6 });
            if (settings.geminiApiKey && !aiSuggestions.length) fetchAiSuggestions(q.text);
          }}
        >{content.slice(start, end)}</Mark>
      );
      cursor = end;
    }
    if (cursor < content.length) result.push(content.slice(cursor));
    return result;
  };

  /* ── margin quotations by row ── */
  const marginByRow: Record<number, Quotation[]> = {};
  for (const q of docQuotations) {
    if (!marginByRow[q.rowIndex]) marginByRow[q.rowIndex] = [];
    marginByRow[q.rowIndex].push(q);
  }

  if (!doc) return (
    <Empty>
      <div style={{fontSize:36}}>📄</div>
      <div style={{fontSize:14}}>문서를 선택하거나 왼쪽에서 업로드하세요</div>
    </Empty>
  );

  return (
    <Outer>
      <DocHeader>
        <span style={{fontSize:16}}>📄</span>
        <DocTitle>{doc.name}</DocTitle>
        <div style={{flex:1}}/>
        <span style={{fontSize:11,color:'var(--text-muted)'}}>
          {doc.rows.length}개 행 · {docQuotations.length}개 Quotation
        </span>
        {settings.geminiApiKey && (
          <span style={{fontSize:10,fontWeight:700,color:'var(--accent)',background:'var(--accent-light)',padding:'2px 8px',borderRadius:99,border:'1px solid var(--accent)33'}}>
            ✨ AI 보조 ON
          </span>
        )}
      </DocHeader>
      <Wrap>
        <TranscriptArea>
          {doc.rows.map((row, idx) => {
            const isQ = row.speaker === settings.interviewerLabel || row.speaker.includes('인터뷰어') || row.speaker.includes('모더레이터');
            const color = getSpeakerColor(row.speaker);
            const bg = getSpeakerBadgeColor(row.speaker);
            return (
              <RowWrap key={idx}>
                <TimeCell>{row.time}</TimeCell>
                {row.speaker && (
                  <SpeakerCell>
                    <SpeakerBadge color={color} bg={bg} title={row.speaker}>{row.speaker}</SpeakerBadge>
                  </SpeakerCell>
                )}
                <ContentCell isQ={isQ} style={{paddingLeft:row.speaker?undefined:'124px'}}
                  onMouseUp={e=>handleMouseUp(e,idx)}>
                  {renderContent(row.content, idx)}
                </ContentCell>
              </RowWrap>
            );
          })}
        </TranscriptArea>

        {/* Margin */}
        <MarginArea>
          {doc.rows.map((_, idx) => {
            const qs = marginByRow[idx];
            if (!qs?.length) return null;
            return (
              <div key={idx}>
                {qs.map(q => {
                  const codeColor = q.codes.length ? (codes.find(c=>c.id===q.codes[0])?.color||'#E07B54') : '#E07B54';
                  const codeName = q.codes.length ? (codes.find(c=>c.id===q.codes[0])?.name||'') : '';
                  return (
                    <QTag key={q.id} color={codeColor} active={q.id===editingQId}
                      onClick={e=>{
                        e.stopPropagation();
                        setEditingQId(q.id);
                        setNewMemoBody(''); setEditingMemoId(null); setEditingMemoBody('');
                        const rect=(e.target as HTMLElement).getBoundingClientRect();
                        setSel({text:q.text,rowIndex:q.rowIndex,startOffset:q.startOffset,endOffset:q.endOffset,
                          x:Math.max(50,rect.left-360),y:rect.top});
                        if(settings.geminiApiKey) fetchAiSuggestions(q.text);
                      }}>
                      <QTagText title={codeName||q.text}>{codeName||q.text.slice(0,28)+(q.text.length>28?'…':'')}</QTagText>
                      {codeName && <QTagCode color={codeColor}>{q.text.slice(0,22)+(q.text.length>22?'…':'')}</QTagCode>}
                      <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>
                        {q.codes.length}개 코드 · 메모 {q.memos.length}개
                      </div>
                    </QTag>
                  );
                })}
              </div>
            );
          })}
        </MarginArea>
      </Wrap>

      {/* Popup */}
      {sel && (
        <Popup ref={menuRef} x={sel.x} y={sel.y}>
          {!editingQId ? (
            /* ── 새 Quotation 생성 단계 ── */
            <>
              <PopupTitle>Quotation 생성</PopupTitle>
              <PopupPreview>"{sel.text}"</PopupPreview>
              <ActionRow>
                <PopBtn v="accent" onClick={handleCreate}>✚ Quotation 생성</PopBtn>
                <PopBtn v="ghost" onClick={handleDone}>취소</PopBtn>
              </ActionRow>
            </>
          ) : (
            /* ── 코드 연결 + 메모 단계 ── */
            <>
              <PopupTitle>코드 연결</PopupTitle>
              <PopupPreview>"{currentQ?.text}"</PopupPreview>

              {/* AI Suggestions */}
              {(aiLoading || aiSuggestions.length > 0) && (
                <AiBox>
                  <AiTitle>
                    {aiLoading ? <><Spinner/> AI 코드 분석 중...</> : '✨ AI 추천 코드'}
                  </AiTitle>
                  {!aiLoading && (
                    <AiChips>
                      {aiSuggestions.map(s => {
                        const existing = codes.find(c=>c.name===s.name);
                        const color = existing?.color || 'var(--accent)';
                        const isApplied = currentQ?.codes.includes(existing?.id||'');
                        return (
                          <AiChip key={s.name} color={color} title={s.reason}
                            onClick={()=>!isApplied&&handleApplyAiSuggestion(s.name)}
                            style={{opacity:isApplied?0.5:1}}>
                            {isApplied?'✓ ':'+  '}{s.name}
                          </AiChip>
                        );
                      })}
                    </AiChips>
                  )}
                </AiBox>
              )}

              <SearchInput placeholder="코드 검색..." value={codeSearch} onChange={e=>setCodeSearch(e.target.value)} />
              <div style={{maxHeight:140,overflowY:'auto',marginBottom:7}}>
                {filteredCodes.map(code => {
                  const isOn = currentQ?.codes.includes(code.id)||false;
                  return (
                    <CodeRow key={code.id} on={isOn} color={code.color}
                      onClick={()=>editingQId&&(isOn?removeCodeFromQuotation(code.id,editingQId):assignCodeToQuotation(code.id,editingQId))}>
                      <Dot color={code.color}/>
                      <CodeName>{code.name}</CodeName>
                      <ToggleSwitch on={isOn}/>
                    </CodeRow>
                  );
                })}
                {filteredCodes.length===0 && <div style={{fontSize:11,color:'var(--text-muted)',padding:'6px 0',textAlign:'center'}}>검색 결과 없음</div>}
              </div>
              <NewCodeRow>
                <NewCodeInput placeholder="새 코드 이름 입력 후 Enter..."
                  value={newCodeName} onChange={e=>setNewCodeName(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')handleAddNewCode();}} />
                <PopBtn v="accent" onClick={handleAddNewCode}>+</PopBtn>
              </NewCodeRow>

              {/* ── 메모 섹션 ── */}
              <MemoSection>
                <MemoSectionTitle>📝 메모 ({currentQ?.memos.length ?? 0})</MemoSectionTitle>

                {/* 기존 메모 목록 */}
                {currentQ?.memos.map(m => (
                  <MemoItem key={m.id}>
                    {editingMemoId === m.id ? (
                      <>
                        <MemoEditArea
                          value={editingMemoBody}
                          onChange={e=>setEditingMemoBody(e.target.value)}
                          onKeyDown={e=>{if(e.key==='Enter'&&e.metaKey)handleSaveMemoEdit();}}
                          autoFocus
                        />
                        <div style={{display:'flex',gap:5,marginTop:5}}>
                          <PopBtn v="accent" style={{fontSize:10,padding:'3px 8px'}} onClick={handleSaveMemoEdit}>저장</PopBtn>
                          <PopBtn v="ghost" style={{fontSize:10,padding:'3px 8px'}} onClick={()=>{setEditingMemoId(null);setEditingMemoBody('');}}>취소</PopBtn>
                        </div>
                      </>
                    ) : (
                      <>
                        <MemoBody>{m.body}</MemoBody>
                        <MemoMeta>
                          <span>{new Date(m.updatedAt).toLocaleDateString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                          <span>
                            <IconBtn onClick={()=>{setEditingMemoId(m.id);setEditingMemoBody(m.body);}}>✏️</IconBtn>
                            <IconBtn onClick={()=>editingQId&&deleteQuotationMemo(editingQId,m.id)}>🗑</IconBtn>
                          </span>
                        </MemoMeta>
                      </>
                    )}
                  </MemoItem>
                ))}

                {/* 새 메모 입력 */}
                <MemoAddRow>
                  <MemoEditArea
                    placeholder="메모 추가... (Cmd+Enter로 저장)"
                    value={newMemoBody}
                    onChange={e=>setNewMemoBody(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&e.metaKey)handleAddMemo();}}
                    style={{flex:1}}
                  />
                </MemoAddRow>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:4}}>
                  <PopBtn v="accent" style={{fontSize:10,padding:'3px 8px'}} onClick={handleAddMemo}>+ 메모 추가</PopBtn>
                </div>
              </MemoSection>

              <ActionRow style={{marginTop:12}}>
                <PopBtn v="accent" onClick={handleDone}>✓ 완료</PopBtn>
                <PopBtn v="danger" onClick={()=>{deleteQuotation(editingQId!);handleDone();}}>삭제</PopBtn>
                <PopBtn v="ghost" onClick={handleDone}>닫기</PopBtn>
              </ActionRow>
            </>
          )}
        </Popup>
      )}
    </Outer>
  );
};