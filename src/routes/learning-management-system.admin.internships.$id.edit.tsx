import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { InternshipForm, type InternshipFormValues } from "@/components/lms/InternshipForm";
import {
  adminGetInternship,
  adminUpsertInternship,
} from "@/lib/lms-internships-admin.functions";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { mapErr } from "./learning-management-system.admin.internships.index";

export const Route = createFileRoute("/learning-management-system/admin/internships/$id/edit")({
  head: () => ({
    meta: [
      { title: "Admin — Edit Internship" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditInternship,
});

function EditInternship() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const navigate = useNavigate();
  const getFn = useServerFn(adminGetInternship);
  const save = useServerFn(adminUpsertInternship);

  const [initial, setInitial] = useState<InternshipFormValues | null>(null);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [loadingErr, setLoadingErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getFn({ data: { id } });
        if (cancelled) return;
        const o = res.opportunity;
        setApplicationsCount(res.applications_count);
        setInitial({
          id: o.id,
          title_ar: o.title_ar,
          title_en: o.title_en,
          slug: o.slug,
          summary_ar: o.summary_ar,
          summary_en: o.summary_en,
          description_ar: o.description_ar,
          description_en: o.description_en,
          requirements_ar: o.requirements_ar,
          requirements_en: o.requirements_en,
          location_ar: o.location_ar,
          location_en: o.location_en,
          duration_ar: o.duration_ar,
          duration_en: o.duration_en,
          stipend_ar: o.stipend_ar,
          stipend_en: o.stipend_en,
          capacity: o.capacity,
          starts_at: o.starts_at,
          ends_at: o.ends_at,
          opens_at: o.opens_at,
          deadline_at: o.deadline_at,
          status: o.status,
          require_cv: o.require_cv,
          allow_reapply: o.allow_reapply,
          required_profile_fields: o.required_profile_fields ?? [],
          cover_image_bucket: o.cover_image_bucket,
          cover_image_path: o.cover_image_path,
          questions: (res.questions ?? []).map((q: any, i: number) => ({
            id: q.id,
            label_ar: q.label_ar,
            label_en: q.label_en,
            help_ar: q.help_ar,
            help_en: q.help_en,
            kind: q.kind,
            is_required: q.is_required,
            options: Array.isArray(q.options) ? q.options : [],
            sort_order: q.sort_order ?? i,
          })),
        });
      } catch (err) {
        setLoadingErr(mapErr(err, lang));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getFn, lang]);

  const onSubmit = async (values: InternshipFormValues) => {
    try {
      await save({ data: { ...values, id } });
      toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
    } catch (err) {
      toast.error(mapErr(err, lang));
      throw err;
    }
  };

  if (loadingErr) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-destructive">{loadingErr}</p>
        <button
          className="mt-4 text-primary underline"
          onClick={() => navigate({ to: "/learning-management-system/admin/internships" })}
        >
          {lang === "ar" ? "العودة" : "Back"}
        </button>
      </div>
    );
  }
  if (!initial) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  return (
    <InternshipForm
      mode="edit"
      initial={initial}
      applicationsCount={applicationsCount}
      onSubmit={onSubmit}
    />
  );
}
