import { useRef } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';
import { parseFile } from '../../utils/fileParser';
import { parseCodebookJSON, readFileText } from '../../utils/tabExchange';

const Wrap = styled.div`flex:1; display:flex; flex-direction:column; overflow:hidden; background:var(--surface);`;
const Header = styled.div`padding:12px 14px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-shrink:0;`;
const Title = styled.div`font-size:13px; font-weight:800; color:var(--text);`;
const Btn = styled.button<{v?:'accent'|'ghost'|'small'}>`
  font-size:${p=>p.v==='small'?'10px':'11px'}; font-weight:700;
  padding:${p=>p.v==='small'?'3px 8px':'5px 11px'}; border-radius:6px; white-space:nowrap;
  background:${p=>p.v==='accent'?'var(--accent)':'var(--surface2)'};
  color:${p=>p.v==='accent'?'white':'var(--text-secondary)'};
  border:1px solid ${p=>p.v==='accent'?'transparent':'var(--border)'}; transition:opacity 0.15s;
  &:hover{opacity:0.8;}
`;
const DropZone = styled.div<{over?:boolean}>`
  margin:10px 12px; border:2px dashed ${p=>p.over?'var(--accent)':'var(--border2)'};
  background:${p=>p.over?'var(--accent-light)':'var(--surface2)'};
  border-radius:10px; padding:14px; text-align:center; cursor:pointer; transition:all 0.2s;
  &:hover{border-color:var(--accent);background:var(--accent-light);}
`;
const DropText = styled.div`font-size:11.5px; color:var(--text-secondary); line-height:1.5;`;
const TableHead = styled.div`
  display:grid; grid-template-columns:1fr 50px 60px 80px;
  padding:6px 14px; border-bottom:1px solid var(--border); background:var(--surface2); position:sticky; top:0; z-index:1;
`;
const HeadCell = styled.div`font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;`;
const Row = styled.div<{active?:boolean}>`
  display:grid; grid-template-columns:1fr 50px 60px 80px;
  padding:10px 14px; border-bottom:1px solid var(--border); cursor:pointer; align-items:center;
  background:${p=>p.active?'var(--accent-light)':'transparent'}; transition:background 0.1s;
  &:hover{background:${p=>p.active?'var(--accent-light)':'var(--surface2)'};}
`;
const DocName = styled.div`font-size:12.5px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`;
const Cell = styled.div`font-size:11.5px; color:var(--text-secondary);`;
const Badge = styled.span<{ok?:boolean}>`
  font-size:10px; font-weight:700; padding:2px 7px; border-radius:99px;
  background:${p=>p.ok?'var(--green-light)':'var(--blue-light)'};
  color:${p=>p.ok?'#2A9A6E':'var(--blue)'};
`;
const ExchangeBar = styled.div`
  padding:8px 12px; border-top:1px solid var(--border); background:var(--surface2); flex-shrink:0;
`;
const ExchangeTitle = styled.div`font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:6px;`;
const ExchangeRow = styled.div`display:flex; gap:6px; flex-wrap:wrap;`;

export const DocumentManager = () => {
  const {
    documents, activeDocumentId, addDocument, setActiveDocument,
    importCodes, importProjectData, exportProject,
  } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const codeImportRef = useRef<HTMLInputElement>(null);
  const projectImportRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.name.endsWith('.json') || file.name.endsWith('.qualcoder')) {
        const text = await readFileText(file);
        try {
          const payload = JSON.parse(text);
          // If it's explicitly a full project
          if (payload.type === 'project' || (payload.documents && payload.quotations)) {
            if (importProjectData(text)) alert('✅ 프로젝트 불러오기 완료');
            else alert('❌ 프로젝트 형식 오류');
            continue;
          }
        } catch {
          // Ignore parse errors and fall through to codebook check
        }
        
        // Next, try codebook
        const cb = parseCodebookJSON(text);
        if (cb && cb.codes.length > 0) { importCodes(cb.codes); alert(`✅ 코드북 불러오기 완료 (${cb.codes.length}개 코드)`); continue; }
        
        alert('❌ 파일 형식을 인식할 수 없습니다.');
        continue;
      }
      try {
        const doc = await parseFile(file);
        addDocument(doc);
        setActiveDocument(doc.id);
      } catch (e) { console.error(e); }
    }
  };

  const handleCodeImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await readFileText(file);
    const cb = parseCodebookJSON(text);
    if (cb && cb.codes.length > 0) {
      importCodes(cb.codes);
      alert(`✅ 코드북 ${cb.codes.length}개 코드를 불러왔습니다.`);
    } else {
      alert('❌ 유효한 코드북 파일이 아닙니다.');
    }
    e.target.value = '';
  };

  const handleProjectImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('현재 작업이 모두 교체됩니다. 계속하시겠습니까?')) return;
    const text = await readFileText(file);
    const ok = importProjectData(text);
    alert(ok ? '✅ 프로젝트를 불러왔습니다.' : '❌ 파일 형식 오류');
    e.target.value = '';
  };

  return (
    <Wrap>
      <Header>
        <Title>Document Manager</Title>
        <Btn v="accent" onClick={() => inputRef.current?.click()}>+ 추가</Btn>
        <input ref={inputRef} type="file" accept=".csv,.docx,.txt,.json,.qualcoder" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files)} />
      </Header>

      <DropZone
        onDragOver={e=>{e.preventDefault();}}
        onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}
        onClick={() => inputRef.current?.click()}
      >
        <div style={{fontSize:22,marginBottom:4}}>📂</div>
        <DropText><b>CSV / DOCX</b> 인터뷰 파일 드래그<br/>또는 <b>.json</b> 코드북/프로젝트 파일</DropText>
      </DropZone>

      {documents.length > 0 && (
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <TableHead>
            <HeadCell>이름</HeadCell>
            <HeadCell>코드</HeadCell>
            <HeadCell>인용</HeadCell>
            <HeadCell>상태</HeadCell>
          </TableHead>
          <div style={{flex:1,overflowY:'auto'}}>
            {documents.map(doc => (
              <Row key={doc.id} active={doc.id===activeDocumentId} onClick={()=>setActiveDocument(doc.id)}>
                <DocName title={doc.name}>{doc.name}</DocName>
                <Cell>🏷️{doc.codes}</Cell>
                <Cell>💬{doc.quotations}</Cell>
                <Cell><Badge ok={doc.status==='완료'}>{doc.status}</Badge></Cell>
              </Row>
            ))}
          </div>
        </div>
      )}

      {/* Tab Exchange Bar */}
      <ExchangeBar>
        <ExchangeTitle>📦 탭 간 연동 (다운로드 / 불러오기)</ExchangeTitle>
        <ExchangeRow>
          <Btn v="small" onClick={exportProject}>
            ↓ 프로젝트 저장
          </Btn>
          <Btn v="small" onClick={() => projectImportRef.current?.click()}>
            ↑ 프로젝트 열기
          </Btn>
          <Btn v="small" onClick={() => codeImportRef.current?.click()}>
            ↑ 코드북 가져오기
          </Btn>
        </ExchangeRow>
        <input ref={codeImportRef} type="file" accept=".json" style={{display:'none'}} onChange={handleCodeImport} />
        <input ref={projectImportRef} type="file" accept=".json,.qualcoder" style={{display:'none'}} onChange={handleProjectImport} />
      </ExchangeBar>
    </Wrap>
  );
};
