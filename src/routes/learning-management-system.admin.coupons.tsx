import { createFileRoute, redirect } from "@tanstack/react-router";

/* Coupons were switched off (enrolment is by approval only). The old codes
   stay in lms_coupons; the page is gone from the console. */
export const Route = createFileRoute("/learning-management-system/admin/coupons")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/learning-management-system/admin/settings" });
  },
});
