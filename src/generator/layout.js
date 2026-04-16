const pptxgen = require('pptxgenjs');
const path = require('path');

/**
 * 加载配置文件
 */
function loadConfig(configPath) {
  const fs = require('fs');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config;
    }
  } catch (err) {
    console.warn(`Failed to load config from ${configPath}:`, err.message);
  }
  return getDefaultConfig();
}

/**
 * 默认配置
 */
function getDefaultConfig() {
  return {
    theme: 'modern',
    layout: 'LAYOUT_16x9',
    author: 'React to PPT',
    colors: {
      primary: '1E2761',      // 深蓝
      secondary: 'CADCFC',    // 冰蓝
      accent: 'FFFFFF',       // 白色
      text: '363636',         // 深灰
      background: 'FFFFFF'    // 纯白背景
    },
    fonts: {
      title: 'Arial Black',
      body: 'Calibri',
      code: 'Consolas'
    },
    highlight: {
      theme: 'atom-one-dark',
      lineNumbers: false,
      fontSize: 10
    }
  };
}

/**
 * 主题颜色预设
 */
const themePresets = {
  midnight: {
    primary: '1E2761',
    secondary: 'CADCFC',
    accent: 'FFFFFF',
    background: '1E2761',
    text: 'FFFFFF'
  },
  coral: {
    primary: 'F96167',
    secondary: 'F9E795',
    accent: '2F3C7E',
    background: 'FFFFFF',
    text: '363636'
  },
  forest: {
    primary: '2C5F2D',
    secondary: '97BC62',
    accent: 'F5F5F5',
    background: 'FFFFFF',
    text: '363636'
  },
  modern: {
    primary: '028090',
    secondary: '00A896',
    accent: '02C39A',
    background: 'FFFFFF',
    text: '363636'
  }
};

/**
 * 创建 PptxGenJS 演示文稿实例
 */
function createPresentation(componentInfo, config = {}) {
  const fullConfig = { ...getDefaultConfig(), ...config };
  const colors = fullConfig.colors;
  
  const pres = new pptxgen();
  
  // 设置布局和元数据
  pres.layout = fullConfig.layout;
  pres.author = fullConfig.author;
  pres.title = componentInfo.name ? `${componentInfo.name} - React Component` : 'React Component Presentation';
  
  // 设置主题
  pres.theme = {
    name: 'Custom',
    colors: [colors.primary, colors.secondary, colors.accent, colors.text, colors.background],
    fonts: {
      major: { latin: fullConfig.fonts.title },
      minor: { latin: fullConfig.fonts.body },
      eastAsian: { jpan: '游明朝' }
    }
  };
  
  return { pres, config: fullConfig };
}

module.exports = {
  loadConfig,
  getDefaultConfig,
  themePresets,
  createPresentation
};
