import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Loader2,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ---------- language helpers ---------- */

export function useT() {
  const { lang } = useLang();
  const ar = lang === "ar";
  return { ar, lang, t: (arText: string, enText: string) => (ar ? arText : enText) };
}

export function fmtDate(iso: string | null | undefined, lang: "ar" | "en", withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang === "ar" ? "ar-SY" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function fmtNum(n: number | null | undefined, lang: "ar" | "en") {
  return Number(n ?? 0).toLocaleString(lang === "ar" ? "ar-SY" : "en-US");
}

/* ---------- page structure ---------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  actions,
  meta,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** A route to go back to, or onClick for in-page "back" (no route change). */
  back?: { to?: string; label: string; params?: Record<string, string>; onClick?: () => void };
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {back &&
        (back.onClick || !back.to ? (
          <button
            type="button"
            onClick={back.onClick}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--cx-muted)] hover:text-[var(--cx-teal)]"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
            {back.label}
          </button>
        ) : (
          <Link
            to={back.to as never}
            params={back.params as never}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--cx-muted)] hover:text-[var(--cx-teal)]"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
            {back.label}
          </Link>
        ))}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="cx-eyebrow mb-1">{eyebrow}</div>}
          <h1 className="cx-h1">{title}</h1>
          {description && <p className="cx-sub mt-1.5 max-w-2xl">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  flush,
  className = "",
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** No inner padding: for tables and lists that run edge to edge. */
  flush?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`cx-card ${className}`}>
      {(title || actions) && (
        <div
          className={`flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3 ${children !== undefined ? "border-b border-[var(--cx-line-2)]" : ""}`}
        >
          <div className="min-w-0">
            {title && <h2 className="text-[16px] font-extrabold text-[var(--cx-ink)]">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-[13px] text-[var(--cx-muted)]">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children !== undefined && <div className={flush ? "" : "p-5"}>{children}</div>}
    </section>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "teal",
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "teal" | "green" | "orange" | "gray";
  to?: string;
}) {
  const tones = {
    teal: "bg-[var(--cx-teal-50)] text-[var(--cx-teal)]",
    green: "bg-[var(--cx-green-50)] text-[var(--cx-green)]",
    orange: "bg-[var(--cx-orange-50)] text-[var(--cx-orange-ink)]",
    gray: "bg-[var(--cx-raise-2)] text-[var(--cx-ink-2)]",
  } as const;
  const body = (
    <div className="cx-card h-full p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-[28px] font-extrabold leading-none tabular-nums text-[var(--cx-ink)]">
          {value}
        </span>
      </div>
      <div className="mt-3 text-[14px] font-bold text-[var(--cx-ink)]">{label}</div>
      {hint && <div className="mt-0.5 text-[12px] text-[var(--cx-muted)]">{hint}</div>}
    </div>
  );
  return to ? (
    <Link to={to as never} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Pill({
  tone = "gray",
  icon: Icon,
  children,
}: {
  tone?: "gray" | "orange" | "green" | "red" | "teal";
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="cx-pill" data-tone={tone}>
      {Icon && <Icon />}
      {children}
    </span>
  );
}

const COURSE_STATUS: Record<
  string,
  { tone: "gray" | "orange" | "green" | "red"; ar: string; en: string; icon: LucideIcon }
> = {
  draft: { tone: "gray", ar: "مسودّة", en: "Draft", icon: FileText },
  pending: { tone: "orange", ar: "بانتظار المراجعة", en: "Waiting for review", icon: Clock },
  published: { tone: "green", ar: "منشورة", en: "Published", icon: CheckCircle2 },
  rejected: { tone: "red", ar: "مرفوضة", en: "Rejected", icon: XCircle },
};

export function CourseStatusPill({ status }: { status: string }) {
  const { ar } = useT();
  const s = COURSE_STATUS[status] ?? COURSE_STATUS.draft;
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {ar ? s.ar : s.en}
    </Pill>
  );
}

const REQUEST_STATUS: Record<
  string,
  { tone: "gray" | "orange" | "green" | "red"; ar: string; en: string }
> = {
  pending: { tone: "orange", ar: "بانتظار القرار", en: "Pending" },
  approved: { tone: "green", ar: "مقبول", en: "Approved" },
  rejected: { tone: "red", ar: "مرفوض", en: "Rejected" },
  cancelled: { tone: "gray", ar: "ملغى", en: "Cancelled" },
};

export function RequestStatusPill({ status }: { status: string }) {
  const { ar } = useT();
  const s = REQUEST_STATUS[status] ?? { tone: "gray" as const, ar: status, en: status };
  return <Pill tone={s.tone}>{ar ? s.ar : s.en}</Pill>;
}

export function EmptyState({
  icon: Icon = Circle,
  title,
  text,
  action,
  compact,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-8" : "py-14"} px-4`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
        <Icon className="h-6 w-6" />
      </span>
      <div className="mt-3 text-[15px] font-bold text-[var(--cx-ink)]">{title}</div>
      {text && <p className="mt-1 max-w-md text-[13.5px] text-[var(--cx-muted)]">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  const { t } = useT();
  return (
    <div
      className="flex items-center justify-center gap-2 py-14 text-[14px] text-[var(--cx-muted)]"
      role="status"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? t("جارٍ التحميل…", "Loading…")}
    </div>
  );
}

export function ErrorNote({ onRetry, text }: { onRetry?: () => void; text?: string }) {
  const { t } = useT();
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--cx-red-line)] bg-[var(--cx-red-50)] px-4 py-3 text-[14px] text-[var(--cx-red)]"
    >
      <span>{text ?? t("تعذّر تحميل البيانات.", "Could not load the data.")}</span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t("إعادة المحاولة", "Try again")}
        </Button>
      )}
    </div>
  );
}

/* ---------- filters and tabs ---------- */

export function Seg<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string; count?: number }[];
}) {
  return (
    <div className="cx-seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {typeof o.count === "number" && <span className="n">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export type TabDef<V extends string> = {
  value: V;
  label: string;
  icon?: LucideIcon;
  count?: number;
  hidden?: boolean;
};

export function Tabs<V extends string>({
  value,
  onChange,
  tabs,
}: {
  value: V;
  onChange: (v: V) => void;
  tabs: TabDef<V>[];
}) {
  return (
    <div className="cx-tabs mb-6" role="tablist">
      {tabs
        .filter((t) => !t.hidden)
        .map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              className="cx-tab"
              aria-selected={value === t.value}
              data-active={value === t.value}
              onClick={() => onChange(t.value)}
            >
              {Icon && <Icon />}
              {t.label}
              {!!t.count && <span className="cx-tab-count">{t.count}</span>}
            </button>
          );
        })}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block w-full sm:w-72">
      <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cx-muted)] start-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] ps-9 pe-3 text-[14px] outline-none focus:border-[var(--cx-teal)] focus:ring-2 focus:ring-[var(--cx-teal-50)]"
      />
    </label>
  );
}

/* ---------- forms ---------- */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-bold text-[var(--cx-ink-2)]"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[12px] font-semibold text-[var(--cx-red)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[12px] text-[var(--cx-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

/** A labelled on/off switch row. */
export function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <label htmlFor={id} className="cursor-pointer text-[14px] font-bold text-[var(--cx-ink)]">
          {label}
        </label>
        {hint && <p className="text-[12.5px] text-[var(--cx-muted)]">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-[var(--cx-petrol)]" : "bg-[var(--cx-track)]"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "start-[22px]" : "start-0.5"}`}
        />
      </button>
    </div>
  );
}

/** Floating bar shown while a form has unsaved changes. */
export function SaveBar({
  show,
  saving,
  onSave,
  onDiscard,
}: {
  show: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard?: () => void;
}) {
  const { t } = useT();
  if (!show) return null;
  return (
    <div
      className="cx-savebar"
      role="region"
      aria-label={t("تغييرات غير محفوظة", "Unsaved changes")}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--cx-orange)]" />
      <span className="flex-1 text-[14px] font-semibold">
        {t("لديك تغييرات غير محفوظة", "You have unsaved changes")}
      </span>
      {onDiscard && (
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="h-9 rounded-lg px-3 text-[13px] font-bold text-[#b9d6d9] hover:bg-white/10"
        >
          {t("تجاهل", "Discard")}
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--cx-petrol)] px-4 text-[13.5px] font-bold text-white hover:bg-[#05909f] disabled:opacity-70"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("حفظ التغييرات", "Save changes")}
      </button>
    </div>
  );
}

/** Replaces the browser's prompt(): asks for a reason before a decision. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  required,
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  required?: boolean;
  destructive?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const { t } = useT();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (required && !reason.trim()) return;
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Textarea
          autoFocus
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            required
              ? t("اكتب السبب (مطلوب)", "Write the reason (required)")
              : t("ملاحظة (اختياري)", "Note (optional)")
          }
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={busy || (required && !reason.trim())}
            variant={destructive ? "destructive" : "default"}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Thumb for a course cover, with a branded fallback. */
export function CourseThumb({ src, size = 44 }: { src: string | null | undefined; size?: number }) {
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="shrink-0 rounded-lg border border-[var(--cx-line)] object-cover"
      style={{ width: size * 1.4, height: size }}
    />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-lg"
      style={{
        width: size * 1.4,
        height: size,
        background: "linear-gradient(135deg, #048090 0%, #0b5560 55%, #698f3f 130%)",
      }}
      aria-hidden="true"
    >
      <span
        className="h-[60%] w-[40%] bg-white/85"
        style={{
          WebkitMask: "url(/cinematic/saae-tree.svg) center / contain no-repeat",
          mask: "url(/cinematic/saae-tree.svg) center / contain no-repeat",
        }}
      />
    </span>
  );
}

/** Arabic / English switch for bilingual forms. A dot marks a language with
    missing required text, so nothing is forgotten on the hidden side. */
export function LangSwitch({
  value,
  onChange,
  missing,
}: {
  value: "ar" | "en";
  onChange: (v: "ar" | "en") => void;
  missing?: { ar?: boolean; en?: boolean };
}) {
  return (
    <div className="cx-seg" role="tablist">
      {(["ar", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={value === l}
          data-active={value === l}
          onClick={() => onChange(l)}
        >
          {l === "ar" ? "العربية" : "English"}
          {missing?.[l] && (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--cx-orange)]" aria-label="missing" />
          )}
        </button>
      ))}
    </div>
  );
}
