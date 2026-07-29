/**
 * 星球地图首页
 * 底部 TabBar 第1项 - 展示学习地图和豆豆状态
 */
import { get } from '../../utils/api';

// 豆豆成长阶段映射（对齐后端 pets.stage 字段）
const STAGE_MAP: Record<string, { label: string; emoji: string }> = {
  seed: { label: '种子', emoji: '🌱' },
  sprout: { label: '发芽', emoji: '🌿' },
  growing: { label: '成长', emoji: '🐣' },
  bloom: { label: '绽放', emoji: '🌟' },
  mature: { label: '成熟', emoji: '🦄' },
};

interface PetResp {
  pet: { name: string; stage: string; stageProgress: number };
}
interface TodayResp {
  today: { wordsLearned: number } | null;
  pendingReviews: number;
  masteredWords: number;
}
interface SummaryResp {
  summary: { totalWordsLearned: number; totalMinutes: number; totalSessions: number };
}

Page({
  data: {
    dodoName: '豆豆',
    dodoStage: '种子',
    dodoEmoji: '🌱',
    dodoProgress: 0,
    todayCount: 0,
    totalWords: 0,
    masteredWords: 0,
    userName: '小朋友',
    loading: true,
  },

  onShow() {
    const app = getApp<IAppOption>();
    const user = app.globalData.userInfo;
    if (user) {
      this.setData({ userName: user.name || '小朋友' });
    }
    this.loadData();
  },

  /** 拉取首页真实数据（豆豆状态 + 今日/累计学习） */
  async loadData() {
    try {
      const [petRes, todayRes, summaryRes] = await Promise.all([
        get<PetResp>('/api/v1/pets/mine').catch(() => null),
        get<TodayResp>('/api/v1/learning/today').catch(() => null),
        get<SummaryResp>('/api/v1/learning/summary').catch(() => null),
      ]);

      const patch: Record<string, unknown> = { loading: false };

      if (petRes?.pet) {
        const stage = STAGE_MAP[petRes.pet.stage] || STAGE_MAP.seed;
        patch.dodoName = petRes.pet.name || '豆豆';
        patch.dodoStage = stage.label;
        patch.dodoEmoji = stage.emoji;
        patch.dodoProgress = petRes.pet.stageProgress || 0;
      }
      if (todayRes) {
        patch.todayCount = todayRes.today?.wordsLearned || 0;
        patch.masteredWords = todayRes.masteredWords || 0;
      }
      if (summaryRes?.summary) {
        patch.totalWords = summaryRes.summary.totalWordsLearned || 0;
      }

      this.setData(patch);
    } catch (err) {
      console.error('首页数据加载失败', err);
      this.setData({ loading: false });
    }
  },

  /** 点击开始学习 */
  handleStartLearn() {
    wx.navigateTo({ url: '/pages/learn/learn' });
  },

  /** 进入宠物家园 */
  handleEnterPet() {
    wx.navigateTo({ url: '/pages/pet/pet' });
  },

  /** 进入家长面板 */
  handleEnterParent() {
    wx.navigateTo({ url: '/pages/parent/parent' });
  }
});
