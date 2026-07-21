/**
 * 手账本 - 底部 TabBar 第3项
 * 展示已学单词卡牌，稀有度系统
 */

Page({
  data: {
    /** 手账本单词列表 */
    cards: [] as WordItem[],
    /** 筛选：all | common | rare | epic | legendary */
    filter: 'all' as string,
    /** 统计 */
    stats: {
      total: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    }
  },

  onShow() {
    // TODO: Phase 2 - 从后端拉取手账本数据
    this.setData({
      stats: { total: 0, rare: 0, epic: 0, legendary: 0 }
    });
  },

  /** 切换筛选 */
  handleFilter(e: WechatMiniprogram.TouchEvent) {
    const filter = e.currentTarget.dataset.filter as string;
    this.setData({ filter });
  },

  /** 点击卡片查看详情 */
  handleCardTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    // TODO: Phase 2 - 跳转单词详情页
    console.log('Card tapped:', index);
  }
});
