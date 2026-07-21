/**
 * 学习页（核心）- 底部 TabBar 第2项
 * 对话式英语学习，豆豆角色引导
 */

Page({
  data: {
    /** 当前阶段：greeting | teaching | practice | farewell */
    stage: 'greeting' as string,
    /** 当前单词 */
    currentWord: null as WordItem | null,
    /** 对话历史 */
    messages: [] as { role: 'dodo' | 'user'; text: string }[],
    /** 输入框内容 */
    inputValue: '',
    /** 是否录音中 */
    recording: false,
    /** 学习进度 */
    progress: {
      learned: 0,
      total: 5
    }
  },

  onLoad() {
    this.startSession();
  },

  /** 开始学习会话 */
  startSession() {
    this.setData({
      messages: [{
        role: 'dodo',
        text: 'Hello! 欢迎来到豆语星球！今天我们来学一些有趣的英语单词吧！✨'
      }]
    });
  },

  /** 发送文字消息 */
  handleSend() {
    const value = this.data.inputValue.trim();
    if (!value) return;

    // 添加用户消息
    const messages = [...this.data.messages, { role: 'user' as const, text: value }];
    this.setData({ messages, inputValue: '' });

    // TODO: Phase 2 - 调用 LLM 对话 API
    this.mockDodoReply(messages);
  },

  /** 输入框内容变化 */
  handleInput(e: WechatMiniprogram.Input) {
    this.setData({ inputValue: e.detail.value });
  },

  /** 开始/停止录音 */
  handleRecord() {
    // TODO: Phase 2 - 腾讯云 ASR 语音识别
    wx.showToast({ title: '语音功能开发中', icon: 'none' });
  },

  /** 模拟豆豆回复（Phase 1 移除，Phase 2 接入 LLM） */
  mockDodoReply(messages: { role: string; text: string }[]) {
    setTimeout(() => {
      const replies = [
        'Great! 你学得很棒！👍',
        'Wonderful! 我们继续加油！⭐',
        'Amazing! 你的发音真好听！🎵'
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      this.setData({
        messages: [...messages, { role: 'dodo', text: reply }]
      });
    }, 800);
  },

  /** 滚动到对话底部 */
  scrollToBottom() {
    // 小程序中通过 scroll-view 的 scroll-into-view 实现
  }
});
