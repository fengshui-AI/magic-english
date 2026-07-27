/**
 * 设置页
 * 学习偏好、账户管理、关于
 */

Page({
  data: {
    dailyWordTarget: 5,
    soundEnabled: true,
    version: '1.0.0'
  },

  /** 调整每日单词目标 */
  handleWordTargetChange(e: WechatMiniprogram.SliderChange) {
    this.setData({ dailyWordTarget: e.detail.value });
  },

  /** 切换音效 */
  handleSoundToggle() {
    this.setData({ soundEnabled: !this.data.soundEnabled });
  },

  /** 退出登录 */
  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  }
});
