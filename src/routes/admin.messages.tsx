import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  ArrowLeft,
  Building2,
  CheckCheck,
  Mail,
  MailOpen,
  MessageCircle,
  Phone,
  Reply,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { CONSOLE_COUNTS_KEY } from "@/components/console/useConsoleCounts";
import {
  EmptyState,
  Loading,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Seg,
  fmtDate,
  useT,
} from "@/components/console/ui";

export const Route = createFileRoute("/admin/messages")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Messages — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: MessagesPage,
});

type Msg = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  inquiry_type: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};
type Box = "new" | "read" | "replied" | "archived" | "all";

const TYPES: Record<string, [string, string]> = {
  general: ["استفسار عام", "General"],
  individual: ["فرد", "Individual"],
  company: ["شركة", "Company"],
  partnership: ["شراكة", "Partnership"],
  training: ["تدريب", "Training"],
  media: ["إعلام", "Media"],
  other: ["أخرى", "Other"],
};

/* Messages sent through the website's contact form. They were saved but had
   no screen before; now they are read, answered and archived here. */
function MessagesPage() {
  const { t, ar, lang } = useT();
  const qc = useQueryClient();
  const { id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [rows, setRows] = useState<Msg[] | null>(null);
  const [box, setBox] = useState<Box>("new");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast.error(toUserMessage(error));
    setRows((data as Msg[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (m: Msg, status: string, quiet = false) => {
    setRows((all) => (all ?? []).map((x) => (x.id === m.id ? { ...x, status } : x)));
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", m.id);
    if (error) {
      toast.error(toUserMessage(error));
      load();
      return;
    }
    qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });
    if (!quiet) {
      const done: Record<string, [string, string]> = {
        replied: ["عُلّمت كمُجابة", "Marked as replied"],
        archived: ["نُقلت إلى الأرشيف", "Archived"],
        new: ["عُلّمت كغير مقروءة", "Marked as unread"],
        read: ["أُعيدت إلى الوارد", "Moved back to the inbox"],
      };
      toast.success(ar ? done[status]?.[0] : done[status]?.[1]);
    }
  };

  const open = (m: Msg) => {
    navigate({ search: { id: m.id }, replace: true });
    // Opening a new message marks it as read.
    if (m.status === "new") setStatus(m, "read", true);
  };

  const counts = useMemo(() => {
    const c: Record<Box, number> = { new: 0, read: 0, replied: 0, archived: 0, all: 0 };
    for (const m of rows ?? []) {
      const k = (
        ["new", "read", "replied", "archived"].includes(m.status) ? m.status : "read"
      ) as Box;
      c[k]++;
      c.all++;
    }
    return c;
  }, [rows]);

  const shown = (rows ?? []).filter((m) => {
    const k = ["new", "read", "replied", "archived"].includes(m.status) ? m.status : "read";
    if (box !== "all" && k !== box) return false;
    const n = q.trim().toLowerCase();
    return (
      !n ||
      `${m.full_name} ${m.email} ${m.subject} ${m.message} ${m.organization ?? ""}`
        .toLowerCase()
        .includes(n)
    );
  });
  const selected = rows?.find((m) => m.id === id) ?? null;
  const typeLabel = (k: string) => (TYPES[k] ? (ar ? TYPES[k][0] : TYPES[k][1]) : k);
  const statusPill = (s: string) =>
    s === "new" ? (
      <Pill tone="orange">{t("جديدة", "New")}</Pill>
    ) : s === "replied" ? (
      <Pill tone="green">{t("مُجابة", "Replied")}</Pill>
    ) : s === "archived" ? (
      <Pill tone="gray">{t("مؤرشفة", "Archived")}</Pill>
    ) : (
      <Pill tone="teal">{t("مقروءة", "Read")}</Pill>
    );

  const waNumber = (p: string) => {
    let n = p.trim().replace(/[\s\-()]/g, "");
    if (n.startsWith("+")) n = n.slice(1);
    else if (n.startsWith("00")) n = n.slice(2);
    else if (n.startsWith("0")) n = "963" + n.slice(1);
    return n.replace(/\D/g, "");
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("رسائل التواصل", "Contact messages")}
        description={t(
          "ما يصل من نموذج «تواصل معنا» في الموقع.",
          "What arrives through the website's contact form.",
        )}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={box}
          onChange={setBox}
          options={[
            { value: "new", label: t("جديدة", "New"), count: counts.new },
            { value: "read", label: t("مقروءة", "Read"), count: counts.read },
            { value: "replied", label: t("مُجابة", "Replied"), count: counts.replied },
            { value: "archived", label: t("الأرشيف", "Archive"), count: counts.archived },
            { value: "all", label: t("الكل", "All"), count: counts.all },
          ]}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث بالاسم أو البريد أو الموضوع", "Search name, email or subject")}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className={selected ? "hidden xl:block" : ""}>
          <Panel flush>
            {rows === null ? (
              <Loading />
            ) : shown.length === 0 ? (
              <EmptyState
                compact
                icon={Mail}
                title={
                  box === "new"
                    ? t("لا توجد رسائل جديدة", "No new messages")
                    : t("لا توجد رسائل", "No messages")
                }
              />
            ) : (
              <ul className="max-h-[72vh] overflow-y-auto">
                {shown.map((m) => (
                  <li key={m.id} className="border-b border-[var(--cx-line-2)] last:border-0">
                    <button
                      type="button"
                      onClick={() => open(m)}
                      className={`block w-full px-4 py-3 text-start transition-colors hover:bg-[var(--cx-hover)] ${id === m.id ? "bg-[var(--cx-teal-50)]" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        {m.status === "new" && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--cx-badge)]" />
                        )}
                        <span
                          className={`min-w-0 flex-1 truncate text-[14px] ${m.status === "new" ? "font-extrabold" : "font-bold"}`}
                        >
                          {m.full_name}
                        </span>
                        <span className="shrink-0 text-[11.5px] text-[var(--cx-muted)]">
                          {fmtDate(m.created_at, lang)}
                        </span>
                      </div>
                      <div
                        className="mt-0.5 truncate text-[13px] text-[var(--cx-ink-2)]"
                        dir="auto"
                      >
                        {m.subject}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--cx-muted)]">
                        <span>{typeLabel(m.inquiry_type)}</span>
                        {m.organization && <span className="truncate">· {m.organization}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className={selected ? "" : "hidden xl:block"}>
          {!selected ? (
            <Panel>
              <EmptyState
                icon={MailOpen}
                title={t("اختر رسالة لقراءتها", "Pick a message to read it")}
              />
            </Panel>
          ) : (
            <section className="cx-card">
              <div className="flex flex-wrap items-start gap-3 border-b border-[var(--cx-line-2)] px-5 py-4">
                <button
                  type="button"
                  className="mt-1 xl:hidden"
                  onClick={() => navigate({ search: {}, replace: true })}
                  aria-label={t("رجوع", "Back")}
                >
                  <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-extrabold" dir="auto">
                    {selected.subject}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--cx-muted)]">
                    {statusPill(selected.status)}
                    <Pill tone="gray">{typeLabel(selected.inquiry_type)}</Pill>
                    <span>{fmtDate(selected.created_at, lang, true)}</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 border-b border-[var(--cx-line-2)] px-5 py-4 text-[13.5px] sm:grid-cols-2">
                <div className="font-bold">{selected.full_name}</div>
                {selected.organization && (
                  <div className="flex items-center gap-2 text-[var(--cx-ink-2)]">
                    <Building2 className="h-4 w-4 text-[var(--cx-muted)]" />
                    {selected.organization}
                  </div>
                )}
                <a
                  href={`mailto:${selected.email}`}
                  className="flex items-center gap-2 text-[var(--cx-teal)] hover:underline"
                  dir="ltr"
                >
                  <Mail className="h-4 w-4" />
                  {selected.email}
                </a>
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center gap-2 text-[var(--cx-teal)] hover:underline"
                    dir="ltr"
                  >
                    <Phone className="h-4 w-4" />
                    {selected.phone}
                  </a>
                )}
              </div>
              <p className="whitespace-pre-wrap px-5 py-5 text-[15px] leading-relaxed" dir="auto">
                {selected.message}
              </p>
              <div className="flex flex-wrap gap-2 border-t border-[var(--cx-line-2)] px-5 py-4">
                <Button asChild>
                  <a
                    href={`mailto:${selected.email}?subject=${encodeURIComponent(`${ar ? "رد: " : "Re: "}${selected.subject}`)}`}
                    onClick={() =>
                      selected.status !== "replied" && setStatus(selected, "replied", true)
                    }
                  >
                    <Reply className="h-4 w-4" />
                    {t("الرد بالبريد", "Reply by email")}
                  </a>
                </Button>
                {selected.phone && waNumber(selected.phone) && (
                  <Button asChild variant="outline">
                    <a
                      href={`https://wa.me/${waNumber(selected.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        selected.status !== "replied" && setStatus(selected, "replied", true)
                      }
                    >
                      <MessageCircle className="h-4 w-4 text-[var(--cx-green)]" />
                      {t("واتساب", "WhatsApp")}
                    </a>
                  </Button>
                )}
                {selected.status !== "replied" && (
                  <Button variant="outline" onClick={() => setStatus(selected, "replied")}>
                    <CheckCheck className="h-4 w-4" />
                    {t("تعليم كمُجابة", "Mark as replied")}
                  </Button>
                )}
                {selected.status !== "archived" ? (
                  <Button variant="ghost" onClick={() => setStatus(selected, "archived")}>
                    <Archive className="h-4 w-4" />
                    {t("أرشفة", "Archive")}
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => setStatus(selected, "read")}>
                    <MailOpen className="h-4 w-4" />
                    {t("إعادة إلى الوارد", "Back to inbox")}
                  </Button>
                )}
                {selected.status !== "new" && selected.status !== "archived" && (
                  <Button variant="ghost" onClick={() => setStatus(selected, "new")}>
                    <Mail className="h-4 w-4" />
                    {t("غير مقروءة", "Mark unread")}
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
