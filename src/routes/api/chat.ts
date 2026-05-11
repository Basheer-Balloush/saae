import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

type ChatRequestBody = { messages?: unknown };

const SYSTEM_PROMPT = `أنت "مساعد الجمعية الذكي" — المساعد الرسمي للجمعية السورية للذكاء الاصطناعي وريادة الأعمال (SAAE).
- أجب بنفس لغة المستخدم (عربي أو إنكليزي).
- كن ودوداً، موجزاً، ومهنياً.
- ساعد الزوار بالاستفسارات حول البرامج، المجتمعات، الفعاليات، الشراكات، والتسجيل.
- إذا لم تعرف الإجابة، اقترح التواصل عبر info@aisyria.org.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
