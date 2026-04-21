import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import WebSocket from 'ws';
import { SignalingServer } from './services/signaling';
import { FFmpegProcessor } from './utils/ffmpeg-processor';
import { createLogger } from './utils/logger';
import { config } from './utils/config';

const logger = createLogger('Server');

// 初始化 Express 应用
const app: Express = express();
const server = createServer(app);

// 配置
const PORT = config.port;
const RECORDINGS_DIR = path.resolve(config.recordingsDir);

// 确保录制目录存在
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  logger.info('创建录制目录:', RECORDINGS_DIR);
}

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 初始化信令服务器
const signalingServer = new SignalingServer(PORT);
const wsServer = signalingServer.getServer();

// 初始化 FFmpeg 处理器
const ffmpegProcessor = new FFmpegProcessor(RECORDINGS_DIR);

// 设置录制回调
signalingServer.setOnRecordingStop(async (clientId: string) => {
  logger.info(`处理录制文件: ${clientId}`);
  // 这里可以添加 FFmpeg 后处理逻辑
});

// WebSocket 升级处理
server.on('upgrade', (request: any, socket: any, head: any) => {
  wsServer.handleUpgrade(request, socket, head, (ws: WebSocket) => {
    wsServer.emit('connection', ws, request);
  });
});

// API 路由

/**
 * 获取录制列表
 */
app.get('/api/recordings', (_req: Request, res: Response) => {
  fs.readdir(RECORDINGS_DIR, (err, files) => {
    if (err) {
      logger.error('读取录制目录失败:', err);
      return res.status(500).json({ 
        success: false, 
        error: '无法读取录制文件' 
      });
    }
    
    // 过滤只保留录制文件
    const recordings = files.filter(file => 
      file.endsWith('.webm') || 
      file.endsWith('.mp4') || 
      file.endsWith('.wav')
    );
    
    res.json({ 
      success: true, 
      data: { recordings } 
    });
  });
});

/**
 * 下载录制文件
 */
app.get('/api/recordings/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  
  // 安全检查：防止路径遍历
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ 
      success: false, 
      error: '无效的文件名' 
    });
  }
  
  const filePath = path.join(RECORDINGS_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, filename);
  } else {
    res.status(404).json({ 
      success: false, 
      error: '文件不存在' 
    });
  }
});

/**
 * 删除录制文件
 */
app.delete('/api/recordings/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  
  // 安全检查
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ 
      success: false, 
      error: '无效的文件名' 
    });
  }
  
  const filePath = path.join(RECORDINGS_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    logger.info('删除录制文件:', filename);
    res.json({ 
      success: true, 
      message: '文件已删除' 
    });
  } else {
    res.status(404).json({ 
      success: false, 
      error: '文件不存在' 
    });
  }
});

/**
 * 获取视频元数据
 */
app.get('/api/metadata/:filename', async (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(RECORDINGS_DIR, filename);
  
  try {
    const metadata = await ffmpegProcessor.getMetadata(filePath);
    res.json({
      success: true,
      data: {
        format: metadata.format.format,
        duration: metadata.format.duration,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        video: metadata.streams.find(s => s.codec_type === 'video'),
        audio: metadata.streams.find(s => s.codec_type === 'audio')
      }
    });
  } catch (error) {
    logger.error('获取元数据失败:', error);
    res.status(500).json({
      success: false,
      error: '无法获取视频元数据'
    });
  }
});

/**
 * 转码视频
 */
app.post('/api/transcode', async (req: Request, res: Response) => {
  const { inputFile, outputFile, options } = req.body;
  
  if (!inputFile || !outputFile) {
    return res.status(400).json({
      success: false,
      error: '缺少必需参数'
    });
  }
  
  const inputPath = path.join(RECORDINGS_DIR, inputFile);
  const outputPath = path.join(RECORDINGS_DIR, outputFile);
  
  try {
    await ffmpegProcessor.transcode(inputPath, outputPath, options);
    res.json({
      success: true,
      message: '转码完成',
      data: { outputFile }
    });
  } catch (error) {
    logger.error('转码失败:', error);
    res.status(500).json({
      success: false,
      error: '转码失败'
    });
  }
});

/**
 * 生成缩略图
 */
app.post('/api/thumbnails', async (req: Request, res: Response) => {
  const { filename, count, size } = req.body;
  
  if (!filename) {
    return res.status(400).json({
      success: false,
      error: '缺少文件名'
    });
  }
  
  const inputPath = path.join(RECORDINGS_DIR, filename);
  const outputDir = path.join(RECORDINGS_DIR, 'thumbnails');
  
  try {
    await ffmpegProcessor.generateThumbnails(inputPath, outputDir, {
      count: count || 5,
      size: size || '320x240'
    });
    res.json({
      success: true,
      message: '缩略图生成完成'
    });
  } catch (error) {
    logger.error('生成缩略图失败:', error);
    res.status(500).json({
      success: false,
      error: '生成缩略图失败'
    });
  }
});

/**
 * 健康检查
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      clients: signalingServer.getClientCount(),
      recordings: signalingServer.getRecordingCount(),
      memory: process.memoryUsage()
    }
  });
});

// 启动服务器
server.listen(PORT, () => {
  logger.info(`🚀 服务器运行在 http://localhost:${PORT}`);
  logger.info(`📁 录制文件目录: ${RECORDINGS_DIR}`);
  logger.info(`🌐 环境: ${config.nodeEnv}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，开始关闭服务器...');
  
  signalingServer.close();
  
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，开始关闭服务器...');
  
  signalingServer.close();
  
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

// 错误处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('未处理的 Promise 拒绝:', reason);
});

export { app, server };
