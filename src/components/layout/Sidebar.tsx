import { useStore } from '../../store/useStore';
import styled from 'styled-components';

const SidebarWrap = styled.div`
  width:var(--sidebar-w); background:#18181B;
  display:flex; flex-direction:column; align-items:center;
  padding:8px 0; gap:1px; flex-shrink:0; z-index:10;
`;
const Logo = styled.div`
  width:30px; height:30px; background:var(--accent); border-radius:7px;
  display:flex; align-items:center; justify-content:center;
  font-weight:900; font-size:14px; color:white; margin-bottom:6px;
`;
const IBtn = styled.button<{active?:boolean}>`
  width:44px; height:44px; border-radius:8px; position:relative;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;
  color:${p=>p.active?'white':'#555'};
  background:${p=>p.active?'#2A2A2E':'transparent'};
  border-left:2px solid ${p=>p.active?'var(--accent)':'transparent'};
  transition:all 0.15s; font-size:14px;
  &:hover{background:#2A2A2E;color:#CCC;}
`;
const Lbl = styled.div`font-size:7px; font-weight:800; letter-spacing:0.4px; color:inherit; text-transform:uppercase;`;
const Div = styled.div`width:22px; height:1px; background:#2A2A2E; margin:2px 0;`;
const SaveDot = styled.div`
  width:7px; height:7px; border-radius:50%; background:var(--accent);
  position:absolute; top:5px; right:5px; border:1.5px solid #18181B;
`;
const ApiDot = styled.div<{on:boolean}>`
  width:6px; height:6px; border-radius:50%;
  background:${p=>p.on?'#61D9A5':'#555'};
  position:absolute; bottom:5px; right:5px; border:1.5px solid #18181B;
`;

const NAV_TOP = [
  { id:'documents', icon:'📄', label:'Docs' },
  { id:'codes',     icon:'🏷️', label:'Codes' },
  { id:'board',     icon:'📌', label:'Board' },
  { id:'network',   icon:'🕸️', label:'Graph' },
];
const NAV_MID = [
  { id:'query',  icon:'🔍', label:'Query' },
  { id:'matrix', icon:'⬛', label:'Matrix' },
  { id:'memos',  icon:'📝', label:'Memos' },
];

export const Sidebar = () => {
  const { activeView, setActiveView, isDirty, saveProject, settings } = useStore();
  const hasApi = !!settings.geminiApiKey;

  return (
    <SidebarWrap>
      <Logo>Q</Logo>

      {NAV_TOP.map(n=>(
        <IBtn key={n.id} active={activeView===n.id} onClick={()=>setActiveView(n.id)} title={n.label}>
          <span>{n.icon}</span><Lbl>{n.label}</Lbl>
        </IBtn>
      ))}

      <Div/>

      {NAV_MID.map(n=>(
        <IBtn key={n.id} active={activeView===n.id} onClick={()=>setActiveView(n.id)} title={n.label}>
          <span>{n.icon}</span><Lbl>{n.label}</Lbl>
        </IBtn>
      ))}

      <Div/>
      <div style={{flex:1}}/>

      <IBtn active={activeView==='transcribe'} onClick={()=>setActiveView('transcribe')} title="음성 전사 (STT)">
        <span>🎙️</span><Lbl>STT</Lbl>
        <ApiDot on={hasApi}/>
      </IBtn>

      <IBtn active={activeView==='settings'} onClick={()=>setActiveView('settings')} title="설정">
        <span>⚙️</span><Lbl>Settings</Lbl>
        {!hasApi && <ApiDot on={false}/>}
      </IBtn>

      <Div/>

      <IBtn onClick={saveProject} title="프로젝트 저장 (Ctrl+S)">
        <span>💾</span><Lbl>Save</Lbl>
        {isDirty && <SaveDot/>}
      </IBtn>
    </SidebarWrap>
  );
};
