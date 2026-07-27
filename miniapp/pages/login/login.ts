/**
 * 登录页
 * 流程：授权微信登录 → 后端换取 openid → 生成 JWT → 跳转首页
 */

import { wechatLogin } from '../../utils/auth';

Page({
  data: {
    loading: false,
    errorMsg: ''
  },

  /** 点击微信登录按钮 */
  async handleLogin() {
    if (this.data.loading) return;

    this.setData({ loading: true, errorMsg: '' });

    try {
      const result = await wechatLogin();

      if (result.isNewUser) {
        // 新用户直接进入（后续 Phase 2 加引导流程）
        wx.reLaunch({ url: '/pages/home/home' });
      } else {
        wx.reLaunch({ url: '/pages/home/home' });
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || '登录失败，请重试';
      this.setData({ errorMsg: msg });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 跳过登录（游客模式，Phase 2） */
  handleSkip() {
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
