import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Prefetch route code + loader data when the user hovers or touches a Link
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Avoid loading-flash for fast routes; show pending UI only if >150ms
    defaultPendingMs: 150,
    defaultPendingMinMs: 100,
  });

  return router;
};

