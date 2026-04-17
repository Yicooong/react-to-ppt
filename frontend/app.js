/**
 * Frontend App - React to PPT
 * 三种模式：AI生成、代码转换、仅预览
 */

const API_BASE = window.location.origin;
let currentCode = '';
let currentPptBlob = null;
let currentMode = 'ai'; // 'ai' | 'code' | 'preview'

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initEventListeners();
  initQuickPrompts();
  checkProviders();
});

// ============ 标签切换 ============

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });
}

function switchMode(mode) {
  currentMode = mode;

  // 更新标签状态
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });

  // 显示对应面板
  ['aiModePanel', 'codeModePanel', 'previewModePanel'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(`${mode}ModePanel`).classList.remove('hidden');

  // 按钮显示逻辑
  const generateBtn = document.getElementById('generateBtn');
  const convertBtn = document.getElementById('convertBtn');
  const previewBtn = document.getElementById('previewCodeBtn');

  generateBtn.classList.add('hidden');
  convertBtn.classList.add('hidden');
  previewBtn.classList.add('hidden');

  if (mode === 'ai') {
    generateBtn.classList.remove('hidden');
    generateBtn.querySelector('.btn-text').textContent = '🚀 生成 PPT 演示文稿';
  } else if (mode === 'code') {
    convertBtn.classList.remove('hidden');
  } else if (mode === 'preview') {
    previewBtn.classList.remove('hidden');
  }
}

// ============ 事件绑定 ============

function initEventListeners() {
  // 生成按钮（AI 模式）
  document.getElementById('generateBtn').addEventListener('click', () => handleAIGenerate());

  // 转换按钮（代码模式）
  document.getElementById('convertBtn').addEventListener('click', () => handleCodeConvert());

  // 预览按钮（预览模式）
  document.getElementById('previewCodeBtn').addEventListener('click', () => handlePreview());

  // 复制、收起、重新生成、下载
  document.getElementById('copyCodeBtn').addEventListener('click', () => copyToClipboard(currentCode));
  document.getElementById('toggleCodeBtn').addEventListener('click', toggleCode);
  document.getElementById('regenerateBtn').addEventListener('click', () => {
    if (currentMode === 'ai') handleAIGenerate();
    else if (currentMode === 'code') handleCodeConvert();
    else handlePreview();
  });
  document.getElementById('downloadBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPptBlob) downloadBlob(currentPptBlob, 'react-to-ppt.pptx');
  });

  // 字数统计
  document.getElementById('promptInput').addEventListener('input', updateCharCount);
}

// ============ 快速示例 ============

function initQuickPrompts() {
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      document.getElementById('promptInput').value = prompt;
      updateCharCount();
    });
  });
}

// ============ 模式处理函数 ============

// 模式 1: AI 生成 → 代码 → PPT
async function handleAIGenerate() {
  const prompt = document.getElementById('promptInput').value.trim();
  const provider = document.getElementById('providerSelect').value;
  const theme = document.getElementById('themeSelect').value;

  if (!prompt) return showError('请输入组件描述');
  hideError();
  showLoading('正在连接 LLM...');

  try {
    const codeResult = await callAPI('/api/generate', { prompt, provider });
    currentCode = codeResult.code;
    showLoading('正在生成 PPT 演示文稿...');

    const pptResponse = await fetch(`${API_BASE}/api/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: currentCode, filename: sanitizeFilename(prompt), options: { theme } })
    });

    if (!pptResponse.ok) throw new Error((await pptResponse.json()).error || 'PPT 生成失败');
    currentPptBlob = await pptResponse.blob();

    showResult(currentCode, currentPptBlob, provider);
  } catch (err) {
    showError(err.message || '生成失败，请重试');
  }
}

// 模式 2: 代码转换 → PPT
async function handleCodeConvert() {
  const code = document.getElementById('codeInput').value.trim();
  const theme = document.getElementById('themeSelect').value;

  if (!code) return showError('请输入 React 代码');
  hideError();
  showLoading('正在生成 PPT 演示文稿...');

  try {
    const response = await fetch(`${API_BASE}/api/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, filename: sanitizeFilename(code), options: { theme } })
    });

    if (!response.ok) throw new Error((await response.json()).error || '转换失败');
    currentPptBlob = await response.blob();
    currentCode = code;

    showResult(code, currentPptBlob, null);
  } catch (err) {
    showError(err.message || '转换失败，请重试');
  }
}

// 模式 3: 仅预览代码
async function handlePreview() {
  const prompt = document.getElementById('promptInput').value.trim();
  const provider = document.getElementById('providerSelect').value;

  if (!prompt) return showError('请输入组件描述');
  hideError();
  showLoading('正在生成代码...');

  try {
    const result = await callAPI('/api/generate', { prompt, provider });
    currentCode = result.code;
    showResult(currentCode, null, provider);
  } catch (err) {
    showError(err.message || '生成失败');
  }
}

// ============ API 调用 ============

async function callAPI(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

// ============ UI 状态 ============

function showLoading(msg) {
  document.getElementById('placeholderPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.add('hidden');
  document.getElementById('loadingPanel').classList.remove('hidden');
  document.getElementById('loadingText').textContent = msg;
}

function showResult(code, blob, provider) {
  document.getElementById('loadingPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.remove('hidden');

  const codeBlock = document.getElementById('codeBlock');
  codeBlock.innerHTML = highlightSyntax(code);
  codeBlock.style.maxHeight = 'none';

  updateStats(code, provider);

  if (blob) {
    const url = URL.createObjectURL(blob);
    const btn = document.getElementById('downloadBtn');
    btn.href = url;
    btn.download = `react-to-ppt-${Date.now()}.pptx`;
  } else {
    document.getElementById('downloadBtn').style.display = 'none';
  }

  // 代码模式生成的PPT，显示额外转换按钮
  const convertBtn = document.getElementById('convertFromCodeBtn');
  if (currentMode === 'code' && blob) {
    convertBtn.classList.add('hidden');
  } else if (currentMode === 'code' && !blob) {
    convertBtn.classList.remove('hidden');
  }
}

function showError(msg) {
  const el = document.getElementById('errorPanel');
  document.getElementById('errorMsg').textContent = msg;
  el.classList.remove('hidden');
  setTimeout(hideError, 5000);
}

function hideError() {
  document.getElementById('errorPanel').classList.add('hidden');
}

function updateCharCount() {
  const len = document.getElementById('promptInput').value.length;
  document.getElementById('charCount').textContent = `${len} 字`;
}

function toggleCode() {
  const block = document.getElementById('codeBlock');
  const btn = document.getElementById('toggleCodeBtn');
  block.style.maxHeight = block.style.maxHeight ? '' : '300px';
  btn.textContent = block.style.maxHeight ? '🔼 展开' : '🔽 收起';
}

// ============ 统计 ============

function updateStats(code, provider) {
  const lines = code.split('\n').length;
  const props = (code.match(/props:\s*{/g) || []).length;
  const hooks = (code.match(/(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef)/g) || []).length;

  document.getElementById('statLines').textContent = lines;
  document.getElementById('statProps').textContent = props;
  document.getElementById('statHooks').textContent = hooks;
  if (provider) {
    document.getElementById('statProvider').textContent = { stepfun: 'StepFun', openai: 'OpenAI', local: '本地模型' }[provider] || provider;
    document.getElementById('providerStatItem').classList.remove('hidden');
  } else {
    document.getElementById('providerStatItem').classList.add('hidden');
  }
}

// ============ 工具 ============

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyCodeBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ 已复制';
    setTimeout(() => btn.innerHTML = orig, 2000);
  }).catch(() => showError('复制失败'));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(text) {
  return text.slice(0, 30).replace(/[^a-zA-Z0-9-_]/g, '_') || 'presentation';
}

function highlightSyntax(code) {
  let html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  html = html.replace(/(\/\*[\s\S]*?\*\/|\/\/.*)/g, '<span class="hljs-comment">$1</span>');
  html = html.replace(/(['"`])(.*?)\1/g, '<span class="hljs-string">$1$2$1</span>');

  const keywords = ['import', 'export', 'default', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'new', 'this', 'super', 'try', 'catch', 'throw', 'async', 'await'];
  keywords.forEach(k => html = html.replace(new RegExp(`\\b(${k})\\b`, 'g'), '<span class="hljs-keyword">$1</span>'));

  const reactKeywords = ['React', 'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'Component', 'PureComponent', 'Fragment', 'StrictMode', 'memo'];
  reactKeywords.forEach(k => html = html.replace(new RegExp(`\\b(${k})\\b`, 'g'), '<span class="hljs-function">$1</span>'));

  html = html.replace(/\b(\d+)\b/g, '<span class="hljs-number">$1</span>');
  html = html.replace(/(\w+)(?=\()/g, '<span class="hljs-function">$1</span>');
  html = html.replace(/(&lt;\/?)([\w.]+)/g, '$1<span class="hljs-tag">$2</span>');
  html = html.replace(/(\w+)=/g, '<span class="hljs-attr">$1</span>=');

  return `<code>${html}</code>`;
}

async function checkProviders() {
  try {
    const res = await fetch(`${API_BASE}/api/providers`);
    if (res.ok) console.log('提供商:', (await res.json()).providers);
  } catch (e) {}
}
