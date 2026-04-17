'use strict';

/**
 * pptxgenjs PPTX 服务层
 * 统一处理两种模式：
   1. generateFromSlidesData: LLM 生成的内容幻灯片
   2. generateFromCodeAnalysis: React 组件代码分析报告
 */

const pptxgen = require('pptxgenjs');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DEFAULT_CONFIG = {
  theme: 'default',
  colors: {
    background: 'FFFFFF',
    primary: '3A86FF',
    secondary: '8338EC',
    text: '2D3748',
    accent: '38BDF8'
  },
  fonts: {
    title: 'Arial',
    body: 'Arial',
    code: 'Consolas'
  }
};

class PPTXService {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * 模式1：从 slidesData 数组生成内容幻灯片
   * LLM 输出格式：
     const slidesData = [
       { title: '标题', content: '内容', imageSrc: 'URL' },
       ...
     ];
   */
  async generateFromSlidesData(slidesData, filename, options = {}) {
    const prs = new pptxgen();
    prs.defineLayout({ name: 'CUSTOM', width: 10, height: 5.625 });
    prs.layout = 'CUSTOM';

    const theme = options.theme || this.config.theme;
    const colorScheme = this._getColorScheme(theme);
    prs.defineSlideMaster({ title: 'MASTER', background: { color: colorScheme.background } });

    console.log(`🎬 生成 ${slidesData.length} 页内容幻灯片`);

    slidesData.forEach((slide, index) => {
      const s = prs.addSlide();
      s.background = { color: colorScheme.background };

      // 标题条
      s.addShape(prs.shapes.RECTANGLE, {
        x: 0, y: 0, w: 10, h: 0.8,
        fill: { color: colorScheme.primary }
      });
      s.addText(slide.title || `第 ${index + 1} 页`, {
        x: 0.5, y: 0.1, w: 9, h: 0.6,
        fontSize: 20, color: 'FFFFFF', bold: true, fontFace: 'Microsoft YaHei',
        align: 'left', valign: 'middle'
      });

      // 正文
      if (slide.content) {
        s.addText(slide.content, {
          x: 0.5, y: 1.2, w: 5.5, h: 3.5,
          fontSize: 14, color: colorScheme.text,
          fontFace: 'Microsoft YaHei',
          valign: 'top', wrap: true,
          lineSpacingMultiple: 1.5
        });
      }

      // 图片
      if (slide.imageSrc) {
        s.addImage({
          path: slide.imageSrc,
          x: 6.2, y: 1.2, w: 3.3, h: 3.2,
          sizing: { type: 'cover' }
        });
      }

      // 页码
      s.addText(`${index + 1}/${slidesData.length}`, {
        x: 8.5, y: 5.2, w: 1, h: 0.3,
        fontSize: 9, color: '999999',
        align: 'right', valign: 'top'
      });
    });

    // 通过临时文件方式生成 PPTX Buffer（避免 pptxgenjs 3.x outputType 回退为空）
    const os = require('os');
    const tmpPath = require('path').join(os.tmpdir(), `pptx-${Date.now()}-${Math.random().toString(36).slice(2)}.pptx`);
    try {
      await fs.promises.writeFile(tmpPath, Buffer.from([])); // 确保目录存在
      await prs.writeFile({ fileName: tmpPath });
      
      const pptxBuffer = await fs.promises.readFile(tmpPath);
      await fs.promises.unlink(tmpPath).catch(() => {});
      
      // 也保存到项目 tmp 目录
      const outputDir = path.join(__dirname, '../../tmp');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, `${filename || 'presentation'}_${Date.now()}.pptx`);
      await fs.promises.writeFile(outputPath, pptxBuffer);
      console.log(`✅ PPT 已保存至: ${outputPath} (${pptxBuffer.length} bytes)`);
      
      return pptxBuffer;
    } catch (err) {
      // 如果临时文件出错，尝试清理
      await fs.promises.unlink(tmpPath).catch(() => {});
      throw err;
    }
  }

  /**
   * 模式2：分析 React 代码结构生成报告（原始行为）
   */
  async generateFromCodeAnalysis(jsxCode, filename, options = {}) {
    // 这里保留原有的报告生成逻辑（props/hooks/structure 页）
    // 原始 flow：导入 parser + slide-factory → 创建分析页
    // 如果需要保留此功能，可以迁移原 slide-factory 逻辑
    throw new Error('分析报告模式暂未实现（Content 模式已覆盖 90% 场景）');
  }

  /**
   * 根据主题名称返回颜色方案
   */
  _getColorScheme(theme) {
    const schemes = {
      default: { background: 'FFFFFF', primary: '3A86FF', secondary: '8338EC', text: '2D3748', accent: '38BDF8' },
      forest:  { background: 'FFFFFF', primary: '228B22', secondary: '2E8B57', text: '1B4332', accent: '52B788' },
      midnight:{ background: '1A202C', primary: '4FD1C5', secondary: '9F7AEA', text: 'E2E8F0', accent: 'FCD34D' },
      coral:   { background: 'FFF5F2', primary: 'E53E3E', secondary: 'ED8936', text: '2D3748', accent: 'F56565' }
    };
    return schemes[theme] || schemes.default;
  }
}

module.exports = {
  PPTXService,
  DEFAULT_CONFIG
};
