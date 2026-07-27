/// <reference types="miniprogram-api-typings" />

interface IAppOption {
  globalData: {
    userInfo: UserInfo | null;
    token: string;
    apiBaseUrl: string;
    dodoStatus: DodoStatus;
    systemInfo?: WechatMiniprogram.SystemInfo;
  };
}
