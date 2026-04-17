'use strict';

/**
 * PPT Generator 服务
 * 封装现有的 react-to-ppt 核心逻辑，提供 API 调用接口
 */

const fs = require('fs');
const path = require('path');

class PPTGeneratorService {
  constructor() {
    this.initialized = false;
    this._init();
  }

  _init() {
    try {
      // 导入现有的 parser 和 generator 模块
      // 注意路径：server/services/ppt-generator.js → 需要向上两级找到 src/
      const parserPath = path.join(__dirname, '../../src/parser');
      const generatorPath = path.join(__dirname, '../../src/generator');

      // 验证路径是否存在
      if (!fs.existsSync(parserPath)) {
        throw new Error(`Parser 模块不存在: ${parserPath}`);
      }
      if (!fs.existsSync(generatorPath)) {
        throw new Error(`Generator 模块不存在: ${generatorPath}`);
      }

      // 动态导入
      this.parser = require(parserPath);
      this.generator = require(generatorPath);

      this.initialized = true;
      console.log('✅ PPT Generator 初始化完成');
    } catch (err) {
      console.error('❌ PPT Generator 加载失败:', err.message);
      this.initialized = false;
    }
  }

  /**
   * 生成 PPT 文件（Buffer）
   * @param {string} jsxCode - React 源代码
   * @param {string} filename - 输出文件名（无扩展名）
   * @param {Object} options - 额外选项（覆盖默认配置）
   * @returns {Promise<Buffer>} PPTX 文件 Buffer
   */
  async generate(jsxCode, filename = 'presentation', options = {}) {
    if (!this.initialized) {
      throw new Error('PPT Generator 未初始化');
    }

    try {
      // 1. 解析代码
      let componentInfo;
      try {
        componentInfo = this.parser.parseReactCode(jsxCode);
      } catch (parseErr) {
        throw new Error(`代码解析失败: ${parseErr.message}`);
      }

      // 附加原始代码
      componentInfo.code = jsxCode;
      componentInfo.filePath = null;

      // 2. 生成 PPT（生成到临时文件或内存）
      // 使用 generator 的 processReactFile 逻辑，但输出到临时路径
      const tempDir = path.join(__dirname, '../../tmp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const outputPath = path.join(tempDir, `${filename || 'presentation'}_${Date.now()}.pptx`);

      // 调用 generator.processReactFile 生成文件（必须 await）
      await this.generator.processReactFile(jsxCode, outputPath, options);

      // 3. 读取生成的文件为 Buffer
      const buffer = fs.readFileSync(outputPath);

      // 可选：清理临时文件（保留一段时间用于调试）
      // setTimeout(() => fs.unlink(outputPath).catch(() => {}), 60000);

      return buffer;

    } catch (err) {
      console.error('❌ PPT 生成失败:', err.message);
      throw err;
    }
  }

  /**
   * 生成并立即清理临时文件
   * @param {string} jsxCode
   * @param {string} filename
   * @param {Object} options
   * @returns {Promise<Buffer>}
   */
  async generateAndCleanup(jsxCode, filename = 'presentation', options = {}) {
    const buffer = await this.generate(jsxCode, filename, options);

    // 清理临时文件（如果存在）
    const tempDir = path.join(__dirname, '../../tmp');
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      if (file.startsWith(filename || 'presentation')) {
        try {
          fs.unlinkSync(path.join(tempDir, file));
          console.log(`🗑 清理临时文件: ${file}`);
        } catch (_) {}
      }
    });

    return buffer;
  }

  /**
   * 组件预览（不生成 PPT，只解析）
   * @param {string} jsxCode
   * @returns {Promise<Object>} 组件信息摘要
   */
  async preview(jsxCode) {
    if (!this.initialized) {
      throw new Error('PPT Generator 未初始化');
    }

    try {
      const componentInfo = this.parser.parseReactCode(jsxCode);
      return {
        name: componentInfo.name,
        type: componentInfo.type,
        props: componentInfo.props || [],
        hooks: componentInfo.hooks || [],
        jsxElements: componentInfo.jsxElements || [],
        description: componentInfo.description || ''
      };
    } catch (err) {
      throw new Error(`代码预览失败: ${err.message}`);
    }
  }
}

// 单例导出
module.exports = new PPTGeneratorService();
