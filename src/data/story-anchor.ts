// ============================================================
// 单词故事锚点库 — 按 PRD 7.2 六大原型分类
//
// 每个主题 × 每个原型 = 故事模板（含动态占位符）
// 占位符规则：
//   {word}       → 英文单词
//   {meaning}    → 中文翻译
//   {emoji}      → 单词对应 emoji
//   {sentence}   → 例句
//   {dodo}       → 豆豆的昵称（豆豆）
//   {grade}      → 年级标签（低段/中段/高段）
// ============================================================

export interface StoryAnchorTemplate {
  prototype: string       // 六大原型之一
  gradeRange: 'low' | 'mid' | 'high' | 'all'
  maxLength: number       // 最大字数
  template: string        // 故事模板（含占位符）
}

export interface ThemeStorySet {
  theme: string
  themeName: string
  stories: StoryAnchorTemplate[]
}

// ============================================================
// 六大原型说明：
//   画面联想  — 具象名词、动作动词、基础形容词
//   拟人故事  — 抽象情绪词、状态词
//   孩子生活关联 — 日常校园、家庭、游玩场景词
//   词源故事  — 多音节长单词、组合词（中高段）
//   发音梗    — 特殊发音词、同音词（中高段）
//   文化冷知识 — 节日、食物、风俗词（中高段）
// ============================================================

export const THEME_STORIES: ThemeStorySet[] = [
  // ============================================================
  // 动物主题 — 画面联想 + 拟人故事 + 文化冷知识
  // ============================================================
  {
    theme: 'animal',
    themeName: '动物',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}带你来到神奇动物王国！一只{emoji}{meaning}正朝你跑来，它有着可爱的模样。摸一摸它，记住它叫"{word}"！',
      },
      {
        prototype: '拟人故事',
        gradeRange: 'all',
        maxLength: 50,
        template: '有一天，{emoji}{meaning}来到{dodo}家做客。它说："Hello! My name is {word}!" 然后它给{dodo}讲了一个关于自己的有趣故事。',
      },
      {
        prototype: '文化冷知识',
        gradeRange: 'mid',
        maxLength: 50,
        template: '你知道吗？在英语国家，小朋友都很喜欢{meaning}。他们会说"{word}"，还会模仿{meaning}的样子做游戏！{emoji}',
      },
    ],
  },

  // ============================================================
  // 食物主题 — 画面联想 + 孩子生活关联 + 文化冷知识
  // ============================================================
  {
    theme: 'food',
    themeName: '食物',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}端出一盘香喷喷的{emoji}{meaning}！闻一闻，尝一口——嗯，这就是"{word}"的味道！你想吃吗？',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '今天早饭你吃了什么？{dodo}最爱吃{emoji}{meaning}了！每次吃的时候，{dodo}都会开心地说"I love {word}!"',
      },
      {
        prototype: '文化冷知识',
        gradeRange: 'mid',
        maxLength: 50,
        template: '在西方国家，{meaning}是很常见的食物。小朋友们在午餐时经常会说"Can I have some {word}?" 你也试试这句话吧！{emoji}',
      },
    ],
  },

  // ============================================================
  // 学校主题 — 孩子生活关联 + 画面联想
  // ============================================================
  {
    theme: 'school',
    themeName: '学校',
    stories: [
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}背着小书包跟你一起去上学！在教室里，{dodo}发现了{emoji}{meaning}。老师说：今天我们要学"{word}"！',
      },
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '魔法教室里，{dodo}拿出{emoji}{meaning}放在桌上。它闪着光说："这就是{word}！" 你记住了吗？',
      },
      {
        prototype: '拟人故事',
        gradeRange: 'all',
        maxLength: 45,
        template: '{emoji}{meaning}是一个很勤奋的小同学！每天早上它都会对{dodo}说"Good morning!" 然后开始认真地"{word}"。',
      },
    ],
  },

  // ============================================================
  // 家庭主题 — 孩子生活关联 + 拟人故事
  // ============================================================
  {
    theme: 'family',
    themeName: '家庭',
    stories: [
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}来你家做客啦！它见到了你的{emoji}{meaning}，开心地说："Nice to meet you!" 你的{meaning}微笑着说"{word}"。',
      },
      {
        prototype: '拟人故事',
        gradeRange: 'all',
        maxLength: 40,
        template: '{emoji}{meaning}和{dodo}成了好朋友！他们一起玩游戏、一起学习。{meaning}教会了{dodo}说"{word}"！',
      },
    ],
  },

  // ============================================================
  // 运动主题 — 画面联想 + 孩子生活关联
  // ============================================================
  {
    theme: 'sports',
    themeName: '运动',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}换上运动服，准备{emoji}{meaning}！它跳起来、跑起来——哇，"{word}"真好玩！你也一起来吧！',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '体育课上，{dodo}和你一起{emoji}{meaning}。你跑得飞快，{dodo}在后面喊："Go go go! You can {word}!"',
      },
      {
        prototype: '文化冷知识',
        gradeRange: 'mid',
        maxLength: 50,
        template: '在英语国家，很多小朋友都喜欢{meaning}。放学后他们会说"Let\'s go {word}!" 这是他们最喜欢的运动之一！{emoji}',
      },
    ],
  },

  // ============================================================
  // 自然主题 — 画面联想 + 文化冷知识
  // ============================================================
  {
    theme: 'nature',
    themeName: '自然',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}带你走进美丽的大自然，你们发现了{emoji}{meaning}！阳光照在上面，{dodo}轻声说："So beautiful! This is {word}."',
      },
      {
        prototype: '文化冷知识',
        gradeRange: 'mid',
        maxLength: 50,
        template: '大自然真奇妙！{emoji}{meaning}是地球上很特别的存在。探险家们看到它会兴奋地说"Look! {word}!" 你下次看到{meaning}也可以这样说！',
      },
      {
        prototype: '拟人故事',
        gradeRange: 'all',
        maxLength: 45,
        template: '{emoji}{meaning}是大自然的小精灵！风吹过的时候，它会轻轻摇动，好像在说"Hello, I am {word}!" {dodo}最喜欢和它打招呼了。',
      },
    ],
  },

  // ============================================================
  // 太空主题 — 画面联想 + 拟人故事
  // ============================================================
  {
    theme: 'space',
    themeName: '太空',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}的火箭发射了！🚀 冲出地球，你们在太空中看到了{emoji}{meaning}！{dodo}兴奋地说："Wow! It\'s {word}!"',
      },
      {
        prototype: '拟人故事',
        gradeRange: 'all',
        maxLength: 45,
        template: '{emoji}{meaning}是住在太空里的居民！每天晚上它都会对{dodo}眨眼睛，好像在说"Good night!" {dodo}给它取名叫"{word}"。',
      },
      {
        prototype: '文化冷知识',
        gradeRange: 'mid',
        maxLength: 55,
        template: '宇航员在太空中会看到{emoji}{meaning}！他们用英语说"Look at that {word}!" 太空探索是人类最伟大的冒险之一。你想当宇航员吗？',
      },
    ],
  },

  // ============================================================
  // 颜色主题 — 画面联想 + 孩子生活关联
  // ============================================================
  {
    theme: 'color',
    themeName: '颜色',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 35,
        template: '{dodo}拿出魔法调色盘，轻轻一挥——哇，{emoji}{meaning}出现了！整个世界都变成了{word}的颜色！太美了！',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '看看你身边，有什么东西是{meaning}的？{dodo}找到了！它指着说"Look! {word}!" 你也来找一找吧！{emoji}',
      },
    ],
  },

  // ============================================================
  // 天气主题 — 画面联想 + 孩子生活关联
  // ============================================================
  {
    theme: 'weather',
    themeName: '天气',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 35,
        template: '{dodo}推开窗户，外面{emoji}{meaning}了！{dodo}深呼吸说"Ah, it\'s {word} today!" 好舒服的天气呀！',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '今天天气怎么样？{dodo}看了看窗外说"Oh! It\'s {word}!" 原来今天{meaning}了。你注意到了吗？{emoji}',
      },
    ],
  },

  // ============================================================
  // 身体主题 — 画面联想 + 孩子生活关联
  // ============================================================
  {
    theme: 'body',
    themeName: '身体',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 35,
        template: '{dodo}指着自己的{emoji}{meaning}说"This is my {word}!" 你也指指你的{meaning}，跟{dodo}一起说！',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '每天早上刷牙的时候，你会看到镜子里的自己。{dodo}提醒你：你的{emoji}{meaning}就是"{word}"！记住了吗？',
      },
    ],
  },

  // ============================================================
  // 交通主题 — 画面联想 + 孩子生活关联
  // ============================================================
  {
    theme: 'transport',
    themeName: '交通',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}开着{emoji}{meaning}来接你了！嘟嘟嘟——上车吧！{dodo}一边开车一边说"Let\'s go! This is my {word}!"',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '你坐过{emoji}{meaning}吗？{dodo}第一次坐的时候好兴奋！它学会了说"I go to school by {word}." 你呢？',
      },
      {
        prototype: '文化冷知识',
        gradeRange: 'mid',
        maxLength: 50,
        template: '在不同的国家，人们用不同的交通工具。{emoji}{meaning}在英语里就是"{word}"。下次你看到它，大声说出它的英文名吧！',
      },
    ],
  },

  // ============================================================
  // 日常生活主题 — 孩子生活关联 + 拟人故事
  // ============================================================
  {
    theme: 'daily_life',
    themeName: '日常生活',
    stories: [
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '今天{dodo}和你一起做了一件有趣的事——{emoji}{meaning}！{dodo}开心地说"This is fun! I like to {word}!"',
      },
      {
        prototype: '拟人故事',
        gradeRange: 'all',
        maxLength: 45,
        template: '{emoji}{meaning}是{dodo}每天都要做的事情。早上起来，{dodo}会对自己说"Time to {word}!" 然后充满活力地开始新的一天！',
      },
    ],
  },

  // ============================================================
  // 音乐主题 — 画面联想 + 文化冷知识
  // ============================================================
  {
    theme: 'music',
    themeName: '音乐',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}拿起{emoji}{meaning}，美妙的音乐响起来了！🎵 它边演奏边唱"Listen to my {word}!" 你听到了吗？',
      },
      {
        prototype: '文化冷知识',
        gradeRange: 'mid',
        maxLength: 50,
        template: '音乐没有国界！{emoji}{meaning}在英语国家也很受欢迎。很多小朋友从小学{word}，用音乐表达自己的心情。你也想试试吗？',
      },
    ],
  },

  // ============================================================
  // 艺术主题 — 画面联想 + 孩子生活关联
  // ============================================================
  {
    theme: 'art',
    themeName: '艺术',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}拿出画笔和颜料，开始创作{emoji}{meaning}！它专注地说"I love {word}!" 你最喜欢什么艺术呢？',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '美术课上，老师让大家画{emoji}{meaning}。{dodo}画得可认真了！它学会了说"Can you draw a {word}?" 你也来画一个吧！',
      },
    ],
  },

  // ============================================================
  // 旅行主题 — 画面联想 + 孩子生活关联
  // ============================================================
  {
    theme: 'travel',
    themeName: '旅行',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}收拾好行李，准备去{emoji}{meaning}旅行！✈️ 它兴奋地说"I want to visit {word}!" 你最想去哪里呢？',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '放假的时候，{dodo}和你一起去了{emoji}{meaning}！那里好美呀！{dodo}学会了说"Welcome to {word}!" 你也来试试！',
      },
    ],
  },

  // ============================================================
  // 科学主题 — 画面联想 + 文化冷知识
  // ============================================================
  {
    theme: 'science',
    themeName: '科学',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 45,
        template: '{dodo}穿上白大褂，变成了小小科学家！🔬 它在实验室里发现了{emoji}{meaning}，激动地说"Eureka! This is {word}!"',
      },
      {
        prototype: '文化冷知识',
        gradeRange: 'mid',
        maxLength: 55,
        template: '科学的世界真奇妙！{emoji}{meaning}是科学家们的重要发现。在英语里它叫"{word}"。你知道{meaning}是怎么被发现的吗？',
      },
      {
        prototype: '词源故事',
        gradeRange: 'high',
        maxLength: 60,
        template: '你知道"{word}"这个词的来历吗？它来自科学家的命名，代表着{meaning}。{dodo}觉得会这个词的小朋友特别厉害！{emoji}',
      },
    ],
  },

  // ============================================================
  // 节日主题 — 文化冷知识 + 画面联想
  // ============================================================
  {
    theme: 'festivals',
    themeName: '节日',
    stories: [
      {
        prototype: '文化冷知识',
        gradeRange: 'mid',
        maxLength: 50,
        template: '{emoji}{meaning}是一个特别的节日！在这一天，英语国家的人们会说"Happy {word}!" {dodo}也学会了这句祝福！',
      },
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '节日到啦！🎉 {dodo}穿上节日服装，开心地庆祝{emoji}{meaning}！它大喊"Let\'s celebrate {word}!" 好热闹呀！',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 45,
        template: '你喜欢{emoji}{meaning}吗？{dodo}最喜欢过这个节日了！它学会了用英语说"I love {word}!" 你也说说看！',
      },
    ],
  },

  // ============================================================
  // 科技主题 — 画面联想 + 孩子生活关联
  // ============================================================
  {
    theme: 'technology',
    themeName: '科技',
    stories: [
      {
        prototype: '画面联想',
        gradeRange: 'all',
        maxLength: 40,
        template: '{dodo}拿出一个神奇的{emoji}{meaning}！它按下按钮说"Look! This is a {word}!" 科技真奇妙！',
      },
      {
        prototype: '孩子生活关联',
        gradeRange: 'all',
        maxLength: 40,
        template: '你用过{emoji}{meaning}吗？{dodo}第一次用的时候好惊讶！它学会了说"I use {word} every day." 你呢？',
      },
      {
        prototype: '词源故事',
        gradeRange: 'high',
        maxLength: 55,
        template: '"{word}"是一个很酷的科技词汇！它来自英语，意思就是{meaning}。{dodo}觉得学会这个词，就像掌握了一项新科技！{emoji}',
      },
    ],
  },
]

// ============================================================
// 工具函数
// ============================================================

/**
 * 根据单词主题和年级，匹配最合适的故事模板
 * @returns 填充好占位符的故事文本
 */
export function generateStory(
  word: string,
  meaning: string,
  theme: string,
  emoji: string,
  gradeLevel: number,
): { text: string; prototype: string } | null {
  const themeSet = THEME_STORIES.find((t) => t.theme === theme)
  if (!themeSet || themeSet.stories.length === 0) return null

  // 确定学段
  const gradeRange = gradeLevel <= 2 ? 'low' : gradeLevel <= 4 ? 'mid' : 'high'

  // 筛选适合该学段的故事
  const suitable = themeSet.stories.filter((s) => {
    if (s.gradeRange === 'all') return true
    if (s.gradeRange === 'low' && gradeRange === 'low') return true
    if (s.gradeRange === 'mid' && (gradeRange === 'mid' || gradeRange === 'high')) return true
    if (s.gradeRange === 'high' && gradeRange === 'high') return true
    return false
  })

  if (suitable.length === 0) return null

  // 随机选一个
  const tpl = suitable[Math.floor(Math.random() * suitable.length)]

  // 填充占位符
  const text = tpl.template
    .replace(/\{word\}/g, word)
    .replace(/\{meaning\}/g, meaning)
    .replace(/\{emoji\}/g, emoji || '')
    .replace(/\{dodo\}/g, '豆豆')
    .replace(/\{grade\}/g, gradeRange === 'low' ? '低段' : gradeRange === 'mid' ? '中段' : '高段')

  return { text, prototype: tpl.prototype }
}

/**
 * 获取主题中文名
 */
export function getThemeName(theme: string): string {
  const set = THEME_STORIES.find((t) => t.theme === theme)
  return set?.themeName || theme
}
