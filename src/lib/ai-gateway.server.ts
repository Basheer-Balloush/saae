// Server-only chat model selection for /api/chat.
// Prefers Lovable AI Gateway (LOVABLE_API_KEY) for the Lovable-hosted deployment;
// falls back to the direct OpenRouter provider (createChatModel) for the
// Cloudflare Worker staging/production deployment, which intentionally does not
// carry Lovable secrets.
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { createChatModel } from '@/lib/ai-gateway';

const LOVABLE_AIG_RUN_ID_HEADER = 'X-Lovable-AIG-Run-ID';

// Run-id capture: resends a known run id and captures the one the gateway mints.
// Never mint a run id in app code — only propagate one supplied by Lovable
// infrastructure or returned by the gateway.
export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publishRunId = (value?: string) => {
    const nextRunId = value?.trim() || undefined;
    if (!runId && nextRunId) {
      runId = nextRunId;
    }
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);

  return {
    // `fetch(...)` below is the global fetch — the object key introduces no binding.
    fetch: async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }

      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    },
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

export function getLovableAiGatewayRunId(request: Request) {
  return request.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
}

export function getLovableAiGatewayResponseHeaders(
  providerHeaders: HeadersInit | undefined,
  init?: HeadersInit,
) {
  const headers = new Headers(init);
  const exposedHeaders = new Set(
    (headers.get('Access-Control-Expose-Headers') ?? '')
      .split(',')
      .map((header) => header.trim())
      .filter(Boolean),
  );

  new Headers(providerHeaders).forEach((value, name) => {
    if (name.toLowerCase().startsWith('x-lovable-aig-')) {
      headers.set(name, value);
      exposedHeaders.add(name);
    }
  });

  headers.forEach((_, name) => {
    if (name.toLowerCase().startsWith('x-lovable-aig-')) {
      exposedHeaders.add(name);
    }
  });

  if (exposedHeaders.size > 0) {
    headers.set('Access-Control-Expose-Headers', Array.from(exposedHeaders).join(', '));
  }

  return headers;
}

export async function withLovableAiGatewayRunIdHeader(
  response: Response,
  gateway: {
    getRunId: () => string | undefined;
    waitForRunId: () => Promise<string | undefined>;
  },
  init?: HeadersInit,
) {
  if (!response.body) {
    const runId = gateway.getRunId();
    const headers = getLovableAiGatewayResponseHeaders(undefined, response.headers);
    new Headers(init).forEach((value, name) => headers.set(name, value));
    if (runId) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: getLovableAiGatewayResponseHeaders(undefined, headers),
    });
  }

  const reader = response.body.getReader();
  const firstChunk = reader.read();
  const runId = await gateway.waitForRunId();
  const headers = getLovableAiGatewayResponseHeaders(undefined, response.headers);
  new Headers(init).forEach((value, name) => headers.set(name, value));
  if (runId) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);

  const body = new ReadableStream({
    async start(controller) {
      try {
        const first = await firstChunk;
        if (first.done) {
          controller.close();
          return;
        }
        controller.enqueue(first.value);
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          controller.enqueue(chunk.value);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason?: unknown) {
      return reader.cancel(reason);
    },
  });

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: getLovableAiGatewayResponseHeaders(undefined, headers),
  });
}

export type ChatModelSelection =
  | {
      kind: 'lovable';
      model: LanguageModel;
      providerOptions: {
        openai: {
          forceReasoning: true;
          reasoningEffort: 'low';
          reasoningSummary: 'auto';
          store: false;
          include: ['reasoning.encrypted_content'];
        };
      };
      gateway: {
        getRunId: () => string | undefined;
        waitForRunId: () => Promise<string | undefined>;
      };
    }
  | {
      kind: 'openrouter';
      model: LanguageModel;
      providerOptions: undefined;
      gateway: undefined;
    };

function createLovableChatModel(request: Request): ChatModelSelection {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error('CHAT_CONFIGURATION_MISSING');

  const initialRunId = getLovableAiGatewayRunId(request);
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
  const lovable = createOpenAI({
    baseURL: 'https://ai.gateway.lovable.dev/v1',
    // Satisfies the SDK; the gateway authenticates on the Lovable-API-Key header.
    apiKey: key,
    headers: { 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    fetch: runIdFetch.fetch,
  });

  return {
    kind: 'lovable',
    model: lovable.responses('openai/gpt-6-astra'),
    // Required on /v1/responses: forceReasoning for gateway-prefixed model ids,
    // store:false + include for stateless multi-turn/tool-step item replay.
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: 'low',
        reasoningSummary: 'auto',
        store: false,
        include: ['reasoning.encrypted_content'],
      },
    },
    gateway: { getRunId: runIdFetch.getRunId, waitForRunId: runIdFetch.waitForRunId },
  };
}

export function createChatModelForRequest(request: Request): ChatModelSelection {
  if (process.env['LOVABLE_API_KEY']) {
    return createLovableChatModel(request);
  }
  // Cloudflare Worker deployment: direct OpenRouter provider (CHAT_MODEL required).
  return {
    kind: 'openrouter',
    model: createChatModel(),
    providerOptions: undefined,
    gateway: undefined,
  };
}
