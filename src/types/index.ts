// WebRTC 类型定义
export interface RTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface RTCSessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

// WebSocket 消息类型
export type MessageType = 
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

export interface WebSocketMessage {
  type: MessageType;
  [key: string]: unknown;
}

export interface WelcomeMessage extends WebSocketMessage {
  type: 'welcome';
  clientId: string;
}

export interface PeersListMessage extends WebSocketMessage {
  type: 'peers-list';
  peers: string[];
}

export interface OfferMessage extends WebSocketMessage {
  type: 'offer';
  offer: RTCSessionDescription;
  targetId: string;
  fromId?: string;
}

export interface AnswerMessage extends WebSocketMessage {
  type: 'answer';
  answer: RTCSessionDescription;
  targetId: string;
  fromId?: string;
}

export interface IceCandidateMessage extends WebSocketMessage {
  type: 'ice-candidate';
  candidate: RTCIceCandidate;
  targetId: string;
  fromId?: string;
}

export interface RecordingStartedMessage extends WebSocketMessage {
  type: 'recording-started';
  filename: string;
}

export interface RecordingStoppedMessage extends WebSocketMessage {
  type: 'recording-stopped';
  filename: string;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  message: string;
}

// 客户端连接类型
export interface ConnectedClient {
  id: string;
  ws: WebSocket;
  joinedAt: Date;
}

// 录制信息类型
export interface Recording {
  clientId: string;
  outputFile: string;
  startTime: Date;
}

// FFmpeg 配置类型
export interface FFmpegConfig {
  videoCodec: string;
  audioCodec: string;
  videoBitrate: string;
  audioBitrate: string;
  preset: string;
  crf: number;
}

export interface WatermarkPosition {
  x: number;
  y: number;
}

export interface ThumbnailOptions {
  count: number;
  size: string;
  timestamps?: string[];
}

export interface GIFOptions {
  startTime: string;
  duration: string;
  fps: number;
  scale: number;
}

// FreeSWITCH 类型定义
export interface FreeSWITCHConfig {
  host: string;
  port: number;
  password: string;
}

export interface FreeSWITCHChannelInfo {
  uuid: string;
  callerId: string;
  destination: string;
  state: string;
  duration: number;
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RecordingsResponse extends ApiResponse {
  data: {
    recordings: string[];
  };
}

// 环境变量类型
export interface AppConfig {
  port: number;
  nodeEnv: string;
  freeswitch: FreeSWITCHConfig;
  recordingsDir: string;
  maxRecordingSizeMB: number;
  autoDeleteAfterDays: number;
  ffmpegPath: string;
  ffmpegPreset: string;
  ffmpegCrf: number;
  wsPingInterval: number;
  wsTimeout: number;
}
