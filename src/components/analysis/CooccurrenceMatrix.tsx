import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';
import { downloadMatrixCSV } from '../../utils/tabExchange';

const Wrap = styled.div`flex:1; display:flex; flex-direction:column; overflow:hidden; background:var(--bg);`;
const Header = styled.div`
  padding:14px 20px; border-bottom:1px solid var(--border);
  background:var(--surface); flex-shrink:0;
`;
const Title = styled.div`font-size:15px; font-weight:800;`;
const Sub = styled.div`font-size:11px; color:var(--text-muted); margin-top:2px;`;
const Body = styled.div`flex:1; overflow:auto; padding:24px;`;

const MatrixWrap = styled.div`
  display:inline-block; border:1px solid var(--border);
  border-radius:10px; overflow:hidden; background:var(--surface);
  box-shadow:0 2px 12px rgba(0,0,0,0.06);
`;

const MatrixTable = styled.table`border-collapse:collapse; font-size:11.5px;`;
const Th = styled.th<{isCorner?:boolean}>`
  padding:${p=>p.isCorner?'10px 14px':'8px 12px'};
  background:var(--surface2); border:1px solid var(--border);
  font-weight:700; color:var(--text-muted); white-space:nowrap;
  text-align:${p=>p.isCorner?'center':'left'};
  min-width:${p=>p.isCorner?'40px':'130px'};
  font-size:${p=>p.isCorner?'10px':'11px'};
`;
const ThRotate = styled.th`
  padding:0; border:1px solid var(--border);
  background:var(--surface2); width:44px; min-width:44px;
`;
const ThInner = styled.div`
  writing-mode:vertical-rl; transform:rotate(180deg);
  padding:10px 12px; font-weight:700; color:var(--text-muted);
  font-size:10.5px; white-space:nowrap; max-height:110px; overflow:hidden;
  text-overflow:ellipsis;
`;

const Td = styled.td<{val:number; max:number; isSelf?:boolean; isZero?:boolean}>`
  border:1px solid var(--border); text-align:center;
  width:44px; height:36px; font-size:12px; font-weight:700;
  cursor:${p=>p.isZero||p.isSelf?'default':'pointer'};
  background:${p=>
    p.isSelf ? 'var(--surface2)' :
    p.isZero ? 'white' :
    `rgba(224,123,84,${0.1 + (p.val/p.max)*0.7})`
  };
  color:${p=>p.isSelf?'var(--text-muted)':p.isZero?'var(--border2)':p.val/p.max>0.6?'white':'var(--text)'};
  transition:filter 0.15s;
  &:hover { filter:${p=>(!p.isZero&&!p.isSelf)?'brightness(0.88)':'none'}; }
`;

const TdName = styled.td`
  padding:8px 12px; border:1px solid var(--border);
  background:var(--surface2); white-space:nowrap;
  max-width:150px; overflow:hidden; text-overflow:ellipsis;
`;

const NameWrap = styled.div`display:flex; align-items:center; gap:7px;`;
const Dot = styled.div<{color:string}>`
  width:10px; height:10px; border-radius:50%; background:${p=>p.color}; flex-shrink:0;
`;

const LegendWrap = styled.div`
  display:flex; align-items:center; gap:6px; margin-top:16px; font-size:11px; color:var(--text-muted);
`;
const LegendBar = styled.div`
  height:12px; width:160px; border-radius:99px;
  background:linear-gradient(to right, rgba(224,123,84,0.1), rgba(224,123,84,0.8));
  border:1px solid var(--border);
`;

const DetailPanel = styled.div`
  margin-top:20px; padding:16px; background:var(--surface);
  border:1.5px solid var(--border); border-radius:10px; max-width:700px;
`;
const DPTitle = styled.div`font-size:13px; font-weight:700; margin-bottom:10px;`;
const QItem = styled.div`
  &:hover{border-color:var(--accent);}
`;
const TBtn = styled.button`
  font-size:11px; font-weight:700; padding:5px 10px; border-radius:7px;
  background:var(--surface); border:1.5px solid var(--border);
  color:var(--text-secondary); transition:all 0.15s;
  &:hover{border-color:var(--accent);color:var(--accent);}
`;

type CellInfo = { codeA: string; codeB: string; count: number; quotations: string[] };

export const CooccurrenceMatrix = ({ onOpenDoc }: { onOpenDoc?: (id: string) => void }) => {
  const { codes, quotations } = useStore();
  const [selected, setSelected] = useState<CellInfo | null>(null);
  const [minCount, setMinCount] = useState(1);

  // Only codes that have at least 1 quotation
  const activeCodes = useMemo(() =>
    codes.filter(c => c.quotationIds.length > 0),
    [codes]
  );

  // Build co-occurrence matrix
  const matrix = useMemo(() => {
    const map: Record<string, Record<string, string[]>> = {};
    for (const ca of activeCodes) {
      map[ca.id] = {};
      for (const cb of activeCodes) {
        if (ca.id === cb.id) { map[ca.id][cb.id] = []; continue; }
        const coQuots = quotations.filter(q =>
          q.codes.includes(ca.id) && q.codes.includes(cb.id)
        );
        map[ca.id][cb.id] = coQuots.map(q => q.id);
      }
    }
    return map;
  }, [activeCodes, quotations]);

  const maxVal = useMemo(() => {
    let m = 0;
    for (const ca of activeCodes)
      for (const cb of activeCodes)
        if (ca.id !== cb.id) m = Math.max(m, matrix[ca.id]?.[cb.id]?.length || 0);
    return m || 1;
  }, [matrix, activeCodes]);

  const handleCell = (caId: string, cbId: string) => {
    if (caId === cbId) return;
    const qIds = matrix[caId]?.[cbId] || [];
    if (qIds.length === 0) return;
    setSelected({
      codeA: codes.find(c => c.id === caId)?.name || caId,
      codeB: codes.find(c => c.id === cbId)?.name || cbId,
      count: qIds.length,
      quotations: qIds,
    });
  };

  if (activeCodes.length === 0) {
    return (
      <Wrap>
        <Header><Title>⬛ Co-occurrence Matrix</Title></Header>
        <Body style={{ display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,color:'var(--text-muted)' }}>
          <div style={{ fontSize:36 }}>⬛</div>
          <div style={{ fontSize:14 }}>코드에 Quotation을 연결하면 행렬이 나타납니다</div>
        </Body>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Header>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <div>
            <Title>⬛ Co-occurrence Matrix</Title>
            <Sub>두 코드가 동시에 적용된 Quotation 수를 시각화합니다. 셀을 클릭하면 해당 Quotation을 확인할 수 있습니다.</Sub>
          </div>
          <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text-muted)' }}>
            최소 co-occurrence:
            <input
              type="number" min={0} value={minCount}
              onChange={e => setMinCount(Number(e.target.value))}
              style={{ width:50,padding:'4px 7px',border:'1px solid var(--border)',borderRadius:6,fontSize:12,background:'var(--surface2)',color:'var(--text)',outline:'none' }}
            />
            <TBtn onClick={() => {
              const rows: string[][] = [];
              // Header
              rows.push(['코드', ...activeCodes.map(c => c.name)]);
              // Data
              activeCodes.forEach(ca => {
                const row = [ca.name];
                activeCodes.forEach(cb => {
                  if (ca.id === cb.id) row.push('-');
                  else row.push(String(matrix[ca.id]?.[cb.id]?.length || 0));
                });
                rows.push(row);
              });
              downloadMatrixCSV(rows, `matrix_${new Date().toISOString().slice(0,10)}.csv`);
            }}>
              ↓ CSV 내보내기
            </TBtn>
          </div>
        </div>
      </Header>
      <Body>
        <MatrixWrap>
          <MatrixTable>
            <thead>
              <tr>
                <Th isCorner>코드</Th>
                {activeCodes.map(c => (
                  <ThRotate key={c.id}>
                    <ThInner title={c.name}>{c.name}</ThInner>
                  </ThRotate>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeCodes.map(ca => (
                <tr key={ca.id}>
                  <TdName>
                    <NameWrap>
                      <Dot color={ca.color} />
                      <span style={{ fontSize:11,fontWeight:600,color:'var(--text)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ca.name}</span>
                    </NameWrap>
                  </TdName>
                  {activeCodes.map(cb => {
                    const val = ca.id === cb.id ? -1 : (matrix[ca.id]?.[cb.id]?.length || 0);
                    const isSelf = ca.id === cb.id;
                    const isZero = val === 0;
                    const show = isSelf ? '—' : val === 0 ? '' : val;
                    if (!isSelf && val > 0 && val < minCount) return <Td key={cb.id} val={0} max={maxVal} isZero />;
                    return (
                      <Td
                        key={cb.id} val={Math.max(0,val)} max={maxVal}
                        isSelf={isSelf} isZero={isZero}
                        onClick={() => handleCell(ca.id, cb.id)}
                        title={!isSelf && !isZero ? `${ca.name} ∩ ${cb.name}: ${val}개` : undefined}
                      >
                        {show}
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </MatrixTable>
        </MatrixWrap>

        <LegendWrap>
          <span>낮음</span>
          <LegendBar />
          <span>높음</span>
          <span style={{ marginLeft:12 }}>공동 출현 빈도</span>
        </LegendWrap>

        {selected && (
          <DetailPanel>
            <DPTitle>
              "{selected.codeA}" ∩ "{selected.codeB}" — {selected.count}개 Quotation
            </DPTitle>
            {selected.quotations.map(qid => {
              const q = quotations.find(x => x.id === qid);
              if (!q) return null;
              return (
                <QItem key={qid} onClick={() => onOpenDoc?.(q.documentId)}>
                  <span style={{ fontSize:10,color:'var(--text-muted)',display:'block',marginBottom:3 }}>📄 {q.documentName}</span>
                  {q.text}
                </QItem>
              );
            })}
          </DetailPanel>
        )}
      </Body>
    </Wrap>
  );
};
