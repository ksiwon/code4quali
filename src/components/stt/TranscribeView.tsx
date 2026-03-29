import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import styled, { keyframes, css } from 'styled-components';

/* ─── Types ─────────────────────────────────────── */
type Stage = 'setup' | 'transcribing' | 'merging' | 'converting' | 'done';
type LogLevel = 'info' | 'success' | 'error' | 'warn';

interface LogEntry { id: number; level: LogLevel; msg: string; ts: string; }
interface AudioFile { file: File; name: string; size: string; status: 'pending' | 'uploading' | 'processing' | 'done' | 'error'; progress: number; rowCount?: number; lastTs?: string; completeness?: number; }
interface CsvResult { name: string; rows: { time: string; speaker: string; content: string }[]; audioName: string; }

/* ─── Animations ────────────────────────────────── */
const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const fadeIn = keyframes`from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); }`;
const pulse = keyframes`0%,100% { opacity: 1; } 50% { opacity: 0.4; }`;

/* ─── Styled Components ─────────────────────────── */
const Wrap = styled.div`
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
  background: #F7F6F3; font-family: inherit;
`;

const Body = styled.div`flex: 1; display: flex; overflow: hidden;`;

const LeftCol = styled.div`
  width: 380px; flex-shrink: 0; display: flex; flex-direction: column;
  border-right: 1px solid var(--border); background: var(--surface); overflow: hidden;
`;

const RightCol = styled.div`flex: 1; display: flex; flex-direction: column; overflow: hidden;`;

const Section = styled.div`
  padding: 14px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
`;

const SectionTitle = styled.div`
  font-size: 11px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 10px;
  display: flex; align-items: center; gap: 6px;
`;

const ApiRow = styled.div`display: flex; gap: 6px; align-items: center;`;

const ApiInput = styled.input<{ valid?: boolean }>`
  flex: 1; padding: 8px 11px;
  border: 1.5px solid ${p => p.valid === true ? '#61D9A5' : p.valid === false ? '#E96472' : 'var(--border)'};
  border-radius: 8px; font-size: 12.5px; outline: none;
  background: var(--surface2); color: var(--text); font-family: monospace;
  transition: border-color 0.2s;
  &:focus { border-color: var(--accent); }
  &::placeholder { color: var(--text-muted); font-family: inherit; }
`;

const Btn = styled.button<{ variant?: 'accent' | 'ghost' | 'danger' | 'outline'; disabled?: boolean }>`
  padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700;
  border: 1.5px solid transparent;
  background: ${p =>
    p.disabled ? 'var(--surface2)' :
    p.variant === 'accent' ? 'var(--accent)' :
    p.variant === 'danger' ? '#FEE2E2' :
    p.variant === 'outline' ? 'transparent' : 'var(--surface2)'};
  color: ${p =>
    p.disabled ? 'var(--text-muted)' :
    p.variant === 'accent' ? 'white' :
    p.variant === 'danger' ? '#DC2626' :
    p.variant === 'outline' ? 'var(--text)' : 'var(--text-secondary)'};
  border-color: ${p =>
    p.variant === 'outline' ? 'var(--border2)' :
    p.variant === 'danger' ? '#FECACA' : 'transparent'};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.15s; white-space: nowrap;
  &:hover:not(:disabled) { opacity: ${p => p.disabled ? 1 : 0.8}; }
`;

const DropZone = styled.div<{ over?: boolean }>`
  border: 2px dashed ${p => p.over ? 'var(--accent)' : 'var(--border2)'};
  background: ${p => p.over ? 'var(--accent-light)' : 'var(--surface2)'};
  border-radius: 10px; padding: 18px 14px;
  text-align: center; cursor: pointer; transition: all 0.2s;
  &:hover { border-color: var(--accent); background: var(--accent-light); }
`;

const DropText = styled.div`font-size: 12.5px; color: var(--text-secondary); line-height: 1.5;`;

const FileList = styled.div`flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 7px;`;

const FileCard = styled.div<{ status: AudioFile['status'] }>`
  border: 1.5px solid ${p =>
    p.status === 'done' ? '#61D9A577' :
    p.status === 'error' ? '#E9647277' :
    p.status === 'processing' || p.status === 'uploading' ? 'var(--accent)44' :
    'var(--border)'};
  border-radius: 9px; padding: 10px 12px;
  background: ${p =>
    p.status === 'done' ? '#61D9A511' :
    p.status === 'error' ? '#E9647211' : 'var(--surface)'};
  animation: ${fadeIn} 0.2s ease;
`;

const FileCardTop = styled.div`display: flex; align-items: center; gap: 8px;`;
const FileIcon = styled.div`font-size: 18px; flex-shrink: 0;`;
const FileInfo = styled.div`flex: 1; min-width: 0;`;
const FileName = styled.div`font-size: 12.5px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const FileMeta = styled.div`font-size: 11px; color: var(--text-muted); margin-top: 2px;`;

const StatusBadge = styled.div<{ status: AudioFile['status'] }>`
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; white-space: nowrap;
  background: ${p =>
    p.status === 'done' ? '#61D9A522' :
    p.status === 'error' ? '#E9647222' :
    p.status === 'processing' ? 'var(--accent-light)' :
    p.status === 'uploading' ? '#EBF1FA' : 'var(--surface2)'};
  color: ${p =>
    p.status === 'done' ? '#2A9A6E' :
    p.status === 'error' ? '#DC2626' :
    p.status === 'processing' ? 'var(--accent)' :
    p.status === 'uploading' ? 'var(--blue)' : 'var(--text-muted)'};
  animation: ${p => (p.status === 'processing' || p.status === 'uploading') ? css`${pulse} 1.5s ease infinite` : 'none'};
`;

const DeleteBtn = styled.button`
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface2); border: 1px solid var(--border);
  font-size: 12px; color: var(--text-muted); transition: all 0.15s;
  &:hover { background: #FEE2E2; border-color: #FECACA; color: #DC2626; }
`;

const ProgressBar = styled.div<{ pct: number; status: AudioFile['status'] }>`
  height: 3px; border-radius: 99px; margin-top: 7px;
  background: var(--border);
  overflow: hidden;
  &::after {
    content: ''; display: block; height: 100%; border-radius: 99px;
    width: ${p => p.pct}%; transition: width 0.5s ease;
    background: ${p => p.status === 'done' ? '#61D9A5' : p.status === 'error' ? '#E96472' : 'var(--accent)'};
  }
`;

const CompletenessBar = styled.div<{ pct: number }>`
  display: flex; align-items: center; gap: 6px; margin-top: 5px;
  font-size: 10px; color: var(--text-muted);
  span { font-weight: 700; color: ${p => p.pct >= 70 ? '#2A9A6E' : '#DC2626'}; }
`;

const MiniBar = styled.div<{ pct: number }>`
  flex: 1; height: 4px; border-radius: 99px; background: var(--border); overflow: hidden;
  &::after {
    content: ''; display: block; height: 100%;
    width: ${p => p.pct}%;
    background: ${p => p.pct >= 70 ? '#61D9A5' : '#E96472'};
    border-radius: 99px; transition: width 0.5s;
  }
`;

/* ── Right col ── */
const TabBar = styled.div`
  display: flex; border-bottom: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
`;

const Tab = styled.button<{ active?: boolean }>`
  padding: 10px 18px; font-size: 12px; font-weight: 700;
  border-bottom: 2px solid ${p => p.active ? 'var(--accent)' : 'transparent'};
  color: ${p => p.active ? 'var(--accent)' : 'var(--text-secondary)'};
  background: none; transition: all 0.15s;
  &:hover { color: var(--text); }
`;

const LogBox = styled.div`
  flex: 1; overflow-y: auto; padding: 14px 16px;
  background: #18181B; font-family: 'Fira Code', 'Courier New', monospace;
  display: flex; flex-direction: column; gap: 3px;
`;

const LogLine = styled.div<{ level: LogLevel }>`
  font-size: 11.5px; line-height: 1.6;
  color: ${p => p.level === 'success' ? '#4ADE80' : p.level === 'error' ? '#F87171' : p.level === 'warn' ? '#FBBF24' : '#A1A1AA'};
  animation: ${fadeIn} 0.15s ease;
  span.ts { color: #52525B; margin-right: 8px; }
  span.prefix { margin-right: 6px; }
`;

const ResultPanel = styled.div`flex: 1; overflow-y: auto; padding: 16px;`;

const ResultCard = styled.div`
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 10px; margin-bottom: 14px; overflow: hidden;
`;

const ResultCardHeader = styled.div`
  padding: 10px 14px; background: var(--surface2);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px;
`;

const ResultCardBody = styled.div`max-height: 280px; overflow-y: auto;`;

const ResultRow = styled.div`
  display: grid; grid-template-columns: 60px 80px 1fr;
  padding: 7px 14px; border-bottom: 1px solid var(--border);
  font-size: 12px; gap: 8px;
  &:last-child { border-bottom: none; }
`;

const SpeakerTag = styled.span<{ speaker: string }>`
  font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 99px;
  background: ${p => p.speaker.includes('인터뷰어') || p.speaker.includes('모더레이터') ? '#EBF1FA' : '#F5ECE3'};
  color: ${p => p.speaker.includes('인터뷰어') || p.speaker.includes('모더레이터') ? '#3D6B9E' : '#7A5230'};
`;

const Spinner = styled.div`
  width: 14px; height: 14px; border: 2px solid transparent;
  border-top-color: currentColor; border-radius: 50%;
  animation: ${spin} 0.7s linear infinite; display: inline-block;
`;

const ControlRow = styled.div`
  padding: 12px 16px; border-top: 1px solid var(--border);
  background: var(--surface); display: flex; gap: 8px; align-items: center;
  flex-shrink: 0;
`;

const OptionRow = styled.label`
  display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-secondary);
  cursor: pointer;
  input { cursor: pointer; accent-color: var(--accent); }
`;

const Select = styled.select`
  padding: 6px 10px; border: 1px solid var(--border); border-radius: 7px;
  font-size: 12px; background: var(--surface2); color: var(--text);
  outline: none; cursor: pointer;
  &:focus { border-color: var(--accent); }
`;

const EmptyLog = styled.div`
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; color: #52525B; gap: 8px;
`;

/* ─── Helpers ───────────────────────────────────── */
function fmtSize(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function nowTs() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fileIcon(name: string) {
  if (/\.(m4a|mp4)$/i.test(name)) return '🎵';
  if (/\.mp3$/i.test(name)) return '🎶';
  return '📁';
}

function statusLabel(s: AudioFile['status']) {
  return { pending: '대기', uploading: '업로드중', processing: '전사중', done: '완료', error: '오류' }[s];
}

/* ─── Main Component ────────────────────────────── */
export const TranscribeView = () => {
  const { settings, updateSettings, setSttStats } = useStore();
  const [apiKey, setApiKey] = useState(settings.geminiApiKey);
  const [apiValid, setApiValid] = useState<boolean | undefined>(undefined);
  const [model, setModel] = useState(settings.model);
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [results, setCsvResults] = useState<CsvResult[]>([]);
  const [stage, setStage] = useState<Stage>('setup');
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<'log' | 'result'>('log');
  const [doMerge, setDoMerge] = useState(false);
  const [doConvert, setDoConvert] = useState(false);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const logId = useRef(0);

  /* TopBar에 STT 통계 실시간 동기화 */
  useEffect(() => {
    setSttStats({
      total: files.length,
      done: files.filter(f => f.status === 'done').length,
      results: results.length,
      stage,
    });
  }, [files, results, stage, setSttStats]);

  /* 언마운트 시 TopBar sttStats 초기화 */
  useEffect(() => () => { setSttStats(null); }, [setSttStats]);

  const log = useCallback((msg: string, level: LogLevel = 'info') => {
    const entry: LogEntry = { id: logId.current++, level, msg, ts: nowTs() };
    setLogs(prev => [...prev, entry]);
    setTimeout(() => logRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
  }, []);

  const updateFile = useCallback((name: string, updates: Partial<AudioFile>) => {
    setFiles(prev => prev.map(f => f.name === name ? { ...f, ...updates } : f));
  }, []);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const allowed = ['.m4a', '.mp4', '.mp3', '.wav'];
    const arr: AudioFile[] = [];
    for (const f of Array.from(newFiles)) {
      if (!allowed.some(ext => f.name.toLowerCase().endsWith(ext))) continue;
      if (files.find(x => x.name === f.name)) continue;
      arr.push({ file: f, name: f.name, size: fmtSize(f.size), status: 'pending', progress: 0 });
    }
    setFiles(prev => [...prev, ...arr]);
    if (arr.length) log(`${arr.length}개 파일 추가됨`, 'info');
  };

  /* ─── 파일 삭제 ─── */
  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    log(`파일 삭제됨: ${name}`, 'warn');
  };

  /* ─── Gemini API call ─── */
  const callGeminiTranscribe = async (audioFile: File, apiKey: string, modelId: string): Promise<string> => {
    // Step 1: Upload file
    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
    const formData = new FormData();
    formData.append('file', audioFile, audioFile.name);

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'X-Goog-Upload-Protocol': 'multipart' },
      body: formData,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`파일 업로드 실패: ${uploadRes.status} - ${err}`);
    }
    const uploadData = await uploadRes.json();
    const fileUri = uploadData.file?.uri;
    const mimeType = uploadData.file?.mimeType || 'audio/mp4';
    if (!fileUri) throw new Error('파일 URI를 가져올 수 없습니다.');

    log(`  ✅ 업로드 완료 → ${uploadData.file?.name}`, 'success');

    // Step 2: Wait for processing
    let fileState = uploadData.file?.state;
    const fileName = uploadData.file?.name;
    let waitCount = 0;
    while (fileState === 'PROCESSING' && waitCount < 30) {
      await new Promise(r => setTimeout(r, 3000));
      const stateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
      const stateData = await stateRes.json();
      fileState = stateData.state;
      waitCount++;
    }
    if (fileState !== 'ACTIVE') throw new Error(`파일 처리 실패: ${fileState}`);

    log(`  ⏳ 파일 처리 완료, 전사 시작...`, 'info');

    // Step 3: Transcribe
    const prompt = `당신은 최고 수준의 전문 인터뷰 전사 전문가입니다.
아래 오디오는 인터뷰 녹음입니다. 인터뷰어(연구자/진행자)와 인터뷰이 간의 대화입니다.

**출력 형식: 반드시 아래 CSV 형식만 출력하세요. 다른 텍스트, 설명, 마크다운은 절대 포함하지 마세요.**

시간,화자,내용
MM:SS,화자명,"발화 내용"

규칙:
1. 첫 줄은 반드시 헤더: 시간,화자,내용
2. 각 발화는 한 행으로 작성
3. 시간(MM:SS): 해당 발화가 시작되는 오디오 타임스탬프
4. 화자 선택: 인터뷰어 / 어르신 / 의료진 / 화자불명
5. 내용: 큰따옴표로 감싸고, 말더듬·추임새(어, 음, 아 등)를 그대로 포함
6. 내용 안에 큰따옴표가 있으면 두 개("")로 이스케이프
7. 불명확한 발화는 (불명확), 소음은 (소음) 으로 표시
8. 한국어 구어체 및 사투리를 그대로 전사 (표준어로 바꾸지 말 것)
9. 짧은 추임새나 겹치는 말도 별도 행으로 분리하여 기록
10. 오디오의 처음부터 끝까지 전체 내용을 빠짐없이 전사하세요

위 형식으로만 출력하세요. CSV 외의 어떠한 텍스트도 포함하지 마세요.`;

    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { fileData: { mimeType, fileUri } }
          ]}],
          generationConfig: { temperature: 0, maxOutputTokens: 65536 }
        })
      }
    );
    if (!genRes.ok) {
      const err = await genRes.text();
      throw new Error(`전사 API 오류: ${genRes.status} - ${err}`);
    }
    const genData = await genRes.json();
    const rawText = genData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Cleanup file
    try {
      await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, { method: 'DELETE' });
    } catch {
      // ignore cleanup error
    }

    return rawText;
  };

  /* ─── Parse CSV text ─── */
  const parseCSVText = (raw: string): { time: string; speaker: string; content: string }[] => {
    const text = raw.trim().replace(/^```(?:csv)?\s*/i, '').replace(/\s*```$/, '').trim();
    const lines = text.split('\n');
    let startIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('시간') && lines[i].includes('화자') && lines[i].includes('내용')) {
        startIdx = i + 1; break;
      }
    }
    const rows: { time: string; speaker: string; content: string }[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const m = line.match(/^([^,]+),([^,]+),(.*)$/);
      if (m) {
        const content = m[3].replace(/^"(.*)"$/, '$1').replace(/""/g, '"');
        rows.push({ time: m[1].trim(), speaker: m[2].trim(), content: content.trim() });
      }
    }
    return rows;
  };

  /* ─── Completeness check ─── */
  const checkCompleteness = (rows: { time: string }[], fileSizeMB: number): number => {
    const estimatedDurationMin = fileSizeMB * 0.9;
    const lastRow = rows[rows.length - 1];
    if (!lastRow) return 0;
    const [m, s] = lastRow.time.split(':').map(Number);
    const lastMinutes = (m || 0) + (s || 0) / 60;
    return Math.min(100, Math.round((lastMinutes / estimatedDurationMin) * 100));
  };

  /* ─── Main transcription run ─── */
  const handleRun = async () => {
    if (!apiKey.trim()) { log('API 키를 입력하세요.', 'error'); return; }
    if (files.length === 0) { log('처리할 오디오 파일을 추가하세요.', 'error'); return; }
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) { log('처리할 파일이 없습니다. (모두 완료됨)', 'warn'); return; }

    setRunning(true);
    setStage('transcribing');
    setTab('log');
    log('🚀 전사 작업 시작', 'success');
    log(`모델: ${model} | 파일 수: ${pendingFiles.length}개`, 'info');

    const newResults: CsvResult[] = [...results];

    for (let i = 0; i < pendingFiles.length; i++) {
      const af = pendingFiles[i];
      log(`\n[${i + 1}/${pendingFiles.length}] 처리 시작: ${af.name}`, 'info');

      updateFile(af.name, { status: 'uploading', progress: 10 });

      try {
        log(`  📤 Gemini 서버에 업로드 중... (${af.size})`, 'info');
        updateFile(af.name, { progress: 25 });

        const rawText = await callGeminiTranscribe(af.file, apiKey, model);

        updateFile(af.name, { status: 'processing', progress: 70 });
        log(`  🎙️ 전사 완료, CSV 파싱 중...`, 'info');

        const rows = parseCSVText(rawText);
        const completeness = checkCompleteness(rows, af.file.size / 1024 / 1024);
        const lastTs = rows.length > 0 ? rows[rows.length - 1].time : '0:00';

        updateFile(af.name, {
          status: 'done', progress: 100,
          rowCount: rows.length, lastTs, completeness
        });

        const csvName = af.name.replace(/\.(m4a|mp4|mp3|wav)$/i, '_전사결과.csv');
        newResults.push({ name: csvName, rows, audioName: af.name });
        setCsvResults([...newResults]);

        log(`  ✅ 완료! ${rows.length}개 발화, 마지막 타임스탬프: ${lastTs}`, 'success');

        if (completeness < 70) {
          log(`  ⚠️ 완성도 ${completeness}% — 전사가 짧게 끝났을 수 있습니다.`, 'warn');
        }

      } catch (err: unknown) {
        updateFile(af.name, { status: 'error', progress: 0 });
        const msg = err instanceof Error ? err.message : String(err);
        log(`  ❌ 오류: ${msg}`, 'error');
      }

      if (i < pendingFiles.length - 1) {
        log(`  ⏸️ 2초 대기 중 (API rate limit 방지)...`, 'info');
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setStage('done');
    setRunning(false);
    setTab('result');
    log('\n🎉 모든 전사 작업 완료!', 'success');
  };

  /* ─── Download single CSV ─── */
  const downloadCSV = (result: CsvResult) => {
    const header = '시간,화자,내용\n';
    const body = result.rows.map(r => `${r.time},${r.speaker},"${r.content.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = result.name;
    a.click();
  };

  /* ─── Download all CSVs as one ─── */
  const downloadAll = () => {
    results.forEach(r => downloadCSV(r));
    log(`${results.length}개 CSV 파일 다운로드 완료`, 'success');
  };

  /* ─── Validate API key ─── */
  const validateApiKey = async () => {
    if (!apiKey.trim()) return;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: 'GET' }
      );
      setApiValid(res.ok);
      if (res.ok) { updateSettings({ geminiApiKey: apiKey }); }
      log(res.ok ? '✅ API 키 유효함' : '❌ API 키 무효 또는 오류', res.ok ? 'success' : 'error');
    } catch {
      setApiValid(false);
      log('❌ API 키 확인 실패 (네트워크 오류)', 'error');
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'error').length;

  return (
    <Wrap>
      <Body>
        {/* ── Left: Config + File List ── */}
        <LeftCol>
          {/* API 설정 */}
          <Section>
            <SectionTitle>🔑 Gemini API 설정</SectionTitle>
            <ApiRow>
              <ApiInput
                type="password"
                placeholder="AIza... (Gemini API Key)"
                value={apiKey}
                valid={apiValid}
                onChange={e => { setApiKey(e.target.value); setApiValid(undefined); }}
                onKeyDown={e => { if (e.key === 'Enter') validateApiKey(); }}
              />
              <Btn variant="outline" onClick={validateApiKey}>확인</Btn>
            </ApiRow>
            {apiValid === false && (
              <div style={{ fontSize: 11, color: '#DC2626', marginTop: 5 }}>
                ❌ 유효하지 않은 API 키입니다.
              </div>
            )}
            {apiValid === true && (
              <div style={{ fontSize: 11, color: '#2A9A6E', marginTop: 5 }}>
                ✅ API 키가 유효합니다.
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <SectionTitle style={{ marginBottom: 6 }}>🤖 모델 선택</SectionTitle>
              <Select value={model} onChange={e => { setModel(e.target.value); updateSettings({ model: e.target.value }); }} style={{ width: '100%' }}>
                <option value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview (권장 · 빠름 · 최신)</option>
                <option value="gemini-3-flash-preview">gemini-3-flash-preview (최고 정확도 · 최신)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash (안정)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (구형 · 느림)</option>
              </Select>
            </div>
          </Section>

          {/* 파일 추가 */}
          <Section>
            <SectionTitle>📁 오디오 파일 추가</SectionTitle>
            <DropZone
              over={dragOver}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>🎵</div>
              <DropText>
                <b>.m4a, .mp4, .mp3, .wav</b> 파일을<br />
                드래그하거나 클릭해서 추가하세요
              </DropText>
            </DropZone>
            <input
              ref={inputRef} type="file"
              accept=".m4a,.mp4,.mp3,.wav" multiple
              style={{ display: 'none' }}
              onChange={e => addFiles(e.target.files)}
            />
          </Section>

          {/* 파일 목록 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 4px', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              파일 목록 ({files.length})
            </div>
            {files.length > 0 && (
              <div style={{ display: 'flex', gap: 4 }}>
                <Btn variant="ghost" onClick={() => setFiles(f => f.filter(x => x.status !== 'pending'))} style={{ fontSize: 10, padding: '2px 8px' }}>
                  완료만 남기기
                </Btn>
                <Btn variant="danger" onClick={() => { if (confirm('모든 파일을 목록에서 제거하시겠습니까?')) { setFiles([]); log('파일 목록 전체 삭제됨', 'warn'); } }} style={{ fontSize: 10, padding: '2px 8px' }}>
                  전체 삭제
                </Btn>
              </div>
            )}
          </div>

          <FileList>
            {files.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, paddingTop: 20 }}>
                오디오 파일을 추가하세요
              </div>
            )}
            {files.map(f => (
              <FileCard key={f.name} status={f.status}>
                <FileCardTop>
                  <FileIcon>{fileIcon(f.name)}</FileIcon>
                  <FileInfo>
                    <FileName title={f.name}>{f.name}</FileName>
                    <FileMeta>
                      {f.size}
                      {f.rowCount !== undefined && ` · ${f.rowCount}개 발화`}
                      {f.lastTs && ` · 마지막: ${f.lastTs}`}
                    </FileMeta>
                  </FileInfo>
                  <StatusBadge status={f.status}>
                    {f.status === 'processing' || f.status === 'uploading'
                      ? <>{statusLabel(f.status)} <Spinner /></>
                      : statusLabel(f.status)}
                  </StatusBadge>
                  {/* 삭제 버튼 - 진행 중이 아닐 때만 활성화 */}
                  <DeleteBtn
                    title="파일 제거"
                    onClick={() => removeFile(f.name)}
                    disabled={f.status === 'uploading' || f.status === 'processing'}
                    style={{ opacity: (f.status === 'uploading' || f.status === 'processing') ? 0.3 : 1,
                             cursor: (f.status === 'uploading' || f.status === 'processing') ? 'not-allowed' : 'pointer' }}
                  >
                    ×
                  </DeleteBtn>
                </FileCardTop>
                <ProgressBar pct={f.progress} status={f.status} />
                {f.completeness !== undefined && (
                  <CompletenessBar pct={f.completeness}>
                    완성도 <MiniBar pct={f.completeness} /> <span>{f.completeness}%</span>
                    {f.completeness < 70 && ' ⚠️ 재시도 권장'}
                  </CompletenessBar>
                )}
              </FileCard>
            ))}
          </FileList>

          <ControlRow>
            <OptionRow>
              <input type="checkbox" checked={doMerge} onChange={e => setDoMerge(e.target.checked)} />
              STT 병합 (Merge)
            </OptionRow>
            <OptionRow>
              <input type="checkbox" checked={doConvert} onChange={e => setDoConvert(e.target.checked)} />
              DOCX 변환
            </OptionRow>
            <div style={{ flex: 1 }} />
            <Btn
              variant="accent"
              disabled={running || pendingCount === 0}
              onClick={handleRun}
            >
              {running ? <><Spinner /> 전사 중...</> : `▶ 전사 시작 (${pendingCount}개)`}
            </Btn>
          </ControlRow>
        </LeftCol>

        {/* ── Right: Log + Result ── */}
        <RightCol>
          <TabBar>
            <Tab active={tab === 'log'} onClick={() => setTab('log')}>📋 로그</Tab>
            <Tab active={tab === 'result'} onClick={() => setTab('result')}>
              📄 결과 {results.length > 0 && `(${results.length}개)`}
            </Tab>
            {tab === 'result' && results.length > 0 && (
              <div style={{ marginLeft: 'auto', padding: '6px 12px' }}>
                <Btn variant="accent" onClick={downloadAll}>⬇ 전체 CSV 다운로드</Btn>
              </div>
            )}
          </TabBar>

          {tab === 'log' && (
            <LogBox ref={logRef}>
              {logs.length === 0 && (
                <EmptyLog>
                  <div style={{ fontSize: 28 }}>📋</div>
                  <div>전사 시작 후 로그가 여기에 표시됩니다</div>
                </EmptyLog>
              )}
              {logs.map(l => (
                <LogLine key={l.id} level={l.level}>
                  <span className="ts">[{l.ts}]</span>
                  <span className="prefix">
                    {l.level === 'success' ? '✓' : l.level === 'error' ? '✗' : l.level === 'warn' ? '⚠' : '›'}
                  </span>
                  {l.msg}
                </LogLine>
              ))}
            </LogBox>
          )}

          {tab === 'result' && (
            <ResultPanel>
              {results.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--text-muted)', gap: 10 }}>
                  <div style={{ fontSize: 32 }}>📄</div>
                  <div style={{ fontSize: 14 }}>아직 전사 결과가 없습니다</div>
                </div>
              )}
              {results.map(r => (
                <ResultCard key={r.name}>
                  <ResultCardHeader>
                    <span style={{ fontSize: 16 }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {r.rows.length}개 발화 · 원본: {r.audioName}
                      </div>
                    </div>
                    <Btn variant="accent" onClick={() => downloadCSV(r)}>⬇ CSV</Btn>
                  </ResultCardHeader>
                  <ResultCardBody>
                    <ResultRow style={{ background: 'var(--surface2)', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)' }}>
                      <div>시간</div><div>화자</div><div>내용</div>
                    </ResultRow>
                    {r.rows.slice(0, 50).map((row, i) => (
                      <ResultRow key={i}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{row.time}</div>
                        <div><SpeakerTag speaker={row.speaker}>{row.speaker}</SpeakerTag></div>
                        <div style={{ color: 'var(--text)', lineHeight: 1.4 }}>{row.content}</div>
                      </ResultRow>
                    ))}
                    {r.rows.length > 50 && (
                      <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                        ... 외 {r.rows.length - 50}개 행 (CSV 다운로드 후 확인)
                      </div>
                    )}
                  </ResultCardBody>
                </ResultCard>
              ))}
            </ResultPanel>
          )}
        </RightCol>
      </Body>
    </Wrap>
  );
};
