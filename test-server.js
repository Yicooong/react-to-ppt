#!/usr/bin/env node

/**
 * 测试脚本 - 验证 LLM 服务和 PPT 生成
 */

const path = require('path');
const fs = require('fs');

async function main() {
  // 测试 1: 导入 LLMService
  console.log('🔍 测试 LLMService 导入...');
  try {
    const LLMService = require('./server/services/llm-service');
    console.log('✅ LLMService 导入成功');
  } catch (err) {
    console.error('❌ LLMService 导入失败:', err.message);
    process.exit(1);
  }

  // 测试 2: 导入 PPTGenerator
  console.log('\n🔍 测试 PPTGenerator 导入...');
  let pptGen;
  try {
    pptGen = require('./server/services/ppt-generator');
    console.log('✅ PPTGenerator 导入成功');
    console.log('   初始化状态:', pptGen.initialized);
  } catch (err) {
    console.error('❌ PPTGenerator 导入失败:', err.message);
    process.exit(1);
  }

  // 测试 3: 解析示例代码
  console.log('\n🔍 测试代码解析...');
  try {
    const examplePath = path.join(__dirname, 'examples/Button.jsx');
    if (fs.existsSync(examplePath)) {
      const code = fs.readFileSync(examplePath, 'utf-8');
      const preview = await pptGen.preview(code);
      console.log('✅ 解析成功');
      console.log('   组件名:', preview.name);
      console.log('   Props 数量:', preview.props.length);
      console.log('   Hooks 数量:', preview.hooks.length);
    } else {
      console.log('⚠️  未找到示例文件，跳过解析测试');
    }
  } catch (err) {
    console.error('❌ 解析测试失败:', err.message);
  }

  // 测试 4: 生成 PPT（耗时操作）
  console.log('\n🔍 测试 PPT 生成...');
  try {
    const examplePath = path.join(__dirname, 'examples/Button.jsx');
    const code = fs.readFileSync(examplePath, 'utf-8');

    console.log('   开始生成 PPT...');
    const buffer = await pptGen.generate(code, 'test-output');

    console.log('✅ PPT 生成成功');
    console.log('   文件大小:', buffer.length, 'bytes');

    const outPath = path.join(__dirname, 'test-from-api.pptx');
    fs.writeFileSync(outPath, buffer);
    console.log('   已保存到:', outPath);
  } catch (err) {
    console.error('❌ PPT 生成失败:', err.message);
    console.error('   错误堆栈:', err.stack);
  }

  console.log('\n✨ 所有检查完成！');
}

main().catch(err => {
  console.error('❌ 测试脚本错误:', err.message);
  process.exit(1);
});
