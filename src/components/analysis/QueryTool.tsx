import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';
import { downloadQueryCSV } from '../../utils/tabExchange';

/* ─── Styles ─────────────────────────── */
const Wrap = styled.div`flex:1; display:flex; flex-direction:column; overflow:hidden; background:var(--bg);`;
const Header = styled.div`padding:14px 20px; border-bottom:1px solid var(--border); background:var(--surface); flex-shrink:0;`;
const Title = styled.div`font-size:15px; font-weight:800; color:var(--text); margin-bottom:2px;`;
const Sub = styled.div`font-size:11px; color:var(--text-muted);`;
const Body = styled.div`flex:1; display:flex; overflow:hidden;`;

const BuilderPane = styled.div`
  width:340px; flex-shrink:0; border-right:1px solid var(--border);
  background:var(--surface); display:flex; flex-direction:column; overflow:hidden;
`;
const ResultPane = styled.div`flex:1; display:flex; flex-direction:column; overflow:hidden;`;

const Sec = styled.div`padding:12px 14px; border-bottom:1px solid var(--border); flex-shrink:0;`;
const SecTitle = styled.div`font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:8px;`;

const ConditionRow = styled.div`
  display:flex; align-items:center; gap:6px; margin-bottom:6px;
  padding:7px 9px; border:1.5px solid var(--border); border-radius:8px;
  background:var(--surface2);
`;
const OpBadge = styled.div<{op:'AND'|'OR'|'NOT'}>`
  font-size:10px; font-weight:800; padding:2px 7px; border-radius:4px; flex-shrink:0;
  background:${p=>p.op==='AND'?'#EBF1FA':p.op==='OR'?'#EBF9F3':'#FEE2E2'};
  color:${p=>p.op==='AND'?'#3D6B9E':p.op==='OR'?'#2A9A6E':'#DC2626'};
`;
const OpSelect = styled.select`
  font-size:11px; border:1px solid var(--border); border-radius:5px;
  padding:2px 5px; background:var(--surface); color:var(--text); outline:none; cursor:pointer;
`;
const CodeSelect = styled.select`
  flex:1; font-size:11.5px; border:1px solid var(--border); border-radius:5px;
  padding:4px 7px; background:var(--surface); color:var(--text); outline:none; cursor:pointer;
`;
const DelBtn = styled.button`color:var(--text-muted); font-size:14px; flex-shrink:0; &:hover{color:#DC2626;}`;
const AddBtn = styled.button`
  width:100%; padding:7px; border:2px dashed var(--border); border-radius:7px;
  font-size:12px; font-weight:600; color:var(--text-secondary); background:transparent;
  margin-top:4px; transition:all 0.15s;
  &:hover{border-color:var(--accent);color:var(--accent);}
`;
const RunBtn = styled.button<{disabled?:boolean}>`
  margin:12px 14px; padding:9px; border-radius:8px; font-size:13px; font-weight:800;
  background:${p=>p.disabled?'var(--surface2)':'var(--accent)'}; color:${p=>p.disabled?'var(--text-muted)':'white'};
  cursor:${p=>p.disabled?'not-allowed':'pointer'}; transition:opacity 0.15s;
  &:hover:not(:disabled){opacity:0.85;}
`;
const TBtn = styled.button`
  font-size:11px; font-weight:700; padding:4px 9px; border-radius:6px;
  background:var(--surface); border:1.5px solid var(--border);
  color:var(--text-secondary); transition:all 0.15s;
  &:hover{border-color:var(--accent);color:var(--accent);}
`;

const ResultHeader = styled.div`
  padding:10px 16px; border-bottom:1px solid var(--border); background:var(--surface2);
  display:flex; align-items:center; gap:10px; flex-shrink:0;
`;
const ResultScroll = styled.div`flex:1; overflow-y:auto; padding:14px 16px;`;

const QCard = styled.div`
  border:1.5px solid var(--border); border-radius:9px; margin-bottom:10px;
  background:var(--surface); overflow:hidden;
`;
const QCardTop = styled.div`padding:9px 12px; background:var(--surface2); border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px;`;
const QCardBody = styled.div`padding:10px 14px; font-size:13px; line-height:1.7; color:var(--text);`;
const QCardMeta = styled.div`padding:6px 14px 10px; display:flex; gap:6px; flex-wrap:wrap;`;
const CodeTag = styled.span<{color:string}>`
  font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px;
  background:${p=>p.color}18; color:${p=>p.color}; border:1px solid ${p=>p.color}44;
`;

const DocTag = styled.span`font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:3px;`;




interface Condition { id: string; op: 'AND'|'OR'|'NOT'; codeId: string; }

export const QueryTool = ({ onOpenDoc }: { onOpenDoc?: (id:string)=>void }) => {
  const { codes, quotations, documents } = useStore();
  const [conditions, setConditions] = useState<Condition[]>([{ id: '1', op: 'AND', codeId: codes[0]?.id || '' }]);
  const [results, setResults] = useState<typeof quotations | null>(null);
  const [docFilter, setDocFilter] = useState('all');
  const [speakerFilter, setSpeakerFilter] = useState('all');

  const addCondition = () => {
    setConditions(c => [...c, { id: crypto.randomUUID(), op: 'AND', codeId: codes[0]?.id||'' }]);
  };
  const updateCondition = (id:string, updates:Partial<Condition>) => {
    setConditions(c => c.map(x => x.id===id ? {...x,...updates} : x));
  };
  const removeCondition = (id:string) => {
    setConditions(c => c.filter(x => x.id!==id));
  };

  const handleRun = () => {
    let matched = [...quotations];
    for (const cond of conditions) {
      if (!cond.codeId) continue;
      if (cond.op === 'AND') {
        matched = matched.filter(q => q.codes.includes(cond.codeId));
      } else if (cond.op === 'OR') {
        const extra = quotations.filter(q => q.codes.includes(cond.codeId) && !matched.find(m=>m.id===q.id));
        matched = [...matched, ...extra];
      } else if (cond.op === 'NOT') {
        matched = matched.filter(q => !q.codes.includes(cond.codeId));
      }
    }
    setResults(matched);
  };

  const filteredResults = useMemo(() => {
    if (!results) return null;
    return results.filter(q => {
      if (docFilter !== 'all' && q.documentId !== docFilter) return false;
      if (speakerFilter !== 'all') {
        const doc = documents.find(d => d.id === q.documentId);
        const row = doc?.rows.find((_, i) => i === q.rowIndex);
        if (row && row.speaker !== speakerFilter) return false;
      }
      return true;
    });
  }, [results, docFilter, speakerFilter, documents]);

  const allSpeakers = useMemo(() => {
    const s = new Set<string>();
    documents.forEach(d => d.rows.forEach(r => { if (r.speaker) s.add(r.speaker); }));
    return Array.from(s);
  }, [documents]);

  return (
    <Wrap>
      <Header>
        <Title>🔍 Query Tool</Title>
        <Sub>코드 조건 조합으로 Quotation을 검색합니다 (AND / OR / NOT 불리언 쿼리)</Sub>
      </Header>
      <Body>
        {/* ── Builder ── */}
        <BuilderPane>
          <Sec>
            <SecTitle>쿼리 조건 (Boolean)</SecTitle>
            {conditions.map((cond, i) => (
              <ConditionRow key={cond.id}>
                {i === 0 ? (
                  <OpBadge op="AND" style={{background:'#F0F0F0',color:'#888'}}>START</OpBadge>
                ) : (
                  <OpSelect value={cond.op} onChange={e => updateCondition(cond.id, { op: e.target.value as Condition['op'] })}>
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                    <option value="NOT">NOT</option>
                  </OpSelect>
                )}
                <CodeSelect value={cond.codeId} onChange={e => updateCondition(cond.id, { codeId: e.target.value })}>
                  <option value="">-- 코드 선택 --</option>
                  {codes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </CodeSelect>
                {conditions.length > 1 && (
                  <DelBtn onClick={() => removeCondition(cond.id)}>×</DelBtn>
                )}
              </ConditionRow>
            ))}
            <AddBtn onClick={addCondition}>+ 조건 추가</AddBtn>
          </Sec>

          <Sec>
            <SecTitle>현재 쿼리 미리보기</SecTitle>
            <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.8,fontFamily:'monospace',background:'var(--surface2)',padding:'8px 10px',borderRadius:7,border:'1px solid var(--border)'}}>
              {conditions.map((c,i) => {
                const code = codes.find(x=>x.id===c.codeId);
                if (!code) return null;
                return <span key={c.id}>{i>0?<b style={{color:c.op==='NOT'?'#DC2626':c.op==='OR'?'#2A9A6E':'#3D6B9E'}}> {c.op} </b>:null}<span style={{color:code.color}}>"{code.name}"</span></span>;
              })}
              {conditions.every(c=>!c.codeId) && <span style={{color:'var(--text-muted)'}}>조건 없음</span>}
            </div>
          </Sec>

          <RunBtn onClick={handleRun} disabled={conditions.every(c=>!c.codeId)}>
            ▶ 쿼리 실행
          </RunBtn>

          {results !== null && (
            <div style={{padding:'0 14px 12px', fontSize:12, color:'var(--text-secondary)'}}>
              <b style={{color:'var(--text)'}}>{filteredResults?.length ?? 0}개</b> Quotation 검색됨 (전체 {results.length}개 중)
            </div>
          )}
        </BuilderPane>

        {/* ── Results ── */}
        <ResultPane>
          {results === null ? (
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,color:'var(--text-muted)'}}>
              <div style={{fontSize:36}}>🔍</div>
              <div style={{fontSize:14}}>좌측에서 조건을 설정하고 쿼리를 실행하세요</div>
            </div>
          ) : (
            <>
              <ResultHeader>
                <span style={{fontWeight:700,fontSize:13}}>검색 결과</span>
                <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>문서:</span>
                  <OpSelect value={docFilter} onChange={e=>setDocFilter(e.target.value)} style={{fontSize:11}}>
                    <option value="all">전체</option>
                    {documents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </OpSelect>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>화자:</span>
                  <OpSelect value={speakerFilter} onChange={e=>setSpeakerFilter(e.target.value)} style={{fontSize:11}}>
                    <option value="all">전체</option>
                    {allSpeakers.map(s=><option key={s} value={s}>{s}</option>)}
                  </OpSelect>
                  <TBtn onClick={() => {
                    if (!filteredResults) return;
                    const forCsv = filteredResults.map(q => ({
                      ...q,
                      codes: q.codes.map(cid => codes.find(c => c.id === cid)?.name || cid)
                    }));
                    downloadQueryCSV(forCsv, `query_result_${new Date().toISOString().slice(0,10)}.csv`);
                  }}>
                    ↓ CSV 내보내기
                  </TBtn>
                </div>
              </ResultHeader>
              <ResultScroll>
                {filteredResults?.length === 0 && (
                  <div style={{textAlign:'center',paddingTop:40,color:'var(--text-muted)',fontSize:13}}>
                    조건에 맞는 Quotation이 없습니다
                  </div>
                )}
                {filteredResults?.map(q => {
                  const qCodes = q.codes.map(cid=>codes.find(c=>c.id===cid)).filter(Boolean) as typeof codes;
                  return (
                    <QCard key={q.id}>
                      <QCardTop>
                        <DocTag>📄 {q.documentName}</DocTag>
                        {q.comment && !q.comment.startsWith('__group:') && (
                          <span style={{fontSize:11,color:'var(--text-secondary)',fontStyle:'italic'}}>"{q.comment}"</span>
                        )}
                        <div style={{marginLeft:'auto'}}>
                          <button
                            style={{fontSize:11,color:'var(--blue)',background:'var(--blue-light)',padding:'2px 8px',borderRadius:5,border:'1px solid var(--blue)22'}}
                            onClick={()=>onOpenDoc?.(q.documentId)}
                          >문서에서 보기 →</button>
                        </div>
                      </QCardTop>
                      <QCardBody>"{q.text}"</QCardBody>
                      <QCardMeta>
                        {qCodes.map(c=><CodeTag key={c.id} color={c.color}>{c.name}</CodeTag>)}
                      </QCardMeta>
                    </QCard>
                  );
                })}
              </ResultScroll>
            </>
          )}
        </ResultPane>
      </Body>
    </Wrap>
  );
};
