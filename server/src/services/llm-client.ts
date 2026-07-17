// ============================================================
// LLM 客户端 — 统一封装 OpenAI 兼容接口
//
// 支持 Agnes AI / 腾讯混元 / 智谱 GLM / DeepSeek / OpenAI
// 只需在 .env 中修改 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
// ============================================================

import 'dotenv/config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
  maxTokens?: number
  temperature?: number
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// 默认配置 — Agnes AI
const DEFAULT_CONFIG: LLMConfig = {
  baseUrl: process.env.LLM_BASE_URL || 'https://apihub.agnes-ai.com/v1',
  apiKey: process.env.LLM_API_KEY || '',
  model: process.env.LLM_MODEL || 'agnes-1.5-flash',
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '512'),
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.8'),
}

/**
 * 发送聊天请求
 */
export async function chat(
  messages: ChatMessage[],
  config?: Partial<LLMConfig>,
): Promise<LLMResponse> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  if (!cfg.apiKey) {
    throw new Error('LLM_API_KEY not configured — set it in server/.env')
  }

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`LLM API error ${response.status}: ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  return {
    content,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  }
}

/**
 * 简单单轮对话（无上下文）
 */
export async function simpleChat(
  userMessage: string,
  systemPrompt?: string,
): Promise<string> {
  const messages: ChatMessage[] = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: userMessage })

  const res = await chat(messages)
  return res.content
}
