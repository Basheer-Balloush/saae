import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import {
  adminListInternships,
  adminUpsertInternship,
  type AdminInternshipRow,
} from "@/lib/lms-internships-admin.functions";
import type { Lifecycle } from "@/lib/lms-internships-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Seg,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { LIFECYCLE_UI, deadlineText, internshipError } from "@/features/internships/shared";

export const Route = createFileRoute("/learning-management-system/admin/internships/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Internships — Admin — SAAE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { new?: 1 } => ({
    new: s.new === 1 || s.new === "1" ? 1 : undefined,
  }),
  component: InternshipsPage,
});

const PAGE_SIZE = 24;
type Filter = "active" | Lifecycle;

/* Internship opportunities as cards: where each one stands, how many applied,
   and the two things you do most (read applications, edit). */
function InternshipsPage() {
  const { t, ar, lang } = useT();
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const listFn = useServerFn(adminListInternships);
  const [rows, setRows] = useState<AdminInternshipRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("active");
  const [q, setQ] = useState("");
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await listFn({
        data: {
          q: q.trim() || undefined,
          status: filter === "active" ? undefined : filter,
          page,
          page_size: PAGE_SIZE,
          sort: "updated_desc",
        },
      });
      // "Current" hides the archive; the server has no "not archived" filter.
      setRows(filter === "active" ? res.rows.filter((r) => r.status !== "archived") : res.rows);
      setTotal(res.total);
    } catch {
      setError(true);
    }
  }, [listFn, q, filter, page]);
  useEffect(() => {
    const id = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        eyebrow={t("منصّة التعلّم", "Learning")}
        title={t("فرص التدريب", "Internships")}
        description={t(
          "فرص تدريب يتقدّم لها الطلاب من الموقع. افتح أي فرصة لقراءة الطلبات أو تعديلها.",
          "Internships students apply to on the site. Open one to read its applications or edit it.",
        )}
        actions={
          <Button onClick={() => nav({ search: { new: 1 } })}>
            <Plus className="h-4 w-4" />
            {t("فرصة جديدة", "New internship")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          options={[
            { value: "active", label: t("الحالية", "Current") },
            {
              value: "published",
              label: ar ? LIFECYCLE_UI.published.ar : LIFECYCLE_UI.published.en,
            },
            { value: "draft", label: ar ? LIFECYCLE_UI.draft.ar : LIFECYCLE_UI.draft.en },
            { value: "closed", label: ar ? LIFECYCLE_UI.closed.ar : LIFECYCLE_UI.closed.en },
            { value: "archived", label: t("الأرشيف", "Archive") },
          ]}
        />
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder={t("ابحث بالعنوان أو الرابط", "Search title or link")}
        />
      </div>

      {error ? (
        <ErrorNote onRetry={load} />
      ) : rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Briefcase}
            title={t("لا توجد فرص هنا", "No internships here")}
            action={
              <Button onClick={() => nav({ search: { new: 1 } })}>
                <Plus className="h-4 w-4" />
                {t("أنشئ فرصة", "Create one")}
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const st = LIFECYCLE_UI[r.status];
            const dl = r.status === "published" ? deadlineText(r.deadline_at, ar) : null;
            return (
              <article key={r.id} className="cx-card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                    <Briefcase className="h-5 w-5" />
                  </span>
                  <Pill tone={st.tone}>{ar ? st.ar : st.en}</Pill>
                </div>
                <Link
                  to="/learning-management-system/admin/internships/$id/edit"
                  params={{ id: r.id }}
                  className="mt-3 line-clamp-2 text-[16px] font-extrabold hover:text-[var(--cx-teal)]"
                  dir="auto"
                >
                  {ar ? r.title_ar : r.title_en || r.title_ar}
                </Link>
                <div className="mt-1 font-mono text-[12px] text-[var(--cx-muted)]" dir="ltr">
                  /internships/{r.slug}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--cx-ink-2)]">
                  {dl ? (
                    <span
                      className={`inline-flex items-center gap-1.5 ${dl.soon ? "font-bold text-[var(--cx-orange-ink)]" : ""}`}
                    >
                      <CalendarClock className="h-4 w-4" />
                      {dl.text}
                    </span>
                  ) : r.deadline_at ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4" />
                      {fmtDate(r.deadline_at, lang)}
                    </span>
                  ) : null}
                  <span className="text-[var(--cx-muted)]">
                    {t("عُدّلت", "Edited")} {fmtDate(r.updated_at, lang)}
                  </span>
                </div>
                <div className="flex-1" />
                <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-[var(--cx-line-2)] pt-4">
                  <Button asChild size="sm" variant={r.applications_count ? "default" : "outline"}>
                    <Link
                      to="/learning-management-system/admin/internships/$id/applications"
                      params={{ id: r.id }}
                    >
                      <Users className="h-4 w-4" />
                      {t(
                        `${fmtNum(r.applications_count, lang)} طلب`,
                        `${fmtNum(r.applications_count, lang)} applications`,
                      )}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                    aria-label={t("رابط التسجيل الخارجي", "External sign-up link")}
                  >
                    <Link
                      to="/learning-management-system/admin/internships/$id/signups"
                      params={{ id: r.id }}
                      title={t("رابط التسجيل الخارجي", "External sign-up link")}
                    >
                      <Link2 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                    aria-label={t("تعديل", "Edit")}
                  >
                    <Link
                      to="/learning-management-system/admin/internships/$id/edit"
                      params={{ id: r.id }}
                      title={t("تعديل", "Edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-[13px]">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label={t("السابق", "Previous")}
          >
            {ar ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <span className="text-[var(--cx-muted)]">
            {fmtNum(page, lang)} / {fmtNum(pages, lang)}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            aria-label={t("التالي", "Next")}
          >
            {ar ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <NewInternshipDialog
        open={search.new === 1}
        onClose={() => nav({ search: {}, replace: true })}
      />
    </div>
  );
}

const toSlug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

/** Three fields to start; everything else is filled on the internship's own page. */
function NewInternshipDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, ar } = useT();
  const navigate = useNavigate();
  const saveFn = useServerFn(adminUpsertInternship);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const s = slug || toSlug(titleEn);
    if (!titleAr.trim() || !titleEn.trim())
      return void toast.error(
        t("العنوان مطلوب بالعربية والإنجليزية", "The title is needed in Arabic and English"),
      );
    if (s.length < 3) return void toast.error(t("الرابط قصير جداً", "The link is too short"));
    setSaving(true);
    try {
      const res = await saveFn({
        data: {
          title_ar: titleAr.trim(),
          title_en: titleEn.trim(),
          slug: s,
          status: "draft",
          questions: [],
        } as never,
      });
      toast.success(t("أُنشئت الفرصة كمسودّة", "Created as a draft"));
      navigate({
        to: "/learning-management-system/admin/internships/$id/edit",
        params: { id: res.id },
      });
    } catch (e) {
      toast.error(internshipError(e, ar));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("فرصة تدريب جديدة", "New internship")}</DialogTitle>
          <DialogDescription>
            {t(
              "ابدأ بالاسم. التفاصيل والأسئلة في الخطوة التالية.",
              "Start with the name. Details and questions come next.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={t("العنوان بالعربية", "Title in Arabic")}>
            <Input
              autoFocus
              dir="rtl"
              value={titleAr}
              maxLength={200}
              onChange={(e) => setTitleAr(e.target.value)}
            />
          </Field>
          <Field label={t("العنوان بالإنجليزية", "Title in English")}>
            <Input
              dir="ltr"
              value={titleEn}
              maxLength={200}
              onChange={(e) => {
                setTitleEn(e.target.value);
                if (!slugTouched) setSlug(toSlug(e.target.value));
              }}
            />
          </Field>
          <Field
            label={t("الرابط", "Link")}
            hint={t("أحرف إنجليزية صغيرة وأرقام وشرطات", "Lowercase letters, numbers and dashes")}
          >
            <div
              className="flex items-center rounded-md border border-[var(--cx-line)] bg-[var(--cx-field)] ps-3"
              dir="ltr"
            >
              <span className="shrink-0 text-[13px] text-[var(--cx-muted)]">/internships/</span>
              <input
                className="h-9 min-w-0 flex-1 bg-transparent px-1 text-[14px] outline-none"
                value={slug}
                maxLength={80}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
              />
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button onClick={create} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("إنشاء ومتابعة", "Create and continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
