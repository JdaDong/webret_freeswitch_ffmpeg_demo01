# 测试指南

## 📖 目录

- [快速开始](#快速开始)
- [前置要求](#前置要求)
- [测试脚本使用](#测试脚本使用)
- [手动测试步骤](#手动测试步骤)
- [API 接口测试](#api-接口测试)
- [WebRTC 功能测试](#webrtc-功能测试)
- [FFmpeg 功能测试](#ffmpeg-功能测试)
- [常见问题](#常见问题)

---

## 🚀 快速开始

### 一键测试（推荐）

```bash
# 克隆项目后，直接运行测试脚本
chmod +x scripts/test.sh
./scripts/test.sh
```

这将自动完成：
1. ✅ 检查依赖（Node.js、npm、FFmpeg）
2. ✅ 安装 npm 依赖
3. ✅ TypeScript 类型检查
4. ✅ 启动服务器
5. ✅ 运行所有测试
6. ✅ 自动清理

---

## 📋 前置要求

### 必须安装

| 依赖 | 版本 | 安装命令 |
|------|------|----------|
| **Node.js** | ≥ 14.0.0 | [官网下载](https://nodejs.org/) |
| **npm** | ≥ 6.0.0 | 随 Node.js 一起安装 |
| **FFmpeg** | ≥ 4.0 | 见下方 |

### FFmpeg 安装

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**CentOS/RHEL:**
```bash
sudo yum install epel-release
sudo yum install ffmpeg
```

**Windows:**
```bash
# 使用 Chocolatey
choco install ffmpeg

# 或下载预编译包
# https://ffmpeg.org/download.html
```

### 验证安装

```bash
node -v    # 应该显示 v14+ 版本
npm -v     # 应该显示 6+ 版本
ffmpeg -version  # 应该显示 FFmpeg 版本信息
```

---

## 🧪 测试脚本使用

### 脚本位置
```
scripts/test.sh
```

### 使用方式

```bash
# 完整测试流程（默认）
./scripts/test.sh

# 开发模式启动
./scripts/test.sh dev

# 仅编译 TypeScript
./scripts/test.sh build

# 仅运行测试
./scripts/test.sh test

# 仅安装依赖
./scripts/test.sh install

# 显示帮助
./scripts/test.sh help
```

### 脚本输出示例

```
========================================
  WebRTC Demo 测试脚本
========================================

检测到操作系统: macos

[1/6] 检查依赖...
✓ Node.js: v18.17.0
✓ npm: 9.6.7
✓ FFmpeg: ffmpeg version 5.1

[2/6] 安装依赖...
✓ 依赖安装完成

[3/6] TypeScript 类型检查...
✓ TypeScript 类型检查通过

[4/6] 启动服务器...
等待服务器启动...
✓ 服务器已启动 (PID: 12345)

[5/6] 运行测试...
✓ 健康检查通过
✓ 录制列表 API 正常
✓ 主页可访问
✓ 测试完成

[6/6] 清理...
✓ 清理完成
```

---

## 🔧 手动测试步骤

### 1. 安装依赖

```bash
npm install
```

### 2. TypeScript 编译（如使用 TS 版本）

```bash
npm run build
```

### 3. 启动服务器

**生产模式：**
```bash
npm start
```

**开发模式：**
```bash
npm run dev
```

### 4. 验证服务器运行

打开浏览器访问：`http://localhost:3000`

应该看到 WebRTC Demo 界面。

---

## 🧬 API 接口测试

### 健康检查

```bash
curl http://localhost:3000/api/health
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 12345,
    "clients": 0,
    "recordings": 0,
    "memory": { "heapUsed": 123456, "heapTotal": 234567 }
  }
}
```

### 获取录制列表

```bash
curl http://localhost:3000/api/recordings
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "recordings": ["recording_xxx.webm", "recording_yyy.mp4"]
  }
}
```

### 获取视频元数据

```bash
curl http://localhost:3000/api/metadata/video.mp4
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "format": "mov,mp4,m4a,3gp,3g2,mj2",
    "duration": 120.5,
    "size": 5242880,
    "bitrate": "350000",
    "video": {
      "codec_name": "h264",
      "width": 1280,
      "height": 720
    },
    "audio": {
      "codec_name": "aac",
      "sample_rate": "48000"
    }
  }
}
```

### 转码视频 API

```bash
curl -X POST http://localhost:3000/api/transcode \
  -H "Content-Type: application/json" \
  -d '{
    "inputFile": "input.webm",
    "outputFile": "output.mp4",
    "options": {
      "videoCodec": "libx264",
      "preset": "fast",
      "crf": 23
    }
  }'
```

### 删除录制文件

```bash
curl -X DELETE http://localhost:3000/api/recordings/video.mp4
```

---

## 📡 WebSocket 测试

### 连接测试

使用 `websocat`（需要单独安装）：

```bash
# macOS
brew install websocat

# 连接 WebSocket
websocat ws://localhost:3000
```

### 发送测试消息

连接到 WebSocket 后，发送以下消息：

**1. 获取客户端 ID（自动接收）**
```json
{"type": "welcome", "clientId": "client_abc123"}
```

**2. 获取对等端列表**
```json
{"type": "get-peers"}
```

**响应：**
```json
{"type": "peers-list", "peers": ["client_xxx", "client_yyy"]}
```

**3. 发起通话（Offer）**
```json
{
  "type": "offer",
  "targetId": "目标客户端ID",
  "offer": {
    "type": "offer",
    "sdp": "v=0\\r\\no=..."
  }
}
```

**4. 接听通话（Answer）**
```json
{
  "type": "answer",
  "targetId": "发起方客户端ID",
  "answer": {
    "type": "answer",
    "sdp": "v=0\\r\\no=..."
  }
}
```

**5. 交换 ICE 候选**
```json
{
  "type": "ice-candidate",
  "targetId": "对方客户端ID",
  "candidate": {
    "candidate": "candidate:1 1 UDP 123 192.168.1.1 12345 typ host",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

**6. 开始录制**
```json
{"type": "start-recording"}
```

**响应：**
```json
{"type": "recording-started", "filename": "recording_client_xxx_1234567890.webm"}
```

**7. 停止录制**
```json
{"type": "stop-recording"}
```

**响应：**
```json
{"type": "recording-stopped", "filename": "recording_client_xxx_1234567890.webm"}
```

---

## 🎬 FFmpeg 功能测试

### 1. 转码测试

创建测试视频：
```bash
# 使用 FFmpeg 生成测试视频
ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 \
       -f lavfi -i sine=frequency=1000:duration=10 \
       -pix_fmt yuv420p -c:v libx264 -c:a aac \
       test_input.webm
```

运行转码 API（见上方 API 测试）

### 2. 缩略图生成

```bash
curl -X POST http://localhost:3000/api/thumbnails \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test_input.webm",
    "count": 5,
    "size": "320x240"
  }'
```

### 3. 命令行直接测试 FFmpegProcessor

```bash
# 进入项目目录
cd /path/to/project

# 启动 Node REPL
node

# 测试 FFmpegProcessor
const { FFmpegProcessor } = require('./dist/utils/ffmpeg-processor');
const processor = new FFmpegProcessor('./recordings');

processor.getMetadata('test_input.webm')
  .then(meta => {
    console.log('视频时长:', meta.format.duration);
    console.log('视频格式:', meta.format.format);
  })
  .catch(err => console.error('错误:', err));
```

---

## 🌐 浏览器端测试

### 测试清单

#### 1. 界面加载
- [ ] 主页正常加载
- [ ] CSS 样式正确显示
- [ ] 按钮可点击

#### 2. 摄像头测试
- [ ] 点击"开启摄像头"弹出权限请求
- [ ] 允许权限后本地视频显示
- [ ] 视频流畅无卡顿

#### 3. WebRTC 连接
- [ ] 打开两个浏览器窗口
- [ ] 在两个窗口中都开启摄像头
- [ ] 点击"发起通话"
- [ ] 观察远程视频是否有对方画面

#### 4. 录制功能
- [ ] 点击"开始录制"
- [ ] 通话一段时间
- [ ] 点击"停止录制"
- [ ] 点击"刷新录制列表"
- [ ] 检查是否有新录制文件

#### 5. 下载功能
- [ ] 在录制列表点击"下载"
- [ ] 确认文件可以正常下载
- [ ] 确认视频可以正常播放

---

## 🐛 常见问题

### Q1: 端口 3000 被占用

**错误信息：**
```
Error: listen EADDRINUSE :::3000
```

**解决方案：**
```bash
# 查找占用端口的进程
lsof -i :3000

# 停止该进程
kill -9 <PID>

# 或使用脚本自动处理
./scripts/test.sh
```

### Q2: FFmpeg 未安装

**错误信息：**
```
ffmpeg: command not found
```

**解决方案：**
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg
```

### Q3: TypeScript 编译错误

**错误信息：**
```
TSError: ⨯ Unable to compile TypeScript
```

**解决方案：**
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 重新编译
npm run build
```

### Q4: WebRTC 无法连接

**可能原因：**
- 浏览器不支持 WebRTC
- HTTPS required（生产环境）
- 防火墙阻止

**解决方案：**
- 使用 Chrome/Firefox/Safari 最新版
- 使用 localhost 而非 IP 地址
- 检查防火墙设置

### Q5: 摄像头权限被拒绝

**错误信息：**
```
NotAllowedError: Permission denied
```

**解决方案：**
- 浏览器设置中允许摄像头权限
- 使用 HTTPS 访问
- 检查系统隐私设置

---

## 📊 测试报告模板

```markdown
## 测试报告 - YYYY-MM-DD

### 测试环境
- 操作系统: macOS 13.x
- Node.js: v18.17.0
- npm: 9.6.7
- FFmpeg: 5.1
- 浏览器: Chrome 120.x

### 测试结果

| 功能 | 状态 | 备注 |
|------|------|------|
| 服务器启动 | ✅ 通过 | |
| API 健康检查 | ✅ 通过 | |
| 录制列表 API | ✅ 通过 | |
| WebSocket 连接 | ✅ 通过 | |
| 摄像头开启 | ✅ 通过 | |
| WebRTC 通话 | ✅ 通过 | |
| 录制功能 | ⚠️ 异常 | 偶发卡顿 |
| 文件下载 | ✅ 通过 | |

### 发现的问题
1. 弱网环境下有延迟
2. 大文件转码内存占用高

### 结论
✅ 可以进行下一步开发
```

---

## 🔗 相关链接

- [WebRTC 官方文档](https://webrtc.org/)
- [FFmpeg 文档](https://ffmpeg.org/documentation.html)
- [FreeSWITCH 文档](https://freeswitch.org/confluence/)
- [MDN WebRTC 指南](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)

---

**更新时间：2026-04-21**
