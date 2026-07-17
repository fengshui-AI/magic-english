# Magic English 数据库 & API 设计 V1.0

> 对应架构设计文档，MVP 阶段数据模型定义。

---

## 一、数据库设计

### 1.1 ER 图（核心实体关系）

```
┌──────────┐    1:1    ┌──────────┐    1:N    ┌────────────────┐
│   User   │◄─────────►│   Pet    │◄──────────│  PetEvolution  │
│  (用户)   │           │  (豆豆)   │           │  (进化记录)     │
└────┬─────┘           └────┬─────┘           └────────────────┘
     │                      │
     │ 1:N                  │ 1:N
     ▼                      ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ LearningRecord│    │  EmotionLog  │    │  UserProfile │
│  (学习记录)   │    │  (情感日志)   │    │  (用户画像)   │
└──────┬───────┘    └──────────────┘    └──────────────┘
       │
       │ N:1
       ▼
┌──────────────┐    N:M    ┌──────────────┐
│    Word      │◄──────────│ WordProgress  │
│   (单词)     │           │ (单词掌握进度) │
└──────────────┘           └──────────────┘

┌──────────────┐    1:N    ┌──────────────┐
│  ParentLink  │◄──────────│    User      │
│ (家长关联)    │           │              │
└──────────────┘           └──────────────┘
```

### 1.2 表结构定义

#### 1.2.1 users（用户表）

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(20) UNIQUE,             -- 家长手机号（加密存储）
  role          VARCHAR(10) NOT NULL DEFAULT 'child', -- 'child' | 'parent'
  name          VARCHAR(50),                     -- 昵称
  age_segment   VARCHAR(10),                     -- 'low'(6-7) | 'mid'(8-10) | 'high'(11-12)
  grade         SMALLINT DEFAULT 3,              -- 1-6年级
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_age_segment ON users(age_segment);
```

#### 1.2.2 pets（豆豆表）

```sql
CREATE TABLE pets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) UNIQUE,
  name          VARCHAR(30) NOT NULL DEFAULT '豆豆',
  birth_place   VARCHAR(20) NOT NULL,            -- 出生地：'seaside'|'forest'|'stargrass'|'flower'|'valley'
  personality   VARCHAR(20),                     -- 性格：'outgoing'|'focused'|'gentle'|'curious'|'quiet'
  specialty     VARCHAR(20),                     -- 特长：'memory'|'pronounce'|'creative'|'persistent'|'balanced'
  stage         VARCHAR(10) NOT NULL DEFAULT 'seed', -- 'seed'|'sprout'|'bloom'|'fruit'
  stage_progress INTEGER NOT NULL DEFAULT 0,     -- 当前阶段内进度 0-100
  total_learning_minutes INTEGER NOT NULL DEFAULT 0, -- 累计有效学习时长(分钟)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pets_user ON pets(user_id);
```

#### 1.2.3 pet_evolutions（进化记录表）

```sql
CREATE TABLE pet_evolutions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id),
  from_stage    VARCHAR(10) NOT NULL,
  to_stage      VARCHAR(10) NOT NULL,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_minutes_at_trigger INTEGER NOT NULL       -- 触发时的累计学习时长
);

CREATE INDEX idx_evolutions_pet ON pet_evolutions(pet_id);
```

#### 1.2.4 learning_records（学习记录表）

```sql
CREATE TABLE learning_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  session_date    DATE NOT NULL,                  -- 学习日期
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  effective_minutes INTEGER NOT NULL DEFAULT 0,   -- 有效学习时长(分钟)
  words_learned   INTEGER NOT NULL DEFAULT 0,     -- 新学单词数
  words_reviewed  INTEGER NOT NULL DEFAULT 0,     -- 复习单词数
  sentences_spoken INTEGER NOT NULL DEFAULT 0,    -- 跟读句子数
  stars_earned    INTEGER NOT NULL DEFAULT 0,     -- 获得星星数
  streak_continued BOOLEAN NOT NULL DEFAULT FALSE, -- 是否续上连胜
  emotion_summary JSONB,                          -- 该次学习情感摘要
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_records_user_date ON learning_records(user_id, session_date);
CREATE INDEX idx_records_date ON learning_records(session_date);
```

#### 1.2.5 words（单词表）

```sql
CREATE TABLE words (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word            VARCHAR(100) NOT NULL,           -- 英文单词
  translation     VARCHAR(200) NOT NULL,           -- 中文释义
  phonetic        VARCHAR(100),                    -- 音标
  difficulty      SMALLINT NOT NULL DEFAULT 1,     -- 难度 1-5
  grade_level     SMALLINT,                        -- 对应年级 1-6
  theme           VARCHAR(30),                     -- 主题：'animal'|'space'|'school'|'food'|...
  story_anchor    TEXT,                            -- 故事锚点内容(JSON)
  image_url       TEXT,                            -- 单词配图
  audio_url       TEXT,                            -- 标准发音音频
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_words_theme ON words(theme);
CREATE INDEX idx_words_grade ON words(grade_level);
CREATE INDEX idx_words_difficulty ON words(difficulty);
```

#### 1.2.6 word_progress（单词掌握进度表）

```sql
CREATE TABLE word_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  word_id         UUID NOT NULL REFERENCES words(id),
  status          VARCHAR(15) NOT NULL DEFAULT 'new',  -- 'new'|'learning'|'review'|'mastered'|'suspected_fake'
  review_count    INTEGER NOT NULL DEFAULT 0,           -- 已复习次数
  correct_count   INTEGER NOT NULL DEFAULT 0,           -- 正确次数
  last_review_at  TIMESTAMPTZ,                          -- 上次复习时间
  next_review_at  TIMESTAMPTZ,                          -- 下次复习时间(艾宾浩斯)
  avg_score       REAL,                                 -- 平均评分
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, word_id)
);

CREATE INDEX idx_word_progress_user_status ON word_progress(user_id, status);
CREATE INDEX idx_word_progress_next_review ON word_progress(next_review_at)
  WHERE status IN ('learning', 'review');
```

#### 1.2.7 emotion_logs（情感日志表）

```sql
CREATE TABLE emotion_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  session_id      UUID,                             -- 关联的学习记录
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pleasure        REAL NOT NULL DEFAULT 0.5,         -- 愉悦度 0-1
  closeness       REAL NOT NULL DEFAULT 0.1,         -- 亲近度 0-1
  arousal         REAL NOT NULL DEFAULT 0.5,         -- 唤醒度 0-1
  focus_match     REAL NOT NULL DEFAULT 0.5,         -- 专注匹配度 0-1
  trigger_event   VARCHAR(50),                       -- 触发事件：'answer_correct'|'answer_wrong'|'streak'|...
  raw_signals     JSONB                              -- 原始行为信号
);

CREATE INDEX idx_emotion_user_time ON emotion_logs(user_id, timestamp);
```

#### 1.2.8 user_profiles（用户画像表）

```sql
CREATE TABLE user_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) UNIQUE,

  -- 学习风格画像
  learning_style    VARCHAR(20),                   -- 'story'|'auditory'|'visual'|'kinesthetic'|'balanced'
  style_confidence  REAL NOT NULL DEFAULT 0,       -- 置信度 0-100

  -- 兴趣图谱（JSONB 存储隐性兴趣权重）
  interest_map      JSONB NOT NULL DEFAULT '{}',   -- {"animal": 0.8, "space": 0.3, ...}
  dormant_interests JSONB NOT NULL DEFAULT '[]',   -- 休眠兴趣列表

  -- 口语性格 (V1.1)
  speech_style      VARCHAR(20),                   -- 'confident'|'cautious'|'perfectionist'|'performative'|'silent'
  speech_confidence REAL DEFAULT 0,

  -- 困难模式 (V1.2)
  difficulty_flags  JSONB NOT NULL DEFAULT '{}',   -- {"phoneme_th": 0.7, ...}

  -- 情感节奏 (V1.1)
  rhythm_type       VARCHAR(20),                   -- 'morning'|'night'|'weekend'|'fragmented'|'stable'

  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_version      INTEGER NOT NULL DEFAULT 1      -- 画像版本号，用于迁移
);

CREATE INDEX idx_profiles_user ON user_profiles(user_id);
```

#### 1.2.9 streak_records（连胜记录表）

```sql
CREATE TABLE streak_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) UNIQUE,
  current_streak  INTEGER NOT NULL DEFAULT 0,       -- 当前连胜天数
  longest_streak  INTEGER NOT NULL DEFAULT 0,       -- 历史最长连胜
  last_active_date DATE,                            -- 最后活跃日期
  freeze_cards    INTEGER NOT NULL DEFAULT 0,       -- 冻结卡数量
  streak_level    SMALLINT NOT NULL DEFAULT 0,      -- 连胜等级(0-5对应火焰形态)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_streak_user ON streak_records(user_id);
```

#### 1.2.10 incentive_events（激励事件表）

```sql
CREATE TABLE incentive_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  event_type      VARCHAR(30) NOT NULL,             -- 'daily_goal'|'weekly_goal'|'monthly_goal'|'milestone'|'companion_gradient'
  event_level     SMALLINT NOT NULL DEFAULT 0,      -- 激励等级
  reward_content  JSONB NOT NULL DEFAULT '{}',       -- 奖励内容
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incentive_user ON incentive_events(user_id);
```

#### 1.2.11 parent_links（家长关联表）

```sql
CREATE TABLE parent_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID NOT NULL REFERENCES users(id),
  child_id        UUID NOT NULL REFERENCES users(id),
  relation        VARCHAR(20) NOT NULL,             -- 'mother'|'father'|'guardian'
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  settings        JSONB NOT NULL DEFAULT '{}',      -- 家长设置(时长/时段/消费)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(parent_id, child_id)
);

CREATE INDEX idx_parent_links_parent ON parent_links(parent_id);
CREATE INDEX idx_parent_links_child ON parent_links(child_id);
```

#### 1.2.12 weekly_reports（周报表）

```sql
CREATE TABLE weekly_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES users(id),
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  report_content  JSONB NOT NULL DEFAULT '{}',      -- 报告内容(结构化JSON)
  dodo_message    TEXT,                              -- 豆豆留言(LLM生成)
  parent_viewed   BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(child_id, week_start)
);
```

#### 1.2.13 dialogue_sessions（对话会话表）

```sql
CREATE TABLE dialogue_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  session_type    VARCHAR(20) NOT NULL DEFAULT 'free_chat', -- 'free_chat'|'learning_guide'|'story'
  messages        JSONB NOT NULL DEFAULT '[]',      -- 对话消息列表
  emotion_snapshot JSONB,                           -- 对话期间情感快照
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX idx_dialogue_user ON dialogue_sessions(user_id);
```

---

## 二、API 接口设计

### 2.1 通用约定

| 项目 | 规范 |
|------|------|
| Base URL | `/api/v1` |
| 认证方式 | `Authorization: Bearer <jwt_token>` |
| 请求格式 | `Content-Type: application/json` |
| 响应格式 | `{ "code": 0, "data": {...}, "message": "ok" }` |
| 错误格式 | `{ "code": 40001, "data": null, "message": "error description" }` |
| 分页 | `?page=1&size=20` → `{ "items": [], "total": 100, "page": 1, "size": 20 }` |
| 时间格式 | ISO 8601 `2026-07-15T12:00:00+08:00` |
| 日期格式 | `2026-07-15` |

### 2.2 认证模块

#### POST /auth/login
家长端手机号验证码登录。

```
Request:
{
  "phone": "138****1234",
  "code": "123456"          // 短信验证码
}

Response:
{
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "role": "parent",
    "name": "小明妈妈"
  }
}
```

#### POST /auth/child-login
儿童端登录（家长授权后生成子账号 token）。

```
Request:
{
  "childId": "uuid",
  "authCode": "ABC123"     // 家长端生成的6位授权码
}

Response:
{
  "token": "eyJhbG...",
  "user": {
    "id": "uuid",
    "role": "child",
    "name": "小明",
    "ageSegment": "mid",
    "petId": "uuid"
  }
}
```

### 2.3 豆豆模块

#### GET /pet/state
获取豆豆当前完整状态。

```
Response:
{
  "pet": {
    "id": "uuid",
    "name": "小魔法",
    "birthPlace": "forest",
    "personality": "gentle",
    "specialty": null,        // MVP 阶段可能未定型
    "stage": "seed",          // seed | sprout | bloom | fruit
    "stageProgress": 45,       // 0-100
    "totalLearningMinutes": 540,
    "emotion": {
      "pleasure": 0.72,
      "closeness": 0.35,
      "arousal": 0.60,
      "focusMatch": 0.80
    }
  }
}
```

#### POST /pet/feed
学习完成后喂养经验值。

```
Request:
{
  "exp": 20,                  // 经验值
  "source": "word_learned"    // 来源
}

Response:
{
  "pet": { ... },            // 更新后的豆豆状态
  "leveledUp": false,
  "stageChanged": false
}
```

#### POST /pet/name
给豆豆命名（Day0 命名仪式）。

```
Request:
{
  "name": "小魔法"
}

Response:
{
  "success": true,
  "pet": { ... }
}
```

### 2.4 学习模块

#### GET /learning/today
获取今日学习状态。

```
Response:
{
  "date": "2026-07-15",
  "tasks": [
    {
      "id": "review",
      "type": "review",
      "title": "复习上次学过的单词",
      "wordCount": 3,
      "completed": false
    },
    {
      "id": "new_words",
      "type": "new_words",
      "title": "学习新单词",
      "wordCount": 3,
      "completed": false
    },
    {
      "id": "free_chat",
      "type": "free_chat",
      "title": "和豆豆聊聊天",
      "completed": false
    }
  ],
  "todayMinutes": 0,
  "dailyGoal": 10,
  "streak": {
    "current": 5,
    "level": 2,
    "freezeCards": 1
  }
}
```

#### GET /learning/words
获取待学习的单词列表。

```
Query:
  type: "new" | "review"    // 新词 or 复习词
  count: 3                   // 数量

Response:
{
  "words": [
    {
      "id": "uuid",
      "word": "butterfly",
      "translation": "蝴蝶",
      "phonetic": "/ˈbʌtərflaɪ/",
      "difficulty": 2,
      "theme": "animal",
      "storyAnchor": {
        "type": "story",
        "title": "蝴蝶的旅行",
        "content": "..."
      },
      "imageUrl": "https://...",
      "audioUrl": "https://...",
      "progress": {
        "status": "new",
        "reviewCount": 0,
        "avgScore": null
      }
    }
  ]
}
```

#### POST /learning/complete
完成一个学习步骤。

```
Request:
{
  "stepType": "review" | "new_words" | "free_chat",
  "wordsCompleted": ["uuid", ...],    // 完成的单词ID
  "durationMinutes": 5,
  "starsEarned": 3,
  "behaviorSignals": {                // 行为信号（供画像引擎）
    "hesitationCount": 2,
    "replayCount": 1,
    "skipCount": 0
  }
}

Response:
{
  "petExpGained": 30,
  "petState": { ... },
  "streakUpdated": true,
  "emotionUpdate": {
    "pleasure": 0.75,
    "closeness": 0.36
  },
  "incentiveTriggered": null  // 如有触发激励则返回
}
```

#### POST /learning/pronounce
提交跟读评分结果。

```
Request:
{
  "wordId": "uuid",
  "audioData": "base64...",     // 或上传后的URL
  "duration": 2.5               // 发音时长(秒)
}

Response:
{
  "result": {
    "word": "butterfly",
    "score": 85,
    "accuracy": 88,
    "fluency": 82,
    "completeness": 90,
    "feedback": "great",          // excellent | great | good | try_again | comfort
    "feedbackMessage": "太厉害啦！发音超级标准！"
  },
  "dodoReaction": {               // 豆豆的反应
    "emotion": "excited",
    "animation": "star_eyes",
    "dialogue": "太厉害啦！你的发音超级标准，真的太棒了！"
  }
}
```

### 2.5 画像模块

#### GET /profile/strategy
获取当前画像驱动的策略参数（前端不展示画像标签，仅消费策略结果）。

```
Response:
{
  "contentStrategy": {
    "storyWeight": 0.4,          // 故事锚点权重
    "audioWeight": 0.3,         // 音频类权重
    "visualWeight": 0.2,        // 视觉类权重
    "interactiveWeight": 0.1    // 互动类权重
  },
  "interestPriority": [          // 兴趣优先级（隐性+显性综合）
    { "theme": "animal", "weight": 0.8 },
    { "theme": "school", "weight": 0.5 },
    { "theme": "space", "weight": 0.3 }
  ],
  "dialogueStyle": {
    "questionType": "guided",    // open | guided | demonstration
    "encouragementStyle": "gentle",
    "englishRatio": 0.3          // 自由对话英文占比
  },
  "rhythm": {
    "optimalTimeSlot": "evening",
    "suggestedSessionMinutes": 10,
    "miniModeEnabled": false
  }
}
```

### 2.6 家长端模块

#### GET /parent/report/weekly
获取周报。

```
Query:
  childId: "uuid"
  weekStart: "2026-07-08"

Response:
{
  "weekStart": "2026-07-08",
  "weekEnd": "2026-07-14",
  "summary": {
    "wordsLearned": 15,
    "totalMinutes": 120,
    "activeDays": 5,
    "streakContinued": true
  },
  "progress": {
    "vocabularyGrowth": 12,
    "pronunciationRate": 0.82,
    "focusLevel": "稳步提升"
  },
  "highlights": [
    { "type": "milestone", "description": "累计学习突破 500 分钟" }
  ],
  "dodoMessage": "这周宝贝遇到长句子的时候有点小犹豫，但还是慢慢读完了，特别棒。我们可以多给宝贝一点鼓励哦～",
  "weakAreas": [                 // 需要关注的方向（正向表述）
    { "type": "pronunciation", "detail": "th 发音可以多练习" }
  ]
}
```

---

## 三、关键业务逻辑伪代码

### 3.1 每日学习循环调度

```typescript
// services/learning-engine.ts
async function getTodayLearningPlan(userId: string): Promise<LearningPlan> {
  const words = await getWordsForReview(userId)     // 艾宾浩斯到期单词
  const newWords = await getNewWords(userId)         // 新词（≤3个/天）
  const profile = await getProfileStrategy(userId)   // 画像策略

  return {
    review: {
      words: words.slice(0, 3),                     // 复习 ≤3个
      strategy: profile.contentStrategy
    },
    newWords: {
      words: newWords.slice(0, 3),                  // 新词 ≤3个
      strategy: profile.contentStrategy             // 画像影响故事锚点风格
    },
    freeChat: {
      topics: pickTopics(profile.interestPriority), // 画像影响话题
      style: profile.dialogueStyle
    }
  }
}
```

### 3.2 艾宾浩斯复习调度

```typescript
// services/learning-engine.ts
const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15] // 天数间隔

function scheduleNextReview(wordProgress: WordProgress): Date {
  const nextIntervalIndex = Math.min(
    wordProgress.reviewCount,
    EBBINGHAUS_INTERVALS.length - 1
  )
  const days = EBBINGHAUS_INTERVALS[nextIntervalIndex]
  return addDays(new Date(), days)
}

// 假性掌握检测
function checkSuspectedFake(wordProgress: WordProgress): boolean {
  if (wordProgress.status !== 'mastered') return false
  const daysSinceLastReview = daysBetween(wordProgress.lastReviewAt, new Date())
  return wordProgress.reviewCount >= 3 && daysSinceLastReview >= 4
}
```

### 3.3 情感引擎计算

```typescript
// services/emotion-engine.ts
function calculateEmotion(signals: BehaviorSignals, history: EmotionLog[]): EmotionState {
  // 愉悦度：7天加权滑动平均
  const pleasure = weightedAvg([
    signals.correctRate * 0.4,
    signals.interactionFrequency * 0.3,
    signals.streakBonus * 0.3
  ], history, 7)

  // 亲近度：累积不衰减（仅7天未登录时-5）
  const closeness = clamp(
    history[0]?.closeness + signals.minutes * 0.5 + signals.shareBonus * 3,
    0, 1
  )

  // 唤醒度：实时计算
  const arousal = clamp(
    signals.responseSpeed * 0.4 + signals.volumeLevel * 0.3 + signals.interactionGap * 0.3,
    0, 1
  )

  // 专注匹配度：单次学习维度
  const focusMatch = clamp(
    signals.effectiveRatio * 0.5 + signals.completionRate * 0.3 + signals.disruptionPenalty * 0.2,
    0, 1
  )

  return { pleasure, closeness, arousal, focusMatch }
}
```

### 3.4 画像 T+1 计算

```typescript
// services/profile-engine.ts (定时任务，每天凌晨执行)
async function calculateProfiles(): Promise<void> {
  const activeUsers = await getUsersActiveYesterday()

  for (const user of activeUsers) {
    const records = await getLast30DaysRecords(user.id)
    const signals = extractBehaviorSignals(records)

    // 学习风格判定
    const style = determineLearningStyle(signals)   // 最大概率类型
    const styleConfidence = calculateConfidence(signals, 'learning_style')

    // 隐性兴趣发现
    const interests = discoverHiddenInterests(signals)

    await upsertProfile(user.id, {
      learningStyle: style,
      styleConfidence,
      interestMap: interests,
      updatedAt: new Date()
    })
  }
}

function determineLearningStyle(signals: Signals): string {
  const scores = {
    story: signals.storyAnchorAvgTime / signals.avgTime,
    auditory: signals.replayRate + signals.songCompletionRate,
    visual: signals.imageCardViewTime / signals.avgTime,
    kinesthetic: signals.interactiveCompletionRate + signals.gardenInteractionRate
  }
  const maxType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  // 如果最高分与次高分差距 <15%，判定为 balanced
  return maxType[1] > 0.15 ? maxType[0] : 'balanced'
}
```

---

## 四、前端数据流

### 4.1 页面加载数据流

```
用户打开 APP
    │
    ▼
App.vue mounted
    │
    ├──► usePetStore().fetchPetState()     → GET /api/v1/pet/state
    ├──► useLearningStore().fetchToday()   → GET /api/v1/learning/today
    └──► useProfileStore().fetchStrategy() → GET /api/v1/profile/strategy
    │
    ▼
各页面组件消费 store 数据渲染
```

### 4.2 学习环节数据流

```
用户点击"开始学习"
    │
    ▼
LearningPage 挂载
    │
    ├──► fetchTodayPlan()  → GET /api/v1/learning/today
    │
    ▼
Step 1: 复习环节
    │  ├──► fetchReviewWords()  → GET /api/v1/learning/words?type=review
    │  └──► 用户完成后 → POST /api/v1/learning/complete
    │
    ▼
Step 2: 新词学习
    │  ├──► fetchNewWords()  → GET /api/v1/learning/words?type=new
    │  ├──► 故事锚点展示
    │  ├──► 跟读环节 → POST /api/v1/learning/pronounce
    │  └──► 用户完成后 → POST /api/v1/learning/complete
    │
    ▼
Step 3: 自由对话
    │  ├──► WebSocket 连接 ws://.../chat
    │  ├──► 实时对话
    │  └──► 对话结束 → POST /api/v1/learning/complete
    │
    ▼
学习总结页
    ├──► 展示今日收获（星星、新词、豆豆反应）
    └──► 豆豆情绪动画
```

---

## 五、MVP 数据迁移计划

V1.0 现有前端模拟数据 → 真实后端数据迁移：

| 模块 | 当前状态 | 迁移方案 |
|------|---------|---------|
| 用户/豆豆 | 硬编码 `petStore` | 首次启动引导 Day0 入学流程，创建真实用户和豆豆 |
| 学习记录 | 硬编码 `learningHistory` | 首次学习后写入数据库，历史数据不迁移 |
| 每日任务 | 硬编码 `dailyTasks` | 从后端 `/learning/today` 拉取动态任务列表 |
| 薄弱单词 | 硬编码 `weakWords` | 从 `word_progress` 表查询 status='learning' 且 avg_score<60 |
| 连胜 | 硬编码 `streak: 5` | 从 `streak_records` 表查询 |
| 豆豆阶段 | 硬编码 `stage: 'egg'` | 从 `pets` 表查询，由累计学习时长驱动 |
