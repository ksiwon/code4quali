import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import styled from 'styled-components';
import { GlobalStyle } from '../styles/GlobalStyle';

// 분류된 컴포넌트 import
import { Sidebar, TopBar }                          from './layout';
import { DocumentManager, DocumentViewer }          from './documents';
import { CodeManager, BoardView }                   from './codes';
import { NetworkView, QueryTool,
         CooccurrenceMatrix, AnalyticMemos }        from './analysis';
import { TranscribeView }                           from './stt';
import { SettingsView }                             from './settings';

const AppWrap  = styled.div`display:flex; flex-direction:column; height:100vh; overflow:hidden;`;
const MainWrap = styled.div`display:flex; flex:1; overflow:hidden;`;
const LeftPanel   = styled.div`width:300px; flex-shrink:0; display:flex; flex-direction:column; border-right:1px solid var(--border); overflow:hidden; background:var(--surface);`;
const CenterPanel = styled.div`flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0;`;

function App() {
  const { activeView, setActiveView, setActiveDocument, loadProject } = useStore();

  useEffect(() => { loadProject(); }, []);

  const handleOpenInViewer = (docId: string) => {
    setActiveDocument(docId);
    setActiveView('documents');
  };

  const isDoc = activeView === 'documents';

  return (
    <>
      <GlobalStyle />
      <AppWrap>
        <TopBar />
        <MainWrap>
          <Sidebar />
          {isDoc && (
            <>
              <LeftPanel><DocumentManager /></LeftPanel>
              <CenterPanel><DocumentViewer /></CenterPanel>
            </>
          )}
          {activeView === 'codes'    && <CenterPanel><CodeManager    onOpenInViewer={handleOpenInViewer} /></CenterPanel>}
          {activeView === 'board'    && <CenterPanel><BoardView       onOpenInViewer={handleOpenInViewer} /></CenterPanel>}
          {activeView === 'network'  && <CenterPanel><NetworkView /></CenterPanel>}
          {activeView === 'query'    && <CenterPanel><QueryTool       onOpenDoc={handleOpenInViewer} /></CenterPanel>}
          {activeView === 'matrix'   && <CenterPanel><CooccurrenceMatrix onOpenDoc={handleOpenInViewer} /></CenterPanel>}
          {activeView === 'memos'    && <CenterPanel><AnalyticMemos /></CenterPanel>}
          {activeView === 'transcribe' && <CenterPanel><TranscribeView /></CenterPanel>}
          {activeView === 'settings' && <CenterPanel><SettingsView /></CenterPanel>}
        </MainWrap>
      </AppWrap>
    </>
  );
}

export default App;
