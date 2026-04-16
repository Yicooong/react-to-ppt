# React to PPT - 完整使用指南

## 快速开始

### 1. 安装依赖

```bash
cd react-to-ppt
npm install
```

**系统要求：**
- Node.js >= 16.0.0
- 需要安装 pptxgenjs (已包含在 dependencies)

### 2. 基本使用

```bash
# 转换单个文件
node cli.js examples/Button.jsx -o my-presentation.pptx

# 使用自定义主题
node cli.js examples/Button.jsx --theme coral

# 选择要生成的页面
node cli.js examples/Button.jsx --pages cover,code,props,summary

# 指定配置文件
node cli.js examples/Button.jsx --config ./config/my-config.json
```

### 3. 批量转换

```bash
# 批量处理整个目录
node cli.js batch ./src/components --output ./presentations

# 指定文件扩展名
node cli.js batch ./src --ext .jsx,.tsx --output ./docs/slides
```

## 项目结构

```
react-to-ppt/
├── src/
│   ├── parser/
│   │   └── index.js          # React 代码 AST 解析器
│   ├── generator/
│   │   ├── index.js          # PPT 生成主逻辑
│   │   ├── layout.js         # 布局和主题管理
│   │   └── slide-factory.js  # 各类 slide 生成器
│   └── utils/
│       └── code-highlight.js # 代码高亮工具
├── config/
│   └── default.json          # 默认配置
├── examples/
│   └── Button.jsx            # 示例 React 组件
├── cli.js                    # 命令行工具
├── demo.js                   # 测试脚本
├── package.json
└── README.md
```

## 配置详解

### config/default.json

```json
{
  "theme": "modern",
  "layout": "LAYOUT_16x9",
  "author": "React to PPT",
  "colors": {
    "primary": "1E2761",      // 主色调
    "secondary": "CADCFC",    // 次色调
    "accent": "FFFFFF",       // 强调色
    "text": "363636",         // 文本颜色
    "background": "FFFFFF"    // 背景色
  },
  "fonts": {
    "title": "Arial Black",  // 标题字体
    "body": "Calibri",       // 正文字体
    "code": "Consolas"       // 代码字体
  },
  "pages": [                  // 要生成的页面类型
    "cover",
    "code",
    "structure",
    "props",
    "hooks",
    "summary"
  ],
  "highlight": {
    "theme": "atom-one-dark",
    "lineNumbers": false,
    "fontSize": 10
  }
}
```

### 内置主题

```javascript
// 可用主题：
themePresets = {
  midnight:  // 深蓝背景，白色文字（适合暗色主题）
  coral:     // 珊瑚色 + 金色 + 深蓝
  forest:    // 森林绿 + 苔藓绿 + 米白
  modern:    // 青绿色系，清新现代
}
```

使用：`--theme midnight` 或修改配置文件。

## 功能特性

### 1. 智能解析

自动提取以下信息：
- ✅ 组件名称和类型（函数/类组件）
- ✅ Props 参数（名称、类型、是否必需、默认值）
- ✅ Hooks 使用情况（useState, useEffect, useContext, useRef 等）
- ✅ 组件内部 state 定义
- ✅ JSX 元素结构（用于生成组件树）
- ✅ 导入依赖关系
- ✅ 生命周期方法（仅类组件）

### 2. 生成的页面类型

#### Cover (封面页)
- 组件名称（大标题）
- 组件类型标签
- 文件路径（可选）
- 描述信息（如有）

#### Code (代码页)
- 源代码展示
- 语法高亮
- 行号显示（可选）

#### Structure (结构页)
- 组件树可视化
- 子元素层级关系
- 连线表示父子关系

#### Props (参数表格页)
- Props 名称、类型、必需性、默认值
- 斑马纹表格，易读性强

#### Hooks (Hooks 统计页)
- 自定义 Hooks 列表
- State 和 Effect 使用情况
- 两栏布局设计

#### Summary (总结页)
- 统计数据（大号数字卡片）
- 关键要点

### 3. 主题和样式

- **16:9 宽屏布局**：适配现代投影仪和屏幕
- **专业配色**：4 套预设主题
- **字体组合**：标题用 Arial Black，正文用 Calibri
- **形状样式**：圆角矩形、阴影、对齐网格

## 代码示例

### 使用 API 直接编程

```javascript
const { parseReactCode, analyzeDirectory } = require('./src/parser');
const { generatePPT } = require('./src/generator');
const fs = require('fs');

// 方式1：读取文件并解析
const code = fs.readFileSync('./MyComponent.jsx', 'utf-8');
const componentInfo = parseReactCode(code);
componentInfo.code = code;  // 保存源码用于展示

// 方式2：分析整个目录
const components = await analyzeDirectory('./src/components');

// 生成 PPT
components.forEach(comp => {
  const pres = generatePPT(comp, { theme: 'coral' });
  pres.writeFile({ fileName: `${comp.name}.pptx` });
});
```

### 自定义配置

```javascript
const { generatePPT } = require('./src/generator');
const { createPresentation } = require('./src/generator/layout');

// 完全自定义主题
const customConfig = {
  theme: 'custom',
  colors: {
    primary: 'FF5722',    // 橙红色
    secondary: 'FFCDD2',
    accent: 'D32F2F',
    background: 'FFF3E0',
    text: '212121'
  },
  fonts: {
    title: 'Georgia',
    body: 'Calibri'
  },
  pages: ['cover', 'props', 'summary']
};

const pres = createPresentation(componentInfo, customConfig).pres;
// ... 添加 slide ...
pres.writeFile({ fileName: 'custom.pptx' });
```

## 设计理念

### 色彩选择

每个主题都经过精心设计：
- **主导色 (60-70%)**：大面积使用，决定整体基调
- **辅助色 (20-30%)**：用于次级元素、表格、装饰
- **强调色 (10%)**：用于按钮、高亮、需要吸引注意的地方

### 排版原则

- 标题 36-44pt，正文 14-16pt
- 充足的行高和边距
- 保持对齐的一致性
- 避免文本居中（仅标题可用）

### 视觉增强

每个页面都包含视觉元素：
- 封面：装饰条、图标
- 代码：代码块背景、语法高亮
- 结构：颜色编码的组件树
- Props：斑马纹表格
- Hooks：圆角卡片布局
- Summary：大数字卡片

## 扩展性

### 添加新的 Slide 类型

在 `src/generator/slide-factory.js` 中添加函数：

```javascript
function createMyNewSlide(pres, componentInfo, config) {
  const { colors, fonts } = config;
  const slide = pres.addSlide();
  // ... 你的实现
  return slide;
}

module.exports = {
  // ...
  createMyNewSlide
};
```

然后在 `src/generator/index.js` 中调用即可。

### 支持更多代码语言

修改 `src/utils/code-highlight.js`：

```javascript
hljs.registerLanguage('tsx', require('highlight.js/lib/languages/typescript'));
```

### 添加图表

PptxGenJS 支持以下图表：
- BAR (柱状图)
- LINE (折线图)
- PIE (饼图)
- DOUGHNUT (环形图)
- SCATTER (散点图)
- BUBBLE (气泡图)
- RADAR (雷达图)

使用：`slide.addChart(pres.charts.BAR, data, options)`

## 限制与已知问题

1. **代码高亮**：当前版本仅返回纯文本，完整高亮需要集成 highlight.js 的 HTML→图像管线
2. **大型文件**：超过 500 行的组件会触发多页拆分逻辑（待实现）
3. **TypeScript 类型**：支持解析但未展示完整类型信息
4. **嵌套组件**：目前仅展示当前组件的直接子元素，不递归

## 性能优化建议

- 批量生成时使用 `pres.writeFile({ fileName: 'output.pptx' })` 而不是单个文件重复调用
- 大型组件可考虑先解析为 JSON 缓存
- 避免在循环中创建新的 `pptxgen()` 实例

## 未来改进方向

- [ ] 完整代码高亮显示（带颜色）
- [ ] 支持组件依赖图谱
- [ ] 添加交互流程图（useEffect 依赖链）
- [ ] 导出为 PDF 格式
- [ ] Web 界面版本
- [ ] 支持 Vue/Preact 等其他框架
- [ ] 智能分页策略（超过 X 行自动分多页）
- [ ] 自定义模板系统（从 .pptx 模板加载）
- [ ] 图表自动生成（props 关系图）
- [ ] Markdown 说明文档生成（配套）

## 技术栈详解

| 工具 | 版本 | 用途 |
|------|------|------|
| @babel/parser | ^7.23.0 | 将源码转换为 AST |
| @babel/traverse | ^7.23.0 | 遍历 AST 节点 |
| pptxgenjs | ^3.12.0 | PPT 文件生成 |
| highlight.js | ^11.9.0 | 代码语法高亮 |
| commander | ^11.0.0 | CLI 参数解析 |

## 使用技巧

1. **先解析再确认**：首次运行可使用 `--pages cover,props` 仅生成摘要页
2. **调试模式**：查看解析结果：`node -e "console.log(require('./src/parser').parseReactCode(require('fs').readFileSync('MyComponent.jsx','utf-8')))"`
3. **批量处理**：使用 `batch` 命令，配合 `--ext` 指定文件类型
4. **自定义主题**：复制 `config/default.json` 并修改颜色值

## 常见问题

### Q: 如何处理 TypeScript 文件（.tsx）？
A: 已在 parser 中启用 `typescript` 插件，无需额外配置。

### Q: 生成的文件在哪里？
A: 默认保存到当前目录，文件名：`{ComponentName}_presentation.pptx`，可通过 `-o` 指定路径。

### Q: 能否修改已存在的 PPT？
A: 当前版本只支持创建新文件。需要编辑功能可参考 `pptxgenjs` 的 `pres.readFile()` 方法。

### Q: 代码太长怎么办？
A: 可以：
  - 使用 `--pages cover,props` 只生成摘要页
  - 在配置中降低 `highlight.fontSize`
  - 手动拆分大组件为多个小组件

## 许可证

MIT License - 自由使用、修改和分发。

---

**开始使用：** `node cli.js examples/Button.jsx -o demo.pptx`

祝你使用愉快！🎉
