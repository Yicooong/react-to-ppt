/**
 * React to PPT - 前端应用
 * 三种模式 + LLM提供商配置管理
 */

const API_BASE = window.location.origin;
let currentCode = '';
let currentPptBlob = null;
let currentMode = 'ai';

const STORAGE_KEY = 'react-to-ppt-providers';
const PROVIDER_CHOICES = ['stepfun', 'openai', 'local', 'zhipu'];

// 默认配置
function defaultProviders() {
  return {
    stepfun: { name: 'StepFun',   type: 'openai', apiKey:'',  baseUrl:'https://api.stepfun.com/v1',    model:'step-3.5-flash', temperature:0.7 },
    openai:   { name: 'OpenAI',    type: 'openai', apiKey:'',  baseUrl:'https://api.openai.com/v1',    model:'gpt-4',        temperature:0.7 },
    local:    { name: '本地模型',  type: 'openai', apiKey:'ollama', baseUrl:'http://localhost:11434/v1', model:'codellama:7b', temperature:0.7 },
    zhipu:    { name: '智谱 AI',   type: 'openai', apiKey:'',  baseUrl:'https://open.bigmodel.cn/api/paas/v4', model:'glm-4-flash', temperature:0.7 }
  };
}

function getProviders() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultProviders(); }
  catch { return defaultProviders(); }
}

function saveProviders(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

// ============ 初始化 ============

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initEvents();
  initQuickPrompts();
  initSettings();
  applySavedProviders();
});

// ============ 标签页 ============

function initTabs() {
  document.querySelectorAll('.tab').forEach(t =>
    t.addEventListener('click', () => switchMode(t.dataset.mode)));
}

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  ['aiModePanel','codeModePanel','previewModePanel'].forEach(id =>
    document.getElementById(id).classList.toggle('hidden', id !== mode+'ModePanel'));
  updateButtons();
  hideError();
}

function updateButtons() {
  document.getElementById('generateBtn').classList.add('hidden');
  document.getElementById('convertBtn').classList.add('hidden');
  document.getElementById('previewCodeBtn').classList.add('hidden');
  if (currentMode === 'ai') document.getElementById('generateBtn').classList.remove('hidden');
  else if (currentMode === 'code') document.getElementById('convertBtn').classList.remove('hidden');
  else document.getElementById('previewCodeBtn').classList.remove('hidden');
}

// ============ 事件 ============

function initEvents() {
  document.getElementById('generateBtn').addEventListener('click', () => handleAI());
  document.getElementById('convertBtn').addEventListener('click', () => handleCode());
  document.getElementById('previewCodeBtn').addEventListener('click', () => handlePreview());
  document.getElementById('copyCodeBtn').addEventListener('click', () => copyToClipboard(currentCode));
  document.getElementById('toggleCodeBtn').addEventListener('click', () => {
    const b = document.getElementById('codeBlock');
    b.style.maxHeight = b.style.maxHeight ? '' : '300px';
    document.getElementById('toggleCodeBtn').textContent = b.style.maxHeight ? '🔼 展开' : '🔽 收起';
  });
  document.getElementById('regenerateBtn').addEventListener('click', () => {
    if (currentMode === 'ai') handleAI();
    else if (currentMode === 'code') handleCode();
    else handlePreview();
  });
  document.getElementById('downloadBtn').addEventListener('click', e => {
    e.preventDefault();
    if (currentPptBlob) downloadBlob(currentPptBlob, 'react-to-ppt.pptx');
  });
  document.getElementById('promptInput').addEventListener('input', () =>
    document.getElementById('charCount').textContent = document.getElementById('promptInput').value.length + ' 字');
}

function initQuickPrompts() {
  document.querySelectorAll('.quick-chip').forEach(c =>
    c.addEventListener('click', () => {
      document.getElementById('promptInput').value = c.dataset.prompt;
      document.getElementById('charCount').textContent = c.dataset.prompt.length + ' 字';
    }));
}

// ============ LLM 设置模态框 ============

const icons = { stepfun:'🚀', openai:'🔵', local:'🖥️', zhipu:'🧠', custom:'⚙️' };

function initSettings() {
  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('hidden');
    renderProviders();
  });
  document.getElementById('settingsModal').addEventListener('click', e => {
    if (e.target.id === 'settingsModal') closeSettings();
  });
}

function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }

function renderProviders() {
  const providers = getProviders();
  document.getElementById('providersList').innerHTML =
    Object.entries(providers).map(([id, p]) =>
      `<div class="provider-item">
        <div class="provider-info">
          <div class="provider-icon">${icons[p.type] || '🤖'}</div>
          <div class="provider-details"><h4>${p.name}</h4><p>${p.baseUrl} · ${p.model}</p></div>
        </div>
        <div class="provider-actions">
          <button onclick="editProvider('${id}')">编辑</button>
          <button class="delete" onclick="deleteProvider('${id}')">删除</button>
        </div></div>`).join('') ||
    '<p style="color:var(--text-muted);text-align:center;padding:20px">暂无自定义提供商</p>';
}

function editProvider(id) {
  const p = getProviders()[id]; if (!p) return;
  document.getElementById('providerName').value = p.name;
  document.getElementById('providerType').value = p.type;
  document.getElementById('apiKey').value = p.apiKey;
  document.getElementById('baseUrl').value = p.baseUrl;
  document.getElementById('modelName').value = p.model;
  document.getElementById('temperature').value = p.temperature ?? 0.7;
  document.querySelector('.provider-form').scrollIntoView({behavior:'smooth'});
}

function deleteProvider(id) {
  if (!confirm(`确定删除「${getProviders()[id]?.name}」？`)) return;
  const p = getProviders(); delete p[id]; saveProviders(p);
  renderProviders(); applySavedProviders();
}

function toggleApiKey() {
  document.getElementById('apiKey').type =
    document.getElementById('apiKey').type === 'password' ? 'text' : 'password';
}

async function testConnection() {
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const apiKey   = document.getElementById('apiKey').value.trim();
  const model    = document.getElementById('modelName').value.trim();
  if (!baseUrl || !apiKey || !model) { alert('请填写 API Key、Base URL 和模型'); return; }
  try {
    const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
      body: JSON.stringify({model, messages:[{role:'user',content:'Hello'}], max_tokens:5})
    });
    res.ok ? alert('✅ 连接成功！') : alert('❌ 失败：' + (await res.json().then(d => d.error?.message || res.status)));
  } catch(e) { alert('❌ 网络错误：' + e.message); }
}

function saveProvider() {
  const name  = document.getElementById('providerName').value.trim();
  const type  = document.getElementById('providerType').value;
  const apiKey = document.getElementById('apiKey').value.trim();
  const baseUrl= document.getElementById('baseUrl').value.trim();
  const model  = document.getElementById('modelName').value.trim();
  const temp   = parseFloat(document.getElementById('temperature').value) || 0.7;
  if (!name || !apiKey || !baseUrl || !model) { alert('请填写所有必填字段'); return; }

  const p = getProviders();
  const id = name.toLowerCase().replace(/\s+/g, '-');
  p[id] = { name, type, apiKey, baseUrl, model, temperature: temp };
  saveProviders(p);

  ['providerName','apiKey','baseUrl','modelName'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('temperature').value = '0.7';

  renderProviders(); applySavedProviders();
  alert('✅ 提供商保存成功！可以在此下拉列表中选择使用了。');
}

function applySavedProviders() {
  const select = document.getElementById('providerSelect');
  select.innerHTML = [
    '<option value="stepfun">StepFun (推荐)</option>',
    '<option value="openai">OpenAI (GPT-4)</option>',
    '<option value="local">本地模型 (Ollama)</option>',
    '<option value="zhipu">智谱 AI (GLM-4)</option>'
  ].join('');
  const p = getProviders();
  Object.entries(p).forEach(([id, cfg]) => {
    if (!PROVIDER_CHOICES.includes(id))
      select.insertAdjacentHTML('beforeend', `<option value="${id}">${cfg.name}</option>`);
  });
}

// ============ 生成逻辑 ============

async function handleAI() {
  const prompt  = document.getElementById('promptInput').value.trim();
  const provider= document.getElementById('providerSelect').value;
  const theme   = document.getElementById('themeSelect').value;
  if (!prompt) return showError('请输入组件描述');

  hideError();
  showLoading('正在 AI 生成...');
  setProgress(20, '正在请求 LLM...');

  try {
    // step1: 生成代码
    const { code } = await callAPI('/api/generate', { prompt, provider });
    currentCode = code;
    setProgress(60, '正在渲染 PPT...');

    // step2: 代码→PPT
    const res = await fetch(API_BASE + '/api/convert', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code, filename: sanitize(prompt), options:{ theme } })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'PPT 生成失败');
    currentPptBlob = await res.blob();
    setProgress(100, '生成完成！');
    setTimeout(() => showResult(code, currentPptBlob, provider), 400);
  } catch(err) {
    showError(err.message || '生成失败');
  }
}

async function handleCode() {
  const code  = document.getElementById('codeInput').value.trim();
  const theme = document.getElementById('themeSelect').value;
  if (!code) return showError('请输入 React 代码');

  hideError();
  showLoading('代码→PPT 转换中...');
  try {
    const res = await fetch(API_BASE + '/api/convert', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code, filename: sanitize(code), options:{ theme } })
    });
    if (!res.ok) throw new Error((await res.json()).error || '转换失败');
    currentPptBlob = await res.blob();
    currentCode = code;
    showResult(code, currentPptBlob, null);
  } catch(err) { showError(err.message || '转换失败'); }
}

async function handlePreview() {
  const prompt  = document.getElementById('promptInput').value.trim();
  const provider= document.getElementById('providerSelect').value;
  if (!prompt) return showError('请输入组件描述');

  hideError();
  showLoading('正在生成代码...');
  try {
    const { code } = await callAPI('/api/generate', { prompt, provider });
    currentCode = code;
    currentPptBlob = null;
    showResult(code, null, provider);
  } catch(err) { showError(err.message || '生成失败'); }
}

// ============ API ============

async function callAPI(endpoint, body) {
  const res = await fetch(API_BASE + endpoint, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({})).error) || `HTTP ${res.status}`);
  return await res.json();
}

// ============ UI 工具 ============

function showLoading(msg) {
  document.getElementById('placeholderPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.add('hidden');
  document.getElementById('loadingPanel').classList.remove('hidden');
  document.getElementById('loadingText').textContent = msg;
}

function setProgress(pct, msg) {
  document.getElementById('progressPanel').classList.remove('hidden');
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = msg;
  document.getElementById('progressIcon').textContent = pct < 100 ? '⏳' : '✅';
}

function showResult(code, blob, provider) {
  document.getElementById('progressPanel').classList.add('hidden');
  document.getElementById('loadingPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.remove('hidden');

  document.getElementById('codeBlock').innerHTML = highlightSyntax(code);
  document.getElementById('codeBlock').style.maxHeight = 'none';

  updateStats(code, provider);

  if (blob) {
    const url = URL.createObjectURL(blob);
    const btn = document.getElementById('downloadBtn');
    btn.href = url;
    btn.download = 'react-to-ppt-' + Date.now() + '.pptx';
    btn.style.display = 'inline-flex';
  } else {
    document.getElementById('downloadBtn').style.display = 'none';
  }
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('errorPanel').classList.remove('hidden');
  setTimeout(hideError, 5000);
}
function hideError() { document.getElementById('errorPanel').classList.add('hidden'); }

function updateStats(code, provider) {
  document.getElementById('statLines').textContent    = code.split('\n').length;
  document.getElementById('statProps').textContent  = (code.match(/props:\s*{/g)||[]).length;
  document.getElementById('statHooks').textContent  = (code.match(/(useState|useEffect|useContext|useCallback|useMemo|useRef)/g)||[]).length;
  if (provider) {
    const n = {stepfun:'StepFun',openai:'OpenAI',local:'本地模型'};
    document.getElementById('statProvider').textContent = n[provider]||provider;
    document.getElementById('providerStatItem').classList.remove('hidden');
  } else {
    document.getElementById('providerStatItem').classList.add('hidden');
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const b = document.getElementById('copyCodeBtn');
    b.innerHTML = '✅ 已复制'; setTimeout(() => b.innerHTML = '📋 复制代码', 2000);
  }).catch(() => showError('复制失败'));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {href:url, download:filename});
  a.click(); URL.revokeObjectURL(url);
}

function sanitize(t) { return t.slice(0,30).replace(/[^a-zA-Z0-9-_]/g,'_')||'presentation'; }

// ============ 语法高亮 ============

function highlightSyntax(code) {
  let h = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  h = h.replace(/(\/\*[\s\S]*?\*\/|\/\/.*)/g,'<span class="hljs-comment">$1</span>');
  h = h.replace(/(['"`])(.*?)\1/g,'<span class="hljs-string">$1$2$1</span>');
  ['import','export','default','from','const','let','var','function',
   'return','if','else','for','while','switch','case','break','continue',
   'class','extends','new','this','super','try','catch','throw','async','await']
  .forEach(k => h = h.replace(new RegExp(`\\b(${k})\\b`,'g'),'<span class="hljs-keyword">$1</span>'));
  ['React','useState','useEffect','useContext','useReducer','useCallback',
   'useMemo','useRef','Component','Fragment','memo']
  .forEach(k => h = h.replace(new RegExp(`\\b(${k})\\b`,'g'),'<span class="hljs-function">$1</span>'));
  h = h.replace(/\b(\d+)\b/g,'<span class="hljs-number">$1</span>');
  h = h.replace(/(&lt;\/?)([\w.]+)/g,'$1<span class="hljs-tag">$2</span>');
  h = h.replace(/(\w+)=/g,'<span class="hljs-attr">$1</span>=');
  h = h.replace(/(\w+)(?=\()/g,'<span class="hljs-function">$1</span>');
  return `<code>${h}</code>`;
}
