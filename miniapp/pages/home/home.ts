/**
 * 星球地图首页
 * 底部 TabBar 第1项 - 展示豆豆形象与成长时光（严格遵守 PRD 4.7 前端展示铁律：永不展示数字）
 */
import { get } from '../../utils/api';

/**
 * 豆豆四阶段成长时光（对齐 PRD 4.6：种子→发芽→开花→结果）
 * 后端 pets.stage 兼容旧枚举（growing/bloom/mature），统一归并到四阶段
 * emoji：成长时光的视觉传达（暂用 emoji，后续替换为出生地立绘）
 * mood：情感化状态文案（不含任何数字）
 */
const STAGE_MAP: Record<string, { key: string; label: string; emoji: string; mood: string }> = {
  seed:    { key: 'seed',   label: '一颗种子',   emoji: '🌰', mood: '豆豆还是一颗种子，它在等你一起长大' },
  sprout:  { key: 'sprout', label: '发芽了',     emoji: '🌱', mood: '豆豆发芽啦，冒出了嫩嫩的小芽芽' },
  // 旧枚举 growing 归并到「发芽」时光
  growing: { key: 'sprout', label: '发芽了',     emoji: '🌱', mood: '豆豆发芽啦，冒出了嫩嫩的小芽芽' },
  bloom:   { key: 'bloom',  label: '开花了',     emoji: '🌸', mood: '豆豆开花了，你们一起走过好多时光' },
  // 旧枚举 mature 归并到「结果（圆满）」时光
  mature:  { key: 'fruit',  label: '圆满',       emoji: '🌟', mood: '豆豆长成了独一无二的模样，圆满啦' },
  fruit:   { key: 'fruit',  label: '圆满',       emoji: '🌟', mood: '豆豆长成了独一无二的模样，圆满啦' },
};

/**
 * 连胜火焰五档视觉梯度（对齐 PRD 8.4.2）
 * 后台判定天数：1档1-2 / 2档3-6 / 3档7-29 / 4档30-99 / 5档100+
 * 铁律：儿童端不展示具体天数，只用火焰形态区分档位
 * level 0 = 无连胜（不显示火焰）
 */
const FLAME_TIERS: { emoji: string; label: string }[] = [
  { emoji: '',   label: '' },              // 0 档：无连胜
  { emoji: '🔥', label: '小火苗' },         // 1 档：1-2 天
  { emoji: '🔥', label: '小火焰' },         // 2 档：3-6 天
  { emoji: '🔥', label: '明亮火焰' },       // 3 档：7-29 天
  { emoji: '🔥', label: '饱满火焰' },       // 4 档：30-99 天
  { emoji: '🔥', label: '终极火焰' },       // 5 档：100+ 天
];

/** 连胜天数 → 火焰档位（PRD 8.4.2 阈值） */
function streakToFlameLevel(streak: number): number {
  if (streak >= 100) return 5;
  if (streak >= 30) return 4;
  if (streak >= 7) return 3;
  if (streak >= 3) return 2;
  if (streak >= 1) return 1;
  return 0;
}

interface PetResp {
  pet: { name: string; stage: string; stageProgress: number };
  growth?: { stage: string; stageLabel: string; hint: string; progressPercent: number };
}
interface ProgressResp {
  summary: { currentStreak: number };
}

Page({
  data: {
    dodoName: '豆豆',
    dodoStage: '一颗种子',
    dodoEmoji: '🌰',
    dodoMood: '豆豆还是一颗种子，它在等你一起长大',
    /** 成长钩子文案（后端 growth.hint 拼装，不含数字，守 PRD 4.7 铁律） */
    growthHint: '',
    /** 连胜火焰：档位(0-5) + 形态，只显视觉不显天数 */
    flameLevel: 0,
    flameEmoji: '',
    /** 火焰档位越高，微光越强（1-5 映射到 css class 强度） */
    flameClass: '',
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

  /** 拉取首页数据：豆豆成长时光 + 连胜火焰档位（不展示任何数字） */
  async loadData() {
    try {
      const [petRes, progressRes] = await Promise.all([
        get<PetResp>('/api/v1/pets/mine').catch(() => null),
        get<ProgressResp>('/api/v1/learning/progress').catch(() => null),
      ]);

      const patch: Record<string, unknown> = { loading: false };

      if (petRes?.pet) {
        const stage = STAGE_MAP[petRes.pet.stage] || STAGE_MAP.seed;
        patch.dodoName = petRes.pet.name || '豆豆';
        patch.dodoStage = stage.label;
        patch.dodoEmoji = stage.emoji;
        patch.dodoMood = stage.mood;
        // 成长钩子文案：优先用后端 hint（随学习进度动态变化，制造"再陪一会就长大"的期待）
        if (petRes.growth?.hint) {
          patch.growthHint = petRes.growth.hint;
        }
      }

      if (progressRes?.summary) {
        const level = streakToFlameLevel(progressRes.summary.currentStreak || 0);
        patch.flameLevel = level;
        patch.flameEmoji = FLAME_TIERS[level].emoji;
        patch.flameClass = level > 0 ? `flame-lv${level}` : '';
      }

      this.setData(patch);
    } catch (err) {
      console.error('首页数据加载失败', err);
      this.setData({ loading: false });
    }
  },

  /** 点击开始学习（learn 是 tab 页，必须用 switchTab） */
  handleStartLearn() {
    wx.switchTab({ url: '/pages/learn/learn' });
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
