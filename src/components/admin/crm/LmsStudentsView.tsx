import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listLmsStudents } from "@/lib/crm.functions";
import { toUserMessage } from "@/lib/safe-error";
import { useLang } from "@/lib/i18n";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";

type Student = Awaited<ReturnType<typeof listLmsStudents>>["students"][number];

export function LmsStudentsView() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const fetch = useServerFn(listLmsStudents);
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch()
      .then((r) => setRows(r.students))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, [fetch]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => (r.email ?? "").toLowerCase().includes(s));
  }, [rows, search]);

  const onExport = () => {
    void exportRowsToXlsx<Student>({
      filenameBase: `lms-students-${new Date().toISOString().slice(0, 10)}`,
      sheetName: "Students",
      rtl: ar,
      columns: [
        { header: "Email", get: (r) => r.email ?? "" },
        { header: "Enrollments", type: "number", get: (r) => r.enrollments_count },
        { header: "Completed", type: "number", get: (r) => r.completed_count },
        { header: "Avg Progress %", type: "number", get: (r) => r.avg_progress },
        { header: "Last enrolled", type: "date", get: (r) => new Date(r.last_enrolled_at) },
        { header: "Courses", get: (r) => r.courses.map((c) => (ar ? c.title_ar : c.title_en)).join(" | ") },
      ],
      rows: filtered,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ar ? "طلاب منصّة التدريب والتعلّم" : "Training & Learning Platform Students"}</h1>
          <p className="text-sm text-muted-foreground">
            {ar ? "الإجمالي" : "Total"}: <span className="font-semibold">{filtered.length}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onExport}>{ar ? "تصدير" : "Export"}</Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "بحث بالإيميل…" : "Search by email…"} className="ps-9" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">{ar ? "الإيميل" : "Email"}</th>
              <th className="px-3 py-2 text-start">{ar ? "التسجيلات" : "Enrollments"}</th>
              <th className="px-3 py-2 text-start">{ar ? "أُكملت" : "Completed"}</th>
              <th className="px-3 py-2 text-start">{ar ? "متوسط التقدم" : "Avg progress"}</th>
              <th className="px-3 py-2 text-start">{ar ? "الدورات" : "Courses"}</th>
              <th className="px-3 py-2 text-start">{ar ? "آخر تسجيل" : "Last enrolled"}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">{ar ? "لا يوجد طلاب" : "No students"}</td></tr>
            )}
            {!loading && filtered.map((r) => (
              <tr key={r.student_id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{r.email ?? r.student_id.slice(0, 8)}</td>
                <td className="px-3 py-2">{r.enrollments_count}</td>
                <td className="px-3 py-2">{r.completed_count}</td>
                <td className="px-3 py-2">{r.avg_progress}%</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.courses.slice(0, 3).map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-xs">{ar ? c.title_ar : c.title_en}</Badge>
                    ))}
                    {r.courses.length > 3 && <span className="text-xs text-muted-foreground">+{r.courses.length - 3}</span>}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{new Date(r.last_enrolled_at).toLocaleDateString(ar ? "ar" : "en")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
