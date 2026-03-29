import { useState } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';

const Wrap = styled.div`
  flex:1; overflow-y:auto; padding:28px 32px;
  background: var(--bg);
`;
const PageTitle = styled.div`font-size:20px; font-weight:900; color:var(--text); margin-bottom:4px;`;
const PageSub   = styled.div`font-size:13px; color:var(--text-muted); margin-bottom:24px;`;
const Grid = styled.div`display:grid; grid-template-columns:1fr 1fr; gap:20px; max-width:900px;`;
const Card = styled.div`
  background:var(--surface); border:1px solid var(--border); border-radius:12px;
  padding:20px; display:flex; flex-direction:column; gap:12px;
`;
const CardTitle = styled.div`font-size:13px; font-weight:800; color:var(--text);`;
const Field = styled.div`display:flex; flex-direction:column; gap:5px;`;
const Label = styled.label`font-size:11.5px; font-weight:700; color:var(--text-secondary);`;
const Input = styled.input`
  padding:8px 11px; border:1.5px solid var(--border); border-radius:8px;
  font-size:13px; outline:none; background:var(--surface2); color:var(--text);
  transition:border-color 0.2s;
  &:focus{border-color:var(--accent);}
`;
const Select = styled.select`
  padding:8px 11px; border:1.5px solid var(--border); border-radius:8px;
  font-size:13px; outline:none; background:var(--surface2); color:var(--text);
  cursor:pointer;
  &:focus{border-color:var(--accent);}
`;
const Toggle = styled.div`display:flex; align-items:center; justify-content:space-between; font-size:13px;`;
const ToggleTrack = styled.div<{on:boolean}>`
  width:36px; height:20px; border-radius:99px; cursor:pointer; position:relative;
  background:${p=>p.on?'var(--accent)':'var(--border2)'}; transition:background 0.2s;
  &::after{content:''; position:absolute; left:${p=>p.on?'18px':'3px'}; top:3px;
    width:14px; height:14px; border-radius:50%; background:white; transition:left 0.2s;}
`;
const Btn = styled.button<{variant?:'accent'|'danger'|'ghost'|'nuke'}>`
  padding:9px 18px; border-radius:9px; font-size:12.5px; font-weight:700; border:none;
  background:${p=>
    p.variant==='accent' ? 'var(--accent)' :
    p.variant==='danger' ? '#DC2626' :
    p.variant==='nuke'   ? '#18181B' : 'var(--surface2)'};
  color:${p=>
    p.variant==='accent'||p.variant==='danger'||p.variant==='nuke' ? 'white' : 'var(--text-secondary)'};
  cursor:pointer; border:1.5px solid ${p=>p.variant==='ghost'?'var(--border)':'transparent'};
  transition:opacity 0.15s; &:hover{opacity:0.8;}
`;
const StatusMsg = styled.div<{ok:boolean}>`
  font-size:11.5px; font-weight:600; padding:8px 12px; border-radius:7px;
  background:${p=>p.ok?'#EBF9F3':'#FEE2E2'}; color:${p=>p.ok?'#2A9A6E':'#DC2626'};
  border:1px solid ${p=>p.ok?'#61D9A544':'#E9647244'};
`;
const Divider = styled.div`height:1px; background:var(--border); margin:2px 0;`;

/* 경고 박스 */
const WarnBox = styled.div`
  background:#FEF2F2; border:1.5px solid #FECACA; border-radius:10px;
  padding:14px 16px; display:flex; flex-direction:column; gap:8px;
`;
const WarnTitle = styled.div`font-size:12.5px; font-weight:800; color:#DC2626; display:flex; align-items:center; gap:6px;`;
const WarnDesc  = styled.div`font-size:11.5px; color:#7F1D1D; line-height:1.6;`;

const MODELS = [
  { value:'gemini-3.1-flash-lite-preview', label:'gemini-3.1-flash-lite-preview — 빠름 · 최신 (권장)' },
  { value:'gemini-3-flash-preview',        label:'gemini-3-flash-preview — 최고 정확도 · 최신' },
  { value:'gemini-2.0-flash',              label:'gemini-2.0-flash — 안정적' },
  { value:'gemini-1.5-pro',                label:'gemini-1.5-pro — 구형 · 느림' },
];

export const SettingsView = () => {
  const {
    settings, updateSettings, clearProject, clearAllData,
    exportProject, documents, codes, quotations, memos,
  } = useStore();
  const [apiStatus, setApiStatus] = useState<boolean|null>(null);
  const [testing,  setTesting]   = useState(false);
  const [localKey, setLocalKey]  = useState(settings.geminiApiKey);

  const handleSaveKey = () => {
    updateSettings({ geminiApiKey: localKey });
    setApiStatus(null);
  };

  const handleTest = async () => {
    if (!localKey) return;
    setTesting(true); setApiStatus(null);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${localKey}`);
      setApiStatus(res.ok);
    } catch { setApiStatus(false); }
    setTesting(false);
  };

  /* 전체 데이터 삭제 — 2회 confirm 후 reload */
  const handleNukeAll = () => {
    const first = confirm(
      '⚠️ 경고: 모든 로컬 데이터(프로젝트 + API 설정)가 완전히 삭제됩니다.\n\n계속하시겠습니까?'
    );
    if (!first) return;

    const second = confirm(
      '🚨 최종 확인: 삭제 후에는 되돌릴 수 없습니다.\n\n정말로 모든 데이터를 삭제하고 앱을 새로고침하시겠습니까?'
    );
    if (!second) return;

    clearAllData();
    window.location.reload();
  };

  const stats = [
    { icon:'📄', label:'문서',       count: documents.length },
    { icon:'🏷️', label:'코드',       count: codes.length },
    { icon:'💬', label:'Quotation', count: quotations.length },
    { icon:'📝', label:'메모',       count: memos.length },
  ];

  return (
    <Wrap>
      <PageTitle>⚙️ 설정</PageTitle>
      <PageSub>API 키, 모델, 프로젝트 설정을 관리합니다.</PageSub>

      <Grid>
        {/* ─── 일반 설정 ─── */}
        <Card>
          <CardTitle>일반 설정</CardTitle>
          <Toggle>
            <Label>다크 모드 (Dark Mode)</Label>
            <ToggleTrack 
              on={settings.theme === 'dark'} 
              onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} 
            />
          </Toggle>
          <Divider />
          <Field>
            <Label>인터뷰어 호칭 (STT 레이블)</Label>
            <Input 
              value={settings.interviewerLabel} 
              onChange={e => updateSettings({ interviewerLabel: e.target.value })}
              placeholder="예: 인터뷰어, 조사자, 나"
            />
          </Field>
          <Toggle>
            <Label>자동 저장 (Local Storage)</Label>
            <ToggleTrack 
              on={settings.autoSave} 
              onClick={() => updateSettings({ autoSave: !settings.autoSave })} 
            />
          </Toggle>
        </Card>

        {/* ─── AI 분석 설정 ─── */}
        <Card>
          <CardTitle>🔑 Gemini API 키</CardTitle>
          <Field>
            <Label>API 키</Label>
            <Input
              type="password"
              placeholder="AIza..."
              value={localKey}
              onChange={e => { setLocalKey(e.target.value); setApiStatus(null); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); }}
            />
          </Field>
          <div style={{display:'flex', gap:8}}>
            <Btn variant="accent" onClick={handleSaveKey}>저장</Btn>
            <Btn variant="ghost"  onClick={handleTest} style={{opacity: testing ? 0.6 : 1}}>
              {testing ? '⏳ 테스트 중...' : '🔌 연결 테스트'}
            </Btn>
          </div>
          {apiStatus !== null && (
            <StatusMsg ok={apiStatus}>
              {apiStatus ? '✅ API 키가 유효합니다.' : '❌ API 키가 유효하지 않거나 연결 오류입니다.'}
            </StatusMsg>
          )}
        </Card>

        {/* ── 모델 및 기본값 ── */}
        <Card>
          <CardTitle>🤖 모델 및 기본값</CardTitle>
          <Field>
            <Label>기본 모델 (STT · AI 추천)</Label>
            <Select value={settings.model} onChange={e => updateSettings({ model: e.target.value })}>
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </Field>
          <Field>
            <Label>인터뷰어 레이블</Label>
            <Input
              value={settings.interviewerLabel}
              onChange={e => updateSettings({ interviewerLabel: e.target.value })}
              placeholder="인터뷰어"
            />
          </Field>
          <Toggle>
            <span>자동 저장 (변경 시 로컬 저장)</span>
            <input type="checkbox" style={{display:'none'}} checked={settings.autoSave} onChange={e=>updateSettings({autoSave:e.target.checked})} />
            <ToggleTrack on={settings.autoSave} onClick={()=>updateSettings({autoSave:!settings.autoSave})} />
          </Toggle>
        </Card>

        {/* ── 프로젝트 현황 ── */}
        <Card>
          <CardTitle>📊 현재 프로젝트 현황</CardTitle>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {stats.map(s=>(
              <div key={s.label} style={{padding:'14px',background:'var(--surface2)',borderRadius:10,border:'1px solid var(--border)',textAlign:'center'}}>
                <div style={{fontSize:22}}>{s.icon}</div>
                <div style={{fontSize:22,fontWeight:900,color:'var(--text)',lineHeight:1.2}}>{s.count}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>
          <Divider />
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Btn variant="accent" onClick={()=>exportProject()}>📤 프로젝트 내보내기</Btn>
            <Btn variant="danger" onClick={()=>{if(confirm('모든 데이터가 삭제됩니다. 계속하시겠습니까?')) clearProject();}}>
              🗑 프로젝트 초기화
            </Btn>
          </div>
        </Card>

        {/* ── 단축키 ── */}
        <Card>
          <CardTitle>⌨️ 키보드 단축키</CardTitle>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
            {[
              ['Ctrl + S', '프로젝트 저장'],
              ['드래그', 'Quotation 생성'],
              ['더블클릭', '코드명 편집'],
              ['Enter', '코드 추가 / 검색'],
              ['Esc', '팝업 닫기'],
              ['마우스 휠', '네트워크 줌'],
            ].map(([key, desc])=>(
              <div key={key} style={{padding:'8px 10px',background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
                <code style={{fontSize:10,fontWeight:700,background:'var(--text)',color:'white',padding:'2px 6px',borderRadius:5,whiteSpace:'nowrap'}}>{key}</code>
                <span style={{fontSize:11,color:'var(--text-secondary)'}}>{desc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── ☢️ 위험 구역: 전체 데이터 삭제 ── */}
        <Card style={{gridColumn:'1/-1', border:'1.5px solid #FECACA'}}>
          <CardTitle style={{color:'#DC2626'}}>☢️ 위험 구역</CardTitle>
          <WarnBox>
            <WarnTitle>🗑️ 전체 localStorage 초기화</WarnTitle>
            <WarnDesc>
              브라우저에 저장된 <b>모든 데이터</b>를 완전히 삭제합니다.<br/>
              프로젝트 데이터(문서·코드·Quotation·메모)와 <b>API 키·설정</b>이 모두 사라집니다.<br/>
              삭제 후 앱이 자동으로 새로고침되며, <b>복구할 수 없습니다.</b>
            </WarnDesc>
            <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
              <div style={{fontSize:11, color:'#7F1D1D', fontWeight:600}}>
                현재 저장된 데이터: 문서 {documents.length}개 · 코드 {codes.length}개 · Quotation {quotations.length}개 · 메모 {memos.length}개
              </div>
              <Btn variant="nuke" onClick={handleNukeAll} style={{marginLeft:'auto'}}>
                🗑️ 전체 데이터 삭제 및 초기화
              </Btn>
            </div>
          </WarnBox>
        </Card>
      </Grid>
    </Wrap>
  );
};
