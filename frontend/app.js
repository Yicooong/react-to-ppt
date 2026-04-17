/**
 * Frontend App - React to PPT
 * 负责与后端 API 交互，处理用户界面逻辑
 */

const API_BASE = window.location.origin; // 当前域名
let currentCode = '';
let currentPptBlob = null;

// ============ 初始化 ============

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
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
  const providerSelect = document.getElementById('providerSelect');

  // 生成按钮
  generateBtn.addEventListener('click', handleGenerate);

  // 预览按钮（仅生成代码，不生成 PPT）
  previewBtn.addEventListener('click', () => handleGenerate(true));

  // 复制代码
  copyCodeBtn.addEventListener('click', () => copyToClipboard(currentCode));

  // 收起/展开代码
  toggleCodeBtn.addEventListener('click', () => {
    const codeBlock = document.getElementById('codeBlock');
    if (codeBlock.style.maxHeight) {
      codeBlock.style.maxHeight = '';
      toggleCodeBtn.textContent = '🔽 收起';
    } else {
      codeBlock.style.maxHeight = '300px';
      toggleCodeBtn.textContent = '🔼 展开';
    }
  });

  // 重新生成
  regenerateBtn.addEventListener('click', () => handleGenerate());

  // 下载 PPT
  downloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPptBlob) {
      downloadBlob(currentPptBlob, downloadBtn.getAttribute('download') || 'presentation.pptx');
    }
  });

  // 字数统计
  promptInput.addEventListener('input', updateWordCount);

  // Provider 变化
  providerSelect.addEventListener('change', checkProviders);
}

// ============ 事件处理 ============

async function handleGenerate(previewOnly = false) {
  const prompt = document.getElementById('promptInput').value.trim();
  const provider = document.getElementById('providerSelect').value;

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
      // 完整 pipeline：生成代码 + PPT
      showLoading('正在生成 React 代码...');
      const codeResult = await callAPI('/api/generate', { prompt, provider });

      showLoading('正在生成 PPT 演示文稿...');
      const pptResult = await fetch(`${API_BASE}/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeResult.code,
          filename: prompt.slice(0, 30).replace(/[^a-zA-Z0-9-_]/g, '_') || 'presentation',
          options: {}
        })
      });

      if (!pptResult.ok) {
        const err = await pptResult.json();
        throw new Error(err.error || 'PPT 生成失败');
      }

      currentPptBlob = await pptResult.blob();
      currentCode = codeResult.code;

      // 显示结果
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

  // 代码高亮（基础）
  const codeBlock = document.getElementById('codeBlock');
  codeBlock.innerHTML = highlightSyntax(code);
  codeBlock.style.maxHeight = 'none'; // 重置折叠状态

  // 统计信息
  updateStats(code, provider);

  // 下载链接
  if (blob) {
    const url = URL.createObjectURL(blob);
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.href = url;
    downloadBtn.download = `presentation-${Date.now()}.pptx`;
  }
}

function showError(message) {
  document.getElementById('errorMsg').textContent = message;
  document.getElementById('errorPanel').classList.remove('hidden');
}

function hideError() {
  document.getElementById('errorPanel').classList.add('hidden');
}

function updateWordCount() {
  const text = document.getElementById('promptInput').value;
  document.getElementById('wordCount').textContent = `${text.length} 字`;
}

// ============ 工具函数 ============

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

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyCodeBtn');
    const original = btn.textContent;
    btn.textContent = '✅ 已复制';
    setTimeout(() => btn.textContent = original, 2000);
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

// ============ 语法高亮（基础版） ============

function highlightSyntax(code) {
  // 简单的高亮规则（实际项目推荐 highlight.js）
  const keywords = [
    'import', 'export', 'default', 'from', 'const', 'let', 'var',
    'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case',
    'break', 'continue', 'class', 'extends', 'new', 'this', 'true', 'false',
    'null', 'undefined', 'try', 'catch', 'throw', 'async', 'await'
  ];

  const reactKeywords = [
    'React', 'useState', 'useEffect', 'useContext', 'useReducer',
    'useCallback', 'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect',
    'Component', 'PureComponent', 'Fragment', 'StrictMode'
  ];

  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 注释
  html = html.replace(/(\/\*[\s\S]*?\*\/|\/\/.*)/g, '<span class="hljs-comment">$1</span>');

  // 字符串
  html = html.replace(/(['"`])(.*?)\1/g, '<span class="hljs-string">$1$2$1</span>');

  // 关键字
  keywords.forEach(kw => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    html = html.replace(regex, '<span class="hljs-keyword">$1</span>');
  });

  // React 关键字
  reactKeywords.forEach(kw => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    html = html.replace(regex, '<span class="hljs-function">$1</span>');
  });

  // 函数调用
  html = html.replace(/(\w+)(?=\()/g, '<span class="hljs-function">$1</span>');

  return `<code>${html}</code>`;
}

// ============ 检查提供商可用性 ============

async function checkProviders() {
  try {
    const res = await fetch(`${API_BASE}/api/providers`);
    if (res.ok) {
      const data = await res.json();
      const select = document.getElementById('providerSelect');
      // 可以根据可用性动态调整选项（可选）
      console.log('可用提供商:', data.providers);
    }
  } catch (err) {
    console.warn('无法获取提供商列表:', err.message);
  }
}
