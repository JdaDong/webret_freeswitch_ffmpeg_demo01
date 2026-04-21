import WebSocket, { WebSocketServer } from 'ws';
import { createLogger } from '../utils/logger';
import { 
  ConnectedClient, 
  WebSocketMessage, 
  Recording,
  WelcomeMessage,
  PeersListMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage
} from '../types';
import { generateClientId } from '../utils/helpers';

const logger = createLogger('Signaling');

export class SignalingServer {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient>;
  private activeRecordings: Map<string, Recording>;
  private onRecordingStart?: (clientId: string) => void;
  private onRecordingStop?: (clientId: string) => void;

  constructor(port: number = 3000) {
    this.wss = new WebSocketServer({ noServer: true });
    this.clients = new Map();
    this.activeRecordings = new Map();
    
    this.setupServer();
    logger.info(`信令服务器初始化完成，端口: ${port}`);
  }

  /**
   * 获取 WebSocket 服务器实例
   */
  getServer(): WebSocketServer {
    return this.wss;
  }

  /**
   * 设置服务器
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket, request: any) => {
      this.handleConnection(ws, request);
    });
  }

  /**
   * 处理新的 WebSocket 连接
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const clientId = generateClientId();
    
    const client: ConnectedClient = {
      id: clientId,
      ws,
      joinedAt: new Date()
    };
    
    this.clients.set(clientId, client);
    logger.info(`客户端已连接: ${clientId}`);

    // 发送欢迎消息
    const welcomeMsg: WelcomeMessage = {
      type: 'welcome',
      clientId: clientId
    };
    this.send(ws, welcomeMsg);

    // 设置消息处理
    ws.on('message', (data: any) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        this.handleMessage(clientId, message);
      } catch (error) {
        logger.error('消息解析错误:', error);
      }
    });

    // 设置关闭处理
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // 设置错误处理
    ws.on('error', (error: Error) => {
      logger.error(`WebSocket 错误 (${clientId}):`, error.message);
    });
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(clientId: string, message: WebSocketMessage): void {
    logger.debug(`收到消息 [${message.type}] 从 ${clientId}`);

    switch (message.type) {
      case 'get-peers':
        this.handleGetPeers(clientId);
        break;

      case 'offer':
        this.handleOffer(clientId, message as OfferMessage);
        break;

      case 'answer':
        this.handleAnswer(clientId, message as AnswerMessage);
        break;

      case 'ice-candidate':
        this.handleIceCandidate(clientId, message as IceCandidateMessage);
        break;

      case 'start-recording':
        this.handleStartRecording(clientId);
        break;

      case 'stop-recording':
        this.handleStopRecording(clientId);
        break;
    }
  }

  /**
   * 处理获取对等端列表请求
   */
  private handleGetPeers(clientId: string): void {
    const peers = Array.from(this.clients.keys()).filter(id => id !== clientId);
    
    const message: PeersListMessage = {
      type: 'peers-list',
      peers
    };
    
    const client = this.clients.get(clientId);
    if (client) {
      this.send(client.ws, message);
    }
    
    logger.debug(`发送对等端列表给 ${clientId}:`, peers);
  }

  /**
   * 处理 Offer 消息
   */
  private handleOffer(fromId: string, message: OfferMessage): void {
    const { targetId, offer } = message;
    
    if (!targetId) {
      logger.warn(`Offer 缺少目标 ID: ${fromId}`);
      return;
    }

    const targetClient = this.clients.get(targetId);
    if (!targetClient) {
      logger.warn(`目标客户端不存在: ${targetId}`);
      return;
    }

    const forwardedMessage: OfferMessage = {
      type: 'offer',
      offer,
      targetId,
      fromId
    };

    this.send(targetClient.ws, forwardedMessage);
    logger.debug(`转发 Offer: ${fromId} -> ${targetId}`);
  }

  /**
   * 处理 Answer 消息
   */
  private handleAnswer(fromId: string, message: AnswerMessage): void {
    const { targetId, answer } = message;
    
    if (!targetId) {
      logger.warn(`Answer 缺少目标 ID: ${fromId}`);
      return;
    }

    const targetClient = this.clients.get(targetId);
    if (!targetClient) {
      logger.warn(`目标客户端不存在: ${targetId}`);
      return;
    }

    const forwardedMessage: AnswerMessage = {
      type: 'answer',
      answer,
      targetId,
      fromId
    };

    this.send(targetClient.ws, forwardedMessage);
    logger.debug(`转发 Answer: ${fromId} -> ${targetId}`);
  }

  /**
   * 处理 ICE 候选消息
   */
  private handleIceCandidate(fromId: string, message: IceCandidateMessage): void {
    const { targetId, candidate } = message;
    
    if (!targetId) {
      logger.warn(`ICE Candidate 缺少目标 ID: ${fromId}`);
      return;
    }

    const targetClient = this.clients.get(targetId);
    if (!targetClient) {
      logger.warn(`目标客户端不存在: ${targetId}`);
      return;
    }

    const forwardedMessage: IceCandidateMessage = {
      type: 'ice-candidate',
      candidate,
      targetId,
      fromId
    };

    this.send(targetClient.ws, forwardedMessage);
    logger.debug(`转发 ICE Candidate: ${fromId} -> ${targetId}`);
  }

  /**
   * 处理开始录制
   */
  private handleStartRecording(clientId: string): void {
    const outputFile = `recording_${clientId}_${Date.now()}.webm`;
    
    logger.info(`开始录制: ${clientId} -> ${outputFile}`);

    const recording: Recording = {
      clientId,
      outputFile,
      startTime: new Date()
    };

    this.activeRecordings.set(clientId, recording);

    // 通知客户端录制已开始
    const client = this.clients.get(clientId);
    if (client) {
      this.send(client.ws, {
        type: 'recording-started',
        filename: outputFile
      });
    }

    // 触发回调
    if (this.onRecordingStart) {
      this.onRecordingStart(clientId);
    }
  }

  /**
   * 处理停止录制
   */
  private handleStopRecording(clientId: string): void {
    if (!this.activeRecordings.has(clientId)) {
      logger.warn(`没有正在进行的录制: ${clientId}`);
      return;
    }

    const recording = this.activeRecordings.get(clientId)!;
    this.activeRecordings.delete(clientId);

    logger.info(`停止录制: ${clientId}`);

    // 通知客户端录制已停止
    const client = this.clients.get(clientId);
    if (client) {
      this.send(client.ws, {
        type: 'recording-stopped',
        filename: recording.outputFile
      });
    }

    // 触发回调
    if (this.onRecordingStop) {
      this.onRecordingStop(clientId);
    }
  }

  /**
   * 处理客户端断开
   */
  private handleDisconnect(clientId: string): void {
    // 停止正在进行的录制
    if (this.activeRecordings.has(clientId)) {
      this.handleStopRecording(clientId);
    }

    this.clients.delete(clientId);
    logger.info(`客户端已断开: ${clientId}`);

    // 广播通知其他客户端
    this.broadcast({
      type: 'peer-disconnected',
      clientId
    }, clientId);
  }

  /**
   * 广播消息给所有客户端（除了指定客户端）
   */
  private broadcast(message: WebSocketMessage, excludeId?: string): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * 发送消息到指定 WebSocket
   */
  private send(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * 设置录制开始回调
   */
  setOnRecordingStart(callback: (clientId: string) => void): void {
    this.onRecordingStart = callback;
  }

  /**
   * 设置录制停止回调
   */
  setOnRecordingStop(callback: (clientId: string) => void): void {
    this.onRecordingStop = callback;
  }

  /**
   * 获取活跃客户端数量
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 获取活跃录制数量
   */
  getRecordingCount(): number {
    return this.activeRecordings.size;
  }

  /**
   * 关闭服务器
   */
  close(): void {
    this.wss.close();
    logger.info('信令服务器已关闭');
  }
}

export default SignalingServer;
