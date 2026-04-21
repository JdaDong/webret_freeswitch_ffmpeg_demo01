# WebRTC + FreeSWITCH + FFmpeg Demo

## 🌟 JavaScript 版本 vs TypeScript 版本

本项目同时提供 **JavaScript** 和 **TypeScript** 两个版本：

### JavaScript 版本
- 文件：`server.js`、`app.js`、`ffmpeg-processor.js`
- 直接运行，无需编译
- 适合快速原型和简单场景

### TypeScript 版本 ⭐ (推荐)
- 文件：`src/server.ts`、`src-public/app.ts`、`src/`
- 完整的类型检查
- 更好的 IDE 支持和代码提示
- 适合生产环境

---

## TypeScript 版本

### 功能特性

- ✅ **完整的类型安全** - 所有类型定义在 `src/types/index.ts`
- ✅ **WebRTC 音视频通话** - 基于浏览器的实时音视频通信
- ✅ **WebSocket 信令** - 内置 TypeScript 信令服务器
- ✅ **FFmpeg 处理** - 强大的媒体处理工具类
- ✅ **FreeSWITCH 集成** - 可选的 FreeSWITCH ESL 连接
- ✅ **现代化 UI** - 美观的响应式界面
- ✅ **实时状态监控** - WebSocket 和 WebRTC 连接状态

### 项目结构 (TypeScript)

```
webrt_freeswitch_ffmpeg_demo01/
├── src/                          # TypeScript 源代码
│   ├── server.ts                 # 主服务器
│   ├── types/                    # 类型定义
│   │   └── index.ts             # 所有类型定义
│   ├── utils/                    # 工具类
│   │   ├── logger.ts            # 日志工具
│   │   ├── config.ts            # 配置管理
│   │   ├── helpers.ts           # 辅助函数
│   │   └── ffmpeg-processor.ts  # FFmpeg 处理器
│   └── services/                 # 服务层
│       ├── signaling.ts         # 信令服务器
│       └── freeswitch-manager.ts # FreeSWITCH 管理
├── src-public/                   # 前端 TypeScript
│   └── app.ts                   # 客户端 WebRTC
├── public/                       # 前端静态资源
│   └── index.html              # 页面 HTML
├── dist/                         # 编译输出（自动生成）
├── tsconfig.json                 # TypeScript 配置
├── package.json                  # 项目依赖
└── README.md                     # 文档
```

### 快速开始

#### 1. 安装依赖

```bash
npm install
```

#### 2. 编译 TypeScript

```bash
npm run build
```

#### 3. 启动服务器

```bash
npm start
```

#### 4. 开发模式（无需编译，直接运行）

```bash
npm run dev
```

### NPM 脚本

| 脚本 | 说明 |
|------|------|
| `npm run build` | 编译 TypeScript 到 `dist/` 目录 |
| `npm start` | 运行编译后的 JavaScript 代码 |
| `npm run dev` | 使用 ts-node 开发模式运行 |
| `npm run watch` | 监听文件变化自动编译 |
| `npm run clean` | 清理编译输出 |

### 类型定义

所有类型定义位于 `src/types/index.ts`：

```typescript
// WebRTC 类型
interface RTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

interface RTCSessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

// WebSocket 消息类型
type MessageType = 
  | 'welcome'
  | 'get-peers'
  | 'peers-list'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'peer-disconnected'
  | 'start-recording'
  | 'stop-recording'
  | 'recording-started'
  | 'recording-stopped'
  | 'error';

// FFmpeg 配置
interface FFmpegConfig {
  videoCodec: string;
  audioCodec: string;
  videoBitrate: string;
  audioBitrate: string;
  preset: string;
  crf: number;
}
```

### API 接口

#### 获取录制列表
```typescript
// GET /api/recordings
interface RecordingsResponse {
  success: boolean;
  data: {
    recordings: string[];
  };
}
```

#### 获取视频元数据
```typescript
// GET /api/metadata/:filename
interface MetadataResponse {
  success: boolean;
  data: {
    format: string;
    duration: number;
    size: number;
    bitrate: string;
    video: StreamInfo;
    audio: StreamInfo;
  };
}
```

#### 转码视频
```typescript
// POST /api/transcode
interface TranscodeRequest {
  inputFile: string;
  outputFile: string;
  options?: Partial<FFmpegConfig>;
}
```

### FFmpegProcessor 使用示例

```typescript
import { FFmpegProcessor } from './utils/ffmpeg-processor';

const processor = new FFmpegProcessor('./recordings');

// 转码
await processor.transcode('input.webm', 'output.mp4', {
  videoCodec: 'libx264',
  preset: 'fast',
  crf: 23
});

// 添加水印
await processor.addWatermark(
  'video.mp4',
  'watermark.png',
  'output.mp4',
  { x: 10, y: 10 }
);

// 生成缩略图
await processor.generateThumbnails('video.mp4', './thumbnails', {
  count: 10,
  size: '320x240'
});

// 提取音频
await processor.extractAudio('video.mp4', 'audio.mp3');

// 视频合并
await processor.mergeVideos(['v1.mp4', 'v2.mp4'], 'merged.mp4');

// 裁剪视频
await processor.trim('video.mp4', 'trimmed.mp4', '00:00:10', '00:00:30');

// 转换为 GIF
await processor.toGIF('video.mp4', 'output.gif', {
  startTime: '00:00:00',
  duration: '5',
  fps: 10,
  scale: 320
});

// 获取元数据
const metadata = await processor.getMetadata('video.mp4');
console.log('时长:', metadata.format.duration);
```

### FreeSWITCHManager 使用示例

```typescript
import { FreeSwitchManager } from './services/freeswitch-manager';

const fsManager = new FreeSwitchManager({
  host: 'localhost',
  port: 8021,
  password: 'ClueCon'
});

// 连接
await fsManager.connect();

// 监听事件
fsManager.on('channelAnswer', (data) => {
  console.log('通话已接通:', data.uuid);
});

fsManager.on('recordStart', (data) => {
  console.log('录音开始:', data.filename);
});

// 发起呼叫
const jobUUID = await fsManager.originate('user/1000', '&bridge(user/1001)');

// 开始录音
await fsManager.startRecording(uuid, '/tmp/recording.wav');

// 获取活动通道
const channels = await fsManager.getChannels();

// 断开连接
fsManager.disconnect();
```

### 信令服务器使用示例

```typescript
import { SignalingServer } from './services/signaling';

const signaling = new SignalingServer(3000);

// 设置录制回调
signaling.setOnRecordingStart((clientId) => {
  console.log('开始录制:', clientId);
});

signaling.setOnRecordingStop((clientId) => {
  console.log('停止录制:', clientId);
});

// 获取状态
console.log('客户端数:', signaling.getClientCount());
console.log('录制数:', signaling.getRecordingCount());
```

### 前端 TypeScript 使用示例

```typescript
// src-public/app.ts

// WebRTC 配置（类型安全）
const config: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// 使用正确的类型
let localStream: MediaStream | null = null;
let peerConnection: RTCPeerConnection | null = null;

// 完整的类型提示和检查
async function startCall(): Promise<void> {
  peerConnection = new RTCPeerConnection(config);
  
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection!.addTrack(track, localStream!);
    });
  }
  
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  
  sendMessage({
    type: 'offer',
    offer: peerConnection.localDescription,
    targetId: 'peer'
  });
}
```

### 编译配置

`tsconfig.json` 主要选项：

```json
{
  "compilerOptions": {
    "target": "ES2020",           // 编译目标
    "module": "commonjs",         // 模块系统
    "strict": true,               // 严格模式
    "noImplicitAny": true,        // 不允许隐式 any
    "strictNullChecks": true,     // 严格空检查
    "declaration": true,          // 生成 .d.ts
    "sourceMap": true,            // 生成 source map
    "outDir": "./dist"            // 输出目录
  }
}
```

### 开发工具

推荐使用 VS Code 并安装以下扩展：

- **TypeScript Hero** - TypeScript 代码辅助
- **ESLint** - 代码检查
- **Prettier** - 代码格式化

### 生产部署

1. **编译项目**
   ```bash
   npm run build
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件
   ```

3. **使用 PM2 运行**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name webrtc-demo
   pm2 save
   pm2 startup
   ```

4. **Nginx 配置**
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
   }
   ```

---

## JavaScript 版本

如果使用 JavaScript 版本，请参考：

- `server.js` - 主服务器
- `app.js` - 客户端脚本
- `ffmpeg-processor.js` - FFmpeg 处理
- `freeswitch-integration.js` - FreeSWITCH 集成

运行 JavaScript 版本：

```bash
node server.js
```

---

## 许可证

MIT License
# webret_freeswitch_ffmpeg_demo01
