import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
export function createChatModel() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.CHAT_MODEL;
  if (!apiKey || !model) throw new Error('CHAT_CONFIGURATION_MISSING');
  return createOpenAICompatible({
    name: 'openrouter', baseURL: 'https://openrouter.ai/api/v1',
    headers: { Authorization: `Bearer ${apiKey}` },
  })(model);
}
