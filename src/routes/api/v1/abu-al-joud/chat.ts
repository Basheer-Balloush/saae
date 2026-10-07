import { createFileRoute } from "@tanstack/react-router";
import type { LeakVerdict } from "@/features/chat/lib/chat-api-guard";

/* POST /api/v1/abu-al-joud/chat — Abu Al-Joud for other systems, with a key
   an admin issues on the chatbot page (API keys tab). How to call it:
   docs/chatbot/api.md. Everything is loaded inside the handler, so none of it
   (the website chat's prompt included) can reach the browser bundle. */

let checkReply: ((text: string) => LeakVerdict) | null = null;

export const Route = createFileRoute("/api/v1/abu-al-joud/chat")({
  server: {
    handlers: {
      // Without this a GET would render the website's page.
      GET: async () =>
        (await import("@/features/chat/lib/chat-api")).apiError("method_not_allowed"),
      POST: async ({ request }) => {
        const [{ handleApiChat, routeHandler }, { createLeakGuard }, server, site] =
          await Promise.all([
            import("@/features/chat/lib/chat-api-handler"),
            import("@/features/chat/lib/chat-api-guard"),
            import("@/features/chat/lib/chat-api.server"),
            import("@/routes/api/chat"),
          ]);
        checkReply ??= createLeakGuard(site.SYSTEM_PROMPT);
        return handleApiChat(request, {
          authorize: server.authorizeApiCall,
          siteChat: routeHandler(site.Route, "POST"),
          checkReply,
          noteBlocked: server.noteBlockedAnswer,
        });
      },
    },
  },
});
