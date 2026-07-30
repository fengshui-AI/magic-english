/**
 * 学习页（核心）- 底部 TabBar 第2项
 * 对话式英语学习，豆豆角色引导
 * Phase 2：接入后端 /api/v1/dialogue/* 真实 LLM 对话
 */
import { post, request } from '../../utils/api';
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

/** session/start 返回结构 */
interface SessionStartResp {
  session: { id: string };
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

  /** 学习时长记录：后端 learningRecords 的 id（session/start 返回） */
  learningRecordId: '' as string,
  /** 本次进入学习页的开始时间戳（ms） */
  learnStartAt: 0 as number,
  /** 是否正在开学习记录，防止 onShow 重复触发 */
  startingRecord: false as boolean,

  /** 是否已追加过告别钩子（防止 farewell 多轮重复追加） */
  farewellHooked: false,

  onLoad() {
    this.startSession();
  },

  /** 每次页面显示：开一条学习时长记录，开始计时 */
  onShow() {
    this.beginLearningRecord();
  },

  /** 页面隐藏（切后台/跳其他 Tab）：结算并上报学习时长 */
  onHide() {
    this.endLearningRecord();
  },

  /** 页面卸载：结算并上报学习时长 */
  onUnload() {
    this.endLearningRecord();
  },

  /**
   * 开一条学习时长记录（session/start），记录开始时间。
   * 静默调用，不弹 loading、失败不打扰学习。
   * 成长引擎的数据源头——没有它豆豆永远不长大。
   */
  async beginLearningRecord() {
    if (this.learningRecordId || this.startingRecord) return;
    this.startingRecord = true;
    try {
      const res = await request<SessionStartResp>({
        url: '/api/v1/learning/session/start',
        method: 'POST',
        showLoading: false,
      });
      this.learningRecordId = res?.session?.id || '';
      this.learnStartAt = Date.now();
    } catch (err) {
      console.error('[session/start] failed:', err);
    } finally {
      this.startingRecord = false;
    }
  },

  /**
   * 结算本次学习时长并上报（session/end），触发后端成长引擎推进豆豆 stage。
   * effectiveMinutes 至少记 1 分钟（哪怕停留不足 1 分钟，也算陪伴了一次）。
   * 上报后清空记录 id，避免重复上报。
   */
  endLearningRecord() {
    const recordId = this.learningRecordId;
    if (!recordId || !this.learnStartAt) return;
    // 先清空，避免 onHide+onUnload 连续触发重复上报
    this.learningRecordId = '';
    const elapsedMs = Date.now() - this.learnStartAt;
    this.learnStartAt = 0;
    const effectiveMinutes = Math.max(1, Math.round(elapsedMs / 60000));
    // 静默上报，不阻塞页面离开
    request({
      url: '/api/v1/learning/session/end',
      method: 'POST',
      data: {
        sessionId: recordId,
        effectiveMinutes,
        sentencesSpoken: this.data.messages.filter((m) => m.role === 'user').length,
      },
      showLoading: false,
    }).catch((err) => {
      console.error('[session/end] failed:', err);
    });
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

    // 检测用户是否主动告别（前端兜底，不依赖后端阶段）
    const userWantsGoodbye = this.isGoodbye(value);

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
      // 触发条件双保险：① 后端切到收尾阶段 wrapup；② 用户主动说了告别词
      if (newStage === 'wrapup' || userWantsGoodbye) {
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
   * 判断用户是否在表达"告别/想结束"的意图（中英文）
   * 用于前端兜底触发成长预告钩子，不依赖后端阶段推进。
   */
  isGoodbye(text: string): boolean {
    const t = text.toLowerCase();
    const patterns = [
      'bye', 'goodbye', 'good bye', 'see you', 'see ya', 'good night', 'goodnight',
      'tomorrow', 'talk later', "i'm done", 'im done', 'gtg',
      '拜拜', '再见', '再會', '明天见', '明天見', '晚安', '不聊了', '不学了', '走了', '结束', '下次见'
    ];
    return patterns.some((p) => t.includes(p));
  },

  /** 追加告别成长预告钩子（PRD 5.4.1 分镜7 / 5.2）
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
