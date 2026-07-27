/**
 * 宠物家园
 * 豆豆喂养、进化、装扮系统
 */

Page({
  data: {
    dodoStatus: {
      mood: 'happy' as DodoStatus['mood'],
      level: 1,
      exp: 0
    },
    /** 装扮列表 */
    outfits: [] as string[],
    /** 当前选中装扮 */
    activeOutfit: ''
  },

  onShow() {
    const app = getApp<IAppOption>();
    this.setData({ dodoStatus: app.globalData.dodoStatus });
  },

  /** 喂食豆豆 */
  handleFeed() {
    // TODO: Phase 2 - 调用后端喂养 API
    wx.showToast({ title: '喂食功能开发中', icon: 'none' });
  },

  /** 打开装扮 */
  handleOutfit() {
    // TODO: Phase 2 - 装扮系统
    wx.showToast({ title: '装扮功能开发中', icon: 'none' });
  }
});
