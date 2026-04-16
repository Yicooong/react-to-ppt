# React to PPT - 代码转换演示文稿工具

将 React 组件代码自动转换为专业的 PPT 演示文稿，适用于技术分享、代码评审和项目文档。

## 核心特性

- **智能解析**：使用 AST 解析 React 组件，提取结构信息
- **多种页面类型**：
  - 封面页（组件概览）
  - 代码页（语法高亮显示）
  - 结构页（组件树、Props 表格）
  - 流程图页（状态流转、生命周期）
  - 总结页
- **专业设计**：集成 PptxGenJS，支持自定义配色、字体、布局
- **灵活配置**：支持多种输出格式和自定义模板

## 技术栈

- **AST 解析**：@babel/parser + @babel/traverse
- **PPT 生成**：pptxgenjs
- **代码高亮**：highlight.js 或 prismjs
- **图表支持**：使用 shapes 绘制流程图、UML 图

## 快速开始

```bash
# 安装依赖
npm install

# 使用示例
node cli.js --input ./src/components/Button.jsx --output button-presentation.pptx

# 批量处理
node cli.js --input ./src/components/ --output ./docs/presentations/
```

## 项目结构

```
react-to-ppt/
├── src/
│   ├── parser/
│   │   ├── index.js          # React 代码解析入口
│   │   ├── ast-utils.js      # AST 工具函数
│   │   ├── component-info.js # 组件信息提取
│   │   └── props-analyzer.js # Props 分析
│   ├── generator/
│   │   ├── index.js          # PPT 生成主逻辑
│   │   ├── slide-factory.js  # 各类 slide 生成器
│   │   ├── layout.js         # 布局管理
│   │   └── theme.js          # 主题配置
│   └── utils/
│       ├── code-highlight.js # 代码高亮
│       └── file-utils.js     # 文件操作工具
├── cli.js                     # 命令行入口
├── config/
│   └── default.json          # 默认配置
└── examples/
    └── Button.jsx            # 示例组件
```

## 配置选项

```json
{
  "theme": "modern",
  "layout": "16:9",
  "pages": [
    "cover",
    "code",
    "structure",
    "flow",
    "summary"
  ],
  "highlight": {
    "theme": "monokai-sublime",
    "lineNumbers": true
  }
}
```

## 输出示例

生成的 PPT 包含：
- **封面页**：组件名称、描述、作者信息
- **目录页**：章节导航
- **代码展示页**：带语法高亮的源码（可拆分多页）
- **Props 表格**：参数名称、类型、默认值、说明
- **组件树**：渲染层级结构图
- **状态管理**：useState/useEffect 等 Hook 使用统计
- **流程图**：生命周期或交互流程
- **总结页**：关键要点

## License

MIT
