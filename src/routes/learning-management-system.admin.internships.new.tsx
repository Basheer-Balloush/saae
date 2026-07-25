import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { InternshipForm, type InternshipFormValues } from "@/components/lms/InternshipForm";
import { adminUpsertInternship } from "@/lib/lms-internships-admin.functions";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { mapErr } from "./learning-management-system.admin.internships.index";

export const Route = createFileRoute("/learning-management-system/admin/internships/new")({
  head: () => ({
    meta: [
      { title: "Admin — New Internship" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewInternship,
});

function NewInternship() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const save = useServerFn(adminUpsertInternship);

  const onSubmit = async (values: InternshipFormValues) => {
    try {
      const res = await save({ data: values });
      toast.success(lang === "ar" ? "تم إنشاء الفرصة" : "Opportunity created");
      navigate({
        to: "/learning-management-system/admin/internships/$id/edit",
        params: { id: res.id },
      });
    } catch (err) {
      toast.error(mapErr(err, lang));
      throw err;
    }
  };

  return <InternshipForm mode="create" onSubmit={onSubmit} />;
}
