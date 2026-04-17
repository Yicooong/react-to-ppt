/**
 * Frontend App - React to PPT
 * 负责与后端 API 交互，处理用户界面逻辑
 */

const API_BASE = window.location.origin;
let currentCode = '';
let currentPptBlob = null;

// ============ 初始化 ============

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  initQuickPrompts();
  checkProviders();
});

function initEventListeners() {
  const promptInput = document.getElementById('promptInput');
  const generateBtn = document.getElementById('generateBtn');
  const previewBtn = document.getElementById('previewBtn');
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  const toggleCodeBtn = document.getElementById('toggleCodeBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  // 生成按钮
  generateBtn.addEventListener('click', () => handleGenerate(false));

  // 预览按钮（仅生成代码）
  previewBtn.addEventListener('click', () => handleGenerate(true));

  // 复制代码
  copyCodeBtn.addEventListener('click', () => copyToClipboard(currentCode));

  // 收起/展开代码
  toggleCodeBtn.addEventListener('click', toggleCode);

  // 重新生成
  regenerateBtn.addEventListener('click', () => handleGenerate(false));

  // 下载 PPT
  downloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPptBlob) {
      downloadBlob(currentPptBlob, downloadBtn.getAttribute('download') || 'presentation.pptx');
    }
  });

  // 字数统计
  promptInput.addEventListener('input', updateCharCount);
}

// ============ 快速示例 ============

function initQuickPrompts() {
  const chips = document.querySelectorAll('.quick-chip');
  const promptInput = document.getElementById('promptInput');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      promptInput.value = prompt;
      updateCharCount();

      // 动画反馈
      chip.style.transform = 'scale(0.95)';
      setTimeout(() => chip.style.transform = '', 150);
    });
  });
}

// ============ 事件处理 ============

async function handleGenerate(previewOnly = false) {
  const prompt = document.getElementById('promptInput').value.trim();
  const provider = document.getElementById('providerSelect').value;
  const theme = document.getElementById('themeSelect')?.value || 'modern';

  if (!prompt) {
    showError('请输入组件描述');
    return;
  }

  hideError();
  showLoading('正在连接 LLM...');

  try {
    if (previewOnly) {
      // 仅生成代码
      const result = await callAPI('/api/generate', { prompt, provider });
      showResult(result.code, null, result.provider);
    } else {
      // 完整 pipeline
      showLoading('正在生成 React 代码...');
      const codeResult = await callAPI('/api/generate', { prompt, provider });

      showLoading('正在生成 PPT 演示文稿...');
      const pptResponse = await fetch(`${API_BASE}/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeResult.code,
          filename: sanitizeFilename(prompt),
          options: { theme }
        })
      });

      if (!pptResponse.ok) {
        const err = await pptResponse.json();
        throw new Error(err.error || 'PPT 生成失败');
      }

      currentPptBlob = await pptResponse.blob();
      currentCode = codeResult.code;

      showResult(currentCode, currentPptBlob, codeResult.provider);
    }

  } catch (err) {
    console.error('生成失败:', err);
    showError(err.message || '生成过程中发生错误，请重试');
  }
}

// ============ API 调用 ============

async function callAPI(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

// ============ UI 状态管理 ============

function showLoading(message = '生成中...') {
  document.getElementById('placeholderPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.add('hidden');
  document.getElementById('loadingPanel').classList.remove('hidden');
  document.getElementById('loadingText').textContent = message;
}

function showResult(code, blob, provider) {
  document.getElementById('loadingPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.remove('hidden');

  // 代码高亮显示
  const codeBlock = document.getElementById('codeBlock');
  codeBlock.innerHTML = highlightSyntax(code);
  codeBlock.style.maxHeight = 'none';
  currentCode = code;

  // 更新统计
  updateStats(code, provider);

  // 设置下载按钮
  if (blob) {
    const url = URL.createObjectURL(blob);
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.href = url;
    downloadBtn.download = `react-to-ppt-${Date.now()}.pptx`;
  }
}

function showError(message) {
  const errorPanel = document.getElementById('errorPanel');
  document.getElementById('errorMsg').textContent = message;
  errorPanel.classList.remove('hidden');

  // 自动 5 秒后消失
  setTimeout(hideError, 5000);
}

function hideError() {
  document.getElementById('errorPanel').classList.add('hidden');
}

function updateCharCount() {
  const text = document.getElementById('promptInput').value;
  document.getElementById('charCount').textContent = `${text.length} 字`;
}

function toggleCode() {
  const codeBlock = document.getElementById('codeBlock');
  const btn = document.getElementById('toggleCodeBtn');

  if (codeBlock.style.maxHeight) {
    codeBlock.style.maxHeight = '';
    btn.textContent = '🔽 收起';
  } else {
    codeBlock.style.maxHeight = '300px';
    btn.textContent = '🔼 展开';
  }
}

// ============ 统计信息 ============

function updateStats(code, provider) {
  const lines = code.split('\n').length;
  const propsMatch = code.match(/props:\s*{([^}]*)}/g) || [];
  const hooksMatch = code.match(/(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef)/g) || [];

  document.getElementById('statLines').textContent = lines;
  document.getElementById('statProps').textContent = propsMatch.length;
  document.getElementById('statHooks').textContent = hooksMatch.length;
  document.getElementById('statProvider').textContent = getProviderName(provider);
}

function getProviderName(id) {
  const names = {
    stepfun: 'StepFun',
    openai: 'OpenAI',
    local: '本地模型'
  };
  return names[id] || id;
}

// ============ 工具函数 ============

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyCodeBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '✅ 已复制';
    setTimeout(() => btn.innerHTML = originalHTML, 2000);
  }).catch(() => {
    showError('复制失败，请手动复制');
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(text) {
  return text.slice(0, 30).replace(/[^a-zA-Z0-9-_]/g, '_') || 'presentation';
}

// ============ 语法高亮（增强版） ============

function highlightSyntax(code) {
  // 转义 HTML
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 规则顺序很重要

  // 1. 注释（多行和单行）
  html = html.replace(/(\/\*[\s\S]*?\*\/|\/\/.*)/g, '<span class="hljs-comment">$1</span>');

  // 2. 字符串（单引号、双引号、模板字符串）
  html = html.replace(/(['"`])(.*?)\1/g, '<span class="hljs-string">$1$2$1</span>');

  // 3. 关键字
  const keywords = [
    'import', 'export', 'default', 'from', 'const', 'let', 'var', 'function',
    'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
    'class', 'extends', 'new', 'this', 'super', 'try', 'catch', 'throw', 'async', 'await'
  ];
  keywords.forEach(kw => {
    html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="hljs-keyword">$1</span>');
  });

  // 4. React 关键字（函数）
  const reactKeywords = [
    'React', 'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
    'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect',
    'Component', 'PureComponent', 'Fragment', 'StrictMode', 'memo'
  ];
  reactKeywords.forEach(kw => {
    html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="hljs-function">$1</span>');
  });

  // 5. 数字
  html = html.replace(/\b(\d+)\b/g, '<span class="hljs-number">$1</span>');

  // 6. 函数调用
  html = html.replace(/(\w+)(?=\()/g, '<span class="hljs-function">$1</span>');

  // 7. JSX 标签
  html = html.replace(/(&lt;\/?)([\w.]+)/g, '$1<span class="hljs-tag">$2</span>');
  html = html.replace(/(\w+)=/g, '<span class="hljs-attr">$1</span>=');

  return `<code>${html}</code>`;
}

// ============ 检查提供商可用性 ============

async function checkProviders() {
  try {
    const res = await fetch(`${API_BASE}/api/providers`);
    if (res.ok) {
      const data = await res.json();
      console.log('可用提供商:', data.providers);
    }
  } catch (err) {
    console.warn('无法获取提供商列表:', err.message);
  }
}
