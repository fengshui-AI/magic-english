/**
 * API 请求封装
 * 后端地址：CloudBase 云托管
 */

const API_BASE = 'https://magic-english-api-282732-9-1413580527.sh.run.tcloudbase.com';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  header?: Record<string, string>;
  showLoading?: boolean;
}

/**
 * 统一请求方法
 * - 自动携带 JWT Token
 * - 401 时自动跳转登录页
 * - 统一错误处理
 */
function request<T = unknown>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, header = {}, showLoading = true } = options;

  const token = wx.getStorageSync('token') || '';

  if (showLoading) {
    wx.showLoading({ title: '加载中…', mask: true });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...header
      },
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.reLaunch({ url: '/pages/login/login' });
          reject({ code: 401, message: '登录已过期' });
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          const errData = res.data as { message?: string; error?: string };
          reject({
            code: res.statusCode,
            message: errData?.error || errData?.message || '请求失败'
          });
        }
      },
      fail(err) {
        reject({
          code: -1,
          message: `网络异常：${err.errMsg}`
        });
      },
      complete() {
        if (showLoading) {
          wx.hideLoading();
        }
      }
    });
  });
}

/** GET 请求 */
function get<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'GET', data });
}

/** POST 请求 */
function post<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'POST', data });
}

/** PUT 请求 */
function put<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'PUT', data });
}

export { get, post, put, request, API_BASE };
