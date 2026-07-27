import {
  pgTable,
  uuid,
  varchar,
  smallint,
  text,
  timestamp,
  date,
  integer,
  real,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

// ============================================================
// 1. users — 用户表
// ============================================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: varchar('phone', { length: 20 }).unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    wxOpenid: varchar('wx_openid', { length: 64 }).unique(),
    role: varchar('role', { length: 10 }).notNull().default('child'),
    name: varchar('name', { length: 50 }),
    ageSegment: varchar('age_segment', { length: 10 }),
    grade: smallint('grade').default(3),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => ({
    roleIdx: index('idx_users_role').on(table.role),
    ageSegIdx: index('idx_users_age_segment').on(table.ageSegment),
    wxOpenidIdx: index('idx_users_wx_openid').on(table.wxOpenid),
  }),
)

// ============================================================
// 2. pets — 豆豆表
// ============================================================
export const pets = pgTable(
  'pets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id)
      .unique(),
    name: varchar('name', { length: 30 }).notNull().default('豆豆'),
    birthPlace: varchar('birth_place', { length: 20 }).notNull(),
    personality: varchar('personality', { length: 20 }),
    specialty: varchar('specialty', { length: 20 }),
    stage: varchar('stage', { length: 10 }).notNull().default('seed'),
    stageProgress: integer('stage_progress').notNull().default(0),
    totalLearningMinutes: integer('total_learning_minutes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_pets_user').on(table.userId),
  }),
)

// ============================================================
// 3. pet_evolutions — 进化记录表
// ============================================================
export const petEvolutions = pgTable(
  'pet_evolutions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    petId: uuid('pet_id')
      .notNull()
      .references(() => pets.id),
    fromStage: varchar('from_stage', { length: 10 }).notNull(),
    toStage: varchar('to_stage', { length: 10 }).notNull(),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }).notNull().defaultNow(),
    totalMinutesAtTrigger: integer('total_minutes_at_trigger').notNull(),
  },
  (table) => ({
    petIdx: index('idx_evolutions_pet').on(table.petId),
  }),
)

// ============================================================
// 4. learning_records — 学习记录表
// ============================================================
export const learningRecords = pgTable(
  'learning_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    sessionDate: date('session_date').notNull(),
    startTime: timestamp('start_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    effectiveMinutes: integer('effective_minutes').notNull().default(0),
    wordsLearned: integer('words_learned').notNull().default(0),
    wordsReviewed: integer('words_reviewed').notNull().default(0),
    sentencesSpoken: integer('sentences_spoken').notNull().default(0),
    starsEarned: integer('stars_earned').notNull().default(0),
    streakContinued: boolean('streak_continued').notNull().default(false),
    emotionSummary: jsonb('emotion_summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index('idx_records_user_date').on(table.userId, table.sessionDate),
    dateIdx: index('idx_records_date').on(table.sessionDate),
  }),
)

// ============================================================
// 5. words — 单词表
// ============================================================
export const words = pgTable(
  'words',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    word: varchar('word', { length: 100 }).notNull(),
    translation: varchar('translation', { length: 200 }).notNull(),
    phonetic: varchar('phonetic', { length: 100 }),
    difficulty: smallint('difficulty').notNull().default(1),
    gradeLevel: smallint('grade_level'),
    theme: varchar('theme', { length: 30 }),
    sentence: text('sentence'),
    sentenceCn: text('sentence_cn'),
    storyAnchor: text('story_anchor'),
    imageUrl: text('image_url'),
    audioUrl: text('audio_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    themeIdx: index('idx_words_theme').on(table.theme),
    gradeIdx: index('idx_words_grade').on(table.gradeLevel),
    diffIdx: index('idx_words_difficulty').on(table.difficulty),
  }),
)

// ============================================================
// 6. word_progress — 单词掌握进度表
// ============================================================
export const wordProgress = pgTable(
  'word_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    wordId: uuid('word_id')
      .notNull()
      .references(() => words.id),
    status: varchar('status', { length: 15 }).notNull().default('new'),
    reviewCount: integer('review_count').notNull().default(0),
    correctCount: integer('correct_count').notNull().default(0),
    lastReviewAt: timestamp('last_review_at', { withTimezone: true }),
    nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
    avgScore: real('avg_score'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userWordUnique: uniqueIndex('uq_word_progress_user_word').on(table.userId, table.wordId),
    userStatusIdx: index('idx_word_progress_user_status').on(table.userId, table.status),
    nextReviewIdx: index('idx_word_progress_next_review').on(table.nextReviewAt),
  }),
)

// ============================================================
// 7. emotion_logs — 情感日志表
// ============================================================
export const emotionLogs = pgTable(
  'emotion_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    sessionId: uuid('session_id'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    pleasure: real('pleasure').notNull().default(0.5),
    closeness: real('closeness').notNull().default(0.1),
    arousal: real('arousal').notNull().default(0.5),
    focusMatch: real('focus_match').notNull().default(0.5),
    triggerEvent: varchar('trigger_event', { length: 50 }),
    rawSignals: jsonb('raw_signals'),
  },
  (table) => ({
    userTimeIdx: index('idx_emotion_user_time').on(table.userId, table.timestamp),
  }),
)

// ============================================================
// 8. user_profiles — 用户画像表
// ============================================================
export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id)
      .unique(),
    learningStyle: varchar('learning_style', { length: 20 }),
    styleConfidence: real('style_confidence').notNull().default(0),
    interestMap: jsonb('interest_map').notNull().default({}),
    dormantInterests: jsonb('dormant_interests').notNull().default([]),
    speechStyle: varchar('speech_style', { length: 20 }),
    speechConfidence: real('speech_confidence').default(0),
    difficultyFlags: jsonb('difficulty_flags').notNull().default({}),
    rhythmType: varchar('rhythm_type', { length: 20 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    dataVersion: integer('data_version').notNull().default(1),
  },
  (table) => ({
    userIdx: index('idx_profiles_user').on(table.userId),
  }),
)

// ============================================================
// 9. streak_records — 连胜记录表
// ============================================================
export const streakRecords = pgTable(
  'streak_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id)
      .unique(),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    lastActiveDate: date('last_active_date'),
    freezeCards: integer('freeze_cards').notNull().default(0),
    streakLevel: smallint('streak_level').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_streak_user').on(table.userId),
  }),
)

// ============================================================
// 10. incentive_events — 激励事件表
// ============================================================
export const incentiveEvents = pgTable(
  'incentive_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    eventType: varchar('event_type', { length: 30 }).notNull(),
    eventLevel: smallint('event_level').notNull().default(0),
    rewardContent: jsonb('reward_content').notNull().default({}),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_incentive_user').on(table.userId),
  }),
)

// ============================================================
// 11. parent_links — 家长关联表
// ============================================================
export const parentLinks = pgTable(
  'parent_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => users.id),
    childId: uuid('child_id')
      .notNull()
      .references(() => users.id),
    relation: varchar('relation', { length: 20 }).notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    settings: jsonb('settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    parentChildUnique: uniqueIndex('uq_parent_links').on(table.parentId, table.childId),
    parentIdx: index('idx_parent_links_parent').on(table.parentId),
    childIdx: index('idx_parent_links_child').on(table.childId),
  }),
)

// ============================================================
// 12. weekly_reports — 周报表
// ============================================================
export const weeklyReports = pgTable(
  'weekly_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => users.id),
    weekStart: date('week_start').notNull(),
    weekEnd: date('week_end').notNull(),
    reportContent: jsonb('report_content').notNull().default({}),
    dodoMessage: text('dodo_message'),
    parentViewed: boolean('parent_viewed').notNull().default(false),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    childWeekUnique: uniqueIndex('uq_weekly_report_child_week').on(table.childId, table.weekStart),
  }),
)

// ============================================================
// 13. dialogue_sessions — 对话会话表
// ============================================================
export const dialogueSessions = pgTable(
  'dialogue_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    sessionType: varchar('session_type', { length: 20 }).notNull().default('free_chat'),
    messages: jsonb('messages').notNull().default([]),
    emotionSnapshot: jsonb('emotion_snapshot'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('idx_dialogue_user').on(table.userId),
  }),
)

// ============================================================
// 14. starlight_records — 星光流水表
// ============================================================
export const starlightRecords = pgTable(
  'starlight_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    amount: integer('amount').notNull(),
    sourceType: varchar('source_type', { length: 30 }).notNull(),
    balance: integer('balance').notNull().default(0),
    sourceRef: varchar('source_ref', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_starlight_user').on(table.userId),
    dateIdx: index('idx_starlight_date').on(table.createdAt),
    typeIdx: index('idx_starlight_type').on(table.sourceType),
  }),
)

// ============================================================
// 15. decorations — 装饰品定义表（种子数据）
// ============================================================
export const decorations = pgTable(
  'decorations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 20 }).notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    emoji: varchar('emoji', { length: 10 }).notNull(),
    theme: varchar('theme', { length: 30 }),
    unlockType: varchar('unlock_type', { length: 30 }).notNull(),
    unlockValue: integer('unlock_value').notNull().default(0),
    slot: varchar('slot', { length: 20 }),
    gradeMin: smallint('grade_min').notNull().default(1),
    gradeMax: smallint('grade_max').notNull().default(6),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('idx_decorations_type').on(table.type),
    unlockIdx: index('idx_decorations_unlock').on(table.unlockType),
  }),
)

// ============================================================
// 16. user_decorations — 用户拥有的装饰品
// ============================================================
export const userDecorations = pgTable(
  'user_decorations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    decorationId: uuid('decoration_id')
      .notNull()
      .references(() => decorations.id),
    equipped: boolean('equipped').notNull().default(false),
    position: smallint('position').default(0),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDecoUnique: uniqueIndex('uq_user_decoration').on(table.userId, table.decorationId),
    userIdx: index('idx_user_decorations_user').on(table.userId),
    equippedIdx: index('idx_user_decorations_equipped').on(table.userId, table.equipped),
  }),
)

// ============================================================
// 17. garden_layouts — 花园布局表
// ============================================================
export const gardenLayouts = pgTable(
  'garden_layouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id)
      .unique(),
    layoutData: jsonb('layout_data').notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_garden_user').on(table.userId),
  }),
)
