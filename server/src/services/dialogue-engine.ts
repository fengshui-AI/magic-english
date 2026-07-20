// ============================================================
// 对话引擎 — 儿童英语情景对话（LLM 驱动版）
//
// 保留 4 阶段状态机：
//   warmup → topic → practice → wrapup
//
// 话术生成由 LLM 驱动，不再使用硬编码话术库
// 降级方案：LLM 不可用时回退到硬编码话术库
// ============================================================

import { chat, type ChatMessage } from './llm-client.js'

export type DialogueStage = 'warmup' | 'topic' | 'practice' | 'wrapup'

export interface DialogueState {
  stage: DialogueStage
  turn: number
  topic: string
  targetWords: string[]
  targetSentence: string
  childEnglishRatio: number
  childSentenceCount: number
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
  followUp?: string
  stage: DialogueStage
}

// ============================================================
// System Prompt — 豆豆角色设定
// ============================================================

function buildSystemPrompt(state: DialogueState, grade: number): string {
  return `You are Dodo (豆豆), a friendly and encouraging virtual pet who helps Chinese children (grade ${grade}) learn English.

## Your Personality
- Warm, playful, and patient like a beloved pet
- Always encouraging, never critical
- Mix English and Chinese naturally (70% English, 30% Chinese for key hints)
- Use simple vocabulary suitable for a grade ${grade} student
- Keep responses short (1-3 sentences)

## Current Dialogue Stage: ${state.stage}
- warmup: Greet the child, ask how they feel
- topic: Introduce and discuss today's topic "${state.topic}"
- practice: Encourage the child to use target words and sentences
- wrapup: Give positive summary and say goodbye

## Today's Learning Goals
- Topic: ${state.topic}
- Target words: ${state.targetWords.join(', ')}
- Target sentence pattern: ${state.targetSentence}

## Conversation History
${state.history.slice(-6).map((t) => `${t.speaker === 'dodo' ? 'Dodo' : 'Child'}: ${t.content}`).join('\n') || '(start of conversation)'}

## Rules
1. Always respond with encouragement first, then guide the child to speak English
2. When the child uses Chinese, gently encourage: "Try saying it in English! I'll help you!"
3. When the child uses a target word, celebrate! "Wow, you said '${state.targetWords[0]}'! Amazing!"
4. NEVER correct harshly — use "Almost! Let me help you..." instead
5. Use emojis sparingly (1-2 per response max)
6. At wrapup stage, summarize what was learned and say a warm goodbye

Respond in this JSON format only:
{
  "text": "your English response to the child",
  "translation": "Chinese translation for the child",
  "expression": "happy|excited|thinking|encouraging|proud|normal",
  "animation": "bounce|wave|nod|sparkle|clap|idle",
  "followUp": "optional follow-up question to keep conversation going"
}`
}

// ============================================================
// 话题库（LLM 不可用时的降级方案）
// ============================================================
const TOPIC_POOL: Record<number, { topic: string; words: string[]; sentence: string }[]> = {
  1: [
    { topic: 'My Family', words: ['mom', 'dad', 'sister', 'brother', 'love'], sentence: 'This is my ___.' },
    { topic: 'Colors', words: ['red', 'blue', 'yellow', 'green', 'pink'], sentence: 'I like ___.' },
    { topic: 'Animals', words: ['cat', 'dog', 'fish', 'bird', 'rabbit'], sentence: 'I see a ___.' },
    { topic: 'Food', words: ['apple', 'milk', 'bread', 'egg', 'rice'], sentence: 'I want ___.' },
  ],
  2: [
    { topic: 'My School', words: ['teacher', 'classroom', 'book', 'pencil', 'friend'], sentence: 'I have a ___.' },
    { topic: 'Weather', words: ['sunny', 'rainy', 'cloudy', 'windy', 'snowy'], sentence: 'It is ___ today.' },
    { topic: 'Clothes', words: ['shirt', 'shoes', 'hat', 'dress', 'pants'], sentence: 'I wear my ___.' },
    { topic: 'Sports', words: ['run', 'jump', 'swim', 'play', 'dance'], sentence: 'I can ___.' },
  ],
  3: [
    { topic: 'Daily Routine', words: ['wake', 'eat', 'go', 'sleep', 'read'], sentence: 'I ___ every day.' },
    { topic: 'My Home', words: ['kitchen', 'bedroom', 'garden', 'door', 'window'], sentence: 'The ___ is nice.' },
    { topic: 'Transport', words: ['bus', 'car', 'bike', 'train', 'plane'], sentence: 'I go by ___.' },
    { topic: 'Feelings', words: ['happy', 'sad', 'tired', 'excited', 'brave'], sentence: 'I feel ___.' },
  ],
  4: [
    { topic: 'Hobbies', words: ['draw', 'sing', 'cook', 'camp', 'travel'], sentence: 'I like ___ing.' },
    { topic: 'Nature', words: ['mountain', 'river', 'forest', 'ocean', 'desert'], sentence: 'The ___ is beautiful.' },
    { topic: 'Festivals', words: ['birthday', 'new year', 'Christmas', 'party', 'gift'], sentence: 'On ___ we ___.' },
    { topic: 'My Dream', words: ['doctor', 'teacher', 'artist', 'scientist', 'pilot'], sentence: 'I want to be a ___.' },
  ],
  5: [
    { topic: 'Countries', words: ['China', 'USA', 'Japan', 'France', 'travel'], sentence: 'I want to visit ___.' },
    { topic: 'Technology', words: ['computer', 'robot', 'internet', 'phone', 'game'], sentence: 'I use ___ to ___.' },
    { topic: 'Environment', words: ['recycle', 'save', 'clean', 'tree', 'energy'], sentence: 'We should ___.' },
    { topic: 'Stories', words: ['hero', 'magic', 'adventure', 'brave', 'once'], sentence: 'The story is about ___.' },
  ],
  6: [
    { topic: 'Future', words: ['future', 'world', 'change', 'hope', 'dream'], sentence: 'In the future, ___.' },
    { topic: 'Friendship', words: ['together', 'share', 'help', 'trust', 'kind'], sentence: 'A good friend ___.' },
    { topic: 'Space', words: ['star', 'moon', 'planet', 'astronaut', 'rocket'], sentence: 'In space, I see ___.' },
    { topic: 'Books', words: ['story', 'character', 'page', 'read', 'imagine'], sentence: 'My favorite book is about ___.' },
  ],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function detectEnglishRatio(text: string): number {
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length
  const totalChars = text.replace(/\s/g, '').length || 1
  return englishChars / totalChars
}

// ============================================================
// 对话状态机核心
// ============================================================

export function createDialogueState(grade: number, interestTags?: string[]): DialogueState {
  const allTopics = TOPIC_POOL[grade] || TOPIC_POOL[3]
  let selectedTopic = pick(allTopics)

  // 如果有兴趣标签，优先匹配
  if (interestTags?.length) {
    const matched = allTopics.find((t) =>
      interestTags.some((tag) => t.topic.toLowerCase().includes(tag.toLowerCase())),
    )
    if (matched) selectedTopic = matched
  }

  return {
    stage: 'warmup',
    turn: 0,
    topic: selectedTopic.topic,
    targetWords: [...selectedTopic.words],
    targetSentence: selectedTopic.sentence,
    childEnglishRatio: 0,
    childSentenceCount: 0,
    history: [],
  }
}

export async function processChildMessage(
  state: DialogueState,
  message: string,
  grade: number,
): Promise<DodoReply> {
  state.history.push({
    speaker: 'child',
    content: message,
    timestamp: Date.now(),
  })

  state.childSentenceCount++
  const englishRatio = detectEnglishRatio(message)
  state.childEnglishRatio = state.childEnglishRatio * 0.7 + englishRatio * 0.3

  // 阶段切换
  if (state.stage === 'warmup' && state.turn >= 2) {
    state.stage = 'topic'
    state.turn = 0
  } else if (state.stage === 'topic' && state.turn >= 3) {
    state.stage = 'practice'
    state.turn = 0
  } else if (state.stage === 'practice' && state.turn >= 3) {
    state.stage = 'wrapup'
    state.turn = 0
  }

  state.turn++

  // 尝试 LLM 生成回复
  try {
    const reply = await generateLLMReply(state, grade)
    state.history.push({
      speaker: 'dodo',
      content: reply.text,
      translation: reply.translation,
      timestamp: Date.now(),
    })
    return reply
  } catch (err: any) {
    console.warn('LLM failed, using fallback:', err.message?.substring(0, 100))
    const reply = generateFallbackReply(state, message, englishRatio)
    state.history.push({
      speaker: 'dodo',
      content: reply.text,
      translation: reply.translation,
      timestamp: Date.now(),
    })
    return reply
  }
}

// ============================================================
// LLM 驱动的回复生成
// ============================================================

async function generateLLMReply(state: DialogueState, grade: number): Promise<DodoReply> {
  const systemPrompt = buildSystemPrompt(state, grade)

  // 根据阶段添加用户指令
  let userInstruction = ''
  switch (state.stage) {
    case 'warmup':
      userInstruction = "Start a warm greeting. Ask the child how they're doing today."
      break
    case 'topic':
      userInstruction = `Introduce today's topic "${state.topic}". Ask the child what they know or like about it.`
      break
    case 'practice':
      userInstruction = `Encourage the child to practice the sentence pattern "${state.targetSentence}" using today's words.`
      break
    case 'wrapup':
      userInstruction = 'Give a positive summary of the conversation and say a warm goodbye.'
      break
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInstruction },
  ]

  const res = await chat(messages, { temperature: 0.9 })

  // 解析 LLM 返回的 JSON
  try {
    const parsed = JSON.parse(extractJSON(res.content))
    return {
      text: parsed.text || res.content,
      translation: parsed.translation,
      expression: validateExpression(parsed.expression),
      animation: validateAnimation(parsed.animation),
      followUp: parsed.followUp,
      stage: state.stage,
    }
  } catch {
    // JSON 解析失败，直接使用原始文本
    return {
      text: res.content.trim(),
      expression: 'normal',
      animation: 'idle',
      stage: state.stage,
    }
  }
}

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : text
}

function validateExpression(e: string): DodoReply['expression'] {
  const valid = ['happy', 'excited', 'thinking', 'encouraging', 'proud', 'normal']
  return valid.includes(e) ? (e as DodoReply['expression']) : 'normal'
}

function validateAnimation(a: string): DodoReply['animation'] {
  const valid = ['bounce', 'wave', 'nod', 'sparkle', 'clap', 'idle']
  return valid.includes(a) ? (a as DodoReply['animation']) : 'idle'
}

// ============================================================
// 降级方案：丰富话术库（LLM 不可用时）
//
// 每个阶段 6-8 条话术，按英语使用率分三档：
//   high: >50% — 鼓励进阶
//   mid:  20-50% — 继续引导
//   low:  <20% — 温和鼓励
// ============================================================

interface FallbackTemplate {
  text: string
  translation: string
  expression: DodoReply['expression']
  animation: DodoReply['animation']
  followUp?: string
}

function pickFallback(pool: FallbackTemplate[]): FallbackTemplate {
  return pool[Math.floor(Math.random() * pool.length)]
}

function generateFallbackReply(
  state: DialogueState,
  message: string,
  englishRatio: number,
): DodoReply {
  const tier = englishRatio > 0.5 ? 'high' : englishRatio > 0.2 ? 'mid' : 'low'
  const w0 = state.targetWords[0] || 'it'
  const w1 = state.targetWords[1] || w0
  const topic = state.topic
  const sentence = state.targetSentence

  switch (state.stage) {
    // ============================================================
    // 暖场阶段
    // ============================================================
    case 'warmup': {
      const pool: FallbackTemplate[] = [
        {
          text: "Hello my friend! I'm so happy to see you! How are you today? 😊",
          translation: '你好朋友！见到你好开心！今天感觉怎么样？',
          expression: 'happy', animation: 'wave',
          followUp: 'What did you do today?',
        },
        {
          text: "Hi there! Did you have a good day? I'm so excited to chat with you! 🌟",
          translation: '嗨！今天过得开心吗？跟你聊天我好兴奋！',
          expression: 'excited', animation: 'bounce',
          followUp: 'Tell me something fun about your day!',
        },
        {
          text: "Welcome back! I missed you! How are you feeling right now? 💚",
          translation: '欢迎回来！我想你了！你现在感觉怎么样？',
          expression: 'happy', animation: 'wave',
          followUp: 'Are you feeling happy or tired?',
        },
        {
          text: "Hey buddy! Ready for some English fun today? Let's warm up! 🎉",
          translation: '嘿小伙伴！准备好今天的英语乐趣了吗？来暖个场吧！',
          expression: 'excited', animation: 'sparkle',
          followUp: 'What makes you happy today?',
        },
        {
          text: "Good to see you! Let's start with something easy — how are you? ☀️",
          translation: '见到你真好！咱们从简单的开始——你好吗？',
          expression: 'encouraging', animation: 'nod',
          followUp: 'Can you say "I am..."?',
        },
        {
          text: "Oh! My favorite time of day — chatting with you! How's everything? 🦕",
          translation: '哦！我一天中最喜欢的时刻——和你聊天！一切都好吗？',
          expression: 'happy', animation: 'bounce',
          followUp: 'Did anything fun happen today?',
        },
      ]
      const tpl = pickFallback(pool)
      return { ...tpl, stage: 'warmup' }
    }

    // ============================================================
    // 话题阶段
    // ============================================================
    case 'topic': {
      if (tier === 'low') {
        const pool: FallbackTemplate[] = [
          {
            text: `Let's talk about ${topic}! It's okay to use Chinese — just try one English word like "${w0}"! 😊`,
            translation: `我们聊聊${topic}吧！可以说中文，试着说一个英文词就好，比如"${w0}"！`,
            expression: 'encouraging', animation: 'nod',
            followUp: `Can you say "${w0}"?`,
          },
          {
            text: `Today's topic is ${topic}! Don't worry, even one word is amazing! Try "${w0}"! 🌱`,
            translation: `今天的话题是${topic}！别担心，说一个词就很棒了！试试"${w0}"！`,
            expression: 'encouraging', animation: 'wave',
            followUp: `What's your favorite ${w0}?`,
          },
          {
            text: `I love ${topic}! Do you know any English words about ${topic}? Let me help you! 💪`,
            translation: `我喜欢${topic}！你知道关于${topic}的英语单词吗？我来帮你！`,
            expression: 'encouraging', animation: 'nod',
            followUp: `Try saying "${w0}" — I believe in you!`,
          },
        ]
        const tpl = pickFallback(pool)
        return { ...tpl, stage: 'topic' }
      }

      if (tier === 'mid') {
        const pool: FallbackTemplate[] = [
          {
            text: `Great! You know some English about ${topic}! Can you tell me more? I love "${w0}"! 💬`,
            translation: `太棒了！你知道${topic}的英语！能多说一点吗？我喜欢"${w0}"！`,
            expression: 'excited', animation: 'sparkle',
            followUp: `What else do you know about ${topic}?`,
          },
          {
            text: `Nice! You're getting better! Let's explore ${topic} together. What do you like? 🎯`,
            translation: `不错！你越来越棒了！我们一起探索${topic}吧。你喜欢什么？`,
            expression: 'happy', animation: 'bounce',
            followUp: `Do you like ${w0} or ${w1}?`,
          },
          {
            text: `Cool! You used English! Let's keep talking about ${topic}. Can you use "${w0}" in a sentence? 🌟`,
            translation: `酷！你用了英语！我们继续聊${topic}。你能用"${w0}"造个句子吗？`,
            expression: 'proud', animation: 'sparkle',
            followUp: `Try: "I like ${w0}!"`,
          },
        ]
        const tpl = pickFallback(pool)
        return { ...tpl, stage: 'topic' }
      }

      // high
      const pool: FallbackTemplate[] = [
        {
          text: `Wow! Your English is so good! I love talking about ${topic} with you! Tell me everything! 🌈`,
          translation: `哇！你的英语太好了！跟你聊${topic}真开心！全都告诉我吧！`,
          expression: 'excited', animation: 'sparkle',
          followUp: `Can you describe ${w0} in English?`,
        },
        {
          text: `Amazing English! You sound like a pro! Let's dive deeper into ${topic}! What's your favorite thing? 🚀`,
          translation: `英语太棒了！听起来像个小专家！我们深入聊聊${topic}！你最喜欢什么？`,
          expression: 'excited', animation: 'bounce',
          followUp: `Why do you like it? Tell me in English!`,
        },
        {
          text: `You're a star! ⭐ Your English makes me so proud! Let's explore more about ${topic} together!`,
          translation: `你是个明星！⭐ 你的英语让我好骄傲！我们一起探索更多${topic}吧！`,
          expression: 'proud', animation: 'clap',
          followUp: `Can you teach me a new word about ${topic}?`,
        },
      ]
      const tpl = pickFallback(pool)
      return { ...tpl, stage: 'topic' }
    }

    // ============================================================
    // 练习阶段
    // ============================================================
    case 'practice': {
      if (tier === 'low') {
        const pool: FallbackTemplate[] = [
          {
            text: `Let's practice together! Just repeat after me: "${sentence}" — I'll help you! 🤗`,
            translation: `我们一起练习！跟着我说："${sentence}"——我来帮你！`,
            expression: 'encouraging', animation: 'nod',
            followUp: 'Ready? Repeat after me!',
          },
          {
            text: `Practice time! Don't be shy — let's try "${sentence}". I'll say it first! 🎤`,
            translation: `练习时间！别害羞——试试"${sentence}"。我先说一遍！`,
            expression: 'encouraging', animation: 'wave',
            followUp: 'Your turn! You can do it!',
          },
          {
            text: `It's practice time! Even a little try counts. Can you say one word from "${sentence}"? 🌱`,
            translation: `练习时间到！试一点点也算数。你能说"${sentence}"里的一个词吗？`,
            expression: 'thinking', animation: 'nod',
            followUp: `How about just saying "${w0}"?`,
          },
        ]
        const tpl = pickFallback(pool)
        return { ...tpl, stage: 'practice' }
      }

      if (tier === 'mid') {
        const pool: FallbackTemplate[] = [
          {
            text: `Good job! Now let's practice the sentence: "${sentence}". Try making your own! 🎯`,
            translation: `做得好！现在练习这个句子："${sentence}"。试着造你自己的！`,
            expression: 'encouraging', animation: 'sparkle',
            followUp: 'Can you change one word and make a new sentence?',
          },
          {
            text: `You're doing great! Let's practice "${sentence}" with different words. Use "${w0}" or "${w1}"! 💪`,
            translation: `你做得很棒！我们用不同的词练习"${sentence}"。用"${w0}"或"${w1}"！`,
            expression: 'happy', animation: 'bounce',
            followUp: `Try: "${sentence.replace('___', w0)}"`,
          },
          {
            text: `Practice makes perfect! Let's say "${sentence}" together — then you try alone! Ready? 🔥`,
            translation: `熟能生巧！我们一起说"${sentence}"——然后你自己试试！准备好了吗？`,
            expression: 'encouraging', animation: 'wave',
            followUp: '3, 2, 1, go!',
          },
        ]
        const tpl = pickFallback(pool)
        return { ...tpl, stage: 'practice' }
      }

      // high
      const pool: FallbackTemplate[] = [
        {
          text: `Excellent! You're ready for a challenge! Make 3 sentences with "${w0}", "${w1}", and "${sentence.split('___')[0].trim()}" 🏆`,
          translation: `太棒了！你准备好挑战了！用"${w0}"、"${w1}"造3个句子！`,
          expression: 'excited', animation: 'sparkle',
          followUp: 'I know you can do it!',
        },
        {
          text: `Super impressive! Let's level up — can you ask ME a question using "${w0}"? I'll answer! 🎮`,
          translation: `超级厉害！升级一下——你能用"${w0}"问我一个问题吗？我来回答！`,
          expression: 'excited', animation: 'bounce',
          followUp: 'Ask me anything!',
        },
        {
          text: `You're a natural! 🌟 Let's have a mini conversation — you start with "${sentence.replace('___', w0)}", and I'll reply!`,
          translation: `你天生就是学英语的料！🌟 来场迷你对话——你用"${sentence.replace('___', w0)}"开头，我回复！`,
          expression: 'proud', animation: 'clap',
          followUp: 'Your turn first!',
        },
      ]
      const tpl = pickFallback(pool)
      return { ...tpl, stage: 'practice' }
    }

    // ============================================================
    // 收尾阶段
    // ============================================================
    case 'wrapup': {
      const pool: FallbackTemplate[] = [
        {
          text: "That was so much fun! You did amazing today! I'm so proud of you! See you next time! 💝",
          translation: '太有趣了！你今天表现超棒！我为你骄傲！下次见！',
          expression: 'proud', animation: 'sparkle',
        },
        {
          text: "Time flies when we're having fun! You learned so much today! Come back soon, okay? 🌟",
          translation: '开心的时间过得真快！你今天学了好多！快点回来哦？',
          expression: 'happy', animation: 'wave',
        },
        {
          text: "What a wonderful chat! You're getting better every day! Big hug! See you tomorrow! 🤗🦕",
          translation: '多棒的聊天啊！你每天都在进步！大大拥抱！明天见！',
          expression: 'excited', animation: 'bounce',
        },
        {
          text: "Great job today! Remember the words we practiced — they're your superpowers now! Bye-bye! ⚡",
          translation: '今天做得好！记住我们练习的词——它们现在是你的超能力了！拜拜！',
          expression: 'encouraging', animation: 'sparkle',
        },
        {
          text: "I had the best time chatting with you! You're a star! Keep shining! See you soon! ⭐💚",
          translation: '跟你聊天是我最开心的时光！你是颗星星！继续发光！再见！',
          expression: 'proud', animation: 'clap',
        },
        {
          text: "All done! You worked so hard today! Give yourself a round of applause! 👏 See you next adventure!",
          translation: '完成啦！今天你很努力！给自己鼓鼓掌！👏 下次冒险见！',
          expression: 'proud', animation: 'clap',
        },
        {
          text: "That's a wrap! 🎬 You used so many English words today! I can't wait for our next chat! 💖",
          translation: '收工啦！🎬 你今天用了好多英语单词！我等不及下次聊天了！',
          expression: 'excited', animation: 'sparkle',
        },
        {
          text: "Mission accomplished! 🏅 You leveled up your English today! Sweet dreams and see you soon!",
          translation: '任务完成！🏅 你今天英语升级了！做个好梦，很快再见！',
          expression: 'happy', animation: 'wave',
        },
      ]
      const tpl = pickFallback(pool)
      return { ...tpl, stage: 'wrapup' }
    }
  }
}

// ============================================================
// 生成开场白（对话入口）
// ============================================================

export async function generateGreeting(
  grade: number,
  streak: number,
  emotion?: { pleasure: number; closeness: number },
): Promise<DodoReply> {
  // 尝试 LLM
  try {
    const systemPrompt = `You are Dodo (豆豆), a friendly virtual pet. The child is in grade ${grade}, streak ${streak} days. ${emotion ? `Emotion: pleasure=${emotion.pleasure}, closeness=${emotion.closeness}.` : ''} Give a warm, encouraging greeting. Return JSON: {"text":"...","translation":"...","expression":"happy|excited","animation":"bounce|wave|sparkle","followUp":"..."}`

    const res = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Greet the child warmly for a new conversation.' },
    ], { temperature: 0.9 })

    try {
      const parsed = JSON.parse(extractJSON(res.content))
      return {
        text: parsed.text || res.content,
        translation: parsed.translation,
        expression: validateExpression(parsed.expression),
        animation: validateAnimation(parsed.animation),
        followUp: parsed.followUp || 'What would you like to talk about?',
        stage: 'warmup',
      }
    } catch {
      // fall through
    }
  } catch (err: any) {
    console.warn('LLM greeting failed:', err.message?.substring(0, 100))
  }

  // 降级
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
    text: "Hello! Welcome back! I'm so happy to see you! Let's have a fun chat! 😊",
    translation: '你好！欢迎回来！见到你好开心！我们来场有趣的聊天吧！',
    expression: 'happy',
    animation: 'wave',
    followUp: 'What would you like to talk about?',
    stage: 'warmup',
  }
}

// ============================================================
// 话题切换
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
