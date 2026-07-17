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
// 降级方案：硬编码话术（LLM 不可用时）
// ============================================================

function generateFallbackReply(
  state: DialogueState,
  _message: string,
  englishRatio: number,
): DodoReply {
  switch (state.stage) {
    case 'warmup':
      return {
        text: "Hello my friend! I'm so happy to see you! How are you today? 😊",
        translation: '你好朋友！见到你好开心！今天怎么样？',
        expression: 'happy',
        animation: 'wave',
        followUp: 'What did you do today?',
        stage: 'warmup',
      }

    case 'topic':
      if (englishRatio < 0.2) {
        return {
          text: `Let's talk about ${state.topic}! Try saying a little in English — even one word is great! 😊`,
          translation: `我们聊聊${state.topic}吧！试着用英语说一点点，一个词也很棒！`,
          expression: 'encouraging',
          animation: 'nod',
          followUp: `Can you say "${state.targetWords[0]}"?`,
          stage: 'topic',
        }
      }
      return {
        text: `Wow, great English! Let's talk more about ${state.topic}!`,
        translation: `哇，英语说得真好！我们多聊聊${state.topic}！`,
        expression: 'excited',
        animation: 'sparkle',
        followUp: `Can you make a sentence with "${state.targetWords[0]}"?`,
        stage: 'topic',
      }

    case 'practice':
      return {
        text: `Now let's practice! Try saying: "${state.targetSentence}"`,
        translation: `现在来练习！试试说："${state.targetSentence}"`,
        expression: 'encouraging',
        animation: 'wave',
        followUp: 'You can do it!',
        stage: 'practice',
      }

    case 'wrapup':
      return {
        text: 'That was so fun! You did great today! See you next time! 💝',
        translation: '太有趣了！你今天表现很棒！下次见！',
        expression: 'proud',
        animation: 'sparkle',
        stage: 'wrapup',
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
