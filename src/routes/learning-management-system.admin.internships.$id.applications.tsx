import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Eye, Loader2, RotateCcw, Search } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import {
  adminListApplications,
  adminExportApplications,
  adminListLmsAdmins,
  type ApplicationListRow,
  type ApplicationStatus,
} from "@/lib/lms-internships-applications-admin.functions";
import { adminGetInternship } from "@/lib/lms-internships-admin.functions";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute(
  "/learning-management-system/admin/internships/$id/applications",
)({
  head: () => ({
    meta: [
      { title: "Admin — Internship Applications" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApplicationsList,
});

const STATUSES: ApplicationStatus[] = [
  "new",
  "under_review",
  "shortlisted",
  "interview",
  "accepted",
  "rejected",
  "withdrawn",
];

const PAGE_SIZE = 25;

function statusLabel(s: ApplicationStatus, lang: "ar" | "en") {
  const t = lmsInternshipsT[lang];
  const map: Record<ApplicationStatus, string> = {
    new: t.statusNew,
    under_review: t.statusUnderReview,
    shortlisted: t.statusShortlisted,
    interview: t.statusInterview,
    accepted: t.statusAccepted,
    rejected: t.statusRejected,
    withdrawn: t.statusWithdrawn,
  };
  return map[s];
}

function statusClass(s: ApplicationStatus) {
  const m: Record<ApplicationStatus, string> = {
    new: "bg-muted text-muted-foreground",
    under_review: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    shortlisted: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    interview: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    accepted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    rejected: "bg-destructive/10 text-destructive",
    withdrawn: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  };
  return m[s];
}

function ApplicationsList() {
  const { id: opportunityId } = Route.useParams();
  const { lang, dir } = useLang();
  const t = lmsInternshipsT[lang];
  const navigate = useNavigate();

  const listFn = useServerFn(adminListApplications);
  const exportFn = useServerFn(adminExportApplications);
  const adminsFn = useServerFn(adminListLmsAdmins);
  const opportunityFn = useServerFn(adminGetInternship);

  const [rows, setRows] = useState<ApplicationListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [assigned, setAssigned] = useState<string | "all" | "unassigned">("all");
  const [admins, setAdmins] = useState<Array<{ user_id: string; email: string | null }>>([]);
  const [opportunityTitle, setOpportunityTitle] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status, assigned]);

  useEffect(() => {
    (async () => {
      try {
        const list = await adminsFn();
        setAdmins(list);
      } catch {
        /* ignore */
      }
    })();
  }, [adminsFn]);

  useEffect(() => {
    (async () => {
      try {
        const res = await opportunityFn({ data: { id: opportunityId } });
        const opp = (res as { opportunity?: { title_ar?: string; title_en?: string } } | null)
          ?.opportunity;
        if (opp) setOpportunityTitle(lang === "ar" ? opp.title_ar ?? "" : opp.title_en ?? opp.title_ar ?? "");
      } catch {
        /* ignore */
      }
    })();
  }, [opportunityFn, opportunityId, lang]);

  const filterParams = useMemo(
    () => ({
      opportunity_id: opportunityId,
      q: debouncedQ.trim() || undefined,
      status: status === "all" ? undefined : status,
      assigned_admin:
        assigned === "all" || assigned === "unassigned" ? undefined : assigned,
      sort: "submitted_desc" as const,
    }),
    [opportunityId, debouncedQ, status, assigned],
  );

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await listFn({
        data: { ...filterParams, page, page_size: PAGE_SIZE },
      });
      let list = res.rows;
      if (assigned === "unassigned") list = list.filter((r) => !r.assigned_admin);
      setRows(list);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errorLoad);
    } finally {
      setBusy(false);
    }
  }, [listFn, filterParams, page, assigned, t.errorLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetFilters = () => {
    setQ("");
    setDebouncedQ("");
    setStatus("all");
    setAssigned("all");
    setPage(1);
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const res = await exportFn({ data: filterParams });
      const list = assigned === "unassigned"
        ? res.rows.filter((r) => !r.assigned_admin)
        : res.rows;
      if (res.truncated) toast.warning(t.adminApplicationsExportLimit);
      await exportRowsToXlsx<ApplicationListRow>({
        filenameBase: `internship-applications-${opportunityId.slice(0, 8)}`,
        sheetName: "Applications",
        rtl: lang === "ar",
        rows: list,
        columns: [
          { header: lang === "ar" ? "الحالة" : "Status", get: (r) => statusLabel(r.status, lang), width: 16 },
          { header: lang === "ar" ? "الاسم" : "Full name", get: (r) => r.snapshot_full_name, width: 28 },
          { header: lang === "ar" ? "البريد" : "Email", get: (r) => r.snapshot_email, width: 28 },
          { header: lang === "ar" ? "الهاتف" : "Phone", get: (r) => r.snapshot_phone, width: 18 },
          { header: lang === "ar" ? "المنظمة" : "Organization", get: (r) => r.snapshot_organization, width: 24 },
          { header: lang === "ar" ? "المسؤول" : "Assigned admin", get: (r) => r.assigned_admin_email, width: 28 },
          { header: lang === "ar" ? "الدورات" : "Courses", type: "number", get: (r) => r.courses_count, width: 12 },
          { header: lang === "ar" ? "الشهادات" : "Certificates", type: "number", get: (r) => r.certificates_count, width: 14 },
          { header: lang === "ar" ? "الملاحظات" : "Notes", type: "number", get: (r) => r.notes_count, width: 12 },
          { header: lang === "ar" ? "أُرسل في" : "Submitted at", type: "date", get: (r) => r.submitted_at, width: 20 },
          { header: lang === "ar" ? "المحاولة" : "Attempt", type: "number", get: (r) => r.attempt_number, width: 10 },
        ],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errorLoad);
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8" dir={dir}>
      <header className="mb-6">
        <Link
          to="/learning-management-system/admin/internships"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3"
        >
          <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
          {lang === "ar" ? "العودة إلى الفرص" : "Back to opportunities"}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t.adminApplicationsTitle}
            </h1>
            {opportunityTitle && (
              <p className="text-sm text-muted-foreground mt-1" dir="auto">
                {opportunityTitle}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={doExport} disabled={exporting || total === 0}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Download className="h-4 w-4 mx-1" />}
            {t.adminApplicationsExport}
          </Button>
        </div>
      </header>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === "rtl" ? "right-3" : "left-3"}`} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.adminApplicationsSearch}
              className={dir === "rtl" ? "pr-9" : "pl-9"}
              dir="auto"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.adminApplicationsFilterStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "ar" ? "كل الحالات" : "All statuses"}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{statusLabel(s, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigned} onValueChange={(v) => setAssigned(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={t.adminApplicationsFilterAssigned} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "ar" ? "كل المسؤولين" : "All admins"}</SelectItem>
              <SelectItem value="unassigned">{lang === "ar" ? "غير مُسند" : "Unassigned"}</SelectItem>
              {admins.map((a) => (
                <SelectItem key={a.user_id} value={a.user_id}>
                  {a.email ?? a.user_id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 mx-1" />
            {lang === "ar" ? "تصفير" : "Reset"}
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang === "ar" ? "الاسم" : "Name"}</TableHead>
              <TableHead>{lang === "ar" ? "التواصل" : "Contact"}</TableHead>
              <TableHead>{t.adminApplicationsFilterStatus}</TableHead>
              <TableHead>{t.adminApplicationsFilterAssigned}</TableHead>
              <TableHead className="text-center">{lang === "ar" ? "الدورات" : "Courses"}</TableHead>
              <TableHead className="text-center">{lang === "ar" ? "الشهادات" : "Certs"}</TableHead>
              <TableHead className="text-center">{lang === "ar" ? "ملاحظات" : "Notes"}</TableHead>
              <TableHead>{lang === "ar" ? "أُرسل" : "Submitted"}</TableHead>
              <TableHead className={dir === "rtl" ? "text-left" : "text-right"}>
                {lang === "ar" ? "إجراءات" : "Actions"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            )}
            {!busy && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  {lang === "ar" ? "لا توجد طلبات" : "No applications"}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium max-w-[200px] truncate" dir="auto">
                  {r.snapshot_full_name || "—"}
                </TableCell>
                <TableCell className="text-xs max-w-[220px]">
                  <div className="truncate" dir="ltr">{r.snapshot_email || "—"}</div>
                  <div className="truncate text-muted-foreground" dir="ltr">{r.snapshot_phone || ""}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusClass(r.status)}>
                    {statusLabel(r.status, lang)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs" dir="ltr">
                  {r.assigned_admin_email ?? (
                    <span className="text-muted-foreground italic">
                      {lang === "ar" ? "غير مُسند" : "Unassigned"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">{r.courses_count}</TableCell>
                <TableCell className="text-center">{r.certificates_count}</TableCell>
                <TableCell className="text-center">{r.notes_count}</TableCell>
                <TableCell className="text-xs" dir="ltr">
                  {new Date(r.submitted_at).toLocaleDateString(lang)}
                </TableCell>
                <TableCell className={dir === "rtl" ? "text-left" : "text-right"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/learning-management-system/admin/internships/$id/applications/$appId",
                        params: { id: opportunityId, appId: r.id },
                      })
                    }
                  >
                    <Eye className="h-4 w-4 mx-1" />
                    {lang === "ar" ? "عرض" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {lang === "ar"
              ? `الصفحة ${page} من ${totalPages} — ${total} طلب`
              : `Page ${page} of ${totalPages} — ${total} applications`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || busy} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {lang === "ar" ? "السابق" : "Previous"}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || busy} onClick={() => setPage((p) => p + 1)}>
              {lang === "ar" ? "التالي" : "Next"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
