import { createFileRoute } from "@tanstack/react-router";
import { CouponsPage } from "@/features/lms/coupons/CouponsPage";

export const Route = createFileRoute("/learning-management-system/admin/coupons")({
  head: () => ({ meta: [{ title: "Coupons — Learning platform — SAAE" }] }),
  component: CouponsPage,
});
