#!/usr/bin/env node

/**
 * React to PPT - 最终可运行版本
 * 手动遍历 AST，避免 Babel traverse 限制
 */

const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const pptxgen = require('pptxgenjs');

// ============================================================
// 配置
// ============================================================
const config = {
  colors: { primary: '1E2761', secondary: 'CADCFC', accent: 'FFFFFF', text: '363636', background: 'FFFFFF' },
  fonts: { title: 'Arial Black', body: 'Calibri' }
};

// ============================================================
// 解析器（纯手动 AST 遍历）
// ============================================================
function parseReactCode(code) {
  const ast = babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  const program = ast.type === 'File' ? ast.program : ast;

  const info = {
    name: 'Unknown',
    type: 'Functional',
    props: [],
    hooks: [],
    state: [],
    jsxElements: []
  };

  // 遍历顶层声明
  for (const stmt of program.body) {
    if (stmt.type === 'VariableDeclaration') {
      processVariableDeclaration(stmt, info);
    }
  }

  // 全局收集所有 JSX 元素
  collectJSX(program, info);

  return info;
}

/**
 * 处理 VariableDeclaration
 */
function processVariableDeclaration(node, info) {
  const decl = node.declarations[0];
  
  if (decl.type !== 'VariableDeclarator') return;
  
  const init = decl.init;
  if (!init) return;
  
  // 检查是否为箭头函数或函数表达式
  if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
    // 判断名称是否首字母大写
    const varName = decl.id?.name;
    if (varName && /^[A-Z]/.test(varName)) {
      info.name = varName;
      info.type = 'Functional';
      
      // 提取参数（Props）
      if (init.params.length > 0) {
        const param = init.params[0];
        if (param.type === 'ObjectPattern') {
          for (const prop of param.properties) {
            if (prop.type === 'RestElement') {
              info.props.push({ name: '...' + prop.argument.name, type: 'spread', required: false });
            } else {
              info.props.push({
                name: prop.key?.name || prop.key?.value,
                type: 'any',
                required: !prop.value
              });
            }
          }
        }
      }
      
      // 遍历函数体
      processFuncBody(init.body, info);
    }
  }
}

/**
 * 处理函数体：提取 Hooks 和 State
 */
function processFuncBody(body, info) {
  if (!body) return;
  
  // 函数体应该是 BlockStatement
  if (body.type !== 'BlockStatement') return;
  
  for (const stmt of body.body) {
    // VariableDeclaration: 处理 Hook 初始化（见 processVariableDeclarator）
    if (stmt.type === 'VariableDeclaration') {
      for (const d of stmt.declarations) {
        processVariableDeclarator(d, info);
      }
    }
  }
}

/**
 * 处理 VariableDeclarator（Hook 初始化）
 */
function processVariableDeclarator(decl, info) {
  const init = decl.init;
  if (!init || init.type !== 'CallExpression') return;
  
  // 检查是否为 Hook
  const hookName = getHookName(init.callee);
  if (!hookName || !hookName.startsWith('use')) return;
  
  info.hooks.push({ name: hookName, line: decl.loc?.start?.line });
  
  if (hookName === 'useState' && decl.id) {
    info.state.push({
      name: decl.id.name,
      type: 'state',
      hook: 'useState'
    });
  } else if (hookName === 'useEffect' && decl.id) {
    info.state.push({
      name: decl.id.name,
      type: 'effect',
      hook: 'useEffect'
    });
  } else if (hookName === 'useContext') {
    info.state.push({
      name: 'useContext',
      type: 'context',
      hook: 'useContext'
    });
  } else if (hookName === 'useRef' && decl.id) {
    info.state.push({
      name: decl.id.name,
      type: 'ref',
      hook: 'useRef'
    });
  }
}

/**
 * 提取 Hook 名称（支持 React.useState 形式）
 */
function getHookName(callee) {
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') {
    // React.useState -> 提取 useState
    // callee.object 可能是 Identifier(name='React') 或 Identifier(name='Hooks') 等
    // callee.property 是 Identifier(name='useState')
    return callee.property?.name;
  }
  return null;
}

/**
 * 收集 JSX 元素
 */
function collectJSX(node, info) {
  if (!node) return;
  
  // 遍历子节点
  for (const key in node) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
    
    const child = node[key];
    if (!child) continue;
    
    if (child.type === 'JSXElement') {
      info.jsxElements.push({
        tag: child.openingElement.name?.name || 'unknown',
        line: child.loc?.start?.line
      });
      continue;
    }
    
    // 递归遍历数组
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && !['loc', 'start', 'end', 'range'].includes(key)) {
          collectJSX(item, info);
        }
      }
    } else if (child && typeof child === 'object') {
      // 忽略一些通用节点
      if (!['loc', 'start', 'end', 'range', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) {
        collectJSX(child, info);
      }
    }
  }
}

// ============================================================
// PPT 生成器
// ============================================================
function createPresentation(componentInfo) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.title = `${componentInfo.name} - React Component`;
  return pres;
}

function createCoverSlide(pres, info) {
  const { colors, fonts } = config;
  const slide = pres.addSlide();
  slide.background = { color: colors.background };
  
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.2, w: 9, h: 0.08,
    fill: { color: colors.primary }
  });
  
  slide.addText(info.type, {
    x: 0.5, y: 1.4, w: 2, h: 0.5,
    fontSize: 14, color: colors.primary,
    align: 'left', valign: 'middle'
  });
  
  slide.addText(info.name, {
    x: 0.5, y: 1.8, w: 9, h: 1.2,
    fontSize: 48, color: colors.text,
    bold: true, fontFace: fonts.title,
    align: 'left', valign: 'middle'
  });
  
  slide.addText(`Props: ${info.props.length} | Hooks: ${info.hooks.length} | JSX: ${info.jsxElements.length}`, {
    x: 0.5, y: 3.5, w: 9, h: 0.5,
    fontSize: 14, color: '666666'
  });
  
  return slide;
}

function createPropsSlide(pres, info) {
  const { colors, fonts } = config;
  const slide = pres.addSlide();
  slide.background = { color: colors.background };
  
  slide.addText('📋 Props Table', {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 20, color: colors.primary,
    bold: true, fontFace: fonts.title
  });
  
  slide.addText(`Component: ${info.name}`, {
    x: 0.5, y: 1.1, w: 9, h: 0.4,
    fontSize: 12, color: colors.text
  });
  
  if (info.props.length > 0) {
    const colX = [0.5, 2.5, 5.5, 7.5];
    const colW = [2, 3, 1.5, 2];
    
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 1.8, w: 8.5, h: 0.5,
      fill: { color: colors.primary }
    });
    
    ['Prop Name', 'Type', 'Required', 'Default'].forEach((header, idx) => {
      slide.addText(header, {
        x: colX[idx], y: 1.8, w: colW[idx], h: 0.5,
        fontSize: 11, color: colors.accent,
        bold: true, align: 'center', valign: 'middle'
      });
    });
    
    info.props.forEach((prop, rowIdx) => {
      const y = 2.4 + rowIdx * 0.6;
      if (rowIdx % 2 === 1) {
        slide.addShape(pres.shapes.RECTANGLE, {
          x: 0.5, y, w: 8.5, h: 0.5,
          fill: { color: 'F7F7F7' }
        });
      }
      
      slide.addText(prop.name, {
        x: colX[0], y, w: colW[0], h: 0.5,
        fontSize: 10, color: colors.text,
        align: 'left', valign: 'middle'
      });
      slide.addText(prop.type || 'any', {
        x: colX[1], y, w: colW[1], h: 0.5,
        fontSize: 9, color: '666666'
      });
      slide.addText(prop.required ? 'Yes' : 'No', {
        x: colX[2], y, w: colW[2], h: 0.5,
        fontSize: 9, align: 'center', valign: 'middle'
      });
    });
  }
  
  return slide;
}

function createHooksSlide(pres, info) {
  const { colors, fonts } = config;
  const slide = pres.addSlide();
  slide.background = { color: colors.background };
  
  slide.addText('🪝 Hooks Usage', {
    x: 0.5, y: 0.4, w: 9, h: 0.6,
    fontSize: 20, color: colors.primary,
    bold: true, fontFace: fonts.title
  });
  
  const col1X = 0.5, col2X = 5.0, cellW = 4.2, startY = 1.2;
  
  // 左侧：自定义 Hooks
  slide.addShape(pres.shapes.RECTANGLE, {
    x: col1X, y: startY - 0.2, w: cellW, h: 0.4,
    fill: { color: colors.secondary }
  });
  slide.addText('Custom Hooks', {
    x: col1X, y: startY - 0.2, w: cellW, h: 0.4,
    fontSize: 11, color: colors.primary,
    bold: true, align: 'center'
  });
  
  // 右侧：内置 Hooks
  slide.addShape(pres.shapes.RECTANGLE, {
    x: col2X, y: startY - 0.2, w: cellW, h: 0.4,
    fill: { color: colors.secondary }
  });
  slide.addText('State & Effects', {
    x: col2X, y: startY - 0.2, w: cellW, h: 0.4,
    fontSize: 11, color: colors.primary,
    bold: true, align: 'center'
  });
  
  const customHooks = info.hooks.filter(h => h.name !== 'useState' && h.name !== 'useEffect');
  customHooks.forEach((hook, idx) => {
    const y = startY + idx * 0.7;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: col1X, y, w: cellW, h: 0.55,
      fill: { color: colors.background },
      line: { color: colors.primary, width: 1 }
    });
    slide.addText(hook.name, {
      x: col1X, y, w: cellW, h: 0.55,
      fontSize: 10, color: colors.text,
      align: 'left', valign: 'middle', margin: { left: 0.1 }
    });
  });
  
  info.state.slice(0, 6).forEach((item, idx) => {
    const y = startY + idx * 0.7;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: col2X, y, w: cellW, h: 0.55,
      fill: { color: colors.background },
      line: { color: colors.primary, width: 1 }
    });
    slide.addText(item.hook || item.name, {
      x: col2X, y, w: cellW, h: 0.55,
      fontSize: 9, color: colors.text,
      align: 'left', valign: 'middle', margin: { left: 0.1 }
    });
  });
  
  return slide;
}

function createSummarySlide(pres, info) {
  const { colors, fonts } = config;
  const slide = pres.addSlide();
  slide.background = { color: colors.primary };
  
  slide.addText('✨ Key Takeaways', {
    x: 0.5, y: 0.8, w: 9, h: 0.8,
    fontSize: 28, color: colors.accent,
    bold: true, fontFace: fonts.title,
    align: 'center', valign: 'middle'
  });
  
  const stats = [
    { label: 'Hooks', value: info.hooks.length.toString() },
    { label: 'State', value: info.state.length.toString() },
    { label: 'Props', value: info.props.length.toString() }
  ];
  
  stats.forEach((stat, idx) => {
    const x = 1.5 + idx * 2.5;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 2.2, w: 2, h: 1.5,
      fill: { color: colors.accent }
    });
    slide.addText(stat.value, {
      x, y: 2.2, w: 2, h: 0.8,
      fontSize: 48, color: colors.primary,
      bold: true, align: 'center', valign: 'middle'
    });
    slide.addText(stat.label, {
      x, y: 3.0, w: 2, h: 0.4,
      fontSize: 12, color: colors.text,
      align: 'center', valign: 'middle'
    });
  });
  
  slide.addText(`Component: ${info.name}`, {
    x: 0.5, y: 4.2, w: 9, h: 0.5,
    fontSize: 16, color: colors.accent,
    align: 'center'
  });
  
  return slide;
}

// ============================================================
// 4. 主程序
// ============================================================
async function main() {
  const filePath = './examples/Button.jsx';
  
  try {
    console.log('📖 读取文件:', filePath);
    const code = fs.readFileSync(filePath, 'utf-8');
    
    console.log('🔍 解析代码...');
    const info = parseReactCode(code);
    
    console.log('\n=== 分析结果 ===');
    console.log(`✅ 组件: ${info.name}`);
    console.log(`   Props: ${info.props.length} 个`);
    console.log(`   Hooks: ${info.hooks.length} 个`);
    console.log(`   State: ${info.state.length} 个`);
    console.log(`   JSX:   ${info.jsxElements.length} 个`);
    
    console.log('\nProps 详情:');
    info.props.forEach(p => console.log(`  - ${p.name}${p.required ? ' (必需)' : ' (可选)'}`));
    
    console.log('\n🎨 生成 PPT...');
    const pres = createPresentation(info);
    
    createCoverSlide(pres, info);
    if (info.props.length > 0) createPropsSlide(pres, info);
    if (info.hooks.length > 0) createHooksSlide(pres, info);
    createSummarySlide(pres, info);
    
    const output = './Button-final.pptx';
    await pres.writeFile({ fileName: output });
    
    console.log('\n✅ 成功！');
    console.log(`📁 输出: ${path.resolve(output)}`);
    console.log(`\n提示: 打开 ${output} 查看演示文稿`);
    
  } catch (err) {
    console.error('\n❌ 错误:', err.message);
    console.error(err.stack);
  }
}

if (require.main === module) main();
module.exports = { parseReactCode, main };
