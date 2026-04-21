const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件服务
app.use(express.static('public'));
app.use(express.json());

// 创建录制目录
const recordingsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir);
}

// WebSocket 服务器用于信令
const wss = new WebSocket.Server({ noServer: true });

// 存储连接的客户端
const clients = new Map();

wss.on('connection', (ws, request) => {
  const clientId = generateClientId();
  clients.set(clientId, ws);
  
  console.log(`客户端已连接: ${clientId}`);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleSignaling(clientId, data);
    } catch (error) {
      console.error('消息解析错误:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`客户端已断开: ${clientId}`);
    
    // 通知其他客户端
    broadcast({
      type: 'peer-disconnected',
      clientId: clientId
    }, clientId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error);
  });
});

// 信令处理
function handleSignaling(fromId, data) {
  console.log(`收到信令 [${data.type}] 从 ${fromId}`);
  
  switch (data.type) {
    case 'offer':
    case 'answer':
    case 'ice-candidate':
      // 转发信令消息到目标客户端
      if (data.targetId && clients.has(data.targetId)) {
        const targetWs = clients.get(data.targetId);
        targetWs.send(JSON.stringify({
          ...data,
          fromId: fromId
        }));
      }
      break;
      
    case 'get-peers':
      // 返回在线客户端列表
      const peers = Array.from(clients.keys()).filter(id => id !== fromId);
      clients.get(fromId).send(JSON.stringify({
        type: 'peers-list',
        peers: peers
      }));
      break;
      
    case 'start-recording':
      startRecording(fromId, data);
      break;
      
    case 'stop-recording':
      stopRecording(fromId);
      break;
  }
}

// 广播消息
function broadcast(message, excludeId = null) {
  const messageStr = JSON.stringify(message);
  clients.forEach((ws, clientId) => {
    if (clientId !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

// FFmpeg 录制管理
const activeRecordings = new Map();

function startRecording(clientId, data) {
  const outputFile = path.join(recordingsDir, `recording_${clientId}_${Date.now()}.webm`);
  
  console.log(`开始录制: ${clientId} -> ${outputFile}`);
  
  // 这里是一个示例，实际应用中需要从 WebRTC 流中获取数据
  // 可以通过 WebSocket 接收音视频数据块，然后用 FFmpeg 处理
  
  const recording = {
    clientId: clientId,
    outputFile: outputFile,
    startTime: Date.now()
  };
  
  activeRecordings.set(clientId, recording);
  
  // 通知客户端录制已开始
  if (clients.has(clientId)) {
    clients.get(clientId).send(JSON.stringify({
      type: 'recording-started',
      filename: path.basename(outputFile)
    }));
  }
}

function stopRecording(clientId) {
  if (activeRecordings.has(clientId)) {
    const recording = activeRecordings.get(clientId);
    console.log(`停止录制: ${clientId}`);
    
    // 使用 FFmpeg 处理录制文件（转码、添加水印等）
    processRecording(recording);
    
    activeRecordings.delete(clientId);
    
    // 通知客户端录制已停止
    if (clients.has(clientId)) {
      clients.get(clientId).send(JSON.stringify({
        type: 'recording-stopped',
        filename: path.basename(recording.outputFile)
      }));
    }
  }
}

function processRecording(recording) {
  const inputFile = recording.outputFile;
  const outputFile = inputFile.replace('.webm', '_processed.mp4');
  
  console.log(`处理录制文件: ${inputFile}`);
  
  // FFmpeg 转码示例
  ffmpeg(inputFile)
    .outputOptions([
      '-c:v libx264',
      '-preset fast',
      '-crf 22',
      '-c:a aac',
      '-b:a 128k'
    ])
    .output(outputFile)
    .on('start', (cmd) => {
      console.log('FFmpeg 命令:', cmd);
    })
    .on('progress', (progress) => {
      console.log(`处理进度: ${progress.percent}%`);
    })
    .on('end', () => {
      console.log('处理完成:', outputFile);
    })
    .on('error', (err) => {
      console.error('FFmpeg 错误:', err);
    })
    .run();
}

// 生成客户端 ID
function generateClientId() {
  return 'client_' + Math.random().toString(36).substr(2, 9);
}

// API 端点
app.get('/api/recordings', (req, res) => {
  fs.readdir(recordingsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: '无法读取录制文件' });
    }
    res.json({ recordings: files });
  });
});

app.get('/api/recordings/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(recordingsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: '文件不存在' });
  }
});

// HTTP 服务器
const server = app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 升级 HTTP 连接到 WebSocket
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
