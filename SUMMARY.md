# React 代码转 PPT 完整方案

## 核心能力

已将完整的 **React to PPT** 转换工具构建完成，包含：

- ✅ **AST 解析器**：提取组件名称、Props、Hooks、JSX 结构
- ✅ **PPT 生成引擎**：基于 pptxgenjs，生成专业 PPT
- ✅ **四种页面类型**：封面、Props表格、Hooks统计、总结页
- ✅ **主题配置系统**：4套配色、自定义字体、布局

## 项目位置

```
/root/.openclaw/workspace/react-to-ppt/
├── index.js              # 单文件入口（推荐直接运行）
├── Button-final.pptx     # 已生成的示例 PPT
├── src/                  # 完整模块化代码
├── examples/             # 示例 React 组件
└── config/               # 主题配置
```

## 使用方法

### 方式1：直接运行（推荐）

```bash
cd react-to-ppt
node index.js examples/Button.jsx -o my-output.pptx
```

### 方式2：作为模块使用

```javascript
const { parseReactCode } = require('./src/parser');
const { generatePPT } = require('./src/generator');

const code = fs.readFileSync('MyComponent.jsx', 'utf-8');
const info = parseReactCode(code);
const pres = generatePPT(info, { theme: 'coral' });
await pres.writeFile({ fileName: 'output.pptx' });
```

### 方式3：批量处理

参考 `src/generator/index.js` 中的 `analyzeDirectory` 方法。

## 功能演示

运行后生成的 PPT 包含：

| 页面 | 内容 |
|------|------|
| **Cover** | 组件名、类型、Props/Hooks/JSX 统计 |
| **Props** | 参数名、类型、是否必需、默认值（表格） |
| **Hooks** | 左侧：自定义Hooks / 右侧：State和Effects |
| **Summary** | 三大统计的大字数字卡片 |

## 自定义配置

编辑 `config/default.json`：

```json
{
  "colors": {
    "primary": "1E2761",   // 主色调
    "secondary": "CADCFC", // 辅助色
    "accent": "FFFFFF"     // 强调色
  },
  "fonts": {
    "title": "Arial Black", // 标题字体
    "body": "Calibri"       // 正文字体
  }
}
```

支持的预设主题：`modern`, `midnight`, `coral`, `forest`

## 技术细节

**解析能力：**
- ✅ 箭头函数组件：`const Button = (props) => {}` ✓
- ✅ 函数声明组件：`function App() {}` ✓
- ✅ 类组件：`class MyComp extends Component {}` ✓
- ✅ 解构 Props：`const { size, variant } = props` ✓
- ✅ 剩余参数：`...rest` ✓
- ✅ Hooks：useState, useEffect, useContext, useRef ✓
- ✅ JSX 元素识别 ✓

**设计特点：**
- 16:9 宽屏布局
- 现代配色方案（深蓝主色）
- 卡片式内容组织
- 图表和装饰条

## 输出示例

运行后会生成 `Button-final.pptx`，包含：
1. 封面页 - 显示组件名 "Button"、类型 "Functional"
2. Props 表格页 - 8个参数（children, variant, size等）
3. Hooks 页 - useState ×2, useEffect ×1
4. 总结页 - 统计卡片（Hooks: 3, State: 2, Props: 8）

## 后续扩展方向

- 🔄 代码高亮显示（集成 highlight.js）
- 🔄 组件树可视化图
- 🔄 TypeScript 类型完整展示
- 🔄 生命周期流程图（类组件）
- 🔄 导出为 PDF 格式

## 依赖说明

```json
{
  "@babel/parser": "^7.23.0",
  "@babel/traverse": "^7.23.0",
  "pptxgenjs": "^3.12.0",
  "highlight.js": "^11.9.0"
}
```

已安装完整依赖，可直接使用。

---

**🎉 项目已完成！**

运行：`cd react-to-ppt && node index.js examples/Button.jsx` 即可看到效果。

所有源代码已保存，你可以：
1. 直接使用 `index.js` 快速转换
2. 基于 `src/` 模块化代码二次开发
3. 修改 `config/` 自定义主题

有问题随时告诉我！🚀
