// ============================================================
// 对话引擎 — 儿童英语情景对话状态机 + 话术生成
//
// 对话策略：
//   - 阶段1 暖场 (warmup)：简单问候 + 情绪感知
//   - 阶段2 话题 (topic)：基于兴趣/教材的引导对话
//   - 阶段3 练习 (practice)：鼓励孩子用目标句型/词汇回答
//   - 阶段4 收尾 (wrapup)：正向反馈 + 总结 + 期待下次
//
// 中英夹杂策略：豆豆说英文为主，关键处给中文提示
// ============================================================

export type DialogueStage = 'warmup' | 'topic' | 'practice' | 'wrapup'

export interface DialogueState {
  stage: DialogueStage
  turn: number
  totalTurns: number
  topic: string
  targetWords: string[]
  targetSentence: string
  childEnglishRatio: number // 孩子说英文的比例
  childSentenceCount: number
  lastChildMessage: string
  history: DialogueTurn[]
}

export interface DialogueTurn {
  speaker: 'dodo' | 'child'
  content: string
  translation?: string
  timestamp: number
}

export interface DodoReply {
  text: string
  translation?: string
  expression: 'happy' | 'excited' | 'thinking' | 'encouraging' | 'proud' | 'normal'
  animation: 'bounce' | 'wave' | 'nod' | 'sparkle' | 'clap' | 'idle'
  followUp?: string // 追问/引导
  stage: DialogueStage
}

// ============================================================
// 话题库（按年级 + 主题组织）
// ============================================================
const TOPIC_POOL: Record<number, TopicSet[]> = {
  1: [
    {
      topic: 'My Family',
      words: ['mom', 'dad', 'sister', 'brother', 'love'],
      sentence: 'This is my ___.',
    },
    { topic: 'Colors', words: ['red', 'blue', 'yellow', 'green', 'pink'], sentence: 'I like ___.' },
    { topic: 'Animals', words: ['cat', 'dog', 'fish', 'bird', 'rabbit'], sentence: 'I see a ___.' },
    { topic: 'Food', words: ['apple', 'milk', 'bread', 'egg', 'rice'], sentence: 'I want ___.' },
    {
      topic: 'My Body',
      words: ['head', 'hand', 'eye', 'nose', 'mouth'],
      sentence: 'This is my ___.',
    },
  ],
  2: [
    {
      topic: 'My School',
      words: ['teacher', 'classroom', 'book', 'pencil', 'friend'],
      sentence: 'I have a ___.',
    },
    {
      topic: 'Weather',
      words: ['sunny', 'rainy', 'cloudy', 'windy', 'snowy'],
      sentence: 'It is ___ today.',
    },
    {
      topic: 'Clothes',
      words: ['shirt', 'shoes', 'hat', 'dress', 'pants'],
      sentence: 'I wear my ___.',
    },
    { topic: 'Sports', words: ['run', 'jump', 'swim', 'play', 'dance'], sentence: 'I can ___.' },
    {
      topic: 'Fruits',
      words: ['banana', 'orange', 'grape', 'watermelon', 'strawberry'],
      sentence: 'I like ___s.',
    },
  ],
  3: [
    {
      topic: 'Daily Routine',
      words: ['wake', 'eat', 'go', 'sleep', 'read'],
      sentence: 'I ___ every day.',
    },
    {
      topic: 'My Home',
      words: ['kitchen', 'bedroom', 'garden', 'door', 'window'],
      sentence: 'The ___ is nice.',
    },
    {
      topic: 'Transport',
      words: ['bus', 'car', 'bike', 'train', 'plane'],
      sentence: 'I go by ___.',
    },
    {
      topic: 'Feelings',
      words: ['happy', 'sad', 'tired', 'excited', 'brave'],
      sentence: 'I feel ___.',
    },
    {
      topic: 'Shopping',
      words: ['buy', 'shop', 'money', 'toy', 'book'],
      sentence: 'I want to buy ___.',
    },
  ],
  4: [
    {
      topic: 'Hobbies',
      words: ['draw', 'sing', 'cook', 'camp', 'travel'],
      sentence: 'I like ___ing.',
    },
    {
      topic: 'Nature',
      words: ['mountain', 'river', 'forest', 'ocean', 'desert'],
      sentence: 'The ___ is beautiful.',
    },
    {
      topic: 'Festivals',
      words: ['birthday', 'new year', 'Christmas', 'party', 'gift'],
      sentence: 'On ___ we ___.',
    },
    {
      topic: 'My Dream',
      words: ['doctor', 'teacher', 'artist', 'scientist', 'pilot'],
      sentence: 'I want to be a ___.',
    },
    {
      topic: 'Health',
      words: ['healthy', 'strong', 'exercise', 'vegetable', 'sleep'],
      sentence: 'To be healthy, I ___.',
    },
  ],
  5: [
    {
      topic: 'Countries',
      words: ['China', 'USA', 'Japan', 'France', 'travel'],
      sentence: 'I want to visit ___.',
    },
    {
      topic: 'Technology',
      words: ['computer', 'robot', 'internet', 'phone', 'game'],
      sentence: 'I use ___ to ___.',
    },
    {
      topic: 'Environment',
      words: ['recycle', 'save', 'clean', 'tree', 'energy'],
      sentence: 'We should ___.',
    },
    {
      topic: 'Stories',
      words: ['once upon', 'hero', 'magic', 'adventure', 'brave'],
      sentence: 'The story is about ___.',
    },
    {
      topic: 'Music',
      words: ['piano', 'guitar', 'song', 'listen', 'dance'],
      sentence: 'I enjoy ___ music.',
    },
  ],
  6: [
    {
      topic: 'Future',
      words: ['future', 'world', 'change', 'hope', 'dream'],
      sentence: 'In the future, ___.',
    },
    {
      topic: 'Friendship',
      words: ['together', 'share', 'help', 'trust', 'kind'],
      sentence: 'A good friend ___.',
    },
    {
      topic: 'Space',
      words: ['star', 'moon', 'planet', 'astronaut', 'rocket'],
      sentence: 'In space, I see ___.',
    },
    {
      topic: 'Books',
      words: ['story', 'character', 'page', 'read', 'imagine'],
      sentence: 'My favorite book is about ___.',
    },
    {
      topic: 'Food Culture',
      words: ['noodle', 'pizza', 'sushi', 'delicious', 'cook'],
      sentence: '___ is a popular food.',
    },
  ],
}

interface TopicSet {
  topic: string
  words: string[]
  sentence: string
}

// ============================================================
// 暖场话术库
// ============================================================
const WARMUP_PHRASES = [
  {
    text: 'Hello my friend! How are you today? 😊',
    translation: '你好朋友！今天怎么样？',
    expression: 'happy' as const,
    animation: 'wave' as const,
  },
  {
    text: "I'm so happy to see you! Let's chat!",
    translation: '见到你好开心！我们聊聊天吧！',
    expression: 'excited' as const,
    animation: 'bounce' as const,
  },
  {
    text: 'Hi! Did you have a good day?',
    translation: '嗨！你今天过得好吗？',
    expression: 'normal' as const,
    animation: 'nod' as const,
  },
  {
    text: 'Welcome back! I missed you!',
    translation: '欢迎回来！我想你了！',
    expression: 'happy' as const,
    animation: 'sparkle' as const,
  },
  {
    text: "Yay! It's chat time! 🎉",
    translation: '耶！聊天时间到！',
    expression: 'excited' as const,
    animation: 'bounce' as const,
  },
]

// ============================================================
// 鼓励/引导话术
// ============================================================
const ENCOURAGE_PHRASES = [
  {
    text: "Wow, that's great! Tell me more!",
    translation: '哇，太棒了！再跟我说说！',
    expression: 'excited' as const,
    animation: 'sparkle' as const,
  },
  {
    text: "You're doing amazing! Try saying it in English?",
    translation: '你说得太好了！试试用英语说？',
    expression: 'encouraging' as const,
    animation: 'nod' as const,
  },
  {
    text: 'I love your answer! Can you say it again?',
    translation: '我喜欢你的回答！可以再说一次吗？',
    expression: 'happy' as const,
    animation: 'clap' as const,
  },
  {
    text: 'Good try! Let me help you say it.',
    translation: '很好的尝试！让我帮你一起说。',
    expression: 'encouraging' as const,
    animation: 'nod' as const,
  },
  {
    text: 'That sounds interesting! 🌟',
    translation: '听起来很有趣！',
    expression: 'thinking' as const,
    animation: 'idle' as const,
  },
  {
    text: "Awesome! You're getting better every day!",
    translation: '太厉害了！你每天都在进步！',
    expression: 'proud' as const,
    animation: 'bounce' as const,
  },
  {
    text: "Cool! Let's practice this word together!",
    translation: '酷！我们一起练习这个词！',
    expression: 'happy' as const,
    animation: 'wave' as const,
  },
]

const WRAPUP_PHRASES = [
  {
    text: 'That was so fun! I loved chatting with you! 💝',
    translation: '太有趣了！我喜欢和你聊天！',
    expression: 'happy' as const,
    animation: 'sparkle' as const,
  },
  {
    text: 'You did great today! See you next time!',
    translation: '你今天表现很棒！下次见！',
    expression: 'proud' as const,
    animation: 'wave' as const,
  },
  {
    text: "Time flies when we're having fun! Bye bye!",
    translation: '开心的时候时间过得真快！拜拜！',
    expression: 'happy' as const,
    animation: 'bounce' as const,
  },
  {
    text: 'I learned so much from you! Goodbye friend!',
    translation: '我从你那里学到了好多！再见朋友！',
    expression: 'excited' as const,
    animation: 'clap' as const,
  },
]

// ============================================================
// 辅助函数
// ============================================================
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function detectEnglishRatio(text: string): number {
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length
  const totalChars = text.replace(/\s/g, '').length || 1
  return englishChars / totalChars
}

function extractKeywords(text: string, words: string[]): string[] {
  const lower = text.toLowerCase()
  return words.filter((w) => lower.includes(w.toLowerCase()))
}

// ============================================================
// 对话状态机核心
// ============================================================
export function createDialogueState(grade: number, interestTags?: string[]): DialogueState {
  const topicSet = pick(TOPIC_POOL[grade] || TOPIC_POOL[3])
  // 如果有兴趣标签，优先匹配相关话题
  const allTopics = TOPIC_POOL[grade] || TOPIC_POOL[3]
  let selectedTopic = topicSet
  if (interestTags?.length) {
    const matched = allTopics.find((t) =>
      interestTags.some((tag) => t.topic.toLowerCase().includes(tag.toLowerCase())),
    )
    if (matched) selectedTopic = matched
  }

  return {
    stage: 'warmup',
    turn: 0,
    totalTurns: 0,
    topic: selectedTopic.topic,
    targetWords: [...selectedTopic.words],
    targetSentence: selectedTopic.sentence,
    childEnglishRatio: 0,
    childSentenceCount: 0,
    lastChildMessage: '',
    history: [],
  }
}

export function processChildMessage(state: DialogueState, message: string): DodoReply {
  state.totalTurns++
  state.lastChildMessage = message
  state.childSentenceCount++

  const englishRatio = detectEnglishRatio(message)
  // 加权移动平均
  state.childEnglishRatio = state.childEnglishRatio * 0.7 + englishRatio * 0.3

  // 检测孩子是否用了目标词汇
  const usedKeywords = extractKeywords(message, state.targetWords)

  // 阶段切换逻辑
  if (state.stage === 'warmup' && state.turn >= 2) {
    state.stage = 'topic'
    state.turn = 0
    return generateTopicIntro(state)
  }

  if (state.stage === 'topic' && state.turn >= 3) {
    state.stage = 'practice'
    state.turn = 0
    return generatePracticePrompt(state)
  }

  if (state.stage === 'practice' && (state.turn >= 3 || usedKeywords.length >= 2)) {
    state.stage = 'wrapup'
    state.turn = 0
    return generateWrapup(state)
  }

  state.turn++

  // 根据阶段生成回复
  switch (state.stage) {
    case 'warmup':
      return generateWarmupReply(state, message, englishRatio)
    case 'topic':
      return generateTopicReply(state, message, usedKeywords, englishRatio)
    case 'practice':
      return generatePracticeReply(state, message, usedKeywords, englishRatio)
    case 'wrapup':
      return generateWrapup(state)
    default:
      return generateWarmupReply(state, message, englishRatio)
  }
}

// ============================================================
// 各阶段回复生成
// ============================================================
function generateWarmupReply(
  state: DialogueState,
  _message: string,
  englishRatio: number,
): DodoReply {
  if (state.turn === 1) {
    const phrase = pick(WARMUP_PHRASES)
    return {
      text: phrase.text,
      translation: phrase.translation,
      expression: phrase.expression,
      animation: phrase.animation,
      followUp: 'You can answer in English or Chinese!',
      stage: 'warmup',
    }
  }
  // 后续暖场回复
  return {
    text:
      englishRatio > 0.3
        ? 'Great English! I love talking with you!'
        : "It's okay to try English! I'll help you!",
    translation:
      englishRatio > 0.3 ? '英语说得真好！我喜欢和你聊天！' : '试着说英语没关系！我会帮你的！',
    expression: 'encouraging',
    animation: 'nod',
    followUp: 'What did you do today?',
    stage: 'warmup',
  }
}

function generateTopicIntro(state: DialogueState): DodoReply {
  const topic = state.topic
  const introTemplates = [
    {
      text: `Let's talk about ${topic}! I love ${topic}! What do you think?`,
      translation: `我们聊聊${topic}吧！我喜欢${topic}！你觉得呢？`,
      expression: 'excited' as const,
      animation: 'sparkle' as const,
    },
    {
      text: `Today's topic is ${topic}! Tell me what you know about it!`,
      translation: `今天的话题是${topic}！跟我说说你知道的吧！`,
      expression: 'happy' as const,
      animation: 'wave' as const,
    },
    {
      text: `Do you like ${topic}? I want to hear your thoughts!`,
      translation: `你喜欢${topic}吗？我想听听你的想法！`,
      expression: 'thinking' as const,
      animation: 'nod' as const,
    },
  ]
  const tpl = pick(introTemplates)
  return {
    text: tpl.text,
    translation: tpl.translation,
    expression: tpl.expression,
    animation: tpl.animation,
    followUp: `Can you say something about ${topic}?`,
    stage: 'topic',
  }
}

function generateTopicReply(
  state: DialogueState,
  _message: string,
  usedKeywords: string[],
  englishRatio: number,
): DodoReply {
  if (usedKeywords.length > 0) {
    return {
      text: `Oh, you said "${usedKeywords[0]}"! That's one of today's words! Great job! 🌟`,
      translation: `哦，你说了"${usedKeywords[0]}"！这是今天的单词之一！太棒了！`,
      expression: 'excited',
      animation: 'sparkle',
      followUp: `Can you make a sentence with "${usedKeywords[0]}"?`,
      stage: 'topic',
    }
  }

  if (englishRatio < 0.2) {
    return {
      text: 'Try saying a little in English! Even one word is great! 😊',
      translation: '试着用英语说一点点！一个词也很棒！',
      expression: 'encouraging',
      animation: 'nod',
      followUp: `For example, you can say "I like ${state.targetWords[0]}"`,
      stage: 'topic',
    }
  }

  const phrase = pick(ENCOURAGE_PHRASES)
  return {
    text: phrase.text,
    translation: phrase.translation,
    expression: phrase.expression,
    animation: phrase.animation,
    followUp: `Can you use the word "${state.targetWords[Math.floor(Math.random() * state.targetWords.length)]}"?`,
    stage: 'topic',
  }
}

function generatePracticePrompt(state: DialogueState): DodoReply {
  return {
    text: `Now let's practice! Try saying this: "${state.targetSentence}"`,
    translation: `现在来练习！试试说这个句子："${state.targetSentence}"`,
    expression: 'encouraging',
    animation: 'wave',
    followUp: "You can replace the blank with today's word!",
    stage: 'practice',
  }
}

function generatePracticeReply(
  state: DialogueState,
  _message: string,
  usedKeywords: string[],
  englishRatio: number,
): DodoReply {
  if (englishRatio > 0.5) {
    return {
      text: 'Excellent! Your English is getting better and better! 🎉',
      translation: '太棒了！你的英语越来越好了！',
      expression: 'proud',
      animation: 'clap',
      followUp: `One more time! Try: "${state.targetSentence}"`,
      stage: 'practice',
    }
  }

  if (usedKeywords.length > 0) {
    return {
      text: `You used "${usedKeywords[0]}"! Now let me hear the full sentence!`,
      translation: `你用了"${usedKeywords[0]}"！现在让我听听完整的句子！`,
      expression: 'happy',
      animation: 'nod',
      followUp: state.targetSentence,
      stage: 'practice',
    }
  }

  return {
    text: 'Almost there! Listen to me and repeat: ' + state.targetSentence,
    translation: '快了！听我说然后重复：' + state.targetSentence,
    expression: 'encouraging',
    animation: 'nod',
    stage: 'practice',
  }
}

function generateWrapup(state: DialogueState): DodoReply {
  const phrase = pick(WRAPUP_PHRASES)
  return {
    text: phrase.text,
    translation: phrase.translation,
    expression: phrase.expression,
    animation: phrase.animation,
    stage: 'wrapup',
  }
}

// ============================================================
// 导出：生成 Dodo 开场白（对话入口）
// ============================================================
export function generateGreeting(
  grade: number,
  streak: number,
  emotion?: { pleasure: number; closeness: number },
): DodoReply {
  const phrase = pick(WARMUP_PHRASES)

  // 根据情感状态调整问候
  if (emotion && emotion.closeness > 0.6) {
    return {
      text: "Hey bestie! I'm so excited to chat with you! 💖",
      translation: '嘿好朋友！跟你聊天我好兴奋！',
      expression: 'excited',
      animation: 'bounce',
      followUp: 'What shall we talk about today?',
      stage: 'warmup',
    }
  }

  if (streak >= 7) {
    return {
      text: `${streak} days in a row! You're on fire! Let's have a fun chat today! 🔥`,
      translation: `连续${streak}天了！你太厉害了！今天来场有趣的对话吧！`,
      expression: 'excited',
      animation: 'sparkle',
      followUp: 'How are you feeling today?',
      stage: 'warmup',
    }
  }

  return {
    text: phrase.text,
    translation: phrase.translation,
    expression: phrase.expression,
    animation: phrase.animation,
    followUp: 'What would you like to talk about?',
    stage: 'warmup',
  }
}

// ============================================================
// 导出：话题切换
// ============================================================
export function switchTopic(
  grade: number,
  currentTopic: string,
): { topic: string; words: string[]; sentence: string } {
  const topics = TOPIC_POOL[grade] || TOPIC_POOL[3]
  const others = topics.filter((t) => t.topic !== currentTopic)
  const selected = pick(others.length > 0 ? others : topics)
  return {
    topic: selected.topic,
    words: [...selected.words],
    sentence: selected.sentence,
  }
}
