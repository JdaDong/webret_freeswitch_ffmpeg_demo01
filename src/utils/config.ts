import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

export function loadConfig(): AppConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  return {
    port,
    nodeEnv,
    freeswitch: {
      host: process.env.FREESWITCH_HOST || 'localhost',
      port: parseInt(process.env.FREESWITCH_PORT || '8021', 10),
      password: process.env.FREESWITCH_PASSWORD || 'ClueCon'
    },
    recordingsDir: process.env.RECORDINGS_DIR || './recordings',
    maxRecordingSizeMB: parseInt(process.env.MAX_RECORDING_SIZE_MB || '500', 10),
    autoDeleteAfterDays: parseInt(process.env.AUTO_DELETE_AFTER_DAYS || '30', 10),
    ffmpegPath: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
    ffmpegPreset: process.env.FFMPEG_PRESET || 'fast',
    ffmpegCrf: parseInt(process.env.FFMPEG_CRF || '23', 10),
    wsPingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10),
    wsTimeout: parseInt(process.env.WS_TIMEOUT || '60000', 10)
  };
}

export const config = loadConfig();
