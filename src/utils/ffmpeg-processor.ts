import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { createLogger } from './logger';
import { 
  FFmpegConfig, 
  WatermarkPosition, 
  ThumbnailOptions, 
  GIFOptions 
} from '../types';

const logger = createLogger('FFmpegProcessor');

export class FFmpegProcessor {
  private outputDir: string;

  constructor(outputDir: string = './recordings') {
    this.outputDir = outputDir;
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * 转码视频
   */
  async transcode(
    inputFile: string, 
    outputFile: string, 
    options: Partial<FFmpegConfig> = {}
  ): Promise<string> {
    const config: FFmpegConfig = {
      videoCodec: options.videoCodec || 'libx264',
      audioCodec: options.audioCodec || 'aac',
      videoBitrate: options.videoBitrate || '1000k',
      audioBitrate: options.audioBitrate || '128k',
      preset: options.preset || 'fast',
      crf: options.crf || 23
    };

    logger.info(`转码: ${inputFile} -> ${outputFile}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .videoCodec(config.videoCodec)
        .audioCodec(config.audioCodec)
        .videoBitrate(config.videoBitrate)
        .audioBitrate(config.audioBitrate)
        .outputOptions([
          `-preset ${config.preset}`,
          `-crf ${config.crf}`
        ])
        .output(outputFile)
        .on('start', (cmd: string) => {
          logger.debug('FFmpeg 命令:', cmd);
        })
        .on('progress', (progress: { percent?: number }) => {
          const percent = Math.round(progress.percent || 0);
          logger.debug(`转码进度: ${percent}%`);
        })
        .on('end', () => {
          logger.info('转码完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err: Error) => {
          logger.error('转码错误:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 添加水印
   */
  async addWatermark(
    inputFile: string, 
    watermarkFile: string, 
    outputFile: string, 
    position: WatermarkPosition = { x: 10, y: 10 }
  ): Promise<string> {
    logger.info(`添加水印: ${inputFile}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .input(watermarkFile)
        .complexFilter([
          `[1:v]scale=100:-1[watermark]`,
          `[0:v][watermark]overlay=${position.x}:${position.y}`
        ])
        .output(outputFile)
        .on('end', () => {
          logger.info('水印添加完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err: Error) => {
          logger.error('添加水印错误:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 提取音频
   */
  async extractAudio(inputFile: string, outputFile: string): Promise<string> {
    logger.info(`提取音频: ${inputFile} -> ${outputFile}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .output(outputFile)
        .on('end', () => {
          logger.info('音频提取完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err: Error) => {
          logger.error('提取音频错误:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 生成缩略图
   */
  async generateThumbnails(
    inputFile: string, 
    outputDir: string, 
    options: ThumbnailOptions = { count: 5, size: '320x240' }
  ): Promise<string> {
    logger.info(`生成缩略图: ${inputFile}`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputFile);
      
      if (options.timestamps) {
        command.screenshots({
          timestamps: options.timestamps,
          folder: outputDir,
          size: options.size,
          filename: 'thumbnail-%s.png'
        });
      } else {
        command.screenshots({
          count: options.count,
          folder: outputDir,
          size: options.size,
          filename: 'thumbnail-%i.png'
        });
      }

      command
        .on('end', () => {
          logger.info('缩略图生成完成');
          resolve(outputDir);
        })
        .on('error', (err: Error) => {
          logger.error('生成缩略图错误:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 合并视频
   */
  async mergeVideos(inputFiles: string[], outputFile: string): Promise<string> {
    logger.info(`合并视频: ${inputFiles.length} 个文件`);

    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      inputFiles.forEach(file => {
        command.input(file);
      });

      command
        .on('end', () => {
          logger.info('视频合并完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err: Error) => {
          logger.error('合并视频错误:', err.message);
          reject(err);
        })
        .mergeToFile(outputFile, path.dirname(outputFile));
    });
  }

  /**
   * 调整视频分辨率
   */
  async resize(inputFile: string, outputFile: string, resolution: string): Promise<string> {
    logger.info(`调整分辨率: ${inputFile} -> ${resolution}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .size(resolution)
        .output(outputFile)
        .on('end', () => {
          logger.info('分辨率调整完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err: Error) => {
          logger.error('调整分辨率错误:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 裁剪视频
   */
  async trim(
    inputFile: string, 
    outputFile: string, 
    startTime: string, 
    duration: string
  ): Promise<string> {
    logger.info(`裁剪视频: ${inputFile} 从 ${startTime} 持续 ${duration}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputFile)
        .on('end', () => {
          logger.info('视频裁剪完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err: Error) => {
          logger.error('裁剪视频错误:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 转换为 GIF
   */
  async toGIF(inputFile: string, outputFile: string, options: GIFOptions): Promise<string> {
    const { startTime, duration, fps, scale } = options;
    logger.info(`转换为 GIF: ${inputFile}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .setStartTime(startTime)
        .setDuration(duration)
        .outputOptions([
          `-vf fps=${fps},scale=${scale}:-1:flags=lanczos`,
          '-loop 0'
        ])
        .output(outputFile)
        .on('end', () => {
          logger.info('GIF 转换完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err: Error) => {
          logger.error('转换 GIF 错误:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 获取视频元数据
   */
  getMetadata(inputFile: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputFile, (err, metadata) => {
        if (err) {
          logger.error('获取视频信息错误:', err.message);
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * 实时流处理 (RTMP/HLS)
   */
  streamTo(
    inputFile: string, 
    outputUrl: string, 
    options: {
      format?: string;
      videoCodec?: string;
      audioCodec?: string;
      preset?: string;
    } = {}
  ): ffmpeg.FfmpegCommand {
    const {
      format = 'flv',
      videoCodec = 'libx264',
      audioCodec = 'aac',
      preset = 'veryfast'
    } = options;

    logger.info(`开始推流: ${inputFile} -> ${outputUrl}`);

    return ffmpeg(inputFile)
      .format(format)
      .videoCodec(videoCodec)
      .audioCodec(audioCodec)
      .outputOptions([
        `-preset ${preset}`,
        '-tune zerolatency'
      ])
      .output(outputUrl)
      .on('start', (cmd: string) => {
        logger.debug('推流命令:', cmd);
      })
      .on('error', (err: Error) => {
        logger.error('推流错误:', err.message);
      });
  }
}

export default FFmpegProcessor;
