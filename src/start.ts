import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const lmsSubdomainRedirectMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.hostname).split(":")[0];
  if (host === "lms.aisyria.org" && !url.pathname.startsWith("/learning-management-system")) {
    url.hostname = host;
    url.pathname = "/learning-management-system";
    return Response.redirect(url.toString(), 302);
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [lmsSubdomainRedirectMiddleware, errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
