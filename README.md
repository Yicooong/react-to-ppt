# React to PPT - 智能 React 代码转 PPT 工具

将 React 组件代码自动转换为专业的 PPT 演示文稿，支持 **自然语言描述生成代码**，适用于技术分享、代码评审和项目文档。

---

## ✨ 核心特性

### 🎯 双重模式

1. **代码转换模式**：直接粘贴 React 组件代码 → 生成 PPT
2. **自然语言生成模式**：用中文描述内容 → LLM 生成幻灯片代码 → 生成 PPT（新型内容演示）

### 📊 智能解析

- **AST 解析**：使用 Babel 解析 React 组件，提取 Props、Hooks、JSX 结构
- **双重 PPT 引擎**：
  - **Content 模式**（新增）：LLM 生成 `slidesData` → 渲染真实内容幻灯片
  - **Analysis 模式**（传统）：代码结构分析 → Props 表、Hooks 统计、组件树
- **主题系统**：支持 4 套配色（默认、Forest🌲、Midnight🌙、Coral🪸）

### 🤖 AI 辅助

- **多模型支持**：StepFun、OpenAI、智谱 AI（GLM-4）、本地 Ollama/ qualquer
- **智能代码生成**：只需输入描述，自动生成完整幻灯片代码
- **一键转换**：完整 pipeline - 描述 → 代码 → PPT，三步到位

### 🎨 UI 设计

- **明亮简约**：蓝白配色，清爽现代
- **Cherry Studio 风格 LLM 设置**：内置提供商管理模态框，API Key 本地 localStorage 安全存储
- **暗色代码高亮**：内置正则高亮，可扩展 highlight.js

---

## 🚀 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/Yicooong/react-to-ppt.git
cd react-to-ppt

# 2. 安装全部依赖
npm install

# 3. 启动服务器（端口 3000）
node server/index.js
```

浏览器打开 **http://localhost:3000** 即可使用前端页面。

---

## ⚙️ LLM 配置

编辑 `server/config/llm.json`（该文件已在 `.gitignore` 中保护，不会上传 GitHub）：

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
  "zhipu": {
    "apiKey": "your-zhipu-api-key",
    "model": "glm-4-flash",
    "baseUrl": "https://open.bigmodel.cn/api/paas/v4"
  },
  "local": {
    "baseUrl": "http://localhost:11434/v1",
    "model": "codellama:7b"
  }
}
```

> 🔑 **安全提醒**：所有 API Key 仅本地存储，不经过任何第三方服务器。

---

## 🔧 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/generate` | 根据自然语言生成 React 代码 |
| `POST` | `/api/convert` | 将 React 代码转为 PPTX |
| `POST` | `/api/pipeline` | 一键完成：描述 → 代码 → PPT（推荐）|
| `GET`  | `/api/providers` | 获取已配置的 LLM 提供商列表 |
| `GET`  | `/health` | 健康检查 |

---

## 📂 项目结构

```
react-to-ppt/
├── frontend/               # 前端页面
│   ├── index.html          # 主界面（三种模式切换）
│   ├── styles.css          # 全部样式（明亮简约 + 模态框）
│   └── app.js              # 前端逻辑（API 调用 + LLM 配置管理）
├── server/                 # 后端服务
│   ├── index.js            # Express 服务器 + API 路由
│   ├── services/
│   │   ├── llm-service/    # 多 LLM 提供商统一接口
│   │   ├── ppt-generator.js# PPT 调度器（双模式）
│   │   └── pptx-service.js # pptxgenjs 内容幻灯片生成
├── src/                    # React-to-PPT 核心库
│   ├── parser/             # AST 解析（Props/Hooks/Structure）
│   └── generator/          # 传统分析报告生成器
└── server/config/          # 本地配置（gitignore）
```

---

## 💻 LLM 提供商设置（前端 UI）

1. 点击顶部导航条的 **⚙️ 按钮**
2. 模态框展示已配置的提供商 + 添加新提供商
3. 支持三种类型：
   - **OpenAI 兼容**：自定义 baseUrl + model
   - **StepFun**：指定模型 `step-3.5-flash`
   - **自定义**：完全手动 baseUrl + model
4. 支持测试连接、显示/隐藏 API Key、删除配置
5. 所有配置**自动保存到浏览器 localStorage**，刷新不丢失

---

## 📝 使用示例

### API 调用

```javascript
// 自然语言生成代码
POST /api/generate
{ "prompt": "创建一个龙门石窟的 PPT 演示组件", "provider": "zhipu" }

// 代码转 PPT
POST /api/convert
{ "code": "export default ...", "filename": "龙门石窟", "options": { "theme": "Forest" } }

// 完整 pipeline（推荐）
POST /api/pipeline
{ "prompt": "龙门石窟，6页", "provider": "zhipu", "options": { "theme": "Forest" } }
```

### 前端三种模式

1. **🤖 AI 生成**：输入描述 → 选 LLM → 选主题 → **生成 PPT 演示文稿**
2. **📝 代码转换**：粘贴已写好的 React 代码 → **生成 PPT 分析报告**
3. **👁️ 仅预览**：快速预览 LLM 生成的 React 组件（不上传代码）

---

## 🎨 主题配色

| 主题 | 效果 |
|------|------|
| `default` | 蓝白主色调，现代简约 |
| `Forest` 🌲 | 森林绿，自然清新 |
| `Midnight` 🌙 | 深色背景 + 霓虹点缀 |
| `Coral` 🪸 | 珊瑚粉，温暖柔和 |

---

## 🔒 隐私安全

- **所有 API Key 仅存储在本地**（`server/config/llm.json` gitignore + 浏览器 localStorage）
- **不经过任何第三方代理服务器**
- 代码生成过程完全在你自己的网络环境中进行

---

## 📋 Todo / 待办

- [ ] 代码高亮替换为正则高亮 → highlight.js
- [ ] 历史记录功能
- [ ] 错误页面美化
- [ ] 重新实现传统 Analysis 模式（Props/Hooks 分析报告）

---

## 📄 License

MIT
