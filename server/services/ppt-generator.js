'use strict';

/**
 * PPT Generator 服务
 * 封装现有的 react-to-ppt
 核心逻辑，提供 API 调用接口
 支持两种模式：
   1. Content 模式：LLM 生成的幻灯片内容组件（含 slidesData）→ 真实内容 PPT
   2. Analysis 模式：普通 React 组件 → 代码分析报告 PPT
 */

const fs = require('fs');
const path = require('path');
const { PPTXService } = require('./pptx-service');

class PPTGeneratorService {
  constructor() {
    this.initialized = false;
    this._init();
  }

  _init() {
    try {
      this.pptxService = new PPTXService();
      this.initialized = true;
      console.log('✅ PPT Generator 初始化完成');
    } catch (err) {
      console.error('❌ PPT Generator 加载失败:', err.message);
      this.initialized = false;
    }
  }

  /**
   * 解析代码，检测是否包含 slidesData（内容型幻灯片）
   */
  _detectContentSlides(jsxCode) {
    try {
      // 查找 const slidesData = [...] 或 const slides = [...] 等模式
      const slidesPatterns = [
        /const\s+(slidesData|slides|slideData|contentSlides)\s*=\s*(\[[\s\S]*?\])/,
        /export\s+default\s+\w+[\s\S]*?const\s+(slidesData|slides|slideData|contentSlides)\s*=\s*(\[[\s\S]*?\])/
      ];

      for (const pattern of slidesPatterns) {
        const match = jsxCode.match(pattern);
        if (match) {
          const dataStr = match[2];
      try {
        // 智能转换为合法 JSON（仅转换对象属性，不碰 URL 中的冒号）
        // 策略：将单引号字符串 → 双引号；同时把 {key: 和 ,key: 替换为 {"key":
        let jsonReady = dataStr
          .replace(/'/g, '"'); // 单引号 → 双引号
        
        // 把属性名 "key:" 变成 "key":（仅当前面是 { 或 , 时）
        jsonReady = jsonReady.replace(/([{,\s])(\w+)\s*:/g, '$1"$2":');
        
        const slidesData = JSON.parse(jsonReady);
        if (Array.isArray(slidesData) && slidesData.length > 0) {
          return { type: 'content', slides: slidesData };
        }
      } catch (e) {
        // 解析失败，继续尝试下一个模式
      }
        }
      }
    } catch (err) {
      console.warn('检测 slidesData 时出错:', err.message);
    }
    return { type: 'analysis' };
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

    const detection = this._detectContentSlides(jsxCode);

    if (detection.type === 'content') {
      console.log(`🎬 检测到内容型幻灯片组件，生成内容 PPT (${detection.slides.length} 页)`);
      return this.pptxService.generateFromSlidesData(detection.slides, filename, options);
    } else {
      console.log(`🔍 未检测到幻灯片内容，使用代码分析模式生成 PPT`);
      return this.pptxService.generateFromCodeAnalysis(jsxCode, filename, options);
    }
  }
}

module.exports = {
  PPTGeneratorService
};
