/**
 * PPT 生成主入口
 * 将 React 组件信息转换为 PPT 演示文稿
 */
const { createPresentation } = require('./layout');
const slideGenerators = require('./slide-factory');
const parser = require('../../src/parser');
const fs = require('fs');
const path = require('path');

/**
 * 生成完整的 PPT 演示文稿
 * @param {Object} componentInfo - 组件信息（来自 parser）
 * @param {Object} options - 配置选项
 * @returns {pptxgen} 生成的演示文稿对象
 */
function generatePPT(componentInfo, options = {}) {
  // 使用绝对路径加载配置
  const configPath = path.resolve(__dirname, '../../react-to-ppt/config/default.json');
  const config = slideGenerators.loadConfig(configPath);
  
  const { pres } = slideGenerators.createPresentation(componentInfo, config);
  
  // 检查应该创建哪些页面
  const pagesToCreate = options.pages || config.pages || ['cover', 'code', 'structure', 'props', 'hooks', 'summary'];
  
  // 根据组件信息决定页面
  if (componentInfo.props && componentInfo.props.length > 0 && pagesToCreate.includes('props')) {
    slideGenerators.createPropsSlide(pres, componentInfo, config);
  }
  
  if (componentInfo.hooks && componentInfo.hooks.length > 0 && pagesToCreate.includes('hooks')) {
    slideGenerators.createHooksSlide(pres, componentInfo, config);
  }
  
  if (componentInfo.jsxElements && componentInfo.jsxElements.length > 0 && pagesToCreate.includes('structure')) {
    slideGenerators.createStructureSlide(pres, componentInfo, config);
  }
  
  if (componentInfo.code && pagesToCreate.includes('code')) {
    slideGenerators.createCodeSlide(pres, componentInfo, config);
  }
  
  // 总结页总是创建
  if (pagesToCreate.includes('summary')) {
    slideGenerators.createSummarySlide(pres, componentInfo, config);
  }
  
  return pres;
}

/**
 * 保存 PPT 到文件
 */
async function savePPT(pres, outputPath) {
  try {
    await pres.writeFile({ fileName: outputPath });
    console.log(`✅ PPT 已保存至: ${outputPath}`);
    return true;
  } catch (err) {
    console.error('❌ 保存 PPT 失败:', err.message);
    return false;
  }
}

/**
 * 主处理函数 - 接收 React 代码路径或源码，生成 PPT
 */
async function processReactFile(input, output, options = {}) {
  const fsProm = fs.promises;
  const parserModule = parser;
  
  let componentInfo;
  let sourceCode;
  
  // 判断输入是文件路径还是源码字符串
  if (typeof input === 'string' && fsProm.existsSync(input)) {
    // 读取文件
    sourceCode = await fsProm.readFile(input, 'utf-8');
    componentInfo = parserModule.parseReactCode(sourceCode);
    componentInfo.filePath = input;
    componentInfo.code = sourceCode; // 保存源码用于展示
  } else if (typeof input === 'string' && (input.includes('import ') || 
             input.includes('function ') || input.includes('React'))) {
    // 源码字符串
    sourceCode = input;
    componentInfo = parserModule.parseReactCode(sourceCode);
    componentInfo.code = sourceCode;
  } else {
    throw new Error('输入必须是有效的 React 文件路径或源码');
  }
  
  // 生成 PPT
  const pres = generatePPT(componentInfo, options);
  
  // 确定输出路径
  let outputPath = output;
  if (!outputPath) {
    const safeName = componentInfo.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    outputPath = path.join(process.cwd(), `${safeName}_presentation.pptx`);
  }
  
  // 保存文件
  const success = await savePPT(pres, outputPath);
  
  if (success) {
    return {
      success: true,
      filePath: outputPath,
      componentName: componentInfo.name,
      stats: {
        props: componentInfo.props?.length || 0,
        hooks: componentInfo.hooks?.length || 0,
        jsxElements: componentInfo.jsxElements?.length || 0
      }
    };
  } else {
    throw new Error('PPT 生成失败');
  }
}

module.exports = {
  generatePPT,
  savePPT,
  processReactFile
};
