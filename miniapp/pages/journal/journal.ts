/**
 * 手账本 - 底部 TabBar 第3项
 * 展示已学单词卡牌，稀有度系统
 *
 * 稀有度规则（老板 2026-07-29 定）：按掌握程度
 *   学过(learning/new) = 普通 common
 *   复习中(review)     = 稀有 rare
 *   已掌握(mastered)   = 史诗 epic
 *
 * 数据来源：后端 GET /learning/journal（已返回算好的 rarity + stats）
 */

import { get } from '../../utils/api';

/** 卡牌数据（后端返回格式） */
interface JournalCard {
  id: string;
  word: string;
  meaning: string;
  theme?: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
  rarity: 'common' | 'rare' | 'epic';
  rarityLabel: string;
}

/** /learning/journal 响应 */
interface JournalResponse {
  items: JournalCard[];
  stats: {
    total: number;
    rare: number;
    epic: number;
  };
}

Page({
  data: {
    /** 当前展示的卡牌列表（已按筛选过滤） */
    cards: [] as JournalCard[],
    /** 全量卡牌（未过滤，用于本地筛选） */
    allCards: [] as JournalCard[],
    /** 筛选：all | common | rare | epic */
    filter: 'all' as string,
    /** 统计 */
    stats: {
      total: 0,
      rare: 0,
      epic: 0
    },
    /** 是否加载中 */
    loading: true
  },

  onShow() {
    this.loadCards();
  },

  /** 从后端加载手账本数据 */
  async loadCards() {
    try {
      const res = await get<JournalResponse>('/learning/journal');
      const allCards = res.items || [];
      const stats = res.stats || { total: allCards.length, rare: 0, epic: 0 };

      this.setData({ allCards, stats, loading: false }, () => {
        this.applyFilter();
      });
    } catch (err) {
      // 接口失败：显示空状态，不崩
      this.setData({ allCards: [], cards: [], loading: false });
    }
  },

  /** 根据当前 filter 过滤 allCards → cards */
  applyFilter() {
    const { allCards, filter } = this.data;
    const cards =
      filter === 'all' ? allCards : allCards.filter((c) => c.rarity === filter);
    this.setData({ cards });
  },

  /** 切换筛选 */
  handleFilter(e: WechatMiniprogram.TouchEvent) {
    const filter = e.currentTarget.dataset.filter as string;
    this.setData({ filter }, () => {
      this.applyFilter();
    });
  },

  /** 点击卡片查看详情 */
  handleCardTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const card = this.data.cards[index];
    if (!card) return;
    wx.showToast({
      title: `${card.word}｜${card.rarityLabel}`,
      icon: 'none'
    });
  }
});
