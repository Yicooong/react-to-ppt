# React to PPT - 智能 React 代码转 PPT 工具

将 React 组件代码自动转换为专业的 PPT 演示文稿，支持 **自然语言描述生成代码**，适用于技术分享、代码评审和项目文档。

## ✨ 核心特性

### 🎯 双重模式

1. **代码转换模式**：直接粘贴 React 组件代码 → 生成 PPT
2. **自然语言生成模式**：用中文描述组件需求 → LLM 生成代码 → 生成 PPT

### 📊 智能解析

- **AST 解析**：使用 Babel 解析 React 组件，提取 Props、Hooks、JSX 结构
- **多种页面类型**：封面、代码展示、Props 表格、Hooks 统计、组件总结
- **专业设计**：集成 PptxGenJS，支持 4 套主题配色

### 🤖 AI 辅助

- **多模型支持**：StepFun、OpenAI、本地 Ollama 模型
- **智能代码生成**：根据自然语言描述生成可用的 React 组件
- **一键转换**：完整 pipeline - 描述 → 代码 → PPT

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Yicooong/react-to-ppt.git
cd react-to-ppt
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 LLM（可选，用于自然语言生成）

编辑 `server/config/llm.json`，填入你的 API Key：

```json
{
  "stepfun": {
    "apiKey": "your-stepfun-api-key",
    "model": "step-3.5-flash",
    "baseUrl": "https://api.stepfun.com/v1"
  },
  "openai": {
    "apiKey": "your-openai-api-key",
    "model": "gpt-4",
    "baseUrl": "https://api.openai.com/v1"
  },
  "local": {
    "baseUrl": "http://localhost:11434/v1",
    "model": "codellama:7b"
  }
}
```

> **注意**：`server/config/llm.json` 和 `.env` 已在 `.gitignore` 中，不会提交到仓库。

### 4. 启动服务器

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

服务器将在 http://localhost:3000 启动。

### 5. 打开浏览器

访问 http://localhost:3000，即可使用 Web 界面：

- **代码模式**：粘贴 React 代码 → 点击"生成 PPT" → 下载文件
- **AI 模式**：描述组件需求 → 点击"AI 生成并转换" → 等待生成 → 下载 PPT

## 📦 命令行工具

如果你更喜欢 CLI 方式：

```bash
# 转换单个文件
node cli.js examples/Button.jsx --output my-component.pptx

# 批量转换
node cli.js batch ./examples --output ./presentations/

# 使用自定义主题
node cli.js examples/Button.jsx --theme coral --output coral-button.pptx
```

## 🏗️ 项目结构

```
react-to-ppt/
├── src/
│   ├── parser/                    # React 代码解析
│   │   └── index.js               # AST 提取组件信息
│   ├── generator/                 # PPT 生成逻辑
│   │   ├── index.js               # 主生成入口
│   │   ├── slide-factory.js       # 各类幻灯片生成器
│   │   └── layout.js              # 布局与主题管理
│   └── utils/
│       └── code-highlight.js      # 代码高亮（highlight.js）
├── server/                        # 🆕 LLM API 服务层
│   ├── index.js                   # Express 服务器
│   ├── services/
│   │   ├── llm-service/           # 🆕 LLM 统一服务
│   │   │   └── index.js           # 多提供商支持
│   │   └── ppt-generator.js       # 后端 PPT 生成封装
│   └── config/
│       └── llm.json               # 🆕 LLM 配置（加入 .gitignore）
├── frontend/                      # 🆕 Web 界面
│   ├── index.html                 # 主页面
│   ├── styles.css                 # 样式
│   └── app.js                     # 前端逻辑
├── config/
│   └── default.json               # 主题配置（4 套配色）
├── examples/
│   └── Button.jsx                 # 示例组件
├── cli.js                         # 命令行入口
├── index.js                       # 主程序（旧版）
├── package.json
├── README.md
└── .gitignore
```

## 🔌 API 接口说明

服务器启动后，提供以下 REST API：

| 端点 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/api/generate` | POST | 自然语言 → React 代码 | `{ prompt, provider }` |
| `/api/convert` | POST | React 代码 → PPT 文件 | `{ code, theme, pages }` |
| `/api/pipeline` | POST | 完整流程：描述 → PPT | `{ prompt, theme, provider }` |
| `/api/providers` | GET | 获取可用 LLM 提供商列表 | - |
| `/health` | GET | 健康检查 | - |

### `/api/pipeline` 示例

```bash
curl -X POST http://localhost:3000/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "创建一个登录按钮，支持加载状态和禁用样式",
    "theme": "modern",
    "provider": "stepfun"
  }'
```

返回 PPT 文件的二进制流，可直接保存为 `.pptx`。

## 🎨 主题配置

内置 4 套主题（可扩展）：

| 主题 | 说明 | 适用场景 |
|------|------|----------|
| `midnight` | 深蓝商务风 | 正式汇报 |
| `coral` | 珊瑚粉亮色 | 创意分享 |
| `forest` | 森林绿清新 | 产品设计 |
| `modern` | 简约黑白灰 | 通用技术分享 |

在 `config/default.json` 中可自定义颜色、字体、页面组合。

## 🛠️ 技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| AST 解析 | `@babel/parser` + `@babel/traverse` | 提取组件元数据 |
| PPT 生成 | `pptxgenjs` | 编程式生成 PPTX |
| 代码高亮 | `highlight.js` | 语法高亮展示 |
| LLM 接口 | OpenAI 兼容协议 | StepFun / OpenAI / Ollama |
| 后端 | `express` + `cors` | API 服务器 |
| 前端 | 原生 JS + CSS3 | 无框架依赖，轻量级 |

## 📖 使用示例

### 示例 1：直接转换现有组件

```javascript
// 打开浏览器访问 http://localhost:3000
// 在"代码模式"标签页粘贴以下代码：

const Button = ({ children = "Click me", onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};

export default Button;
// 点击"生成 PPT"，下载 button-presentation.pptx
```

### 示例 2：用 AI 生成组件

```
在"AI 模式"输入框输入：
"帮我创建一个带有搜索图标的输入框组件，支持清空按钮"

选择提供商：StepFun
点击"AI 生成并转换"

→ 自动生成 React 代码
→ 解析组件结构
→ 生成 6 页 PPT 演示文稿
→ 浏览器下载 PPT 文件
```

### 示例 3：自定义配置

```javascript
// 通过 API 指定主题和页面组合
fetch('/api/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: fs.readFileSync('MyComponent.jsx', 'utf-8'),
    theme: 'coral',
    pages: ['cover', 'code', 'props', 'summary']
  })
})
.then(res => res.blob())
.then(blob => saveAs(blob, 'my-component.pptx'));
```

## ⚙️ 配置选项

### CLI 参数

```bash
node cli.js <input> --output <file> [options]

选项：
  -t, --theme <name>      主题名称（default: modern）
  -p, --pages <list>      页面类型，逗号分隔（cover,code,structure,props,hooks,summary）
  -o, --output <path>     输出文件路径
  -d, --description <str> 组件描述
```

### JSON 配置 (`config/default.json`)

```json
{
  "theme": "modern",
  "layout": "LAYOUT_16x9",
  "pages": ["cover", "code", "structure", "props", "hooks", "summary"],
  "author": "React to PPT",
  "colors": {
    "primary": "1E2761",
    "secondary": "CADCFC",
    "accent": "FFFFFF",
    "text": "363636",
    "background": "FFFFFF"
  },
  "fonts": {
    "title": "Arial Black",
    "body": "Calibri",
    "code": "Consolas"
  },
  "highlight": {
    "theme": "atom-one-dark",
    "lineNumbers": false,
    "fontSize": 10
  }
}
```

## 🐛 已知问题

- Babel Traverse 嵌套调用可能导致 scope 错误，已通过简化 parser 解决
- 大文件生成 PPT 可能需要较长时间（10-30 秒），建议小于 500 行代码
- 某些复杂 Hook（如 `useReducer`、`useContext`）的提取可能不完整

## 📝 开发计划

- [ ] 支持更多 LLM 提供商（Claude、Gemini、文心一言）
- [ ] 前端集成 Monaco Editor 实现代码编辑
- [ ] 支持流程图自动生成（Mermaid 语法）
- [ ] 添加 PPT 模板导入功能
- [ ] 历史记录与多版本对比
- [ ] 导出为 PDF / 图片格式

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 License

MIT

---

**Made with ❤️ by React to PPT Team**
