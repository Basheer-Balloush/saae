import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  Lock,
  Archive,
} from "lucide-react";

import { useLang } from "@/lib/i18n";
import { lmsInternshipsT } from "@/lib/lms-internships-i18n";
import {
  adminListInternships,
  adminSetInternshipStatus,
  adminDeleteInternship,
  type AdminInternshipRow,
} from "@/lib/lms-internships-admin.functions";
import { LIFECYCLE, type Lifecycle } from "@/lib/lms-internships-admin";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/learning-management-system/admin/internships/")({
  head: () => ({
    meta: [
      { title: "Admin — Internship Opportunities" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminInternshipsList,
});

const PAGE_SIZE = 20;

function AdminInternshipsList() {
  const { lang, dir } = useLang();
  const t = lmsInternshipsT[lang];
  const navigate = useNavigate();

  const listFn = useServerFn(adminListInternships);
  const setStatusFn = useServerFn(adminSetInternshipStatus);
  const deleteFn = useServerFn(adminDeleteInternship);

  const [rows, setRows] = useState<AdminInternshipRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Lifecycle | "all">("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminInternshipRow | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await listFn({
        data: {
          q: q.trim() || undefined,
          status: status === "all" ? undefined : status,
          page,
          page_size: PAGE_SIZE,
          sort: "updated_desc",
        },
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errorLoad);
    } finally {
      setBusy(false);
    }
  }, [listFn, page, q, status, t.errorLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  const onStatusChange = async (row: AdminInternshipRow, next: Lifecycle) => {
    setPending(row.id);
    try {
      await setStatusFn({ data: { id: row.id, status: next } });
      toast.success(t.profileSaved);
      await load();
    } catch (err) {
      toast.error(mapErr(err, lang));
    } finally {
      setPending(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setPending(toDelete.id);
    try {
      await deleteFn({ data: { id: toDelete.id } });
      toast.success(t.profileSaved);
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(mapErr(err, lang));
    } finally {
      setPending(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8" dir={dir}>
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t.adminInternshipsTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "ar"
              ? "إدارة فرص التدريب: إنشاء، نشر، إخفاء، إغلاق أو أرشفة."
              : "Create, publish, hide, close, or archive internship opportunities."}
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/learning-management-system/admin/internships/new" })}>
          <Plus className="h-4 w-4 mx-1" /> {t.adminInternshipsNew}
        </Button>
      </header>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === "rtl" ? "right-3" : "left-3"}`} />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={lang === "ar" ? "بحث بالعنوان أو الرابط" : "Search title or slug"}
              className={dir === "rtl" ? "pr-9" : "pl-9"}
              dir="auto"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as Lifecycle | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "ar" ? "كل الحالات" : "All statuses"}</SelectItem>
              {LIFECYCLE.map((s) => (
                <SelectItem key={s} value={s}>{lifecycleLabel(s, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang === "ar" ? "العنوان" : "Title"}</TableHead>
              <TableHead>{t.adminInternshipsSlug}</TableHead>
              <TableHead>{t.adminInternshipsStatus}</TableHead>
              <TableHead className="text-center">{t.adminInternshipsApplicationsCount}</TableHead>
              <TableHead>{t.adminInternshipsDeadline}</TableHead>
              <TableHead>{t.adminInternshipsUpdated}</TableHead>
              <TableHead className={dir === "rtl" ? "text-left" : "text-right"}>
                {lang === "ar" ? "الإجراءات" : "Actions"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </TableCell>
              </TableRow>
            )}
            {!busy && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {lang === "ar" ? "لا توجد فرص بعد" : "No opportunities yet"}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium max-w-[280px]">
                  <Link
                    to="/learning-management-system/admin/internships/$id/edit"
                    params={{ id: row.id }}
                    className="hover:text-primary truncate block"
                    dir="auto"
                  >
                    {lang === "ar" ? row.title_ar : row.title_en || row.title_ar}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground" dir="ltr">
                  {row.slug}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} lang={lang} />
                </TableCell>
                <TableCell className="text-center">
                  <Link
                    to="/learning-management-system/admin/internships/$id/applications"
                    params={{ id: row.id }}
                    className="text-primary hover:underline"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {row.applications_count}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-xs" dir="ltr">
                  {row.deadline_at ? new Date(row.deadline_at).toLocaleDateString(lang) : "—"}
                </TableCell>
                <TableCell className="text-xs" dir="ltr">
                  {new Date(row.updated_at).toLocaleDateString(lang)}
                </TableCell>
                <TableCell className={dir === "rtl" ? "text-left" : "text-right"}>
                  <div className="inline-flex items-center gap-1">
                    {row.status === "draft" || row.status === "hidden" ? (
                      <ActionBtn
                        icon={Eye}
                        label={t.adminInternshipsPublish}
                        onClick={() => onStatusChange(row, "published")}
                        pending={pending === row.id}
                      />
                    ) : null}
                    {row.status === "published" && (
                      <ActionBtn
                        icon={EyeOff}
                        label={t.adminInternshipsHide}
                        onClick={() => onStatusChange(row, "hidden")}
                        pending={pending === row.id}
                      />
                    )}
                    {(row.status === "published" || row.status === "hidden") && (
                      <ActionBtn
                        icon={Lock}
                        label={t.adminInternshipsClose}
                        onClick={() => onStatusChange(row, "closed")}
                        pending={pending === row.id}
                      />
                    )}
                    {row.status !== "archived" && (
                      <ActionBtn
                        icon={Archive}
                        label={t.adminInternshipsArchive}
                        onClick={() => onStatusChange(row, "archived")}
                        pending={pending === row.id}
                      />
                    )}
                    <Link
                      to="/learning-management-system/admin/internships/$id/edit"
                      params={{ id: row.id }}
                    >
                      <Button variant="ghost" size="icon" title={lang === "ar" ? "تحرير" : "Edit"}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setToDelete(row)}
                      title={t.adminInternshipsDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {lang === "ar" ? `الصفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {lang === "ar" ? "السابق" : "Previous"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              {lang === "ar" ? "التالي" : "Next"}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.adminInternshipsDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "ar"
                ? "سيتم الحذف نهائيًا فقط إذا لم يكن هناك أي طلبات مرتبطة. وإلا استخدم الأرشفة."
                : "This permanently deletes the opportunity only if it has no applications. Otherwise use Archive."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "ar" ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.adminInternshipsDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  pending,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} disabled={pending} title={label}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
    </Button>
  );
}

export function StatusBadge({ status, lang }: { status: Lifecycle; lang: "ar" | "en" }) {
  const map: Record<Lifecycle, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-primary/10 text-primary",
    hidden: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    closed: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    archived: "bg-destructive/10 text-destructive",
  };
  return <Badge variant="outline" className={map[status]}>{lifecycleLabel(status, lang)}</Badge>;
}

export function lifecycleLabel(s: Lifecycle, lang: "ar" | "en"): string {
  const t = lmsInternshipsT[lang];
  switch (s) {
    case "draft": return t.lifecycleDraft;
    case "published": return t.lifecyclePublished;
    case "hidden": return t.lifecycleHidden;
    case "closed": return t.lifecycleClosed;
    case "archived": return t.lifecycleArchived;
  }
}

export function mapErr(err: unknown, lang: "ar" | "en"): string {
  const msg = err instanceof Error ? err.message : String(err);
  const AR = lang === "ar";
  if (msg.includes("slug_taken")) return AR ? "هذا الرابط مستخدم مسبقًا" : "Slug is already in use";
  if (msg.includes("has_applications")) return AR ? "لا يمكن الحذف: توجد طلبات مرتبطة. استخدم الأرشفة." : "Cannot delete: applications exist. Use Archive.";
  if (msg.includes("question_has_answers")) return AR ? "لا يمكن حذف سؤال أُجيب عليه" : "Cannot delete a question that has answers";
  if (msg.includes("status_transition_invalid")) return AR ? "لا يمكن تغيير الحالة بهذا الاتجاه" : "That status change isn't allowed";
  if (msg.includes("date_range_invalid")) return AR ? "التواريخ غير متسقة" : "Date range is invalid";
  if (msg.includes("unauthorized")) return AR ? "لا تملك صلاحية هذا الإجراء" : "Unauthorized";
  if (msg.includes("not_found")) return AR ? "غير موجود" : "Not found";
  return msg;
}
