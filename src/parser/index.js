/**
 * React 代码解析器 - 使用 Babel AST 提取组件信息
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

  // Babel 9+ 返回 File 类型，需要访问 .program
  const program = ast.type === 'File' ? ast.program : ast;

  const componentInfo = {
    name: 'Unknown',
    type: 'Functional',
    imports: [],
    exports: [],
    hooks: [],
    state: [],
    props: [],
    methods: [],
    lifecycle: [],
    jsxElements: [],
    dependencies: []
  };

  babelTraverse(program, {
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

    // 函数声明组件
    FunctionDeclaration: ({ node }) => {
      if (node.id && /^[A-Z]/.test(node.id.name)) {
        componentInfo.name = node.id.name;
        componentInfo.type = 'Functional';
        extractFunctionComponentInfo(node, componentInfo, code);
      }
    },

    // 箭头函数组件
    VariableDeclaration: ({ node }) => {
      const init = node.declarations[0]?.init;
      
      if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) {
        const varName = node.declarations[0].id?.name;
        
        if (varName && /^[A-Z]/.test(varName)) {
          componentInfo.name = varName;
          componentInfo.type = 'Functional';
          extractArrowFuncComponentInfo(init, componentInfo, code);
        }
      }
    },

    // 类组件
    ClassDeclaration: ({ node }) => {
      if (isClassComponent(node)) {
        componentInfo.name = node.id.name;
        componentInfo.type = 'Class';
        extractClassComponentInfo(node, componentInfo, code);
      }
    },

    // Hook 调用
    CallExpression: ({ node }) => {
      if (node.loc) {
        const callee = node.callee;
        if (callee?.type === 'Identifier' && 
            callee.name?.startsWith('use') &&
            !isInsideHelper(node)) {
          
          componentInfo.hooks.push({
            name: callee.name,
            line: node.loc.start.line,
            source: getLine(code, node.loc.start.line)
          });
        }
      }
    },

    // JSX 元素
    JSXElement: ({ node }) => {
      if (node.loc) {
        const opening = node.openingElement;
        componentInfo.jsxElements.push({
          tag: opening.name?.name || opening.name?.type,
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
 * 判断节点是否在工具函数中
 */
function isInsideHelper(node) {
  let current = node.parent;
  while (current) {
    if (current.type === 'FunctionDeclaration' || 
        current.type === 'FunctionExpression' || 
        current.type === 'ArrowFunctionExpression') {
      // 检查函数名（如果是变量声明）
      const name = current.id?.name || 
                   (current.type === 'ArrowFunctionExpression' && current.parent?.id?.name);
      if (name && /^[a-z_]/.test(name)) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

/**
 * 提取箭头函数组件信息
 */
function extractArrowFuncComponentInfo(arrowFunc, info, code) {
  // 提取 Props
  if (arrowFunc.params?.[0]?.type === 'ObjectPattern') {
    arrowFunc.params[0].properties.forEach(prop => {
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
  
  // 提取 Hooks
  babelTraverse(arrowFunc, {
    CallExpression: ({ node }) => {
      if (node.loc) {
        const callee = node.callee;
        if (callee?.type === 'Identifier' && callee.name?.startsWith('use')) {
          info.hooks.push({
            name: callee.name,
            line: node.loc.start.line
          });
        }
      }
    },
    VariableDeclaration: ({ node }) => {
      const init = node.declarations[0]?.init;
      if (init?.type === 'CallExpression' && init.callee?.type === 'Identifier' && 
          init.callee.name?.startsWith('use')) {
        const hookName = init.callee.name;
        if (hookName === 'useState') {
          info.state.push({
            name: node.declarations[0].id?.name,
            type: 'state',
            hook: 'useState'
          });
        } else if (hookName === 'useEffect') {
          info.state.push({ name: 'useEffect', type: 'effect' });
        }
      }
    }
  });
}

/**
 * 提取函数声明组件信息
 */
function extractFunctionComponentInfo(node, info, code) {
  if (node.params?.length > 0) {
    node.params.forEach(param => {
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
  
  // 提取 Hooks
  babelTraverse(node.body, {
    CallExpression: ({ node }) => {
      if (node.loc) {
        const callee = node.callee;
        if (callee?.type === 'Identifier' && callee.name?.startsWith('use')) {
          info.hooks.push({
            name: callee.name,
            line: node.loc.start.line
          });
        }
      }
    },
    VariableDeclaration: ({ node }) => {
      const init = node.declarations[0]?.init;
      if (init?.type === 'CallExpression' && init.callee?.type === 'Identifier' && 
          init.callee.name?.startsWith('use')) {
        const hookName = init.callee.name;
        if (hookName === 'useState') {
          info.state.push({
            name: node.declarations[0].id?.name,
            type: 'state'
          });
        }
      }
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

/**
 * 提取类组件信息
 */
function extractClassComponentInfo(node, info, code) {
  babelTraverse(node, {
    ClassMethod: ({ node: methodNode }) => {
      if (methodNode.key?.name === 'render') {
        info.methods.push({
          name: 'render',
          type: 'class',
          line: methodNode.loc?.start?.line
        });
      }
    }
  });
}

/**
 * 辅助函数
 */
function getLine(code, lineNum) {
  const lines = code.split('\n');
  return lines[lineNum - 1] || '';
}

module.exports = {
  parseReactCode,
  analyzeDirectory: async function() {
    throw new Error('Use full version');
  }
};
