// WebRTC 配置
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// 全局变量
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let ws = null;
let clientId = null;
let isRecording = false;

// DOM 元素
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const callBtn = document.getElementById('callBtn');
const hangupBtn = document.getElementById('hangupBtn');
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const refreshRecordingsBtn = document.getElementById('refreshRecordingsBtn');
const wsIndicator = document.getElementById('wsIndicator');
const peerIndicator = document.getElementById('peerIndicator');
const wsStatus = document.getElementById('wsStatus');
const peerStatus = document.getElementById('peerStatus');
const clientIdEl = document.getElementById('clientId');
const recordingsList = document.getElementById('recordingsList');

// WebSocket 连接
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket 已连接');
    updateWSStatus(true);
  };
  
  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    console.log('收到消息:', data);
    
    switch (data.type) {
      case 'welcome':
        clientId = data.clientId;
        clientIdEl.textContent = clientId;
        break;
        
      case 'offer':
        await handleOffer(data);
        break;
        
      case 'answer':
        await handleAnswer(data);
        break;
        
      case 'ice-candidate':
        await handleIceCandidate(data);
        break;
        
      case 'recording-started':
        console.log('录制已开始:', data.filename);
        isRecording = true;
        updateRecordingButtons();
        break;
        
      case 'recording-stopped':
        console.log('录制已停止:', data.filename);
        isRecording = false;
        updateRecordingButtons();
        refreshRecordings();
        break;
        
      case 'peers-list':
        console.log('在线用户:', data.peers);
        break;
    }
  };
  
  ws.onclose = () => {
    console.log('WebSocket 已断开');
    updateWSStatus(false);
    setTimeout(connectWebSocket, 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error);
  };
}

// 更新 WebSocket 状态
function updateWSStatus(connected) {
  if (connected) {
    wsIndicator.classList.add('connected');
    wsIndicator.classList.remove('disconnected');
    wsStatus.textContent = '已连接';
  } else {
    wsIndicator.classList.remove('connected');
    wsIndicator.classList.add('disconnected');
    wsStatus.textContent = '未连接';
  }
}

// 更新 WebRTC 状态
function updatePeerStatus(connected) {
  if (connected) {
    peerIndicator.classList.add('connected');
    peerIndicator.classList.remove('disconnected');
    peerStatus.textContent = '已连接';
  } else {
    peerIndicator.classList.remove('connected');
    peerIndicator.classList.add('disconnected');
    peerStatus.textContent = '未连接';
  }
}

// 开启本地摄像头
async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true
    });
    
    localVideo.srcObject = localStream;
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    callBtn.disabled = false;
    startRecordBtn.disabled = false;
    
    console.log('本地流已启动');
  } catch (error) {
    console.error('无法访问摄像头:', error);
    alert('无法访问摄像头和麦克风，请检查权限设置');
  }
}

// 停止本地摄像头
function stopLocalStream() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
    localStream = null;
  }
  
  startBtn.disabled = false;
  stopBtn.disabled = true;
  callBtn.disabled = true;
  startRecordBtn.disabled = true;
  
  console.log('本地流已停止');
}

// 创建 Peer Connection
function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);
  
  // 添加本地流
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }
  
  // 监听远程流
  peerConnection.ontrack = (event) => {
    console.log('收到远程流');
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
    }
    remoteStream.addTrack(event.track);
  };
  
  // 监听 ICE 候选
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('发送 ICE 候选');
      sendMessage({
        type: 'ice-candidate',
        candidate: event.candidate,
        targetId: 'peer' // 简化示例，实际应用需要指定目标
      });
    }
  };
  
  // 监听连接状态
  peerConnection.onconnectionstatechange = () => {
    console.log('连接状态:', peerConnection.connectionState);
    updatePeerStatus(peerConnection.connectionState === 'connected');
    
    if (peerConnection.connectionState === 'connected') {
      hangupBtn.disabled = false;
    } else if (peerConnection.connectionState === 'disconnected' || 
               peerConnection.connectionState === 'failed') {
      hangupBtn.disabled = true;
      stopRecordBtn.disabled = true;
    }
  };
  
  return peerConnection;
}

// 发起通话
async function startCall() {
  try {
    createPeerConnection();
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    console.log('发送 Offer');
    sendMessage({
      type: 'offer',
      offer: offer,
      targetId: 'peer' // 简化示例
    });
    
    callBtn.disabled = true;
  } catch (error) {
    console.error('创建 Offer 失败:', error);
  }
}

// 处理 Offer
async function handleOffer(data) {
  try {
    createPeerConnection();
    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    console.log('发送 Answer');
    sendMessage({
      type: 'answer',
      answer: answer,
      targetId: data.fromId
    });
  } catch (error) {
    console.error('处理 Offer 失败:', error);
  }
}

// 处理 Answer
async function handleAnswer(data) {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    console.log('Answer 已设置');
  } catch (error) {
    console.error('处理 Answer 失败:', error);
  }
}

// 处理 ICE 候选
async function handleIceCandidate(data) {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    console.log('ICE 候选已添加');
  } catch (error) {
    console.error('添加 ICE 候选失败:', error);
  }
}

// 挂断
function hangup() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
    remoteVideo.srcObject = null;
    remoteStream = null;
  }
  
  updatePeerStatus(false);
  callBtn.disabled = false;
  hangupBtn.disabled = true;
  stopRecordBtn.disabled = true;
  
  console.log('通话已结束');
}

// 发送消息
function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    console.error('WebSocket 未连接');
  }
}

// 开始录制
function startRecording() {
  sendMessage({
    type: 'start-recording'
  });
  startRecordBtn.disabled = true;
}

// 停止录制
function stopRecording() {
  sendMessage({
    type: 'stop-recording'
  });
  stopRecordBtn.disabled = true;
  startRecordBtn.disabled = false;
}

// 更新录制按钮状态
function updateRecordingButtons() {
  if (isRecording) {
    startRecordBtn.disabled = true;
    stopRecordBtn.disabled = false;
  } else {
    startRecordBtn.disabled = false;
    stopRecordBtn.disabled = true;
  }
}

// 刷新录制列表
async function refreshRecordings() {
  try {
    const response = await fetch('/api/recordings');
    const data = await response.json();
    
    if (data.recordings && data.recordings.length > 0) {
      recordingsList.innerHTML = data.recordings.map(filename => `
        <div class="recording-item">
          <span>📹 ${filename}</span>
          <a href="/api/recordings/${filename}" download>下载</a>
        </div>
      `).join('');
    } else {
      recordingsList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">暂无录制文件</p>';
    }
  } catch (error) {
    console.error('获取录制列表失败:', error);
  }
}

// 事件监听
startBtn.addEventListener('click', startLocalStream);
stopBtn.addEventListener('click', stopLocalStream);
callBtn.addEventListener('click', startCall);
hangupBtn.addEventListener('click', hangup);
startRecordBtn.addEventListener('click', startRecording);
stopRecordBtn.addEventListener('click', stopRecording);
refreshRecordingsBtn.addEventListener('click', refreshRecordings);

// 页面加载时连接 WebSocket
window.addEventListener('load', () => {
  connectWebSocket();
  refreshRecordings();
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  if (peerConnection) {
    peerConnection.close();
  }
  if (ws) {
    ws.close();
  }
});
