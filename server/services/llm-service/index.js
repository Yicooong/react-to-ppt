'use strict';

/**
 * 支持的 LLM 提供商列表
 */
const PROVIDERS = ['stepfun', 'openai', 'local', 'zhipu'];

/**
 * 默认模型映射
 */
const DEFAULT_MODELS = {
  stepfun: 'step-3.5-flash',
  openai:  'gpt-4',
  local:   'codellama:7b',
  zhipu:   'glm-4-flash'
};

/**
 * 提供商配置基类
 */
class BaseProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || '';
    this.model = config.model || '';
    this.timeout = config.timeout || 30000;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens || 2048;
  }

  /**
   * 发送聊天请求（子类实现）
   * @param {Array} messages - 消息数组
   * @param {Object} options - 额外选项
   * @returns {Promise<string>} 回复内容
   */
  async chat(messages, options = {}) {
    throw new Error('chat() must be implemented by subclass');
  }

  /**
   * 验证配置是否完整
   * @returns {boolean}
   */
  isConfigured() {
    return this.apiKey !== '' || this.baseUrl !== '';
  }
}

/**
 * OpenAI 兼容接口提供商
 * 适用于：OpenAI、StepFun、本地兼容 OpenAPI 的服务
 */
class OpenAICompatibleProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = config.name || 'openai-compatible';
  }

  isConfigured() {
    // baseUrl 是必需的，apiKey 本地服务可以没有
    return this.baseUrl !== '';
  }

  async chat(messages, options = {}) {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const body = {
      model: options.model || this.model || DEFAULT_MODELS.openai,
      messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      stream: false
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let errJson;
        try { errJson = JSON.parse(errText); } catch (_) {}
        const msg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`[${this.name}] ${msg}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content === undefined || content === null) {
        throw new Error(`[${this.name}] 响应格式异常：缺少 choices[0].message.content`);
      }

      return content.trim();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`[${this.name}] 请求超时（${this.timeout}ms）`);
      }
      throw err;
    }
  }
}

/**
 * LLM 服务统一入口
 */
class LLMService {
  constructor(config = {}) {
    this.instances = {};
    this._initProviders(config);
  }

  _initProviders(config) {
    // StepFun
    if (config.stepfun?.apiKey) {
      this.instances.stepfun = new OpenAICompatibleProvider({
        name: 'stepfun',
        ...config.stepfun
      });
    }

    // OpenAI
    if (config.openai?.apiKey) {
      this.instances.openai = new OpenAICompatibleProvider({
        name: 'openai',
        ...config.openai
      });
    }

    // 本地模型（Ollama / LM Studio / vLLM 等）
    if (config.local) {
      this.instances.local = new OpenAICompatibleProvider({
        name: 'local',
        ...config.local
      });
    }

    // 智谱 AI (Zhipu)
    if (config.zhipu?.apiKey) {
      this.instances.zhipu = new OpenAICompatibleProvider({
        name: 'zhipu',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash',
        ...config.zhipu
      });
    }
  }

  /**
   * 获取提供商实例
   * @param {string} name - 提供商名称
   * @returns {OpenAICompatibleProvider}
   */
  getProvider(name) {
    const provider = this.instances[name];
    if (!provider) {
      throw new Error(`不支持的提供商: ${name}。可用: ${PROVIDERS.join(', ')}`);
    }
    if (!provider.isConfigured()) {
      throw new Error(`提供商 [${name}] 未配置正确，请检查 config/llm.json`);
    }
    return provider;
  }

  /**
   * 生成 React 代码
   * @param {string} prompt - 自然语言描述
   * @param {Object} options - { provider, model, maxRetries }
   * @returns {Promise<string>} JSX 代码
   */
  async generateCode(prompt, options = {}) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('prompt 不能为空');
    }

    const { provider = 'stepfun', model, maxRetries = 3 } = options;

    // 检查 provider 是否已配置
    if (!this.instances[provider]) {
      throw new Error(
        `提供商 [${provider}] 未配置。` +
        `请编辑 config/llm.json 添加 ${provider} 的 API key。` +
        `当前可用提供商: ${Object.keys(this.instances).join(', ') || '无'}`
      );
    }

    const p = this.getProvider(provider);
    const useModel = model || p.model || DEFAULT_MODELS[provider];

    const messages = [
      {
        role: 'system',
        content: this._buildSystemPrompt()
      },
      {
        role: 'user',
        content: this._buildUserPrompt(prompt)
      }
    ];

    let lastErr;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const raw = await p.chat(messages, { model: useModel });
        const { code, clean } = this._extractCode(raw);

        if (!code) {
          throw new Error('LLM 未返回有效的 JSX 代码，请重试或调整描述');
        }

        return {
          code,                   // 清理后的纯 JSX
          raw,                    // LLM 完整输出
          clean,                  // 是否已提取
          provider,
          model: useModel,
          prompt
        };

      } catch (err) {
        lastErr = err;
        console.warn(`LLM 调用失败 (${provider}, attempt ${attempt}/${maxRetries}):`, err.message);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    throw new Error(`LLM 生成失败（已重试 ${maxRetries} 次）: ${lastErr.message}`);
  }

  /**
   * 系统提示词
   * @private
   */
  _buildSystemPrompt() {
    return `你是一个专业的 React 幻灯片组件代码生成专家。

## 任务目标
根据自然语言描述，生成一个完整的 React 演示文稿组件，包含 slidesData 数据数组和 Slide 组件渲染。

## 严格格式（必须遵守）

你必须按以下模板输出完整代码，不要有任何解释文字：

\`\`\`jsx
const slidesData = [
  { title: '标题1', content: '内容1...', imageSrc: 'https://via.placeholder.com/800x400' },
  { title: '标题2', content: '内容2...', imageSrc: 'https://via.placeholder.com/800x400' },
  ...
];

const Slide = ({ title, content, imageSrc }) => (
  <div>
    <h2>{title}</h2>
    <p>{content}</p>
    {imageSrc && <img src={imageSrc} alt={title} />}
  </div>
);

const App = () => (
  <div>
    {slidesData.map((s, i) => <Slide key={i} {...s} />)}
  </div>
);

export default App;
\`\`\`

## 关键规则

### 1. 变量名强制
- 幻灯片数据变量**必须命名为** \`slidesData\`（小写，无其他名称）
- 至少 3 个条目，每个包含 \`title\`（标题）和 \`content\`（内容）字段
- \`imageSrc\` 可选，可使用占位图

### 2. 内容要求
- 根据用户描述组织幻灯片逻辑
- 每页标题简洁（< 15 字），内容简明（< 80 字）
- 图片统一用 \`https://via.placeholder.com/800x400\` 占位

### 3. 代码完整性
- 必须有 \`import React\`（或使用 JSX 转换）
- 必须有 \`export default App\`
- 不要省略任何部分

### 4. 输出限制
只输出代码块，不要有 Markdown 标记之外的任何文字（不要有"好的，这是代码"之类的开场白或结尾）。`;
  }

  /**
   * 用户提示词
   * @private
   */
  _buildUserPrompt(description) {
    return `请根据以下描述生成 React 组件：

## 组件描述
${description}

${this._buildExtraRequirements()}

请生成完整的代码：`;
  }

  /**
   * 额外生成要求
   * @private
   */
  _buildExtraRequirements() {
    return `
## 额外要求（可选）
- 如果需要按钮，请包含多种状态：默认、悬停、禁用、加载中
- 如果需要表单，请包含输入验证和错误提示
- 如果需要列表，请包含空状态和加载状态
- 确保可访问性（aria 属性、键盘导航）`;
  }

  /**
   * 从 LLM 输出中提取 JSX 代码块
   * @private
   */
  _extractCode(raw) {
    if (!raw) return { code: '', clean: false };

    // 1. 直接就是代码（无 markdown）
    if (!raw.includes('```')) {
      if (raw.includes('import ') || raw.includes('function ') || raw.includes('const ') || raw.includes('export ')) {
        return { code: raw.trim(), clean: false };
      }
      return { code: '', clean: false };
    }

    // 2. 提取 ```jsx ... ``` 或 ```javascript ... ``` 或 ``` ... ```
    const patterns = [
      /```jsx\s+([\s\S]*?)```/i,
      /```javascript\s+([\s\S]*?)```/i,
      /```js\s+([\s\S]*?)```/i,
      /```\s*([\s\S]*?)```/
    ];

    let extracted = '';
    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match && match[1]) {
        extracted = match[1].trim();
        break;
      }
    }

    if (!extracted) return { code: '', clean: false };

    // 3. 清理可能残留的非代码内容（只看第一个代码块）
    extracted = extracted
      .replace(/^[\s\n]*```[\s\n]*/g, '')   // 嵌套代码块开始
      .replace(/[\s\n]*```[\s\n]*$/g, '')   // 嵌套代码块结束
      .trim();

    // 4. 尝试拼接多个 ``` 块
    // 如果 LLM 输出 \`\`\`jsx\`\`\` + 代码 + \`\`\`jsx\`\`\`
    const multiCode = raw
      .split(/```(?:jsx|javascript|js)?\s*/)
      .filter(s => s.trim() && !s.match(/^[\s\n]*`+\s*$/))
      .join('\n\n');

    const finalCode = multiCode || extracted;

    return {
      code: finalCode.trim(),
      clean: !!multiCode
    };
  }

  /**
   * 修复代码（基于错误信息）
   * @param {string} code - 原始代码
   * @param {string} errorMsg - 错误信息
   * @param {Object} options - { provider }
   * @returns {Promise<string>} 修复后的代码
   */
  async fixCode(code, errorMsg, options = {}) {
    const { provider = 'stepfun' } = options;
    const p = this.getProvider(provider);

    const messages = [
      {
        role: 'system',
        content: '你是一个 React 代码调试专家。请修复代码中的错误，只返回修正后的完整代码。'
      },
      {
        role: 'user',
        content: `代码：
\`\`\`jsx
${code}
\`\`\`

错误：
${errorMsg}

请返回修复后的完整代码：`
      }
    ];

    const raw = await p.chat(messages);
    const { code: fixedCode } = this._extractCode(raw);
    return fixedCode || code;  // 如果提取失败，返回原代码
  }
}

module.exports = {
  LLMService,
  BaseProvider,
  OpenAICompatibleProvider,
  PROVIDERS,
  DEFAULT_MODELS
};
