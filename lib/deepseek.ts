import OpenAI from 'openai'

let _client: OpenAI | null = null

function getClient() {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY!,
      baseURL: 'https://api.deepseek.com',
    })
  }
  return _client
}

export async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const client = getClient()
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: options.maxTokens ?? 512,
    temperature: options.temperature ?? 0.1,
  })
  return response.choices[0].message.content ?? ''
}
