import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

function getClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return _client
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const client = getClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}
