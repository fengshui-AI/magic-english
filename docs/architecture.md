# Magic English 技术架构设计 V1.0

> 对应 PRD V2.0，MVP 阶段技术方案。

---

## 一、技术选型

### 1.1 整体架构

```
┌──────────────────────────────────────────────┐
│                  Client Layer                 │
│  Vue 3 + TypeScript + Vite (SPA, Hash Route) │
│  iOS / Android WebView 或 独立浏览器           │
└──────────────────┬───────────────────────────┘
                   │ HTTPS + WebSocket
┌──────────────────┴───────────────────────────┐
│                  API Gateway                   │
│        REST API + WebSocket 双向通信           │
│        Nginx 反向代理 / CloudBase HTTP API     │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────┴───────────────────────────┐
│               Application Layer                │
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ 学习引擎  │ │ 情感引擎  │ │  画像计算引擎  │  │
│  │(Node.js) │ │(Node.js) │ │  (Node.js)    │  │
│  └─────────┘ └──────────┘ └───────────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ 内容管理  │ │ 激励体系  │ │  家长端服务    │  │
│  │(Node.js) │ │(Node.js) │ │  (Node.js)    │  │
│  └─────────┘ └──────────┘ └───────────────┘  │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────┴───────────────────────────┐
│                Data Layer                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │PostgreSQL│ │  Redis   │ │   OSS/COS    │  │
│  │(主数据库) │ │ (缓存)    │ │ (音频/图片)   │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────────────────────────────────────┐ │
│  │            AI 服务（外部）                 │ │
│  │  语音识别 ASR | 发音评测 | LLM 对话        │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 1.2 技术栈明细

| 层级 | 技术 | 版本/说明 | 选型理由 |
|------|------|----------|---------|
| **前端框架** | Vue 3 + Composition API | 已有，保持 | 轻量、响应式、生态成熟 |
| **路由** | Vue Router 4 (Hash) | 已有，保持 | SPA Hash 模式适配多端 WebView |
| **状态管理** | Pinia | 替换现有 reactive() | 需要持久化、模块化、DevTools 支持 |
| **构建工具** | Vite 8 | 已有，保持 | 极速 HMR |
| **语言** | TypeScript | 已有，保持 | 类型安全 |
| **HTTP 客户端** | ofetch | 新增 | 轻量(3KB)，支持拦截器、自动重试 |
| **WebSocket** | 原生 WebSocket + 简易重连 | 新增 | 豆豆实时对话需要 |
| **后端运行时** | Node.js 20 LTS | 新增 | 前后端统一语言，降低上下文切换 |
| **后端框架** | Hono | 新增 | 极轻量(14KB)，TypeScript 优先，边缘部署友好 |
| **数据库** | PostgreSQL 16 | 新增 | 关系型数据 + JSONB 灵活字段 |
| **缓存** | Redis 7 | 新增 | 会话、排行榜缓存、画像计算中间态 |
| **ORM** | Drizzle ORM | 新增 | TypeScript 原生，无代码生成，轻量 |
| **AI 服务** | 腾讯云 ASR + TTS | 新增 | 语音识别/合成，国内合规 |
| **LLM** | 混元/通义千问 API | 新增 | 对话生成、故事锚点、家长周报 |
| **文件存储** | 腾讯云 COS | 新增 | 音频、绘本图片 |
| **部署** | CloudBase / 轻量服务器 | 新增 | 按 PRD 集成要求 |

### 1.3 不引入的技术（及理由）

| 技术 | 不引入理由 |
|------|-----------|
| SSR/SSG (Nuxt) | 儿童 App 非 SEO 场景，SPA 足够；WebView 内嵌不需要首屏 SSR |
| GraphQL | MVP 接口简单，REST 足够；画像查询不需要图查询灵活性 |
| MongoDB | 数据强关联（用户-豆豆-学习记录-画像），关系型更合适 |
| 微服务 | MVP 单体足够，按模块分目录即可，V1.1 再拆分 |
| Docker/K8s | MVP 单机部署即可，CloudBase 托管免运维 |

---

## 二、前端架构

### 2.1 目录结构

```
src/
├── main.ts                    # 入口
├── App.vue                    # 根组件 + 底部导航
├── style.css                  # 全局样式 + CSS 变量
├── router/
│   └── index.ts               # 路由配置（扩展后）
├── stores/                    # Pinia stores
│   ├── user.ts                # 用户状态（年龄段、登录态）
│   ├── pet.ts                 # 豆豆状态（重构为 Pinia）
│   ├── learning.ts            # 学习进度状态（重构为 Pinia）
│   ├── emotion.ts             # 情感引擎前端映射
│   └── profile.ts             # 画像前端策略映射（纯后台，前端仅消费结果）
├── types/
│   ├── index.ts               # 基础类型（重构）
│   ├── api.ts                 # API 请求/响应类型
│   ├── pet.ts                 # 豆豆相关类型
│   ├── learning.ts            # 学习相关类型
│   └── profile.ts             # 画像相关类型
├── api/                       # API 调用层
│   ├── client.ts              # HTTP 客户端封装（ofetch）
│   ├── user.ts                # 用户相关 API
│   ├── learning.ts            # 学习模块 API
│   ├── pet.ts                 # 豆豆 API
│   ├── profile.ts             # 画像 API
│   └── parent.ts              # 家长端 API
├── composables/               # 组合式函数
│   ├── useAudio.ts            # 音频播放/录制
│   ├── useSpeech.ts           # 语音识别/评测
│   ├── useDialogue.ts         # 对话管理
│   └── useEmotion.ts          # 情绪展示逻辑
├── views/
│   ├── HomePage.vue           # 首页（重构）
│   ├── LearningPage.vue       # 学习环节主页面（新增）
│   │   ├── ReviewStep.vue     # 复习环节
│   │   ├── NewWordStep.vue    # 新词教学
│   │   ├── StoryAnchor.vue    # 故事锚点
│   │   ├── FollowRead.vue     # 跟读评分
│   │   └── FreeChat.vue       # 自由对话
│   ├── PetPage.vue            # 宠物页（重构）
│   ├── FeedbackPage.vue       # 反馈页（重构）
│   ├── HandbookPage.vue       # 魔法手账本（新增）
│   ├── OnboardingPage.vue     # Day0 入学流程（新增）
│   └── ParentPage.vue         # 家长端（新增）
├── components/
│   ├── dodo/                  # 豆豆相关组件
│   │   ├── DodoAvatar.vue     # 豆豆形象展示
│   │   ├── DodoBubble.vue     # 豆豆对话气泡
│   │   ├── DodoEmotion.vue    # 豆豆情绪动画
│   │   └── DodoGarden.vue     # 豆豆家园场景
│   ├── learning/              # 学习相关组件
│   │   ├── WordCard.vue       # 单词卡片
│   │   ├── PronounceGauge.vue # 发音评分环
│   │   ├── StoryPlayer.vue    # 故事播放器
│   │   └── TaskList.vue       # 任务列表
│   └── shared/                # 通用组件
│       ├── ProgressBar.vue    # 进度条
│       ├── StreakFlame.vue    # 连胜火焰
│       └── ToastNotify.vue    # 提示通知
├── assets/
│   ├── images/
│   │   └── dodo/              # 豆豆各阶段/出生地/表情素材
│   └── audio/                 # 内置音频（UI 音效）
└── utils/
    ├── format.ts              # 格式化工具
    ├── storage.ts             # 本地存储封装
    └── constants.ts           # 常量定义
```

### 2.2 路由设计

```typescript
// 路由表（扩展后）
const routes = [
  // === 儿童端 ===
  { path: '/',              name: 'home',      component: HomePage },
  { path: '/onboarding',    name: 'onboarding', component: OnboardingPage },
  { path: '/learning',      name: 'learning',  component: LearningPage },
  { path: '/learning/:step',name: 'learning-step', component: LearningPage },
  { path: '/pet',           name: 'pet',       component: PetPage },
  { path: '/handbook',      name: 'handbook',  component: HandbookPage },
  { path: '/feedback',      name: 'feedback',  component: FeedbackPage },

  // === 家长端 ===
  { path: '/parent',        name: 'parent',    component: ParentPage },
  { path: '/parent/report', name: 'parent-report', component: ParentPage },
]
```

### 2.3 状态管理方案（Pinia）

现有 `reactive()` 直接导出改为 Pinia store，理由：
- **持久化**：学习进度、豆豆状态需要 localStorage 持久化
- **模块化**：按领域拆分为 user/pet/learning/emotion/profile 五个 store
- **DevTools**：Vue DevTools 调试支持
- **与后端同步**：store action 中封装 API 调用

```typescript
// stores/pet.ts 重构示例
export const usePetStore = defineStore('pet', () => {
  const state = reactive<PetState>({ /* ... */ })

  // 从后端同步
  async function fetchPetState() { /* GET /api/pet */ }
  // 喂食并同步
  async function feedPet(exp: number) {
    state.exp += exp
    await api.pet.feed({ exp })  // 同步后端
    checkEvolution()
  }

  return { state, fetchPetState, feedPet, ... }
})
```

### 2.4 API 调用层设计

```typescript
// api/client.ts
import { ofetch } from 'ofetch'

export const apiClient = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  headers: { 'Content-Type': 'application/json' },
  onRequest({ options }) {
    // 注入 token
    const token = localStorage.getItem('token')
    if (token) options.headers.set('Authorization', `Bearer ${token}`)
  },
  onResponseError({ response }) {
    if (response.status === 401) { /* 跳转登录 */ }
  }
})
```

---

## 三、后端架构

### 3.1 服务模块划分（单体，按目录隔离）

```
server/
├── index.ts                   # 入口，Hono 实例挂载
├── middleware/
│   ├── auth.ts                # JWT 鉴权
│   ├── child-guard.ts         # 儿童账号保护（防成人冒充）
│   └── rate-limit.ts          # 限流
├── routes/
│   ├── auth.ts                # 登录/注册/Token
│   ├── user.ts                # 用户信息/年龄段
│   ├── pet.ts                 # 豆豆状态
│   ├── learning.ts            # 学习记录/进度
│   ├── emotion.ts             # 情感引擎数据
│   ├── profile.ts             # 画像数据
│   ├── content.ts             # 内容（单词/故事/绘本）
│   └── parent.ts              # 家长端
├── services/
│   ├── learning-engine.ts     # 学习引擎（艾宾浩斯、跟读评分）
│   ├── emotion-engine.ts      # 情感引擎（4维量化计算）
│   ├── profile-engine.ts      # 画像引擎（T+1 批量计算）
│   ├── incentive-engine.ts    # 激励引擎（连胜、陪伴梯度）
│   ├── dialogue-service.ts    # 对话服务（LLM 调用）
│   ├── speech-service.ts      # 语音服务（ASR/TTS）
│   └── report-service.ts      # 家长报告生成
├── db/
│   ├── index.ts               # 数据库连接
│   ├── schema/                # Drizzle schema 定义
│   │   ├── users.ts
│   │   ├── pets.ts
│   │   ├── learning-records.ts
│   │   ├── words.ts
│   │   ├── emotions.ts
│   │   └── profiles.ts
│   └── migrations/            # 数据库迁移文件
├── jobs/                      # 定时任务
│   ├── profile-calc.ts        # T+1 画像计算
│   ├── streak-reset.ts        # 连胜过期处理
│   └── weekly-report.ts       # 周报生成
├── config/
│   ├── constants.ts           # 常量（年龄段阈值、情感参数等）
│   └── env.ts                 # 环境变量
└── types/
    └── index.ts               # 后端共享类型
```

### 3.2 核心引擎设计

#### 3.2.1 学习引擎

| 功能 | 算法/逻辑 | PRD 引用 |
|------|----------|---------|
| 艾宾浩斯复习调度 | 1天/2天/4天/7天/15天 间隔队列 | 7.4 |
| 假性掌握检测 | 连续3次复习正确但间隔≥4天未出现 → 标记为疑似 | 7.4.3 |
| 跟读评分 | ASR 返回音素级准确率 → 映射为五级反馈(0-100分) | 7.5 |
| 单词掌握判定 | 连续2次复习评分≥80 → 标记为已掌握 | 7.4.2 |
| 学习时长计算 | 有效交互间隔≤8秒 → 累计为有效时长 | 5.1.3 |

#### 3.2.2 情感引擎

| 维度 | 输入信号 | 计算方式 | PRD 引用 |
|------|---------|---------|---------|
| 愉悦度 | 答题正确率、主动互动频率、连续学习天数 | 加权滑动平均，7天窗口 | 9.2.1 |
| 亲近度 | 累计学习时长、主动分享次数、陪伴梯度 | 累积+回落，无清零 | 9.2.1 |
| 唤醒度 | 答题速度、跟读音量、互动间隔 | 实时计算，分钟级更新 | 9.2.1 |
| 专注匹配度 | 有效时长占比、任务完成率、中断次数 | 单次学习维度，学后结算 | 9.2.1 |

#### 3.2.3 画像计算引擎（T+1 批量）

| 画像维度 | 计算逻辑 | MVP 范围 |
|----------|---------|---------|
| 学习风格 | 各题型完成率/停留时长/偏好比例 → 最大概率类型 | ✅ V1.0 |
| 兴趣图谱 | 主题单词掌握速度 + 自由对话话题频率 → 隐性兴趣标签 | ✅ V1.0 |
| 口语性格 | 跟读首次开口率/音量变化/自评偏差 → 性格类型 | V1.1 |
| 困难模式 | 特定音素/单词反复出错 → 困难类型 | V1.2 |
| 情感节奏 | 学习时段分布/日频次 → 节奏类型 | V1.1 |

---

## 四、通信协议

### 4.1 REST API

```
Base URL: /api/v1

# 认证
POST   /auth/login              # 登录（手机号/微信）
POST   /auth/child-login        # 儿童端登录（家长授权码）

# 用户
GET    /user/me                 # 当前用户信息
PUT    /user/me                 # 更新用户信息（年龄段、兴趣标签）
GET    /user/:id/pet            # 我的豆豆

# 豆豆
GET    /pet/state               # 豆豆当前状态
POST   /pet/feed                # 喂养经验值
POST   /pet/name                # 命名
GET    /pet/evolution           # 进化状态

# 学习
GET    /learning/today          # 今日学习状态（任务、进度）
GET    /learning/words          # 待学/待复习单词列表
POST   /learning/complete       # 完成一个学习步骤
POST   /learning/pronounce      # 提交跟读结果
GET    /learning/history        # 学习历史

# 内容
GET    /content/word/:id        # 单词详情（含故事锚点）
GET    /content/words           # 词库列表（按主题/年级筛选）
GET    /content/story/:id       # 故事内容

# 画像（前端仅消费结果，不暴露标签）
GET    /profile/strategy        # 当前画像驱动的策略（内容偏好权重等）

# 家长端
GET    /parent/report/weekly    # 周报
GET    /parent/report/monthly   # 月报
GET    /parent/child-state      # 孩子当前状态概要
PUT    /parent/settings         # 家长设置（时长/时段/消费管控）
```

### 4.2 WebSocket（豆豆实时对话）

```
连接: wss://api.magicenglish.com/ws/chat

协议: JSON 帧
{
  "type": "message" | "emotion" | "typing" | "system",
  "payload": { ... }
}

消息类型:
- message: 对话消息（用户说话 / 豆豆回应）
- emotion: 豆豆情绪变化通知
- typing: 豆豆"正在输入"状态
- system: 系统事件（进化、奖励等）
```

---

## 五、安全设计

### 5.1 儿童数据保护

| 措施 | 说明 |
|------|------|
| 数据最小化 | 不采集非学习行为数据；画像仅存储标签不存储原始日志 |
| 存储加密 | 用户 PII（手机号等）AES-256 加密存储 |
| 传输加密 | 全站 HTTPS + WebSocket over TLS |
| 账号隔离 | 儿童账号与家长账号分离，通过授权码关联 |
| 删除权 | 家长可一键删除孩子全部数据（30天冷静期后物理删除） |

### 5.2 接口安全

| 措施 | 说明 |
|------|------|
| JWT 鉴权 | 短有效期 access token(1h) + refresh token(7d) |
| 儿童端限制 | 儿童 token 无法访问家长端 API |
| 频率限制 | 单用户 100 req/min，学习提交 30 req/min |
| 内容审核 | LLM 对话内容实时敏感词过滤 |

---

## 六、部署方案（MVP）

```
┌──────────────────────────────────────────────┐
│                  CloudBase                    │
│  ┌────────────┐ ┌──────────┐ ┌────────────┐ │
│  │ 静态托管    │ │云函数     │ │ 云数据库    │ │
│  │ (前端 SPA) │ │(Hono API)│ │(PostgreSQL)│ │
│  └────────────┘ └──────────┘ └────────────┘ │
│  ┌────────────┐ ┌──────────┐                │
│  │ 云存储 COS  │ │ Redis    │                │
│  │ (音频/图片) │ │ (缓存)    │                │
│  └────────────┘ └──────────┘                │
└──────────────────────────────────────────────┘
```

MVP 阶段使用 CloudBase 一体化部署，降低运维成本。V1.1 根据体量决定是否迁移至独立服务器。

---

## 七、MVP 开发阶段规划

| 阶段 | 内容 | 预估工时 | 输出 |
|------|------|---------|------|
| **Phase 0** | 技术方案定稿 + 环境搭建 | 1人天 | 架构文档、数据库设计、开发环境 |
| **Phase 1** | 数据库建表 + 基础 API | 3人天 | Schema、Auth/User/Pet CRUD |
| **Phase 2** | 学习引擎 + 内容 API | 5人天 | 艾宾浩斯复习、跟读评分、词库接口 |
| **Phase 3** | 情感引擎 + 激励体系 | 3人天 | 4维情感计算、连胜火焰、陪伴梯度 |
| **Phase 4** | 前端核心页面重构 | 5人天 | Day0入学、学习循环、豆豆交互 |
| **Phase 5** | 对话 + 语音集成 | 3人天 | WebSocket对话、ASR/TTS 对接 |
| **Phase 6** | 画像引擎 + 家长端 | 3人天 | T+1画像计算、周报生成 |
| **Phase 7** | 联调 + 测试 + 上线 | 3人天 | E2E测试、性能优化、部署 |

> 总预估：约 26 人天。按 2 人并行开发约 3 周。

---

## 八、技术风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| ASR 对儿童英语发音识别不准 | 跟读评分偏差，影响学习体验 | 选用儿童语音优化的 ASR 引擎；评分宽容策略 |
| LLM 对话生成内容不可控 | 可能产生不适当内容 | 预设对话模板为主 + LLM 为辅；内容安全审核层 |
| 画像计算 T+1 延迟 | 个性化体验不够实时 | MVP 接受 T+1；V1.1 关键信号改为准实时 |
| WebSocket 连接不稳定 | 对话中断 | 自动重连 + 离线消息队列；关键对话降级为 HTTP 轮询 |
