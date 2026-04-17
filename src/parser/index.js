/**
 * React 代码解析器 - 使用 Babel AST 提取组件信息
 * 简化版：移除嵌套遍历，避免 scope/parentPath 问题
 */
const babelParser = require('@babel/parser');
const babelTraverse = require('@babel/traverse').default;

/**
 * 解析 React 文件，提取组件元数据
 * @param {string} code - React 源码
 * @returns {Object} 组件信息对象
 */
function parseReactCode(code) {
  const ast = babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  const componentInfo = {
    name: 'Unknown',
    type: 'Functional',
    imports: [],
    hooks: [],
    props: [],
    jsxElements: [],
    state: []
  };

  let foundComponent = false;

  // 直接遍历整个 AST
  babelTraverse(ast, {
    // 导入语句
    ImportDeclaration: ({ node }) => {
      componentInfo.imports.push({
        source: node.source.value,
        specifiers: node.specifiers.map(s => ({
          local: s.local.name,
          imported: s.imported ? s.imported.name : s.local.name,
          type: s.type
        }))
      });
    },

    // 函数声明组件：function Button() {}
    FunctionDeclaration: ({ node }) => {
      if (node.id && /^[A-Z]/.test(node.id.name) && !foundComponent) {
        componentInfo.name = node.id.name;
        componentInfo.type = 'Functional';
        foundComponent = true;
        extractPropsFromParams(node.params, componentInfo);
      }
    },

    // 箭头函数组件：const Button = () => {}
    VariableDeclarator: ({ node }) => {
      const init = node.init;
      if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) {
        const varName = node.id?.name;
        if (varName && /^[A-Z]/.test(varName) && !foundComponent) {
          componentInfo.name = varName;
          componentInfo.type = 'Functional';
          foundComponent = true;
          extractPropsFromParams(init.params, componentInfo);
        }
      }
    },

    // 类组件
    ClassDeclaration: ({ node }) => {
      if (isClassComponent(node) && !foundComponent) {
        componentInfo.name = node.id.name;
        componentInfo.type = 'Class';
        foundComponent = true;
      }
    },

    // Hook 调用（在顶层遍历中捕获所有 CallExpression）
    CallExpression: ({ node }) => {
      if (!node.loc) return;

      const callee = node.callee;
      if (callee?.type === 'Identifier' && callee.name?.startsWith('use')) {
        // 检查是否在组件内部（简单判断：父级是否为函数体或类方法）
        const inComponent = isInsideComponent(node);
        if (inComponent && !isInsideHelper(node)) {
          componentInfo.hooks.push({
            name: callee.name,
            line: node.loc.start.line
          });

          // 如果是 useState，记录变量名
          if (callee.name === 'useState') {
            let parent = node.parent;
            while (parent && parent.type !== 'VariableDeclarator') {
              parent = parent.parent;
            }
            if (parent && parent.id?.type === 'Identifier') {
              componentInfo.state.push({
                name: parent.id.name,
                hook: 'useState'
              });
            }
          }
        }
      }
    },

    // JSX 元素
    JSXElement: ({ node }) => {
      if (node.loc) {
        const opening = node.openingElement;
        componentInfo.jsxElements.push({
          tag: opening.name?.type === 'JSXIdentifier' ? opening.name.name : 'Unknown',
          line: node.loc.start.line,
          attributes: opening.attributes?.map(attr => ({
            name: attr.name?.type === 'JSXIdentifier' ? attr.name.name : attr.name?.value,
            value: attr.value?.type === 'StringLiteral' ? attr.value.value : null
          })) || []
        });
      }
    }
  });

  return componentInfo;
}

/**
 * 判断节点是否在组件内部
 */
function isInsideComponent(node) {
  let current = node.parent;
  while (current) {
    if (current.type === 'FunctionDeclaration' || 
        current.type === 'ArrowFunctionExpression' ||
        current.type === 'ClassDeclaration' ||
        current.type === 'ClassBody') {
      // 检查是否为 React 组件（函数名大写 或 继承自 Component）
      const name = current.id?.name || 
                   (current.parent?.type === 'VariableDeclarator' && current.parent.id?.name);
      if (name && /^[A-Z]/.test(name)) {
        return true;
      }
      if (current.type === 'ClassDeclaration' && isClassComponent(current)) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

/**
 * 判断节点是否在工具函数内部（排除小写函数）
 */
function isInsideHelper(node) {
  let current = node.parent;
  while (current) {
    if (current.type === 'FunctionDeclaration' || 
        current.type === 'FunctionExpression' || 
        current.type === 'ArrowFunctionExpression') {
      const name = current.id?.name || 
                   (current.parent?.type === 'VariableDeclarator' && current.parent.id?.name);
      if (name && /^[a-z_]/.test(name)) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

/**
 * 从参数列表中提取 Props 信息
 */
function extractPropsFromParams(params, info) {
  params.forEach(param => {
    if (param.type === 'Identifier') {
      info.props.push({ name: param.name, type: 'any', required: true });
    } else if (param.type === 'ObjectPattern') {
      param.properties.forEach(prop => {
        if (prop.type === 'RestElement') {
          info.props.push({ name: '...' + prop.argument.name, type: 'spread', required: false });
        } else {
          info.props.push({
            name: prop.key?.name || prop.key?.value,
            type: 'any',
            required: !prop.value
          });
        }
      });
    }
  });
}

/**
 * 判断是否为 React 类组件
 */
function isClassComponent(node) {
  if (node.superClass) {
    if (node.superClass.type === 'Identifier' && node.superClass.name === 'Component') {
      return true;
    }
    if (node.superClass.type === 'MemberExpression') {
      return node.superClass.object?.name === 'React' && 
             node.superClass.property?.name === 'Component';
    }
  }
  return false;
}

module.exports = {
  parseReactCode
};
