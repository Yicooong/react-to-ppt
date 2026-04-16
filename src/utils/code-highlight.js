/**
 * 代码高亮工具 - 支持语法着色
 */
const hljs = require('highlight.js');

/**
 * 使用 highlight.js 高亮代码
 */
function highlightCode(code, language = 'jsx', theme = 'atom-one-dark') {
  try {
    // 注册常用语言
    hljs.registerLanguage('jsx', require('highlight.js/lib/languages/javascript'));
    
    const highlighted = hljs.highlight(code, { language });
    return {
      value: highlighted.value,
      language: highlighted.language
    };
  } catch (err) {
    console.warn('高亮失败，返回原始代码:', err.message);
    return { value: code, language };
  }
}

/**
 * 为 PPT 文本添加简单颜色标记（用于自定义渲染）
 * 这个简化版本仅返回文本，实际渲染由 PPT 库决定
 */
function colorizeCode(code, colors = {}) {
  // 简化：返回纯文本，不进行复杂着色
  // 实际项目中可使用 tokenizer 将代码分割为带颜色信息的片段
  return code;
}

module.exports = {
  highlightCode,
  colorizeCode
};
