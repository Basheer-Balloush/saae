// Server-only chat model selection for /api/chat: Gemini, with OpenRouter as the
// emergency fallback (see ai-gateway.ts). The Lovable AI Gateway is not used.
import type { LanguageModel } from 'ai';
import { createChatModel } from '@/features/chat/lib/ai-gateway';

export type ChatModelSelection = { kind: 'direct'; model: LanguageModel };

export function createChatModelForRequest(): ChatModelSelection {
  return { kind: 'direct', model: createChatModel() };
}
