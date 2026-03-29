import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle<{ themeMode: 'light' | 'dark' }>`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    ${p => p.themeMode === 'light' ? `
      --bg: #F4F3F0;
      --surface: #FFFFFF;
      --surface2: #F9F8F6;
      --border: #E2E0DC;
      --border2: #D0CEC9;
      --text: #1A1917;
      --text-secondary: #6B6863;
      --text-muted: #9B9793;
      --accent: #E07B54;
      --accent-light: #FAF0EB;
    ` : `
      --bg: #1A1A1A;
      --surface: #242424;
      --surface2: #2D2D2D;
      --border: #3D3D3D;
      --border2: #4D4D4D;
      --text: #E0E0E0;
      --text-secondary: #A0A0A0;
      --text-muted: #707070;
      --accent: #FF8F6B;
      --accent-light: #3D2D28;
    `}
    --blue: #4A6FA5;
    --blue-light: #EBF1FA;
    --green: #61D9A5;
    --green-light: #EBF9F3;
    --sidebar-w: 48px;
    --left-panel-w: 320px;
    --right-panel-w: 380px;
    --header-h: 52px;
    font-size: 13px;
  }

  body {
    font-family: 'Pretendard', 'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    overflow: hidden;
    height: 100vh;
  }

  #root {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--border2);
    border-radius: 99px;
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    background: none;
    font-size: inherit;
  }

  input, textarea {
    font-family: inherit;
    font-size: inherit;
  }
`;
