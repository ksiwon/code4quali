import { useState, useMemo, useRef } from 'react';
import { parseCodebookJSON, readFileText, downloadCodebook, downloadCodingResult } from '../../utils/tabExchange';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';

/* ─── Layout ─────────────────────────────────────────── */
const Wrap = styled.div`
  display: flex; flex: 1; overflow: hidden; background: var(--bg);
`;

const LeftPane = styled.div`
  width: 300px; flex-shrink: 0;
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  background: var(--surface); overflow: hidden;
`;

const CenterPane = styled.div`
  flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;
`;

const RightPane = styled.div`
  width: 360px; flex-shrink: 0;
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  background: var(--surface); overflow: hidden;
`;

/* ─── Shared ─────────────────────────────────────────── */
const PaneHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
`;
const PaneTitle = styled.div`font-size: 13px; font-weight: 700; color: var(--text);`;
const Scrollable = styled.div`flex: 1; overflow-y: auto;`;

const SmBtn = styled.button<{ variant?: 'accent' | 'ghost' | 'danger' }>`
  font-size: 11px; font-weight: 600;
  padding: 4px 10px; border-radius: 5px; white-space: nowrap;
  background: ${p => p.variant === 'accent' ? 'var(--accent)' : p.variant === 'danger' ? '#FEE2E2' : 'var(--surface2)'};
  color: ${p => p.variant === 'accent' ? 'white' : p.variant === 'danger' ? '#DC2626' : 'var(--text-secondary)'};
  border: 1px solid ${p => p.variant === 'accent' ? 'transparent' : p.variant === 'danger' ? '#FECACA' : 'var(--border)'};
  &:hover { opacity: 0.8; }
`;

const SearchInput = styled.input`
  width: 100%; padding: 7px 12px;
  border: 1px solid var(--border); border-radius: 7px;
  font-size: 12px; outline: none; background: var(--surface2); color: var(--text);
  &:focus { border-color: var(--accent); }
  &::placeholder { color: var(--text-muted); }
`;

/* ─── Left Pane – Code List ──────────────────────────── */
const CodeRow = styled.div<{ active?: boolean }>`
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  background: ${p => p.active ? 'var(--accent-light)' : 'transparent'};
  transition: background 0.1s;
  &:hover { background: ${p => p.active ? 'var(--accent-light)' : 'var(--surface2)'}; }
`;

const ColorDot = styled.div<{ color: string }>`
  width: 11px; height: 11px; border-radius: 50%;
  background: ${p => p.color}; flex-shrink: 0; margin-top: 3px;
`;

const CodeInfo = styled.div`flex: 1; min-width: 0;`;
const CodeName = styled.div`font-size: 12.5px; font-weight: 600; color: var(--text);`;
const CodeDesc = styled.div`font-size: 11px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const CodeCount = styled.div`font-size: 11px; color: var(--text-muted); flex-shrink: 0;`;

/* ─── Center Pane – Quotation Board ──────────────────── */
const BoardWrap = styled.div`flex: 1; overflow-y: auto; padding: 20px;`;

const GroupSection = styled.div`margin-bottom: 28px;`;

const GroupTitle = styled.div`
  font-size: 16px; font-weight: 700; color: var(--text);
  margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
`;

const CardGrid = styled.div`
  display: flex; flex-wrap: wrap; gap: 10px;
`;

const QuotCard = styled.div<{ color: string }>`
  width: 160px; min-height: 100px;
  background: ${p => p.color}18;
  border: 1.5px solid ${p => p.color}44;
  border-radius: 8px;
  padding: 10px 11px;
  cursor: pointer;
  display: flex; flex-direction: column; justify-content: space-between;
  transition: box-shadow 0.15s, transform 0.1s;
  &:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.1); transform: translateY(-1px); }
`;

const CardText = styled.div`
  font-size: 12px; line-height: 1.5; color: var(--text); flex: 1;
`;

const CardMeta = styled.div`
  font-size: 10px; color: var(--text-muted); margin-top: 8px;
`;

/* ─── Right Pane – Detail ────────────────────────────── */
const DetailSection = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
`;

const Label = styled.div`
  font-size: 10px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%; padding: 7px 10px;
  border: 1px solid var(--border); border-radius: 6px;
  font-size: 12.5px; outline: none; color: var(--text); background: var(--surface2);
  &:focus { border-color: var(--accent); }
`;

const Textarea = styled.textarea`
  width: 100%; padding: 8px 10px;
  border: 1px solid var(--border); border-radius: 6px;
  font-size: 12.5px; outline: none; color: var(--text); background: var(--surface2);
  resize: vertical; min-height: 70px; line-height: 1.5;
  &:focus { border-color: var(--accent); }
  &::placeholder { color: var(--text-muted); }
`;

const GroupChip = styled.div<{ color: string; active?: boolean }>`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 99px;
  background: ${p => p.active ? p.color + '22' : 'var(--surface2)'};
  border: 1.5px solid ${p => p.active ? p.color : 'var(--border)'};
  font-size: 11px; font-weight: 600; color: ${p => p.active ? p.color : 'var(--text-secondary)'};
  cursor: pointer; transition: all 0.15s;
  &:hover { border-color: ${p => p.color}; color: ${p => p.color}; }
`;

const QuotListItem = styled.div`
  padding: 9px 12px;
  border: 1px solid var(--border); border-radius: 7px;
  margin-bottom: 7px; cursor: pointer;
  background: var(--surface2);
  font-size: 12px; line-height: 1.5; color: var(--text);
  transition: border-color 0.15s;
  &:hover { border-color: var(--accent); }
`;

const QuotMeta = styled.div`font-size: 10px; color: var(--text-muted); margin-top: 4px;`;

/* ─── Sort/Filter Bar ────────────────────────────────── */
const FilterBar = styled.div`
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
  background: var(--surface); flex-wrap: wrap;
`;

const SortBtn = styled.button<{ active?: boolean }>`
  font-size: 11px; font-weight: 600; padding: 4px 10px;
  border-radius: 99px;
  background: ${p => p.active ? 'var(--text)' : 'var(--surface2)'};
  color: ${p => p.active ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${p => p.active ? 'var(--text)' : 'var(--border)'};
  transition: all 0.15s;
  &:hover { background: var(--text); color: white; border-color: var(--text); }
`;

/* ─── New Code Modal ─────────────────────────────────── */
const Overlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center; z-index: 200;
`;

const Modal = styled.div`
  background: var(--surface); border-radius: 14px;
  padding: 24px; width: 420px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
`;

const ModalTitle = styled.div`font-size: 16px; font-weight: 800; margin-bottom: 18px;`;

const Field = styled.div`margin-bottom: 14px;`;

/* ─── Component ──────────────────────────────────────── */
type SortMode = 'name' | 'count';

interface Props {
  onOpenInViewer?: (docId: string) => void;
}

export const CodeManager = ({ onOpenInViewer }: Props) => {
  const {
    codes, quotations, codeGroups,
    selectedCodeId, setSelectedCode,
    addCode, updateCode, deleteCode,
    addCodeGroup, updateCodeGroup, deleteCodeGroup,
    importCodes,
  } = useStore();
  const importRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('count');
  const [showModal, setShowModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  // 드래그 중 클릭 이벤트 방지를 위한 플래그
  const isDraggingRef = useRef(false);

  const selectedCode = codes.find(c => c.id === selectedCodeId) ?? null;
  const selectedGroups = codeGroups.filter(g => g.codeId === selectedCodeId);

  // Quotations for the selected code
  const selectedQuotations = useMemo(
    () => selectedCode ? quotations.filter(q => q.codes.includes(selectedCode.id)) : [],
    [selectedCode, quotations]
  );

  // groupId 필드 기반으로 그룹화 (comment 필드 비의존)
  const groupedQuotations = useMemo(() => {
    if (!selectedCode) return [];
    const result: { group: typeof selectedGroups[0] | null; quots: typeof selectedQuotations }[] = [];
    for (const g of selectedGroups) {
      const gQuots = selectedQuotations.filter(q => q.groupId === g.id);
      result.push({ group: g, quots: gQuots });
    }
    // 미분류: groupId가 null이거나 존재하지 않는 그룹을 가리키는 경우
    const validGroupIds = new Set(selectedGroups.map(g => g.id));
    const noGroupQuots = selectedQuotations.filter(
      q => !q.groupId || !validGroupIds.has(q.groupId)
    );
    result.push({ group: null, quots: noGroupQuots });
    return result;
  }, [selectedCode, selectedQuotations, selectedGroups]);

  // Filter + sort codes for left pane
  const filteredCodes = useMemo(() => {
    let arr = codes.filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.comment.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === 'name') arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'count') arr = [...arr].sort((a, b) => b.quotationIds.length - a.quotationIds.length);
    return arr;
  }, [codes, search, sort]);

  const handleSaveModal = () => {
    if (!modalName.trim()) return;
    addCode(modalName.trim(), modalDesc.trim());
    setModalName(''); setModalDesc(''); setShowModal(false);
  };

  const handleSelectCode = (id: string) => {
    setSelectedCode(id === selectedCodeId ? null : id);
    const c = codes.find(c => c.id === id);
    if (c) { setEditName(c.name); setEditDesc(c.comment); }
  };

  const handleSaveEdit = () => {
    if (!selectedCodeId) return;
    updateCode(selectedCodeId, { name: editName, comment: editDesc });
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim() || !selectedCodeId) return;
    addCodeGroup(selectedCodeId, newGroupName.trim());
    setNewGroupName('');
  };

  // groupId 필드로 그룹 소속 변경 (comment 필드 불변)
  const handleDropToGroup = (quotId: string, groupId: string | null) => {
    useStore.getState().updateQuotation(quotId, { groupId });
  };

  return (
    <Wrap>
      {/* ── LEFT: Code List ── */}
      <LeftPane>
        <PaneHeader>
          <PaneTitle>Code Manager</PaneTitle>
          <div style={{ display: 'flex', gap: 5 }}>
            <SmBtn variant="ghost" onClick={() => importRef.current?.click()} title="코드북 JSON 불러오기">↑ 불러오기</SmBtn>
            <SmBtn variant="accent" onClick={() => setShowModal(true)}>+ New Code</SmBtn>
          </div>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const text = await readFileText(file);
            const cb = parseCodebookJSON(text);
            if (cb) { importCodes(cb.codes); alert(`✅ ${cb.codes.length}개 코드 불러오기 완료`); }
            else alert('❌ 코드북 파일 형식 오류');
            e.target.value = '';
          }} />
        </PaneHeader>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <SearchInput
            placeholder="코드 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <FilterBar style={{ padding: '8px 12px', gap: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginRight: 2 }}>정렬</span>
          {(['name', 'count'] as SortMode[]).map(s => (
            <SortBtn key={s} active={sort === s} onClick={() => setSort(s)}>
              {s === 'name' ? '이름순' : '빈도순'}
            </SortBtn>
          ))}
        </FilterBar>
        <Scrollable>
          {filteredCodes.map(code => (
            <CodeRow
              key={code.id}
              active={code.id === selectedCodeId}
              onClick={() => handleSelectCode(code.id)}
            >
              <ColorDot color={code.color} />
              <CodeInfo>
                <CodeName>{code.name}</CodeName>
                {code.comment && <CodeDesc title={code.comment}>{code.comment}</CodeDesc>}
              </CodeInfo>
              <CodeCount>💬{code.quotationIds.length}</CodeCount>
            </CodeRow>
          ))}
          {filteredCodes.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              코드가 없습니다
            </div>
          )}
        </Scrollable>
      </LeftPane>

      {/* ── CENTER: Quotation Board ── */}
      <CenterPane>
        <PaneHeader>
          <div>
            <PaneTitle style={{ display: 'inline' }}>
              {selectedCode ? selectedCode.name : '← 코드를 선택하세요'}
            </PaneTitle>
          </div>
          {selectedCode && (
            <SmBtn variant="ghost" onClick={() => {
              addCodeGroup(selectedCode.id, '새 그룹');
            }}>+ 그룹 추가</SmBtn>
          )}
        </PaneHeader>

        {!selectedCode ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 32 }}>🏷️</div>
            <div style={{ fontSize: 14 }}>좌측에서 코드를 선택하면<br />연결된 Quotation을 볼 수 있습니다</div>
          </div>
        ) : (
          <BoardWrap>
            {groupedQuotations.map(({ group, quots }) => (
              <GroupSection key={group?.id ?? '__none'}>
                <GroupTitle>
                  {group ? (
                    <>
                      <span
                        contentEditable suppressContentEditableWarning
                        style={{ outline: 'none', cursor: 'text' }}
                        onBlur={e => updateCodeGroup(group.id, { name: e.currentTarget.textContent || group.name })}
                      >{group.name}</span>
                      <SmBtn variant="danger" onClick={() => deleteCodeGroup(group.id)} style={{ padding: '2px 7px', fontSize: 10 }}>×</SmBtn>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>미분류</span>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                    ({quots.length})
                  </span>
                </GroupTitle>
                <CardGrid
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    const qid = e.dataTransfer.getData('quotation-id');
                    if (qid) handleDropToGroup(qid, group?.id ?? null);
                  }}
                >
                  {quots.map(q => (
                    <QuotCard
                      key={q.id}
                      color={selectedCode.color}
                      draggable
                      onDragStart={e => {
                        isDraggingRef.current = true;
                        e.dataTransfer.setData('quotation-id', q.id);
                      }}
                      onDragEnd={() => {
                        // 짧은 딜레이 후 플래그 해제 (dragEnd → click 순서 보장)
                        setTimeout(() => { isDraggingRef.current = false; }, 50);
                      }}
                      onClick={() => {
                        if (isDraggingRef.current) return;
                        onOpenInViewer?.(q.documentId);
                      }}
                    >
                      <CardText>[{selectedCode.name}] {q.text}</CardText>
                      <CardMeta>{q.documentName.replace('_최종.csv', '').replace('_최종.docx', '')}</CardMeta>
                    </QuotCard>
                  ))}
                  {quots.length === 0 && (
                    <div style={{ padding: '16px 12px', color: 'var(--text-muted)', fontSize: 12, border: '2px dashed var(--border)', borderRadius: 8, width: 160 }}>
                      여기로 드래그
                    </div>
                  )}
                </CardGrid>
              </GroupSection>
            ))}
            {selectedQuotations.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
                아직 연결된 Quotation이 없습니다.<br />문서에서 텍스트를 드래그해 코드를 연결하세요.
              </div>
            )}
          </BoardWrap>
        )}
      </CenterPane>

      {/* ── RIGHT: Detail Editor ── */}
      <RightPane>
        <PaneHeader>
          <PaneTitle>코드 상세</PaneTitle>
          {selectedCode && (
            <SmBtn variant="danger" onClick={() => { deleteCode(selectedCode.id); setSelectedCode(null); }}>
              삭제
            </SmBtn>
          )}
        </PaneHeader>

        {selectedCode ? (
          <Scrollable>
            <DetailSection>
              <Field>
                <Label>코드명 (Keyword)</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} onBlur={handleSaveEdit} />
              </Field>
              <Field>
                <Label>설명 (Description)</Label>
                <Textarea
                  placeholder="이 코드에 대한 설명을 입력하세요..."
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  onBlur={handleSaveEdit}
                />
              </Field>
              <Field>
                <Label>색상</Label>
                <input
                  type="color"
                  value={selectedCode.color}
                  onChange={e => updateCode(selectedCode.id, { color: e.target.value })}
                  style={{ width: 32, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                />
              </Field>
            </DetailSection>

            <DetailSection>
              <Label style={{ marginBottom: 8 }}>그룹 관리</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                {selectedGroups.map(g => (
                  <GroupChip key={g.id} color={g.color} active>
                    {g.name}
                    <span onClick={() => deleteCodeGroup(g.id)} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
                  </GroupChip>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  placeholder="새 그룹 이름..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(); }}
                  style={{ flex: 1 }}
                />
                <SmBtn variant="accent" onClick={handleAddGroup}>추가</SmBtn>
              </div>
            </DetailSection>

            <DetailSection>
              <Label style={{ marginBottom: 8 }}>Quotations ({selectedQuotations.length})</Label>
              {selectedQuotations.map(q => (
                <QuotListItem key={q.id} onClick={() => onOpenInViewer?.(q.documentId)}>
                  {q.text}
                  <QuotMeta>📄 {q.documentName}</QuotMeta>
                </QuotListItem>
              ))}
              {selectedQuotations.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>연결된 Quotation 없음</div>
              )}
            </DetailSection>
          </Scrollable>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            코드를 선택하세요
          </div>
        )}
      </RightPane>

      {/* ── Tab Exchange Bar ── */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6 }}>
          📦 내보내기 / 가져오기
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
          <SmBtn onClick={() => downloadCodebook(codes, codeGroups)} style={{ fontSize: '10px', padding: '3px 8px' }}>↓ 코드북 JSON</SmBtn>
          <SmBtn onClick={() => downloadCodingResult(codes, quotations, codeGroups, [])} style={{ fontSize: '10px', padding: '3px 8px' }}>↓ 코딩 결과</SmBtn>
          <SmBtn onClick={() => importRef.current?.click()} style={{ fontSize: '10px', padding: '3px 8px' }}>↑ 코드북 가져오기</SmBtn>
        </div>
      </div>

      {/* ── New Code Modal ── */}
      {showModal && (
        <Overlay onClick={() => setShowModal(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>새 코드 추가</ModalTitle>
            <Field>
              <Label>코드명 (Keyword) *</Label>
              <Input
                autoFocus placeholder="예: Accessibility"
                value={modalName} onChange={e => setModalName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveModal(); }}
              />
            </Field>
            <Field>
              <Label>설명 (Description)</Label>
              <Textarea
                placeholder="이 코드가 분류하는 내용을 설명하세요..."
                value={modalDesc} onChange={e => setModalDesc(e.target.value)}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <SmBtn onClick={() => setShowModal(false)}>취소</SmBtn>
              <SmBtn variant="accent" onClick={handleSaveModal}>코드 생성</SmBtn>
            </div>
          </Modal>
        </Overlay>
      )}
    </Wrap>
  );
};