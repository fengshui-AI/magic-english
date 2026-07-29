// 豆语星球 小程序入口
// AppID: wxf2efe37fc4d3a243

App<IAppOption>({
  globalData: {
    userInfo: null,
    token: '',
    apiBaseUrl: 'https://magic-english-api-282732-9-1413580527.sh.run.tcloudbase.com',
    dodoStatus: {
      mood: 'neutral',
      level: 1,
      exp: 0
    }
  },

  onLaunch() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;

    // 检查登录状态：有 token → 直接进首页；无 token → 停留登录页
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      wx.reLaunch({ url: '/pages/home/home' });
    }
  },

  onShow() {
    // 小程序进入前台
  },

  onHide() {
    // 小程序进入后台
  }
});
