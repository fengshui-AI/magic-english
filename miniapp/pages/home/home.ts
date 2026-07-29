/**
 * 星球地图首页
 * 底部 TabBar 第1项 - 展示学习地图和豆豆状态
 */

Page({
  data: {
    dodoStatus: {
      mood: 'happy' as const,
      level: 1,
      exp: 0
    },
    todayCount: 0,
    totalWords: 0,
    userName: '小朋友'
  },

  onShow() {
    // 每次进入页面刷新数据
    const app = getApp<IAppOption>();
    const user = app.globalData.userInfo;
    if (user) {
      this.setData({ userName: user.name || '小朋友' });
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
