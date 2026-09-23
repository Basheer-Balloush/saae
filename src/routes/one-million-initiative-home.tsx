import { createFileRoute, redirect } from "@tanstack/react-router";

/* The old-design initiative page. /initiative replaced it and opens the same
   pay, waitlist and sponsor forms, so old links and bookmarks go there. */
export const Route = createFileRoute("/one-million-initiative-home")({
  beforeLoad: () => {
    throw redirect({ to: "/initiative", statusCode: 301 });
  },
});
