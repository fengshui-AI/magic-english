# Magic English 项目记忆文件

> 最后更新：2026-07-18
> 用途：跨对话共享项目关键信息，新对话开始时快速调取上下文

---

## 一、项目概览

| 项目 | 说明 |
|------|------|
| **名称** | Magic English（豆语星球） |
| **定位** | 面向 1-6 年级儿童的英语学习 App |
| **核心机制** | 虚拟宠物"豆豆"陪伴 + 艾宾浩斯间隔重复 + PAD 情感引擎 + 家长周报 |
| **GitHub** | https://github.com/fengshui-AI/magic-english |
| **线上地址** | https://magic-english-main-d2cp777306bc7-1413580527.tcloudbaseapp.com |
| **API 地址** | https://magic-english-api-282732-9-1413580527.sh.run.tcloudbase.com/api/v1 |

## 二、技术栈

| 层 | 技术 |
|----|------|
| **前端** | Vue 3 + TypeScript + Vite |
| **后端** | Express + Drizzle ORM + PostgreSQL |
| **动画** | PixiJS + Spine（当前 mock） |
| **部署** | CloudBase 云托管（后端容器）+ 静态网站托管（前端） |
| **数据库** | PostgreSQL（腾讯云 CDB） |

## 三、已完成功能

- 14 个页面 / 8 个 stores / 45 个 API / 13 张 DB 表
- 艾宾浩斯遗忘曲线复习引擎
- PAD 情感引擎（Pleasure-Arousal-Dominance）
- 用户画像引擎（兴趣图谱）
- 75+ 测试用例

## 四、待解决问题

| 问题 | 优先级 | 状态 |
|------|--------|------|
| 单词学习无关联，随机拼凑 | 🔴 高 | 待实现主题树 |
| 语音/对话/动画全是 mock | 🟡 中 | 待接入真实服务 |
| 词库仅 60 词（实际 seed 有 500） | 🟡 中 | seed 数据已完备，待确认入库 |
| 状态管理待迁 Pinia | 🟢 低 | 技术债 |
| 安全配置待加固 | 🟢 低 | 技术债 |
| `isDev = true` 需改回 `import.meta.env.DEV` | 🟠 中 | 生产部署前必须改 |

---

## 五、核心架构

### 5.1 数据库关键表

```
words
├── id (UUID)
├── word / translation / phonetic
├── difficulty (1-5)
├── gradeLevel (1-6)
├── theme (animal/food/body/color/weather/sports/family/transport/nature/school/space)
├── sentence / sentenceCn
└── storyAnchor (JSON)

word_progress
├── id (UUID)
├── userId + wordId (唯一约束)
├── status (new/learning/review/mastered)
├── reviewCount / correctCount
├── lastReviewAt / nextReviewAt
└── avgScore
```

### 5.2 每日学习选词逻辑（daily-plan API）

```
GET /learning/daily-plan
  │
  ├── 1. 获取用户年级 (users.grade, 默认3)
  ├── 2. 获取兴趣主题 (user_profiles.interestMap Top3)
  ├── 3. 查复习队列: word_progress JOIN words
  │      WHERE nextReviewAt <= now AND status != 'mastered'
  │      LIMIT 10
  ├── 4. 构建已学集合: 该用户所有 word_progress 记录
  ├── 5. 推荐新词:
  │      - 同年级单词
  │      - 排除已学过的
  │      - 兴趣主题优先排序
  │      - 取前 5 个
  └── 6. 返回: reviewQueue + newWords + suggestedOrder
```

**核心问题**：选词策略是"同年级 + 未学过 + 兴趣优先"，没有主题连贯性。第一天学 animal 的 cat/dog，第二天可能跳到 food 的 hamburger/pizza，单词之间毫无关联。

### 5.3 艾宾浩斯复习间隔

| Stage | 间隔 | 状态 |
|-------|------|------|
| 0-1 | 1 天 | new |
| 1-2 | 2 天 | learning |
| 3-5 | 4/7/15 天 | review |
| 6 | 30 天 | mastered |

### 5.4 前端路由与页面

```
/              → HomePage（星球地图首页）
/login         → LoginPage
/learn         → LearnPage（五步学习 + 复习 + 专项对话）
/chat          → ChatPage（自由对话）
/pet           → PetPage（豆豆宠物）
/notebook      → NotebookPage（手账本/单词收藏）
/parent        → ParentPage（家长观察室）
/feedback      → FeedbackPage（学习反馈）
/profile       → ProfilePage（个人设置）
```

### 5.5 前端关键 Store

| Store | 文件 | 用途 |
|-------|------|------|
| auth | stores/auth.ts | 用户认证 |
| learning | stores/learning.ts | 学习计划、每日单词 |
| session | stores/session.ts | 学习会话（submitPronounce 等） |
| pet | stores/pet.ts | 宠物状态 |
| streak | stores/streak.ts | 连胜记录 |
| notebook | stores/notebook.ts | 单词收藏 |

---

## 六、近期修复记录

### 2026-07-18

| 修复 | 文件 | 说明 |
|------|------|------|
| **白底白字** | LearnPage.vue, ChatPage.vue | `.learn-page` / `.chat-page` 添加 `color: var(--text-on-light)`；输入框、提示文字等子元素显式设置颜色 |
| **单词 emoji 统一** | LearnPage.vue | 4 处 `loadTodayWords()` 中改用 `WORD_EMOJI_MAP[w.word]` 替代 `THEME_STYLES[theme].emoji` |
| **Step1 emoji 太小** | LearnPage.vue | 添加 `.step1-emoji` CSS 类，64px → 80-96px |
| **复习模式图片过滤** | LearnPage.vue | `showReviewEmoji` 从 `grade <= 3` 改为 `grade <= 2` |
| **开发者跳过菜单** | LearnPage.vue | 顶部 ⏭️ 按钮 + 下拉菜单（跳过步骤/单词/跳到对话/跳到结果） |
| **学习进度不推进** | LearnPage.vue | `markKnown()` 中添加 `submitPronounce()` 调用，写入 `word_progress` |
| **豆豆卡片点击穿透** | HomePage.vue | `.dodo-card :deep(.dodo-emotion) { pointer-events: none }` |

### CSS 变量规则（重要！反复出现的问题）

- 全局 `body { color: var(--text-primary) }` = `#FFFFFF`（白色，适配深色主题背景）
- **所有浅色背景页面**必须显式设置 `color: var(--text-on-light)`（`#2D3436`）
- 次级文字用 `var(--text-on-light-muted)`（`#8B7E74`）
- 输入框需要显式 `background: white; color: #333`
- placeholder 需要 `::placeholder { color: #aaa }`

---

## 七、主题树方案（待实现）

### 问题

当前 daily-plan 选词完全随机，每天 5 个单词毫无关联（长颈鹿→熊猫→海龟→蝴蝶→袋鼠→汉堡包），缺乏"学习进度感"。

### 方案思路

**核心概念**：将同 theme 的单词按难度/年级组织成"主题树"，用户按顺序解锁。

```
animal 主题树（Grade 1-2）:
  ├── 第1天: cat, dog, bird, fish, rabbit     （基础宠物）
  ├── 第2天: lion, tiger, bear, monkey, elephant （野生动物）
  ├── 第3天: duck, hen, pig, cow, sheep       （农场动物）
  └── 复习日: 艾宾浩斯自动调度

food 主题树（Grade 1-2）:
  ├── 第1天: apple, banana, orange, grape, pear  （水果）
  ├── 第2天: rice, bread, cake, egg, milk       （主食）
  └── ...

body 主题树（Grade 1-2）:
  ├── 第1天: head, eye, ear, nose, mouth
  └── 第2天: hand, arm, leg, foot, finger
```

**实现要点**：
1. 新增 `topic_group` 表或字段，定义主题内的小组（如 animal 下的"基础宠物""野生动物""农场动物"）
2. 每个 topic_group 包含 5 个关联单词
3. 用户完成一个 group 后才能解锁下一个
4. 每日自动推进到下一个未完成的 group
5. 前端展示"主题树"进度（如：🌳 动物王国 → 🐱 基础宠物 ✅ → 🦁 野生动物 🔄）

### 数据库改动（最小方案）

只需在 `words` 表加一个字段：
```sql
ALTER TABLE words ADD COLUMN topic_group VARCHAR(50);
-- 例如: 'animal-basic', 'animal-wild', 'food-fruit', 'food-staple'
```

或者在代码层面用配置文件定义分组（不改数据库），按 `theme + difficulty` 自动分组。

### 后端改动

`daily-plan` API 改为：
1. 找到用户当前正在进行的主题和 group
2. 如果当前 group 还有未学完的词 → 返回该 group 的剩余词
3. 如果当前 group 已完成 → 推进到下一个 group
4. 如果一个主题的所有 group 都完成了 → 换下一个主题

### 前端改动

- LearnPage 顶部显示当前主题和进度
- HomePage 展示"主题树"地图

---

## 八、部署流程

```bash
# 1. 构建（使用线上 API 地址）
VITE_API_BASE=https://magic-english-api-282732-9-1413580527.sh.run.tcloudbase.com/api/v1 npm run build

# 2. 部署前端静态网站
npx tcb hosting deploy dist -e magic-english-main-d2cp777306bc7

# 3. 部署后端容器（如有修改）
cd server && npx tcb framework deploy -e magic-english-main-d2cp777306bc7
```

---

## 九、关键约定

1. 中文回复，技术名词保留英文
2. 修改前先说明思路
3. 重要决策列出多个方案
4. 一次只改一个文件
5. 涉及 mock 数据、安全配置、外部 API 接入时主动提示
6. 每次操作后总结：改了哪些文件、需要做什么
