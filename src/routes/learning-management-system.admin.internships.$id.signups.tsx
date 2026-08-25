import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Link2, Loader2, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminGetSignupLink,
  adminCreateSignupLink,
  adminSetSignupLinkActive,
  adminListSignupSubmissions,
  adminDeleteSignupSubmission,
  type SignupLink,
  type SignupSubmission,
} from "@/lib/event-signup.functions";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";

export const Route = createFileRoute("/learning-management-system/admin/internships/$id/signups")({
  component: SignupsPage,
});

function SignupsPage() {
  const { id } = Route.useParams();
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const getLink = useServerFn(adminGetSignupLink);
  const createLink = useServerFn(adminCreateSignupLink);
  const setActive = useServerFn(adminSetSignupLinkActive);
  const listSubs = useServerFn(adminListSignupSubmissions);
  const deleteSub = useServerFn(adminDeleteSignupSubmission);

  const [link, setLink] = useState<SignupLink | null>(null);
  const [rows, setRows] = useState<SignupSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, s] = await Promise.all([
        getLink({ data: { opportunity_id: id } }),
        listSubs({ data: { opportunity_id: id } }),
      ]);
      setLink(l);
      setRows(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [getLink, listSubs, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const publicUrl = link
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/event-signup/${link.token}`
    : "";

  const onCreate = async () => {
    setBusy(true);
    try {
      const l = await createLink({ data: { opportunity_id: id } });
      setLink({ ...l, submissions_count: rows.length });
      toast.success(ar ? "تم إنشاء الرابط" : "Link created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async () => {
    if (!link) return;
    setBusy(true);
    try {
      await setActive({ data: { opportunity_id: id, is_active: !link.is_active } });
      setLink({ ...link, is_active: !link.is_active });
      toast.success(
        link.is_active
          ? ar
            ? "تم إيقاف الرابط"
            : "Link deactivated"
          : ar
            ? "تم تفعيل الرابط"
            : "Link activated",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (subId: string) => {
    setBusy(true);
    try {
      await deleteSub({ data: { id: subId } });
      setRows((p) => p.filter((r) => r.id !== subId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    await exportRowsToXlsx({
      filenameBase: "event-signups",
      sheetName: "Signups",
      rtl: ar,
      rows,
      columns: [
        { header: ar ? "الاسم" : "Full name", get: (r) => r.full_name, width: 28 },
        { header: ar ? "البريد" : "Email", get: (r) => r.email, width: 28 },
        { header: ar ? "الهاتف" : "Phone", get: (r) => r.phone, width: 18 },
        { header: ar ? "الجهة" : "Organization", get: (r) => r.organization, width: 24 },
        { header: ar ? "نبذة" : "Bio", get: (r) => r.biography, width: 40 },
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8" dir={dir}>
      <Link
        to="/learning-management-system/admin/internships"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3"
      >
        <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        {ar ? "العودة إلى الفرص" : "Back to opportunities"}
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-6">
        {ar ? "رابط التسجيل الخارجي" : "External sign-up link"}
      </h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {ar ? "تعذّر تحميل البيانات." : "Could not load data."}
          </p>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mx-2" />
            {ar ? "إعادة المحاولة" : "Retry"}
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-5 mb-6">
            {!link ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {ar
                    ? "لا يوجد رابط تسجيل لهذه الفرصة بعد."
                    : "No sign-up link exists for this opportunity yet."}
                </p>
                <Button onClick={onCreate} disabled={busy}>
                  <Link2 className="h-4 w-4 mx-2" />
                  {ar ? "إنشاء رابط" : "Generate link"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={link.is_active ? "default" : "secondary"}>
                    {link.is_active ? (ar ? "فعّال" : "Active") : ar ? "موقوف" : "Deactivated"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {ar ? "عدد التسجيلات:" : "Sign-ups:"} {rows.length}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input readOnly value={publicUrl} dir="ltr" className="flex-1 min-w-[240px]" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(publicUrl);
                      toast.success(ar ? "تم نسخ الرابط" : "Link copied");
                    }}
                  >
                    <Copy className="h-4 w-4 mx-2" />
                    {ar ? "نسخ" : "Copy"}
                  </Button>
                  <Button
                    variant={link.is_active ? "destructive" : "default"}
                    onClick={onToggle}
                    disabled={busy}
                  >
                    {link.is_active ? (
                      <PowerOff className="h-4 w-4 mx-2" />
                    ) : (
                      <Power className="h-4 w-4 mx-2" />
                    )}
                    {link.is_active
                      ? ar
                        ? "إيقاف الرابط"
                        : "Deactivate link"
                      : ar
                        ? "تفعيل الرابط"
                        : "Activate link"}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              {ar ? "التسجيلات" : "Sign-ups"}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onExport()}
              disabled={rows.length === 0}
            >
              {ar ? "تصدير Excel" : "Export Excel"}
            </Button>
          </div>

          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? "الاسم" : "Full name"}</TableHead>
                  <TableHead>{ar ? "البريد" : "Email"}</TableHead>
                  <TableHead>{ar ? "الهاتف" : "Phone"}</TableHead>
                  <TableHead>{ar ? "الجهة" : "Organization"}</TableHead>
                  <TableHead>{ar ? "التاريخ" : "Submitted"}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      {ar ? "لا توجد تسجيلات بعد." : "No sign-ups yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell dir="auto">{r.full_name}</TableCell>
                      <TableCell dir="ltr">{r.email}</TableCell>
                      <TableCell dir="ltr">{r.phone}</TableCell>
                      <TableCell dir="auto">{r.organization ?? "—"}</TableCell>
                      <TableCell dir="ltr" className="text-xs">
                        {new Date(r.created_at).toLocaleString(lang)}
                      </TableCell>
                      <TableCell className={dir === "rtl" ? "text-left" : "text-right"}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          disabled={busy}
                          aria-label={ar ? "حذف" : "Delete"}
                          onClick={() => void onDelete(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
