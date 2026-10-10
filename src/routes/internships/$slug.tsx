// Short URL: redirects to /learning-management-system/internships/$slug. Kept so typed and shared links work.
import { createFileRoute, redirect } from "@tanstack/react-router";

/* A shortened internship link goes to the same opportunity on the learning
   platform (which also tidies a slug pasted with capitals or a full stop). */
export const Route = createFileRoute("/internships/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/learning-management-system/internships/$slug",
      params: { slug: params.slug },
      statusCode: 301,
    });
  },
});
