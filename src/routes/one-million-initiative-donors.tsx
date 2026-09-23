import { createFileRoute, redirect } from "@tanstack/react-router";

/* The old-design sponsor table. /initiative/sponsors lists the same records in
   the site's design, so old links and bookmarks go there. */
export const Route = createFileRoute("/one-million-initiative-donors")({
  beforeLoad: () => {
    throw redirect({ to: "/initiative/sponsors", statusCode: 301 });
  },
});
