import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Field = {
  id: string; field_type: string;
  label_ar: string; label_en: string | null;
};

type Answer = { field_id: string; value: unknown };

export function EnrollmentResponseViewer({
  open, onOpenChange, requestId, courseId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  courseId: string;
}) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [noResponse, setNoResponse] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setNoResponse(false);
      const { data: resp } = await supabase
        .from("lms_enrollment_form_responses")
        .select("answers")
        .eq("request_id", requestId)
        .maybeSingle();
      if (!resp) {
        setNoResponse(true);
        setLoading(false);
        return;
      }
      setAnswers((resp.answers as Answer[]) ?? []);
      const { data: f } = await supabase
        .from("lms_course_forms").select("id").eq("course_id", courseId).maybeSingle();
      if (f) {
        const { data: ff } = await supabase
          .from("lms_course_form_fields")
          .select("id,field_type,label_ar,label_en")
          .eq("form_id", f.id)
          .order("display_order");
        setFields((ff as Field[]) ?? []);
      }
      setLoading(false);
    })();
  }, [open, requestId, courseId]);

  const openFile = async (path: string) => {
    const { data } = await supabase.storage.from("lms-private").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const renderValue = (field: Field, value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">—</span>;
    }
    if (field.field_type === "yes_no") return <span>{value === true ? (ar ? "نعم" : "Yes") : (ar ? "لا" : "No")}</span>;
    if (field.field_type === "multi_choice" && Array.isArray(value)) return <span>{value.join(", ")}</span>;
    if (field.field_type === "file" && typeof value === "string") {
      return (
        <Button size="sm" variant="outline" onClick={() => openFile(value)}>
          <ExternalLink className="h-3.5 w-3.5 mx-1" />
          {ar ? "فتح الملف" : "Open file"}
        </Button>
      );
    }
    return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ar ? "إجابات نموذج التسجيل" : "Form answers"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            <Loader2 className="h-4 w-4 animate-spin inline mx-1" />
            {ar ? "جاري التحميل..." : "Loading..."}
          </p>
        ) : noResponse ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {ar ? "لا يوجد نموذج مرتبط بهذا الطلب." : "No form response for this request."}
          </p>
        ) : (
          <div className="space-y-3">
            {(() => {
              const baseFields: Field[] = [
                { id: "__base_full_name", field_type: "short_text", label_ar: "الاسم الكامل", label_en: "Full name" },
                { id: "__base_phone", field_type: "short_text", label_ar: "رقم الهاتف", label_en: "Phone number" },
                { id: "__base_email", field_type: "short_text", label_ar: "البريد الإلكتروني", label_en: "Email" },
              ];
              const allFields = [...baseFields, ...fields.filter((f) => !f.id.startsWith("__base_"))];
              return allFields.map((f) => {
                const ans = answers.find((a) => a.field_id === f.id);
                const label = ar ? f.label_ar : f.label_en || f.label_ar;
                return (
                  <div key={f.id} className="rounded-md border border-border p-3 bg-background">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
                    <div className="text-sm text-foreground">{renderValue(f, ans?.value)}</div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
