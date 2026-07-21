/**
 * 微信登录模块
 * 流程：wx.login 获取 code → 后端换取 openid → 生成 JWT
 */

import { post } from './api';

interface LoginResult {
  token: string;
  user: UserInfo;
  isNewUser: boolean;
}

/**
 * 执行微信登录
 * 1. 调用 wx.login 获取临时 code
 * 2. 发送 code 到后端换取 JWT + 用户信息
 * 3. 存储 token
 */
async function wechatLogin(): Promise<LoginResult> {
  // 1. 获取微信登录 code
  const loginRes = await new Promise<WechatMiniprogram.LoginSuccessCallbackResult>(
    (resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      });
    }
  );

  // 2. 发送到后端
  const result = await post<ApiResponse<LoginResult>>('/api/auth/wechat-login', {
    code: loginRes.code
  });

  if (result.code !== 0 || !result.data) {
    throw new Error(result.message || '登录失败');
  }

  // 3. 存储 token
  wx.setStorageSync('token', result.data.token);

  // 4. 存储用户信息
  const app = getApp<IAppOption>();
  app.globalData.token = result.data.token;
  app.globalData.userInfo = result.data.user;

  return result.data;
}

/**
 * 检查登录状态
 * @returns token 是否有效
 */
function checkLoginStatus(): boolean {
  const token = wx.getStorageSync('token');
  return !!token;
}

/**
 * 退出登录
 */
function logout(): void {
  wx.removeStorageSync('token');
  const app = getApp<IAppOption>();
  app.globalData.token = '';
  app.globalData.userInfo = null;
  wx.reLaunch({ url: '/pages/login/login' });
}

export { wechatLogin, checkLoginStatus, logout };
export type { LoginResult };
