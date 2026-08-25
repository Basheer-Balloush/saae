import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, Loader2 } from "lucide-react";

import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconActionButton } from "@/components/admin/IconActionButton";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import {
  adminGetRegistrationLink,
  adminSetRegistrationLinkActive,
  type RegistrationLink,
  type RegistrationSubmission,
} from "@/lib/crm-registration-links.functions";
import { publicJoinUrl } from "@/lib/registration-link-url";

export const Route = createFileRoute("/admin/crm/registration-links/$id")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Registration link submissions — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RegistrationLinkDetailPage,
  errorComponent: ({ error }) => (
    <div
      role="alert"
      className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {error.message}
    </div>
  ),
});

function RegistrationLinkDetailPage() {
  const { id } = Route.useParams();
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const getFn = useServerFn(adminGetRegistrationLink);
  const toggleFn = useServerFn(adminSetRegistrationLinkActive);

  const [link, setLink] = useState<RegistrationLink | null>(null);
  const [rows, setRows] = useState<RegistrationSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFn({ data: { id } });
      setLink(res.link);
      setRows(res.submissions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [getFn, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async () => {
    if (!link) return;
    setBusy(true);
    try {
      await toggleFn({ data: { id: link.id, is_active: !link.is_active } });
      setLink({ ...link, is_active: !link.is_active });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(publicJoinUrl(link.token));
      toast.success(ar ? "تم نسخ الرابط" : "Link copied");
    } catch {
      toast.error(ar ? "تعذّر النسخ" : "Could not copy");
    }
  };

  const onExport = async () => {
    await exportRowsToXlsx({
      filenameBase: "registration-link-submissions",
      sheetName: "Submissions",
      rtl: ar,
      rows,
      columns: [
        { header: ar ? "الاسم" : "Full name", get: (r) => r.full_name, width: 28 },
        { header: ar ? "البريد" : "Email", get: (r) => r.email, width: 28 },
        { header: ar ? "الهاتف" : "Phone", get: (r) => r.phone, width: 18 },
        { header: ar ? "التخصص" : "Specialty", get: (r) => r.specialty, width: 22 },
        { header: ar ? "مجال العمل" : "Field of work", get: (r) => r.work_field, width: 22 },
        { header: ar ? "العنوان" : "Address", get: (r) => r.address, width: 26 },
        { header: ar ? "ملاحظات" : "Note", get: (r) => r.short_description, width: 40 },
        {
          header: ar ? "التاريخ" : "Submitted at",
          type: "date",
          get: (r) => r.created_at,
          width: 20,
        },
      ],
    });
  };

  return (
    <section className="space-y-4" dir={dir}>
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/crm/registration-links">
          <ArrowLeft className="h-4 w-4" />
          <span className="mx-1">{ar ? "العودة إلى الروابط" : "Back to links"}</span>
        </Link>
      </Button>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error || !link ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <span>{ar ? "تعذّر تحميل الرابط." : "Could not load this registration link."}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            {ar ? "إعادة المحاولة" : "Retry"}
          </Button>
        </div>
      ) : (
        <>
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground" dir="auto">
                  {link.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {ar ? "عدد التسجيلات" : "Submissions"}: {rows.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={link.is_active}
                  disabled={busy}
                  onCheckedChange={() => void onToggle()}
                  aria-label={ar ? "تفعيل الرابط" : "Toggle link"}
                />
                <Badge variant={link.is_active ? "default" : "secondary"}>
                  {link.is_active ? (ar ? "فعّال" : "Active") : ar ? "متوقف" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input readOnly value={publicJoinUrl(link.token)} className="max-w-md" dir="ltr" />
              <IconActionButton
                icon={Copy}
                label={ar ? "نسخ الرابط" : "Copy link"}
                onClick={() => void onCopy()}
                variant="outline"
              />
              <IconActionButton
                icon={Download}
                label={ar ? "تصدير Excel" : "Export Excel"}
                onClick={() => void onExport()}
                variant="outline"
                disabled={rows.length === 0}
              />
            </div>
          </Card>

          <Card className="overflow-x-auto">
            {rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {ar ? "لا توجد تسجيلات بعد." : "No submissions yet."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ar ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{ar ? "البريد" : "Email"}</TableHead>
                    <TableHead>{ar ? "الهاتف" : "Phone"}</TableHead>
                    <TableHead>{ar ? "التخصص" : "Specialty"}</TableHead>
                    <TableHead>{ar ? "مجال العمل" : "Field of work"}</TableHead>
                    <TableHead>{ar ? "التاريخ" : "Submitted"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium" dir="auto">
                        {r.full_name}
                      </TableCell>
                      <TableCell dir="ltr">{r.email ?? "—"}</TableCell>
                      <TableCell dir="ltr">{r.phone ?? "—"}</TableCell>
                      <TableCell dir="auto">{r.specialty ?? "—"}</TableCell>
                      <TableCell dir="auto">{r.work_field ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(r.created_at).toLocaleString(ar ? "ar" : "en-GB")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
