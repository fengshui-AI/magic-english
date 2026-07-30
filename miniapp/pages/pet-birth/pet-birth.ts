/**
 * 砸金蛋诞生仪式（对齐 PRD V3.7 4.3.6）
 * 流程：砸蛋(3次机会,自己挑自己停) → 3选1挑最喜欢 → 选定进入孵化(incubating)
 * 命名不在此页：按 PRD 4.6.1.1 破壳阶段才命名（B 方案，留钩子）。
 */
import { get, post } from '../../utils/api';

/** 单次砸蛋结果 */
interface Roll {
  id: string;
  chanceIndex: number;
  container: string;
  containerLabel: string;
  rarity: string;
  rarityLabel: string;
}

/** 砸蛋进度返回 */
interface LotteryState {
  maxChances: number;
  chancesUsed: number;
  remainingChances: number;
  finalized: boolean;
  rolls: Roll[];
}

interface CrackResp {
  lotteryId: string;
  chanceIndex: number;
  container: string;
  containerLabel: string;
  rarity: string;
  rarityLabel: string;
  remainingChances: number;
}

/** 容器视觉映射：颜色 + 一句童趣描述（守 4.7：不显示稀有度英文/数字给孩子看，用文案传达） */
const CONTAINER_VISUAL: Record<string, { color: string; desc: string }> = {
  egg: { color: '#F0997B', desc: '暖暖的小蛋' },
  seed: { color: '#97C459', desc: '圆滚滚的种子' },
  bud: { color: '#ED93B1', desc: '粉嘟嘟的花苞' },
  roe: { color: '#5DCAA5', desc: '亮晶晶的卵' },
  cocoon: { color: '#EF9F27', desc: '金闪闪的茧' },
  crystal: { color: '#AFA9EC', desc: '梦幻的水晶' },
};

/** 稀有度对应外圈光环强度（只影响外观，不影响功能，守公平铁律） */
const RARITY_GLOW: Record<string, string> = {
  common: '#534AB7',
  rare: '#EF9F27',
  mythic: '#D4537E',
};

Page({
  data: {
    loading: true,
    /** 屏上待砸的金蛋（6 颗，纯展示，砸哪颗都行） */
    eggs: [0, 1, 2, 3, 4, 5],
    remainingChances: 3,
    maxChances: 3,
    /** 已砸出的结果 */
    rolls: [] as Array<Roll & { color: string; desc: string; glow: string }>,
    /** 当前阶段：crack(砸蛋中) | choose(3选1) */
    phase: 'crack' as 'crack' | 'choose',
    /** 正在砸的蛋索引（触发抖动动画） */
    crackingIndex: -1,
    /** 刚砸出的结果弹层 */
    showResult: false,
    lastRoll: null as (Roll & { color: string; desc: string; glow: string }) | null,
    /** 选中要留下的结果 id */
    chosenId: '',
    submitting: false,
  },

  async onLoad() {
    await this.loadState();
  },

  /** 拉取当前砸蛋进度（支持中途退出再进来续上） */
  async loadState() {
    try {
      const state = await get<LotteryState>('/api/v1/pets/lottery');
      const rolls = (state.rolls || []).map((r) => this.decorate(r));
      const phase = state.remainingChances <= 0 ? 'choose' : 'crack';
      this.setData({
        loading: false,
        remainingChances: state.remainingChances,
        maxChances: state.maxChances,
        rolls,
        phase,
      });
      // 已挑定过 → 直接回首页（防重复进入）
      if (state.finalized) {
        wx.reLaunch({ url: '/pages/home/home' });
      }
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  /** 给后端结果补上前端视觉字段 */
  decorate(r: Roll) {
    const v = CONTAINER_VISUAL[r.container] || { color: '#7F77DD', desc: '神秘的容器' };
    return { ...r, color: v.color, desc: v.desc, glow: RARITY_GLOW[r.rarity] || '#534AB7' };
  },

  /** 敲蛋：砸一次 */
  async handleCrack(e: WechatMiniprogram.TouchEvent) {
    if (this.data.remainingChances <= 0 || this.data.crackingIndex >= 0) return;
    const idx = Number(e.currentTarget.dataset.idx);

    // 触发抖动动画
    this.setData({ crackingIndex: idx });
    wx.vibrateShort({ type: 'medium' }).catch(() => {});

    try {
      const res = await post<CrackResp>('/api/v1/pets/lottery/crack');
      const roll: Roll = {
        id: res.lotteryId,
        chanceIndex: res.chanceIndex,
        container: res.container,
        containerLabel: res.containerLabel,
        rarity: res.rarity,
        rarityLabel: res.rarityLabel,
      };
      const decorated = this.decorate(roll);

      // 抖动 600ms 后弹结果
      setTimeout(() => {
        const rolls = [...this.data.rolls, decorated];
        this.setData({
          crackingIndex: -1,
          rolls,
          remainingChances: res.remainingChances,
          lastRoll: decorated,
          showResult: true,
        });
      }, 600);
    } catch (err: any) {
      this.setData({ crackingIndex: -1 });
      wx.showToast({ title: err?.message || '砸蛋失败', icon: 'none' });
    }
  },

  /** 关掉结果弹层，继续砸 or 进入 3选1 */
  handleCloseResult() {
    const done = this.data.remainingChances <= 0;
    this.setData({
      showResult: false,
      lastRoll: null,
      phase: done ? 'choose' : 'crack',
    });
  },

  /** 3选1：选中某个结果 */
  handleSelect(e: WechatMiniprogram.TouchEvent) {
    const id = String(e.currentTarget.dataset.id);
    this.setData({ chosenId: id });
  },

  /** 确认挑定 → 写入 pet，进入孵化 */
  async handleConfirm() {
    if (!this.data.chosenId || this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      await post('/api/v1/pets/lottery/choose', { lotteryId: this.data.chosenId });
      wx.showToast({ title: '豆豆住进来啦！', icon: 'success' });
      setTimeout(() => wx.reLaunch({ url: '/pages/home/home' }), 1200);
    } catch (err: any) {
      this.setData({ submitting: false });
      wx.showToast({ title: err?.message || '选定失败', icon: 'none' });
    }
  },
});
