/**
 * React to PPT - 前端应用
 * 三种模式：AI生成 / 代码转换 / 仅预览
 */

const API_BASE = window.location.origin;
let currentCode = '';
let currentPptBlob = null;
let currentMode = 'ai';

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initEventListeners();
  initQuickPrompts();
  checkProviders();
});

// ============ 标签切换 ============

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });
}

function switchMode(mode) {
  currentMode = mode;

  // 切换标签状态
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });

  // 切换面板
  ['aiModePanel', 'codeModePanel', 'previewModePanel'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== `${mode}ModePanel`);
  });

  updateActionButtons();
  hideError();
}

function updateActionButtons() {
  const generateBtn = document.getElementById('generateBtn');
  const convertBtn = document.getElementById('convertBtn');
  const previewBtn = document.getElementById('previewCodeBtn');

  [generateBtn, convertBtn, previewBtn].forEach(btn => btn.classList.add('hidden'));

  if (currentMode === 'ai') {
    generateBtn.classList.remove('hidden');
  } else if (currentMode === 'code') {
    convertBtn.classList.remove('hidden');
  } else if (currentMode === 'preview') {
    previewBtn.classList.remove('hidden');
  }
}

// ============ 事件绑定 ============

function initEventListeners() {
  document.getElementById('generateBtn').addEventListener('click', handleAIGenerate);
  document.getElementById('convertBtn').addEventListener('click', handleCodeConvert);
  document.getElementById('previewCodeBtn').addEventListener('click', handlePreview);

  document.getElementById('copyCodeBtn').addEventListener('click', () => copyToClipboard(currentCode));
  document.getElementById('toggleCodeBtn').addEventListener('click', toggleCode);
  document.getElementById('regenerateBtn').addEventListener('click', () => {
    if (currentMode === 'ai') handleAIGenerate();
    else if (currentMode === 'code') handleCodeConvert();
    else handlePreview();
  });
  document.getElementById('downloadBtn').addEventListener('click', e => {
    e.preventDefault();
    if (currentPptBlob) downloadBlob(currentPptBlob, 'react-to-ppt.pptx');
  });

  document.getElementById('promptInput').addEventListener('input', updateCharCount);
}

function initQuickPrompts() {
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      document.getElementById('promptInput').value = prompt;
      updateCharCount();
    });
  });
}

// ============ 三种模式处理 ============

// 模式1: AI 生成 → PPT（一步到位，用 pipeline）
async function handleAIGenerate() {
  const prompt = document.getElementById('promptInput').value.trim();
  const provider = document.getElementById('providerSelect').value;
  const theme = document.getElementById('themeSelect').value;

  if (!prompt) return showError('请输入组件描述');
  hideError();
  showLoading('正在 AI 生成...');

  try {
    const blob = await callAPI('/api/pipeline', {
      prompt,
      provider,
      options: { theme, filename: sanitize(prompt) }
    });
    // 同时获取代码（再次调用 generate 获取生成的代码）
    const { code } = await callAPI('/api/generate', { prompt, provider });
    currentCode = code;
    currentPptBlob = blob;
    showResult(currentCode, blob, provider);
  } catch (err) {
    showError(err.message || '生成失败');
  }
}

// 模式2: 代码 → PPT（直接转换）
async function handleCodeConvert() {
  const code = document.getElementById('codeInput').value.trim();
  const theme = document.getElementById('themeSelect').value;

  if (!code) return showError('请输入 React 代码');
  hideError();
  showLoading('正在转换...');

  try {
    const blob = await callAPI('/api/convert', {
      code,
      filename: sanitize(code),
      options: { theme }
    });
    currentCode = code;
    currentPptBlob = blob;
    showResult(code, blob, null);
  } catch (err) {
    showError(err.message || '转换失败');
  }
}

// 模式3: 仅预览代码
async function handlePreview() {
  const prompt = document.getElementById('promptInput').value.trim();
  const provider = document.getElementById('providerSelect').value;

  if (!prompt) return showError('请输入组件描述');
  hideError();
  showLoading('正在生成代码...');

  try {
    const { code } = await callAPI('/api/generate', { prompt, provider });
    currentCode = code;
    currentPptBlob = null;
    showResult(code, null, provider);
  } catch (err) {
    showError(err.message || '生成失败');
  }
}

// ============ API 调用 ============

async function callAPI(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error((await response.json()).error || `HTTP ${response.status}`);

  return await response.json();
}

// ============ UI 状态 ============

function showLoading(message = '加载中...') {
  document.getElementById('placeholderPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.add('hidden');
  document.getElementById('loadingPanel').classList.remove('hidden');
  document.getElementById('loadingText').textContent = message;
}

function showResult(code, blob, provider) {
  document.getElementById('loadingPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.remove('hidden');

  const codeBlock = document.getElementById('codeBlock');
  codeBlock.innerHTML = highlightSyntax(code);
  codeBlock.style.maxHeight = 'none';

  updateStats(code, provider);

  const btn = document.getElementById('downloadBtn');
  if (blob) {
    const url = URL.createObjectURL(blob);
    btn.href = url;
    btn.download = `presentation-${Date.now()}.pptx`;
    btn.style.display = 'inline-flex';
  } else {
    btn.href = '#';
    btn.style.display = 'none';
  }
}

function showError(message) {
  const panel = document.getElementById('errorPanel');
  document.getElementById('errorMsg').textContent = message;
  panel.classList.remove('hidden');
  setTimeout(hideError, 5000);
}

function hideError() {
  document.getElementById('errorPanel').classList.add('hidden');
}

function updateCharCount() {
  document.getElementById('charCount').textContent =
    `${document.getElementById('promptInput').value.length} 字`;
}

function toggleCode() {
  const block = document.getElementById('codeBlock');
  const btn = document.getElementById('toggleCodeBtn');
  block.style.maxHeight = block.style.maxHeight ? '' : '300px';
  btn.textContent = block.style.maxHeight ? '🔽 收起' : '🔼 展开';
}

// ============ 统计信息 ============

function updateStats(code, provider) {
  document.getElementById('statLines').textContent = code.split('\n').length;
  document.getElementById('statProps').textContent = (code.match(/props:\s*{/g) || []).length;
  document.getElementById('statHooks').textContent = (code.match(/(useState|useEffect|useContext|useCallback|useMemo|useRef)/g) || []).length;

  if (provider) {
    const names = { stepfun: 'StepFun', openai: 'OpenAI', local: '本地模型' };
    document.getElementById('statProvider').textContent = names[provider] || provider;
    document.getElementById('providerStatItem').classList.remove('hidden');
  } else {
    document.getElementById('providerStatItem').classList.add('hidden');
  }
}

// ============ 工具函数 ============

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

function sanitize(text) {
  return text.slice(0, 30).replace(/[^a-zA-Z0-9-_]/g, '_') || 'presentation';
}

function checkProviders() {
  fetch(`${API_BASE}/api/providers`).then(res => {
    if (res.ok) console.log('提供商:', res.json().then(data => data.providers));
  }).catch(() => {});
}

// ============ 语法高亮 ============

function highlightSyntax(code) {
  let html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  html = html.replace(/(\/\*[\s\S]*?\*\/|\/\/.*)/g, '<span class="hljs-comment">$1</span>');
  html = html.replace(/(['"`])(.*?)\1/g, '<span class="hljs-string">$1$2$1</span>');

  ['import', 'export', 'default', 'from', 'const', 'let', 'var', 'function',
   'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
   'class', 'extends', 'new', 'this', 'super', 'try', 'catch', 'throw', 'async', 'await']
  .forEach(k => html = html.replace(new RegExp(`\\b(${k})\\b`, 'g'), '<span class="hljs-keyword">$1</span>'));

  ['React', 'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
   'useMemo', 'useRef', 'Component', 'Fragment']
  .forEach(k => html = html.replace(new RegExp(`\\b(${k})\\b`, 'g'), '<span class="hljs-function">$1</span>'));

  html = html.replace(/\b(\d+)\b/g, '<span class="hljs-number">$1</span>');
  html = html.replace(/(\w+)(?=\()/g, '<span class="hljs-function">$1</span>');
  html = html.replace(/(&lt;\/?)([\w.]+)/g, '$1<span class="hljs-tag">$2</span>');
  html = html.replace(/(\w+)=/g, '<span class="hljs-attr">$1</span>=');

  return `<code>${html}</code>`;
}
