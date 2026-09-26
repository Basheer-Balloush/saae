import { createFileRoute, redirect } from "@tanstack/react-router";

/* Editing lives on the form page, in the Questions tab. */
export const Route = createFileRoute("/admin/forms/$formId/edit")({
  ssr: false,
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/admin/forms/$formId",
      params: { formId: params.formId },
      search: { tab: "build" },
    });
  },
});
