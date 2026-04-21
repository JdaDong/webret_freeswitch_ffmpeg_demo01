// FreeSWITCH ESL 集成示例
// 如果需要集成 FreeSWITCH，可以使用以下代码

const esl = require('freeswitch-esl');

class FreeSwitchManager {
  constructor(host = 'localhost', port = 8021, password = 'ClueCon') {
    this.host = host;
    this.port = port;
    this.password = password;
    this.connection = null;
  }

  // 连接到 FreeSWITCH ESL
  async connect() {
    return new Promise((resolve, reject) => {
      this.connection = new esl.Connection(this.host, this.port, this.password, () => {
        console.log('FreeSWITCH ESL 已连接');
        this.connection.subscribe('all');
        resolve();
      });

      this.connection.on('error', (error) => {
        console.error('FreeSWITCH 连接错误:', error);
        reject(error);
      });

      this.connection.on('esl::event::**', (event) => {
        this.handleEvent(event);
      });
    });
  }

  // 处理 FreeSWITCH 事件
  handleEvent(event) {
    const eventName = event.getHeader('Event-Name');
    console.log('FreeSWITCH 事件:', eventName);

    switch (eventName) {
      case 'CHANNEL_CREATE':
        console.log('通道创建:', event.getHeader('Caller-Caller-ID-Number'));
        break;
      case 'CHANNEL_ANSWER':
        console.log('通话接通');
        break;
      case 'CHANNEL_HANGUP':
        console.log('通话挂断');
        break;
      case 'CUSTOM':
        // 处理自定义事件
        break;
    }
  }

  // 发起呼叫
  async originate(destination, extension) {
    return new Promise((resolve, reject) => {
      const command = `originate ${destination} ${extension}`;
      
      this.connection.bgapi(command, (result) => {
        if (result.getHeader('Reply-Text').includes('+OK')) {
          console.log('呼叫已发起');
          resolve(result);
        } else {
          console.error('呼叫失败');
          reject(new Error('呼叫失败'));
        }
      });
    });
  }

  // 开始录音
  async startRecording(uuid, filename) {
    return new Promise((resolve, reject) => {
      const command = `uuid_record ${uuid} start ${filename}`;
      
      this.connection.api(command, (result) => {
        if (result.getHeader('Reply-Text').includes('+OK')) {
          console.log('录音已开始:', filename);
          resolve(filename);
        } else {
          console.error('录音失败');
          reject(new Error('录音失败'));
        }
      });
    });
  }

  // 停止录音
  async stopRecording(uuid, filename) {
    return new Promise((resolve, reject) => {
      const command = `uuid_record ${uuid} stop ${filename}`;
      
      this.connection.api(command, (result) => {
        if (result.getHeader('Reply-Text').includes('+OK')) {
          console.log('录音已停止:', filename);
          resolve(filename);
        } else {
          console.error('停止录音失败');
          reject(new Error('停止录音失败'));
        }
      });
    });
  }

  // 获取活动通道
  async getChannels() {
    return new Promise((resolve, reject) => {
      this.connection.api('show channels', (result) => {
        const channels = result.getBody();
        resolve(channels);
      });
    });
  }

  // 断开连接
  disconnect() {
    if (this.connection) {
      this.connection.disconnect();
      console.log('FreeSWITCH ESL 已断开');
    }
  }
}

// 使用示例
async function initFreeSWITCH() {
  const fs = new FreeSwitchManager('localhost', 8021, 'ClueCon');
  
  try {
    await fs.connect();
    
    // 发起呼叫示例
    // await fs.originate('user/1000', '&bridge(user/1001)');
    
    // 开始录音示例
    // const uuid = 'channel-uuid';
    // await fs.startRecording(uuid, '/tmp/recording.wav');
    
    return fs;
  } catch (error) {
    console.error('FreeSWITCH 初始化失败:', error);
    throw error;
  }
}

module.exports = {
  FreeSwitchManager,
  initFreeSWITCH
};

/*
集成到主服务器：

在 server.js 中添加：

const { initFreeSWITCH } = require('./freeswitch-integration');

let freeswitchManager;

// 启动时初始化
initFreeSWITCH()
  .then(fs => {
    freeswitchManager = fs;
    console.log('FreeSWITCH 已集成');
  })
  .catch(error => {
    console.log('FreeSWITCH 不可用，使用内置信令服务器');
  });

// 在信令处理中使用
function handleSignaling(fromId, data) {
  if (freeswitchManager && data.type === 'call') {
    // 使用 FreeSWITCH 处理呼叫
    freeswitchManager.originate(data.destination, data.extension);
  } else {
    // 使用内置 WebRTC 信令
    // ... 现有代码
  }
}
*/
