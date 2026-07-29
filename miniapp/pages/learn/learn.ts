/**
 * 学习页（核心）- 底部 TabBar 第2项
 * 对话式英语学习，豆豆角色引导
 * Phase 2：接入后端 /api/v1/dialogue/* 真实 LLM 对话
 */
import { post } from '../../utils/api';
import { speak } from '../../utils/voice';

/** 后端 dialogue 消息返回结构 */
interface DodoReply {
  text: string;
  translation?: string;
  stage?: string;
}
interface StartResp {
  sessionId: string;
  message: DodoReply;
  audioUrl?: string;
  stage?: string;
}
interface MessageResp {
  message: DodoReply;
  audioUrl?: string;
  stage?: string;
  childEnglishRatio?: number;
  turn?: number;
  totalTurns?: number;
}

Page({
  data: {
    /** 当前阶段：greeting | teaching | practice | farewell */
    stage: 'greeting' as string,
    /** 对话历史 */
    messages: [] as { role: 'dodo' | 'user'; text: string; translation?: string; playing?: boolean }[],
    /** 输入框内容 */
    inputValue: '',
    /** 是否录音中 */
    recording: false,
    /** 豆豆是否正在思考（等后端回复） */
    thinking: false,
    /** 学习进度 */
    progress: {
      learned: 0,
      total: 5
    }
  },

  /** 当前对话会话 ID */
  sessionId: '' as string,

  /** 是否已追加过告别钩子（防止 farewell 多轮重复追加） */
  farewellHooked: false,

  onLoad() {
    this.startSession();
  },

  /** 开始学习会话——调后端 dialogue/start 拿开场白 */
  async startSession() {
    this.farewellHooked = false;
    this.setData({ thinking: true });
    wx.showLoading({ title: '豆豆来啦…', mask: true });
    try {
      const res = await post<StartResp>('/api/v1/dialogue/start', { grade: 3 });
      this.sessionId = res.sessionId;
      this.setData({
        stage: res.stage || 'greeting',
        messages: [{
          role: 'dodo',
          text: res.message.text,
          translation: res.message.translation
        }],
        thinking: false
      });
      // 开场白自动朗读
      this.speakMessage(0, res.message.text);
    } catch (err: any) {
      // 后端异常时兜底，不让页面空白
      this.setData({
        messages: [{
          role: 'dodo',
          text: 'Hello! 欢迎来到豆语星球！豆豆现在有点累，稍后再陪你聊哦～'
        }],
        thinking: false
      });
      console.error('[dialogue/start] failed:', err);
    } finally {
      wx.hideLoading();
      this.scrollToBottom();
    }
  },

  /** 发送文字消息——调后端 dialogue/message 拿真实回复 */
  async handleSend() {
    const value = this.data.inputValue.trim();
    if (!value) return;
    if (this.data.thinking) return; // 豆豆思考中，防连点

    // 先上屏用户消息
    const messages = [...this.data.messages, { role: 'user' as const, text: value }];
    this.setData({ messages, inputValue: '', thinking: true });
    this.scrollToBottom();

    // 没有会话则先补建
    if (!this.sessionId) {
      await this.startSession();
      if (!this.sessionId) {
        this.setData({ thinking: false });
        return;
      }
    }

    try {
      const res = await post<MessageResp>('/api/v1/dialogue/message', {
        sessionId: this.sessionId,
        message: value
      });
      const newStage = res.stage || this.data.stage;
      this.setData({
        stage: newStage,
        messages: [...this.data.messages, {
          role: 'dodo' as const,
          text: res.message.text,
          translation: res.message.translation
        }],
        thinking: false
      });
      // 豆豆回复自动朗读（最新一条）
      this.speakMessage(this.data.messages.length - 1, res.message.text);

      // 进入告别阶段：补一句成长预告留存钩子（PRD 5.4.1/5.2，前端补，不改后端）
      if (newStage === 'farewell') {
        this.appendFarewellHook();
      }
    } catch (err: any) {
      this.setData({
        messages: [...this.data.messages, {
          role: 'dodo' as const,
          text: '豆豆没听清，再说一次好吗？😊'
        }],
        thinking: false
      });
      console.error('[dialogue/message] failed:', err);
    } finally {
      this.scrollToBottom();
    }
  },

  /** 输入框内容变化 */
  handleInput(e: WechatMiniprogram.Input) {
    this.setData({ inputValue: e.detail.value });
  },

  /** 开始/停止录音 */
  handleRecord() {
    // TODO: Phase 2 后续 - 腾讯云 ASR 语音识别
    wx.showToast({ title: '语音功能开发中', icon: 'none' });
  },

  /**
   * 追加告别成长预告钩子（PRD 5.4.1 分镜7 / 5.2）
   * 让孩子带着"明天豆豆会长大"的期待离开，形成次日回访钩子。
   * 延迟 1.2s 追加，等豆豆的告别语先播完，节奏更自然。
   */
  appendFarewellHook() {
    if (this.farewellHooked) return;
    this.farewellHooked = true;
    const hook = '今天玩得好开心呀～明天我可能会长出小芽芽哦，记得来看我～晚安 🌙';
    setTimeout(() => {
      const messages = [...this.data.messages, { role: 'dodo' as const, text: hook }];
      this.setData({ messages }, () => {
        this.speakMessage(messages.length - 1, hook);
        this.scrollToBottom();
      });
    }, 1200);
  },

  /** 朗读豆豆某条消息 */
  speakMessage(index: number, text: string) {
    const key = `messages[${index}].playing` as const;
    this.setData({ [key]: true });
    speak(text, 'dodo', (playing) => {
      this.setData({ [key]: playing });
    });
  },

  /** 点击豆豆气泡的喇叭图标重读 */
  handlePlayVoice(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    const msg = this.data.messages[index];
    if (msg && msg.role === 'dodo') {
      this.speakMessage(index, msg.text);
    }
  },

  /** 滚动到对话底部（wxml 的 scroll-into-view 已按 messages.length 自动跟随，无需额外处理） */
  scrollToBottom() {
    // no-op：滚动由 wxml scroll-into-view 自动完成
  }
});
