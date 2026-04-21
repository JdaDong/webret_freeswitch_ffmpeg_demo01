import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { FreeSWITCHConfig, FreeSWITCHChannelInfo } from '../types';

// 注意: freeswitch-esl 包可能没有类型定义，我们需要自行声明
// @ts-ignore
import ESL from 'freeswitch-esl';

const logger = createLogger('FreeSWITCH');

export class FreeSwitchManager extends EventEmitter {
  private config: FreeSWITCHConfig;
  private connection: any = null;
  private isConnected: boolean = false;

  constructor(config: FreeSWITCHConfig) {
    super();
    this.config = config;
  }

  /**
   * 连接到 FreeSWITCH ESL
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`连接 FreeSWITCH: ${this.config.host}:${this.config.port}`);

      try {
        this.connection = new ESL.Connection(
          this.config.host,
          this.config.port,
          this.config.password,
          () => {
            logger.info('FreeSWITCH ESL 已连接');
            this.isConnected = true;
            this.connection.subscribe('all');
            this.setupEventHandlers();
            resolve();
          }
        );

        this.connection.on('error', (error: Error) => {
          logger.error('FreeSWITCH 连接错误:', error.message);
          this.isConnected = false;
          reject(error);
        });

        // 设置超时
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('FreeSWITCH 连接超时'));
          }
        }, 10000);
      } catch (error) {
        logger.error('FreeSWITCH 连接失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.connection.on('esl::event::**', (event: any) => {
      this.handleEvent(event);
    });
  }

  /**
   * 处理 FreeSWITCH 事件
   */
  private handleEvent(event: any): void {
    const eventName = event.getHeader('Event-Name');
    logger.debug('FreeSWITCH 事件:', eventName);

    switch (eventName) {
      case 'CHANNEL_CREATE':
        this.emit('channelCreate', {
          uuid: event.getHeader('Unique-ID'),
          callerId: event.getHeader('Caller-Caller-ID-Number'),
          destination: event.getHeader('Caller-Destination-Number')
        });
        break;

      case 'CHANNEL_ANSWER':
        this.emit('channelAnswer', {
          uuid: event.getHeader('Unique-ID'),
          callerId: event.getHeader('Caller-Caller-ID-Number')
        });
        break;

      case 'CHANNEL_HANGUP':
        this.emit('channelHangup', {
          uuid: event.getHeader('Unique-ID'),
          cause: event.getHeader('Hangup-Cause')
        });
        break;

      case 'CHANNEL_BRIDGE':
        this.emit('channelBridge', {
          uuid: event.getHeader('Unique-ID'),
          bridgeUUID: event.getHeader('Bridge-UUID')
        });
        break;

      case 'RECORD_START':
        this.emit('recordStart', {
          uuid: event.getHeader('Unique-ID'),
          filename: event.getHeader('Recording-File')
        });
        break;

      case 'RECORD_STOP':
        this.emit('recordStop', {
          uuid: event.getHeader('Unique-ID'),
          filename: event.getHeader('Recording-File')
        });
        break;
    }
  }

  /**
   * 发起呼叫
   */
  async originate(destination: string, extension: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('FreeSWITCH 未连接'));
        return;
      }

      const command = `originate ${destination} ${extension}`;
      logger.info('发起呼叫:', command);

      this.connection.bgapi(command, (result: any) => {
        const replyText = result.getHeader('Reply-Text');
        if (replyText.includes('+OK')) {
          const jobUUID = replyText.split(' ')[1];
          logger.info('呼叫已发起:', jobUUID);
          resolve(jobUUID);
        } else {
          logger.error('呼叫失败:', replyText);
          reject(new Error('呼叫失败'));
        }
      });
    });
  }

  /**
   * 开始录音
   */
  async startRecording(uuid: string, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('FreeSWITCH 未连接'));
        return;
      }

      const command = `uuid_record ${uuid} start ${filename}`;
      logger.info('开始录音:', command);

      this.connection.api(command, (result: any) => {
        const replyText = result.getHeader('Reply-Text');
        if (replyText.includes('+OK')) {
          logger.info('录音已开始:', filename);
          resolve(filename);
        } else {
          logger.error('录音失败:', replyText);
          reject(new Error('录音失败'));
        }
      });
    });
  }

  /**
   * 停止录音
   */
  async stopRecording(uuid: string, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('FreeSWITCH 未连接'));
        return;
      }

      const command = `uuid_record ${uuid} stop ${filename}`;
      logger.info('停止录音:', command);

      this.connection.api(command, (result: any) => {
        const replyText = result.getHeader('Reply-Text');
        if (replyText.includes('+OK')) {
          logger.info('录音已停止:', filename);
          resolve(filename);
        } else {
          logger.error('停止录音失败:', replyText);
          reject(new Error('停止录音失败'));
        }
      });
    });
  }

  /**
   * 获取活动通道列表
   */
  async getChannels(): Promise<FreeSWITCHChannelInfo[]> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('FreeSWITCH 未连接'));
        return;
      }

      this.connection.api('show channels', (result: any) => {
        const channels: FreeSWITCHChannelInfo[] = [];
        const body = result.getBody();
        
        // 解析通道信息（简单实现）
        const lines = body.split('\n');
        for (const line of lines) {
          if (line.includes('|')) {
            const parts = line.split('|');
            if (parts.length >= 5) {
              channels.push({
                uuid: parts[0],
                callerId: parts[1],
                destination: parts[2],
                state: parts[3],
                duration: parseInt(parts[4], 10) || 0
              });
            }
          }
        }
        
        resolve(channels);
      });
    });
  }

  /**
   * 执行 FreeSWITCH API 命令
   */
  async executeApi(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('FreeSWITCH 未连接'));
        return;
      }

      this.connection.api(command, (result: any) => {
        resolve(result.getBody());
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.connection) {
      this.connection.disconnect();
      this.isConnected = false;
      logger.info('FreeSWITCH ESL 已断开');
    }
  }

  /**
   * 检查连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default FreeSwitchManager;
