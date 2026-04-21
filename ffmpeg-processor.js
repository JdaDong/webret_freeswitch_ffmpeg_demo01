// FFmpeg 媒体处理工具集
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

class FFmpegProcessor {
  constructor(outputDir = './recordings') {
    this.outputDir = outputDir;
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * 转码视频
   * @param {string} inputFile - 输入文件路径
   * @param {string} outputFile - 输出文件路径
   * @param {Object} options - 转码选项
   */
  transcode(inputFile, outputFile, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        videoCodec = 'libx264',
        audioCodec = 'aac',
        videoBitrate = '1000k',
        audioBitrate = '128k',
        preset = 'fast',
        crf = 23
      } = options;

      console.log(`开始转码: ${inputFile} -> ${outputFile}`);

      ffmpeg(inputFile)
        .videoCodec(videoCodec)
        .audioCodec(audioCodec)
        .videoBitrate(videoBitrate)
        .audioBitrate(audioBitrate)
        .outputOptions([
          `-preset ${preset}`,
          `-crf ${crf}`
        ])
        .output(outputFile)
        .on('start', (cmd) => {
          console.log('FFmpeg 命令:', cmd);
        })
        .on('progress', (progress) => {
          console.log(`转码进度: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log('转码完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('转码错误:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 添加水印
   * @param {string} inputFile - 输入视频文件
   * @param {string} watermarkFile - 水印图片文件
   * @param {string} outputFile - 输出文件
   * @param {Object} position - 水印位置 {x, y}
   */
  addWatermark(inputFile, watermarkFile, outputFile, position = { x: 10, y: 10 }) {
    return new Promise((resolve, reject) => {
      console.log(`添加水印: ${inputFile}`);

      ffmpeg(inputFile)
        .input(watermarkFile)
        .complexFilter([
          `[1:v]scale=100:-1[watermark]`,
          `[0:v][watermark]overlay=${position.x}:${position.y}`
        ])
        .output(outputFile)
        .on('end', () => {
          console.log('水印添加完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('添加水印错误:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 提取音频
   * @param {string} inputFile - 输入视频文件
   * @param {string} outputFile - 输出音频文件
   */
  extractAudio(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      console.log(`提取音频: ${inputFile} -> ${outputFile}`);

      ffmpeg(inputFile)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .output(outputFile)
        .on('end', () => {
          console.log('音频提取完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('提取音频错误:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 生成缩略图
   * @param {string} inputFile - 输入视频文件
   * @param {string} outputDir - 输出目录
   * @param {Object} options - 缩略图选项
   */
  generateThumbnails(inputFile, outputDir, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        count = 5,
        size = '320x240',
        timestamps = null
      } = options;

      console.log(`生成缩略图: ${inputFile}`);

      const command = ffmpeg(inputFile)
        .screenshots({
          count: count,
          folder: outputDir,
          size: size,
          filename: 'thumbnail-%i.png'
        })
        .on('end', () => {
          console.log('缩略图生成完成');
          resolve(outputDir);
        })
        .on('error', (err) => {
          console.error('生成缩略图错误:', err);
          reject(err);
        });

      if (timestamps) {
        command.screenshots({
          timestamps: timestamps,
          folder: outputDir,
          size: size,
          filename: 'thumbnail-%s.png'
        });
      }
    });
  }

  /**
   * 合并视频
   * @param {Array} inputFiles - 输入文件数组
   * @param {string} outputFile - 输出文件
   */
  mergeVideos(inputFiles, outputFile) {
    return new Promise((resolve, reject) => {
      console.log(`合并视频: ${inputFiles.length} 个文件`);

      const command = ffmpeg();

      inputFiles.forEach(file => {
        command.input(file);
      });

      command
        .on('end', () => {
          console.log('视频合并完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('合并视频错误:', err);
          reject(err);
        })
        .mergeToFile(outputFile, path.dirname(outputFile));
    });
  }

  /**
   * 调整视频分辨率
   * @param {string} inputFile - 输入文件
   * @param {string} outputFile - 输出文件
   * @param {string} resolution - 分辨率 (例: '1280x720')
   */
  resize(inputFile, outputFile, resolution) {
    return new Promise((resolve, reject) => {
      console.log(`调整分辨率: ${inputFile} -> ${resolution}`);

      ffmpeg(inputFile)
        .size(resolution)
        .output(outputFile)
        .on('end', () => {
          console.log('分辨率调整完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('调整分辨率错误:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 裁剪视频
   * @param {string} inputFile - 输入文件
   * @param {string} outputFile - 输出文件
   * @param {string} startTime - 开始时间 (例: '00:00:10')
   * @param {string} duration - 持续时间 (例: '00:00:30')
   */
  trim(inputFile, outputFile, startTime, duration) {
    return new Promise((resolve, reject) => {
      console.log(`裁剪视频: ${inputFile} 从 ${startTime} 持续 ${duration}`);

      ffmpeg(inputFile)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputFile)
        .on('end', () => {
          console.log('视频裁剪完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('裁剪视频错误:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 转换为 GIF
   * @param {string} inputFile - 输入视频文件
   * @param {string} outputFile - 输出 GIF 文件
   * @param {Object} options - GIF 选项
   */
  toGIF(inputFile, outputFile, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        startTime = '00:00:00',
        duration = '5',
        fps = 10,
        scale = 320
      } = options;

      console.log(`转换为 GIF: ${inputFile}`);

      ffmpeg(inputFile)
        .setStartTime(startTime)
        .setDuration(duration)
        .outputOptions([
          `-vf fps=${fps},scale=${scale}:-1:flags=lanczos`,
          '-loop 0'
        ])
        .output(outputFile)
        .on('end', () => {
          console.log('GIF 转换完成:', outputFile);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('转换 GIF 错误:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 获取视频信息
   * @param {string} inputFile - 输入文件
   */
  getMetadata(inputFile) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputFile, (err, metadata) => {
        if (err) {
          console.error('获取视频信息错误:', err);
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * 实时流处理 (RTMP/HLS)
   * @param {string} inputFile - 输入文件或流
   * @param {string} outputUrl - 输出流 URL
   * @param {Object} options - 流选项
   */
  streamTo(inputFile, outputUrl, options = {}) {
    const {
      format = 'flv',
      videoCodec = 'libx264',
      audioCodec = 'aac',
      preset = 'veryfast'
    } = options;

    console.log(`开始推流: ${inputFile} -> ${outputUrl}`);

    const command = ffmpeg(inputFile)
      .format(format)
      .videoCodec(videoCodec)
      .audioCodec(audioCodec)
      .outputOptions([
        `-preset ${preset}`,
        '-tune zerolatency'
      ])
      .output(outputUrl)
      .on('start', (cmd) => {
        console.log('推流命令:', cmd);
      })
      .on('error', (err) => {
        console.error('推流错误:', err);
      })
      .run();

    return command;
  }
}

// 使用示例
async function example() {
  const processor = new FFmpegProcessor('./recordings');

  try {
    // 转码示例
    await processor.transcode(
      'input.webm',
      'output.mp4',
      {
        videoCodec: 'libx264',
        preset: 'fast',
        crf: 23
      }
    );

    // 生成缩略图
    await processor.generateThumbnails('output.mp4', './thumbnails', {
      count: 10,
      size: '320x240'
    });

    // 获取视频信息
    const metadata = await processor.getMetadata('output.mp4');
    console.log('视频时长:', metadata.format.duration, '秒');

  } catch (error) {
    console.error('处理失败:', error);
  }
}

module.exports = FFmpegProcessor;
