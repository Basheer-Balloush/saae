import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Aggressive caching to support thousands of concurrent users.
        // Most public content (news, courses, members, partners) changes
        // infrequently — keep cached data fresh for 5 minutes and in memory
        // for 30 minutes to massively reduce DB load.
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
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

