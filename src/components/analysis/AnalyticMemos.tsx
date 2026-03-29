import { useState, useRef } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';
import type { AnalyticMemo } from '../../types';

const Wrap = styled.div`flex:1; display:flex; overflow:hidden; background:var(--bg);`;

const ListPane = styled.div`
  width:300px; flex-shrink:0; border-right:1px solid var(--border);
  background:var(--surface); display:flex; flex-direction:column; overflow:hidden;
`;
const EditorPane = styled.div`
  flex:1; display:flex; flex-direction:column; overflow:hidden; background:var(--surface);
`;

const PaneHeader = styled.div`
  padding:12px 14px; border-bottom:1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
`;
const PaneTitle = styled.div`font-size:13px; font-weight:800; color:var(--text);`;

const Btn = styled.button<{variant?:'accent'|'ghost'|'danger'}>`
  font-size:11px; font-weight:700; padding:5px 11px; border-radius:7px; white-space:nowrap;
  background:${p=>p.variant==='accent'?'var(--accent)':p.variant==='danger'?'#FEE2E2':'var(--surface2)'};
  color:${p=>p.variant==='accent'?'white':p.variant==='danger'?'#DC2626':'var(--text-secondary)'};
  border:1px solid ${p=>p.variant==='accent'?'transparent':p.variant==='danger'?'#FECACA':'var(--border)'};
  &:hover{opacity:0.8;}
`;

const MemoItem = styled.div<{active?:boolean}>`
  padding:10px 14px; border-bottom:1px solid var(--border);
  cursor:pointer; transition:background 0.1s;
  background:${p=>p.active?'var(--accent-light)':'transparent'};
  &:hover{background:${p=>p.active?'var(--accent-light)':'var(--surface2)'};}
`;
const MemoItemTitle = styled.div`font-size:12.5px; font-weight:700; color:var(--text); margin-bottom:3px;`;
const MemoItemPreview = styled.div`font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`;
const MemoItemMeta = styled.div`font-size:10px; color:var(--text-muted); margin-top:4px; display:flex; gap:8px;`;

const TitleInput = styled.input`
  width:100%; padding:16px 20px; font-size:18px; font-weight:800; color:var(--text);
  border:none; border-bottom:1px solid var(--border); outline:none; background:var(--surface);
  &::placeholder{color:var(--text-muted);}
`;

const BodyTextarea = styled.textarea`
  flex:1; padding:16px 20px; font-size:13.5px; line-height:1.8;
  color:var(--text); border:none; outline:none; resize:none; background:var(--surface);
  font-family:inherit;
  &::placeholder{color:var(--text-muted);}
`;

const LinkSection = styled.div`
  padding:12px 16px; border-top:1px solid var(--border); background:var(--surface2); flex-shrink:0;
`;
const LinkTitle = styled.div`font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:8px;`;
const LinkChips = styled.div`display:flex; flex-wrap:wrap; gap:5px;`;
const Chip = styled.div<{color?:string}>`
  font-size:10.5px; font-weight:600; padding:3px 9px; border-radius:99px;
  background:${p=>p.color?p.color+'18':'var(--surface)'};
  color:${p=>p.color||'var(--text-secondary)'};
  border:1.5px solid ${p=>p.color?p.color+'44':'var(--border)'};
  display:flex; align-items:center; gap:4px;
`;
const RemoveChip = styled.span`opacity:0.5; cursor:pointer; &:hover{opacity:1;}`;

const AddLinkSelect = styled.select`
  font-size:11px; border:1px solid var(--border); border-radius:6px;
  padding:4px 8px; background:var(--surface); color:var(--text);
  outline:none; cursor:pointer; margin-top:6px;
  &:focus{border-color:var(--accent);}
`;

const EditorToolbar = styled.div`
  padding:8px 16px; border-bottom:1px solid var(--border);
  display:flex; align-items:center; gap:8px; flex-shrink:0; background:var(--surface2);
`;
const ToolBtn = styled.button`
  font-size:11px; padding:3px 8px; border-radius:5px; background:var(--surface); border:1px solid var(--border);
  color:var(--text-secondary); font-weight:600; transition:all 0.1s;
  &:hover{background:var(--text);color:white;}
`;

const EmptyState = styled.div`
  flex:1; display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:12px; color:var(--text-muted);
`;

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const AnalyticMemos = () => {
  const { memos, codes, quotations, addMemo, updateMemo, deleteMemo } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selected = memos.find(m => m.id === selectedId) ?? null;

  const filtered = memos.filter(m =>
    !search ||
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.body.toLowerCase().includes(search.toLowerCase())
  );

  const handleNew = () => {
    const m = addMemo('새 메모', '');
    setSelectedId(m.id);
  };

  const handleUpdate = (updates: Partial<AnalyticMemo>) => {
    if (!selectedId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateMemo(selectedId, updates), 300);
  };

  const insertTemplate = (tmpl: string) => {
    if (!selected) return;
    const newBody = (selected.body ? selected.body + '\n\n' : '') + tmpl;
    updateMemo(selected.id, { body: newBody });
  };

  const TEMPLATES = [
    { label: '초기 인상', text: '## 초기 인상\n\n' },
    { label: '패턴 발견', text: '## 패턴 발견\n\n이 코드에서 반복적으로 나타나는 패턴:\n- \n- \n' },
    { label: '가설', text: '## 가설\n\n만약 ~ 라면, ~ 일 것이다.\n\n**근거:**\n' },
    { label: '반증 사례', text: '## 반증 사례\n\n이 패턴과 다른 사례:\n\n' },
    { label: '이론 연결', text: '## 이론적 연결\n\n관련 이론/개념:\n\n' },
  ];

  return (
    <Wrap>
      {/* ── List ── */}
      <ListPane>
        <PaneHeader>
          <PaneTitle>📝 Analytic Memos ({memos.length})</PaneTitle>
          <Btn variant="accent" onClick={handleNew}>+ 새 메모</Btn>
        </PaneHeader>
        <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <input
            placeholder="메모 검색..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%',padding:'6px 10px',border:'1px solid var(--border)',borderRadius:7,fontSize:12,outline:'none',background:'var(--surface2)',color:'var(--text)' }}
          />
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding:20, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>
              {memos.length === 0 ? '+ 버튼으로 분석 메모를 작성하세요' : '검색 결과 없음'}
            </div>
          )}
          {filtered.map(m => (
            <MemoItem key={m.id} active={m.id === selectedId} onClick={() => setSelectedId(m.id)}>
              <MemoItemTitle>{m.title || '(제목 없음)'}</MemoItemTitle>
              <MemoItemPreview>{m.body.replace(/#{1,6}\s/g,'').slice(0,60) || '내용 없음'}</MemoItemPreview>
              <MemoItemMeta>
                <span>{fmtDate(m.updatedAt)}</span>
                {m.linkedCodeIds.length > 0 && <span>🏷️ {m.linkedCodeIds.length}</span>}
                {m.linkedQuotationIds.length > 0 && <span>💬 {m.linkedQuotationIds.length}</span>}
              </MemoItemMeta>
            </MemoItem>
          ))}
        </div>
      </ListPane>

      {/* ── Editor ── */}
      <EditorPane>
        {!selected ? (
          <EmptyState>
            <div style={{ fontSize:36 }}>📝</div>
            <div style={{ fontSize:14 }}>메모를 선택하거나 새로 만드세요</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', maxWidth:300, textAlign:'center', lineHeight:1.6 }}>
              Analytic Memo는 코드·Quotation에 대한 연구자의 해석, 가설, 패턴 발견 등을 기록하는 질적 연구의 핵심 도구입니다
            </div>
            <Btn variant="accent" onClick={handleNew}>+ 첫 메모 작성</Btn>
          </EmptyState>
        ) : (
          <>
            <EditorToolbar>
              {TEMPLATES.map(t => (
                <ToolBtn key={t.label} onClick={() => insertTemplate(t.text)}>{t.label}</ToolBtn>
              ))}
              <div style={{ flex:1 }} />
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtDate(selected.updatedAt)} 수정</span>
              <Btn variant="danger" onClick={() => { deleteMemo(selected.id); setSelectedId(null); }}>삭제</Btn>
            </EditorToolbar>

            <TitleInput
              placeholder="메모 제목..."
              defaultValue={selected.title}
              key={selected.id + '_title'}
              onChange={e => handleUpdate({ title: e.target.value })}
            />

            <BodyTextarea
              placeholder={`분석 내용을 자유롭게 작성하세요.\n\n상단 버튼으로 템플릿을 삽입할 수 있습니다.\n\n예시:\n- 이 코드에서 반복되는 패턴은...\n- 이론적으로 연결되는 개념은...\n- 반증 사례로는...`}
              defaultValue={selected.body}
              key={selected.id + '_body'}
              onChange={e => handleUpdate({ body: e.target.value })}
            />

            <LinkSection>
              <div style={{ display:'flex', gap:20 }}>
                {/* 코드 연결 */}
                <div style={{ flex:1 }}>
                  <LinkTitle>연결된 코드</LinkTitle>
                  <LinkChips>
                    {selected.linkedCodeIds.map(cid => {
                      const c = codes.find(x => x.id === cid);
                      if (!c) return null;
                      return (
                        <Chip key={cid} color={c.color}>
                          {c.name}
                          <RemoveChip onClick={() => updateMemo(selected.id, {
                            linkedCodeIds: selected.linkedCodeIds.filter(id => id !== cid)
                          })}>×</RemoveChip>
                        </Chip>
                      );
                    })}
                  </LinkChips>
                  <AddLinkSelect
                    value=""
                    onChange={e => {
                      if (!e.target.value) return;
                      if (!selected.linkedCodeIds.includes(e.target.value))
                        updateMemo(selected.id, { linkedCodeIds: [...selected.linkedCodeIds, e.target.value] });
                    }}
                  >
                    <option value="">+ 코드 연결...</option>
                    {codes.filter(c => !selected.linkedCodeIds.includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </AddLinkSelect>
                </div>

                {/* Quotation 연결 */}
                <div style={{ flex:1 }}>
                  <LinkTitle>연결된 Quotation</LinkTitle>
                  <LinkChips>
                    {selected.linkedQuotationIds.map(qid => {
                      const q = quotations.find(x => x.id === qid);
                      if (!q) return null;
                      return (
                        <Chip key={qid}>
                          "{q.text.slice(0,25)}..."
                          <RemoveChip onClick={() => updateMemo(selected.id, {
                            linkedQuotationIds: selected.linkedQuotationIds.filter(id => id !== qid)
                          })}>×</RemoveChip>
                        </Chip>
                      );
                    })}
                  </LinkChips>
                  <AddLinkSelect
                    value=""
                    onChange={e => {
                      if (!e.target.value) return;
                      if (!selected.linkedQuotationIds.includes(e.target.value))
                        updateMemo(selected.id, { linkedQuotationIds: [...selected.linkedQuotationIds, e.target.value] });
                    }}
                  >
                    <option value="">+ Quotation 연결...</option>
                    {quotations.filter(q => !selected.linkedQuotationIds.includes(q.id)).map(q => (
                      <option key={q.id} value={q.id}>{q.text.slice(0,40)}...</option>
                    ))}
                  </AddLinkSelect>
                </div>
              </div>
            </LinkSection>
          </>
        )}
      </EditorPane>
    </Wrap>
  );
};
