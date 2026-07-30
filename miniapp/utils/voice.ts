/**
 * 语音工具 - 豆豆开口说话（TTS 朗读）
 * 后端 POST /api/v1/speech/tts 返回 base64 音频（data:audio/mp3;base64,...）
 * 小程序 InnerAudioContext 不能直接播 data URI，需要先写入临时文件再播放
 */
import { post } from './api';

interface TTSResp {
  audioUrl: string; // data:audio/mp3;base64,xxx （降级时为空字符串）
  audioBase64?: string;
  duration: number;
  text: string;
}

// 单例音频上下文，避免重复创建
let audioCtx: WechatMiniprogram.InnerAudioContext | null = null;
// 文字 → 临时文件路径缓存，同一句话不重复请求 TTS
const ttsCache = new Map<string, string>();

function getAudioCtx(): WechatMiniprogram.InnerAudioContext {
  if (!audioCtx) {
    audioCtx = wx.createInnerAudioContext();
  }
  return audioCtx;
}

/**
 * 把 base64 音频写入临时文件，返回文件路径
 */
function writeBase64ToTempFile(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/tts-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.mp3`;
    fs.writeFile({
      filePath,
      data: base64,
      encoding: 'base64',
      success: () => resolve(filePath),
      fail: (e) => reject(e),
    });
  });
}

/**
 * 朗读一段文字（豆豆开口说英文）
 * @param text 要朗读的英文
 * @param voice dodo（豆豆童声）| teacher（老师音）
 * @param onStateChange 播放状态回调（用于 UI 显示"正在播放"）
 */
export async function speak(
  text: string,
  voice: 'dodo' | 'teacher' = 'dodo',
  onStateChange?: (playing: boolean) => void
): Promise<void> {
  if (!text || !text.trim()) return;

  const cacheKey = `${voice}:${text}`;
  try {
    onStateChange?.(true);

    // 1. 取临时文件路径（缓存命中则直接用）
    let filePath = ttsCache.get(cacheKey);
    if (!filePath) {
      const res = await post<TTSResp>('/api/v1/speech/tts', { text, voice });
      // 腾讯云 SDK 返回的 base64 可能含换行符/RFC2045分隔符,需先清洗
      const raw = res.audioBase64 || (res.audioUrl || '').replace(/^data:audio\/mp3;base64,/, '');
      const base64 = raw.replace(/[\r\n\s]/g, '');
      if (!base64) {
        // 后端降级（没配腾讯云密钥）→ audioUrl 为空
        onStateChange?.(false);
        wx.showToast({ title: '语音暂不可用', icon: 'none' });
        return;
      }
      filePath = await writeBase64ToTempFile(base64);
      ttsCache.set(cacheKey, filePath);
    }

    // 2. 播放
    const ctx = getAudioCtx();
    ctx.stop(); // 停掉上一段
    ctx.src = filePath;
    ctx.offEnded();
    ctx.offError();
    ctx.onEnded(() => onStateChange?.(false));
    ctx.onError((e) => {
      console.error('[voice] play error:', e);
      onStateChange?.(false);
    });
    ctx.play();
  } catch (err) {
    console.error('[voice] speak failed:', err);
    onStateChange?.(false);
    wx.showToast({ title: '朗读失败', icon: 'none' });
  }
}

/** 停止当前朗读 */
export function stopSpeak(): void {
  if (audioCtx) audioCtx.stop();
}
