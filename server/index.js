'use strict';

/**
 * React to PPT - Server API
 * 提供 LLM 代码生成和 PPT 转换的 HTTP 服务
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入服务
const { LLMService } = require('./services/llm-service');
const PPTGenerator = require('./services/ppt-generator');

// 导入路由（稍后创建）
// const generateRouter = require('./routes/generate');
// const convertRouter = require('./routes/convert');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ 中间件 ============

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '../frontend')));

// 请求日志
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============ 初始化服务 ============

let llmService = null;
let pptGenerator = null;

try {
  // 加载 LLM 配置
  const llmConfigPath = path.join(__dirname, 'config', 'llm.json');
  let llmConfig = {};
  if (fs.existsSync(llmConfigPath)) {
    llmConfig = JSON.parse(fs.readFileSync(llmConfigPath, 'utf-8'));
    console.log('✅ LLM 配置已加载:', Object.keys(llmConfig));
  } else {
    console.warn('⚠️  未找到 LLM 配置文件，请创建:', llmConfigPath);
  }

  llmService = new LLMService(llmConfig);
  pptGenerator = require('./services/ppt-generator');
  console.log('✅ 服务初始化完成');
} catch (err) {
  console.error('❌ 服务初始化失败:', err.message);
  process.exit(1);
}

// ============ API 路由 ============

/**
 * POST /api/generate
 * 使用自然语言生成 React 代码
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, provider, model } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: '缺少 prompt 参数'
      });
    }

    if (!llmService) {
      return res.status(500).json({
        success: false,
        error: 'LLM 服务未初始化'
      });
    }

    console.log(`🔧 生成代码 - Provider: ${provider || 'default'}`);

    const result = await llmService.generateCode(prompt, {
      provider: provider || 'stepfun',
      model
    });

    res.json({
      success: true,
      data: {
        code: result.code,
        raw: result.raw,
        provider: result.provider,
        model: result.model,
        prompt: result.prompt
      }
    });

  } catch (err) {
    console.error('❌ 代码生成失败:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.stack
    });
  }
});

/**
 * POST /api/convert
 * 将 React 代码转换为 PPT
 */
app.post('/api/convert', async (req, res) => {
  try {
    const { code, filename = 'presentation', options } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: '缺少 code 参数'
      });
    }

    if (!pptGenerator) {
      return res.status(500).json({
        success: false,
        error: 'PPT 生成器未初始化'
      });
    }

    console.log(`📊 生成 PPT - 文件名: ${filename}`);

    // 生成 PPT（返回 Buffer）
    const pptBuffer = await pptGenerator.generate(code, filename, options);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pptx"`);
    res.setHeader('Content-Length', pptBuffer.length);

    res.send(pptBuffer);

  } catch (err) {
    console.error('❌ PPT 生成失败:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/pipeline
 * 一键完成：自然语言 → React 代码 → PPT
 */
app.post('/api/pipeline', async (req, res) => {
  try {
    const { prompt, provider, model, filename } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: '缺少 prompt' });
    }

    console.log(`🔄 Pipeline 开始 - ${provider || 'stepfun'}`);

    // Step 1: 生成代码
    const codeResult = await llmService.generateCode(prompt, { provider, model });
    const code = codeResult.code;

    // Step 2: 生成 PPT
    const pptBuffer = await pptGenerator.generate(code, filename || 'generated', {});

    res.json({
      success: true,
      data: {
        code,
        provider: codeResult.provider,
        model: codeResult.model,
        filename: filename || 'generated.pptx',
        size: pptBuffer.length
      }
    });

  } catch (err) {
    console.error('❌ Pipeline 失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/providers
 * 获取可用的 LLM 提供商列表
 */
const providerNames = {
  stepfun: 'StepFun',
  openai: 'OpenAI',
  local: '本地模型',
  zhipu: '智谱 AI'
};

app.get('/api/providers', (req, res) => {
  const providers = [];
  if (llmService && llmService.instances) {
    Object.keys(llmService.instances).forEach(key => {
      providers.push({
        id: key,
        name: providerNames[key] || key,
        configured: llmService.instances[key].isConfigured()
      });
    });
  }
  res.json({ success: true, providers });
});

/**
 * GET /health
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      llm: !!llmService,
      ppt: !!pptGenerator
    }
  });
});

// ============ 错误处理 ============

app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
  });
});

// ============ 404 处理 ============

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path
  });
});

// ============ 启动服务器 ============

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('');
    console.log('🚀 React to PPT Server 已启动');
    console.log(`   🌐 前端页面: http://localhost:${PORT}`);
    console.log(`   🔌 API 地址: http://localhost:${PORT}/api`);
    console.log(`   📚 健康检查: http://localhost:${PORT}/health`);
    console.log('');
    console.log('可用端点:');
    console.log('  POST   /api/generate   - 自然语言生成 React 代码');
    console.log('  POST   /api/convert    - React 代码转 PPT');
    console.log('  POST   /api/pipeline   - 完整流程（推荐）');
    console.log('  GET    /api/providers  - 查看已配置的 LLM');
    console.log('  GET    /health         - 健康状态');
    console.log('');
  });
}

module.exports = app;
