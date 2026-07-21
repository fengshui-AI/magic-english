/// <reference path="./wx.d.ts" />

/** 用户信息 */
interface UserInfo {
  id: number;
  openid: string;
  nickname: string;
  avatarUrl: string;
  /** 豆豆名字 */
  dodoName: string;
}

/** API 统一响应 */
interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 学习进度 */
interface LearningProgress {
  stage: 'greeting' | 'teaching' | 'practice' | 'farewell';
  currentWord?: WordItem;
  score: number;
  streak: number;
}

/** 单词 */
interface WordItem {
  id: number;
  word: string;
  meaning: string;
  imageUrl?: string;
  audioUrl?: string;
  grade: number;
  theme: string;
}

/** 豆豆状态 */
interface DodoStatus {
  mood: 'happy' | 'excited' | 'sleepy' | 'hungry' | 'neutral';
  level: number;
  exp: number;
}
