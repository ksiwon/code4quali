import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';

const Wrap = styled.div`
  flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg);
`;

const Header = styled.div`
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  display: flex; align-items: center; gap: 12px;
  flex-shrink: 0;
`;

const Title = styled.div`font-size: 15px; font-weight: 800; color: var(--text);`;

const SearchInput = styled.input`
  padding: 6px 12px; border: 1px solid var(--border); border-radius: 7px;
  font-size: 12px; outline: none; background: var(--surface2); color: var(--text); width: 180px;
  &:focus { border-color: var(--accent); }
  &::placeholder { color: var(--text-muted); }
`;

const Board = styled.div`
  flex: 1; overflow: auto; padding: 20px;
  display: flex; gap: 20px; align-items: flex-start;
`;

const Column = styled.div`
  width: 260px; flex-shrink: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden;
`;

const ColHeader = styled.div<{ color: string }>`
  padding: 12px 14px;
  background: ${p => p.color}14;
  border-bottom: 2px solid ${p => p.color}55;
  display: flex; align-items: center; gap: 8px;
`;

const ColDot = styled.div<{ color: string }>`
  width: 10px; height: 10px; border-radius: 50%; background: ${p => p.color}; flex-shrink: 0;
`;

const ColTitle = styled.div`font-size: 13px; font-weight: 700; flex: 1;`;
const ColCount = styled.div`font-size: 11px; color: var(--text-muted);`;

const ColDesc = styled.div`
  padding: 8px 14px;
  font-size: 11px; color: var(--text-secondary); line-height: 1.5;
  border-bottom: 1px solid var(--border);
  background: var(--surface2);
`;

const ColBody = styled.div`padding: 10px 10px; display: flex; flex-direction: column; gap: 7px;`;

const Card = styled.div<{ color: string }>`
  background: ${p => p.color}15;
  border: 1.5px solid ${p => p.color}44;
  border-left: 3px solid ${p => p.color};
  border-radius: 7px; padding: 9px 10px;
  cursor: pointer; transition: box-shadow 0.15s, transform 0.1s;
  &:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.09); transform: translateY(-1px); }
`;

const CardTag = styled.div<{ color: string }>`
  font-size: 10px; font-weight: 700; color: ${p => p.color};
  margin-bottom: 4px;
`;

const CardText = styled.div`font-size: 11.5px; line-height: 1.5; color: var(--text);`;

const CardDoc = styled.div`
  font-size: 10px; color: var(--text-muted); margin-top: 5px;
`;

const GroupBadge = styled.div`
  font-size: 10px; font-weight: 700;
  color: var(--text-secondary); background: var(--surface2);
  padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border);
  display: inline-block; margin-bottom: 5px;
`;

export const BoardView = ({ onOpenInViewer }: { onOpenInViewer?: (id: string) => void }) => {
  const { codes, quotations, codeGroups } = useStore();
  const [search, setSearch] = useState('');

  const visibleCodes = useMemo(() => codes.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.comment.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [codes, search]);

  const getCodeQuotations = (codeId: string) =>
    quotations.filter(q => q.codes.includes(codeId));

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return null;
    return codeGroups.find(g => g.id === groupId)?.name ?? null;
  };

  return (
    <Wrap>
      <Header>
        <Title>📌 코드 보드</Title>
        <SearchInput
          placeholder="코드 검색..."
          value={search} onChange={e => setSearch(e.target.value)}
        />

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {visibleCodes.length}개 코드
        </div>
      </Header>

      <Board>
        {visibleCodes.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            조건에 맞는 코드가 없습니다
          </div>
        )}
        {visibleCodes.map(code => {
          const quots = getCodeQuotations(code.id);
          return (
            <Column key={code.id}>
              <ColHeader color={code.color}>
                <ColDot color={code.color} />
                <ColTitle>{code.name}</ColTitle>
                <ColCount>{quots.length}</ColCount>
              </ColHeader>
              {code.comment && <ColDesc>{code.comment}</ColDesc>}
              <ColBody>
                {quots.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '10px 0' }}>
                    Quotation 없음
                  </div>
                )}
                {quots.map(q => {
                  const groupName = getGroupName(q.groupId);
                  return (
                    <Card key={q.id} color={code.color} onClick={() => onOpenInViewer?.(q.documentId)}>
                      {groupName && <GroupBadge>{groupName}</GroupBadge>}
                      <CardTag color={code.color}>[{code.name}]</CardTag>
                      <CardText>{q.text}</CardText>
                      <CardDoc>📄 {q.documentName.replace('_최종.csv', '').replace('_최종.docx', '')}</CardDoc>
                    </Card>
                  );
                })}
              </ColBody>
            </Column>
          );
        })}
      </Board>
    </Wrap>
  );
};
