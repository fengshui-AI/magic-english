/**
 * 家长面板
 * 学习报告、成长数据、设置管理
 */

Page({
  data: {
    /** 周报数据 */
    weekReport: {
      daysStudied: 0,
      newWords: 0,
      totalMinutes: 0,
      streakDays: 0
    },
    /** 孩子信息 */
    childName: '小朋友'
  },

  onShow() {
    // TODO: Phase 2 - 从后端拉取周报
  },

  /** 查看详细报告 */
  handleViewReport() {
    // TODO: Phase 2
    wx.showToast({ title: '详细报告开发中', icon: 'none' });
  },

  /** 设置页面 */
  handleSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  }
});
