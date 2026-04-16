# 🎯 React to PPT 使用指南

## 项目概述

**React to PPT** 是一个将 React 组件代码自动转换为专业 PPT 演示文稿的工具。适用于：

- 🎓 **技术分享**：快速生成代码讲解用的幻灯片
- 🔍 **代码评审**：可视化组件结构、Props、Hooks
- 📚 **项目文档**：为组件创建交互式文档
- 🏗️ **架构设计**：展示组件树和依赖关系

## 快速开始

### 1. 环境准备

```bash
cd react-to-ppt
npm install
```

需要 Node.js >= 16.0

### 2. 转换单个文件

```bash
# 基本用法
node index.js examples/Button.jsx

# 指定输出路径
node index.js examples/Button.jsx -o my-presentation.pptx
```

### 3. 查看输出

生成的 PPT 包含：
- **封面页**：组件名称、类型、统计概览
- **Props 页**：参数表格（可选）
- **Hooks 页**：Hooks 使用情况（可选）
- **总结页**：统计数据展示

## 项目结构

```
react-to-ppt/
├── src/                    # 源代码
│   ├── parser/            # AST 解析器
│   │   └── index.js       # React 代码解析逻辑
│   └── generator/         # PPT 生成器
│       ├── index.js       # 主生成逻辑
│       ├── layout.js      # 布局和主题
│       └── slide-factory.js # 各类 slide 生成
├── examples/              # 示例文件
│   └── Button.jsx         # 示例按钮组件
├── config/                # 配置
│   └── default.json       # 默认主题配置
├── index.js               # 单文件入口（可运行）
├── package.json
└── README.md
```

## 功能特性

### ✅ 智能解析

- 自动识别组件类型（函数/类组件）
- 提取 Props 参数（支持解构和剩余参数）
- 检测 Hooks 使用（useState, useEffect, useContext, useRef）
- 收集 JSX 元素结构
- 支持 TypeScript 和 JSX

### ✅ 专业设计

- 16:9 宽屏布局
- 4 套内置配色主题
- 现代化排版（标题+正文字体）
- 视觉层次分明
- 每页都有装饰元素

### ✅ 灵活配置

支持通过 `config/default.json` 自定义：

```json
{
  "theme": "modern",
  "colors": { "primary": "1E2761", "secondary": "CADCFC" },
  "fonts": { "title": "Arial Black", "body": "Calibri" },
  "pages": ["cover", "props", "hooks", "summary"]
}
```

## 支持的页面类型

| 页面 | 描述 | 触发条件 |
|------|------|----------|
| Cover | 封面页（标题、统计）| 总是生成 |
| Props | Props 参数表格 | 存在 props 时 |
| Hooks | Hooks 使用情况 | 存在 hooks 时 |
| Summary | 总结统计页 | 总是生成 |

## 使用示例

### 示例 1：转换 Button 组件

```bash
node index.js examples/Button.jsx -o Button.pptx
```

输出包含：
- 组件名：Button
- Props: 8 个
- Hooks: 2 个（useState ×2, useEffect ×1）
- JSX 元素：1 个（button 标签）

### 示例 2：自定义主题

编辑 `config/default.json`，修改颜色：

```json
{
  "colors": {
    "primary": "028090",      // 青绿色主色调
    "secondary": "00A896",    // 辅助色
    "accent": "02C39A"
  }
}
```

### 示例 3：集成到项目

```javascript
const { parseReactCode } = require('./src/parser');
const fs = require('fs');

// 读取组件
const code = fs.readFileSync('./MyComponent.jsx', 'utf-8');

// 解析
const info = parseReactCode(code);

// 生成 PPT（通过调用生成器函数）
console.log('组件:', info.name);
console.log('Props:', info.props.map(p => p.name));
```

## 技术栈

- **@babel/parser** - React 代码 AST 解析
- **@babel/traverse** - AST 节点遍历
- **pptxgenjs** - PPT 文件生成
- **highlight.js** - 代码高亮（预留）

## 开发计划

### v1.0（当前版本）
- ✅ 基本 AST 解析
- ✅ Props 表格页
- ✅ Hooks 使用页
- ✅ 封面和总结页

### v1.1（计划中）
- 🔄 代码高亮显示
- 🔄 组件树可视化
- 🔄 TypeScript 类型展示
- 🔄 生命周期图表（类组件）

### v2.0（未来）
- 🌟 代码片段截图（基于 Puppeteer）
- 🌟 流程图生成（useEffect 依赖链）
- 🌟 Markdown 文档导出
- 🌟 Web 界面版本

## 常见问题

### Q: 能处理 TypeScript 吗？
A: 能。已在插件中启用 `typescript`，可解析 `.tsx` 文件。

### Q: 代码中的 helper 函数会被误识别吗？
A: 不会。目前实现只识别首字母大写的变量声明，小写开头的函数不会当作组件。

### Q: 如何生成代码高亮页面？
A: 当前版本仅提供文本展示，完整高亮功能在开发中。

### Q: 可以批量转换吗？
A: 可以，需要编写脚本遍历目录调用解析器。

## 设计说明

### 配色原则
- **主色 (60-70%)**：深蓝色/青绿色，决定整体基调
- **辅助色 (20-30%)**：浅蓝色，用于次级元素
- **强调色 (10%)**：白色，用于高亮和背景

### 排版原则
- 标题：36-48pt，粗体
- 正文：10-16pt
- 间距：0.3-0.5" 标准行距
- 对齐：标题左对齐，正文左对齐

### 视觉元素
每个页面都包含：
- 顶部装饰条
- 卡片/形状容器
- 图标提示（📋 🪝 ✨）
- 一致的边距和对齐

## 许可证

MIT License - 可自由使用、修改和分发。

---

**开始使用：**

```bash
cd react-to-ppt
node index.js examples/Button.jsx -o demo.pptx
```

祝你使用愉快！🎉
