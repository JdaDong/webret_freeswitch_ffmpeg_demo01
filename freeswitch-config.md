# FreeSWITCH 配置文件示例

## 本项目已经包含了基于 WebSocket 的信令服务器
## 如果需要集成 FreeSWITCH，请按以下步骤操作：

### 1. 安装 FreeSWITCH
```bash
# macOS
brew install freeswitch

# Ubuntu/Debian
apt-get install freeswitch

# CentOS/RHEL
yum install freeswitch
```

### 2. 配置 FreeSWITCH WebRTC 支持

在 FreeSWITCH 配置目录中编辑以下文件：

#### /etc/freeswitch/autoload_configs/verto.conf.xml
```xml
<configuration name="verto.conf" description="HTML5 Verto Endpoint">
  <settings>
    <param name="debug" value="10"/>
  </settings>
  <profiles>
    <profile name="default">
      <param name="bind-local" value="0.0.0.0:8081"/>
      <param name="secure-bind-local" value="0.0.0.0:8082"/>
      <param name="enable-text" value="true"/>
      <param name="enable-text-channel" value="true"/>
      
      <param name="userauth" value="true"/>
      <param name="root-password" value="password"/>
      
      <!-- 允许的域 -->
      <param name="apply-candidate-acl" value="any"/>
      <param name="apply-proxy-acl" value="any"/>
      
      <!-- STUN/TURN 服务器 -->
      <param name="ext-rtp-ip" value="auto"/>
      <param name="rtp-ip" value="auto"/>
    </profile>
  </profiles>
</configuration>
```

#### /etc/freeswitch/sip_profiles/internal.xml
```xml
<profile name="internal">
  <!-- 启用 WebRTC -->
  <param name="ws-binding" value=":5066"/>
  <param name="wss-binding" value=":7443"/>
  
  <!-- DTLS 证书 -->
  <param name="tls-cert-dir" value="$${certs_dir}"/>
  <param name="wss-tls-cert-dir" value="$${certs_dir}"/>
  
  <!-- RTP 设置 -->
  <param name="rtp-ip" value="auto"/>
  <param name="ext-rtp-ip" value="auto"/>
  <param name="disable-transcoding" value="true"/>
</profile>
```

### 3. 生成自签名证书（开发环境）
```bash
cd /etc/freeswitch/tls
openssl req -x509 -newkey rsa:4096 -keyout agent.pem -out agent.pem -days 365 -nodes
```

### 4. 启动 FreeSWITCH
```bash
freeswitch -nc -nonat
```

### 5. 连接到 FreeSWITCH
修改项目中的 WebSocket 连接地址：
```javascript
// 在 public/app.js 中
const wsUrl = 'wss://your-freeswitch-server:8082';
```

### 注意事项
- 生产环境必须使用有效的 SSL 证书
- 配置防火墙规则允许 WebRTC 所需端口
- 调整 RTP 端口范围以适应您的网络环境
- 考虑使用 TURN 服务器以支持 NAT 穿透
