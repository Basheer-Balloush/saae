import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  Award,
  FileSearch,
  Loader2,
  RefreshCw,
  UserCog,
  FolderSearch,
} from "lucide-react";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { reconcileCertificates } from "@/lib/lms-certificates.functions";
import {
  reconcileOrphanUploads,
  reconcilePartialProvisioning,
  reconcileInternshipFiles,
  getOpsHealthSummary,
  type OpsHealthSummary,
} from "@/lib/lms-ops.functions";
import { Button } from "@/components/ui/button";
import { Panel, useT } from "@/components/console/ui";

type Job = "health" | "certs" | "orphans" | "provisioning" | "internships";

/* The maintenance tools that used to sit at the bottom of the admin
   dashboard. Same server functions, same limits, now out of the daily view. */
export function SystemHealth() {
  const { t } = useT();
  const [busy, setBusy] = useState<Job | null>(null);
  const [health, setHealth] = useState<OpsHealthSummary | null>(null);
  const runHealth = useServerFn(getOpsHealthSummary);
  const runCerts = useServerFn(reconcileCertificates);
  const runOrphans = useServerFn(reconcileOrphanUploads);
  const runProvisioning = useServerFn(reconcilePartialProvisioning);
  const runInternshipFiles = useServerFn(reconcileInternshipFiles);

  const run = async (job: Job, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(job);
    try {
      await fn();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const outbox = health?.outbox;
  const authFlags = Object.values(health?.auth_rate_flags_24h ?? {}).reduce(
    (a, b) => a + (b as number),
    0,
  );
  const internStuck = health?.internships?.stuck_applications ?? 0;
  const internTotal = Object.values(health?.internships?.by_status ?? {}).reduce(
    (a, b) => a + (b as number),
    0,
  );

  const tools: {
    job: Job;
    icon: typeof Activity;
    title: string;
    text: string;
    action: () => Promise<void>;
  }[] = [
    {
      job: "certs",
      icon: Award,
      title: t("تدقيق الشهادات المؤهلة", "Reconcile eligible certificates"),
      text: t(
        "يفحص التسجيلات المكتملة ويصدر الشهادات الناقصة (حتى 500).",
        "Scans completed enrollments and issues missing certificates (up to 500).",
      ),
      action: async () => {
        if (
          !(await confirmDialog({
            title: t(
              "فحص جميع التسجيلات المؤهلة وإصدار الشهادات الناقصة؟",
              "Scan eligible enrollments and issue any missing certificates?",
            ),
            destructive: true,
          }))
        )
          return;
        const r = await runCerts({ data: { limit: 500 } });
        toast.success(
          t(
            `تم الفحص: ${r.scanned} — تم إصدار: ${r.issued}`,
            `Scanned: ${r.scanned} — Issued: ${r.issued}`,
          ),
        );
      },
    },
    {
      job: "orphans",
      icon: FileSearch,
      title: t("فحص الملفات اليتيمة", "Scan orphan uploads"),
      text: t(
        "ملفات ملفات شخصية لم تعد مرتبطة بأي حساب.",
        "Profile files no longer attached to any account.",
      ),
      action: async () => {
        const r = await runOrphans({ data: { limit: 200 } });
        toast.success(
          t(`ملفات يتيمة: ${r.orphan_profile_files}`, `Orphan files: ${r.orphan_profile_files}`),
        );
      },
    },
    {
      job: "provisioning",
      icon: UserCog,
      title: t("فحص التسجيلات الناقصة", "Scan partial provisioning"),
      text: t("طلبات مقبولة بلا تسجيل فعلي.", "Approved requests that have no enrollment."),
      action: async () => {
        const r = await runProvisioning({ data: { limit: 200 } });
        toast.success(
          t(
            `تسجيلات ناقصة: ${r.missing_enrollments}`,
            `Missing enrollments: ${r.missing_enrollments}`,
          ),
        );
      },
    },
    {
      job: "internships",
      icon: FolderSearch,
      title: t("فحص ملفات التدريب", "Scan internship files"),
      text: t("ملفات طلبات التدريب غير المرتبطة.", "Internship application files with no owner."),
      action: async () => {
        const r = await runInternshipFiles({ data: { limit: 200 } });
        toast.success(
          t(
            `ملفات تدريب يتيمة: ${r.orphan_internship_files} · محمية بلقطة: ${r.snapshot_protected_files}`,
            `Orphan internship files: ${r.orphan_internship_files} · Snapshot-protected: ${r.snapshot_protected_files}`,
          ),
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <Panel
        title={t("حالة النظام", "System status")}
        description={t(
          "المهام المعلّقة وتنبيهات تسجيل الدخول وطلبات التدريب المتأخرة.",
          "Stuck jobs, sign-in alerts and late internship applications.",
        )}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => run("health", async () => setHealth(await runHealth()))}
            disabled={!!busy}
          >
            {busy === "health" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("تحديث", "Refresh")}
          </Button>
        }
      >
        {!health ? (
          <p className="text-[14px] text-[var(--cx-muted)]">
            {t("اضغط تحديث لقراءة حالة النظام.", "Press Refresh to read the system status.")}
          </p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-4">
            <Metric
              label={t("مهام معلّقة / فاشلة", "Stuck / failed jobs")}
              value={`${outbox?.stuck ?? 0} / ${outbox?.failed ?? 0}`}
              bad={(outbox?.stuck ?? 0) + (outbox?.failed ?? 0) > 0}
            />
            <Metric
              label={t("تنبيهات الدخول (24 ساعة)", "Sign-in alerts (24h)")}
              value={String(authFlags)}
              bad={authFlags > 0}
            />
            <Metric
              label={t("طلبات تدريب متأخرة (+14 يوماً)", "Late internship apps (14d+)")}
              value={String(internStuck)}
              bad={internStuck > 0}
            />
            <Metric
              label={t("كل طلبات التدريب", "All internship apps")}
              value={String(internTotal)}
            />
          </dl>
        )}
      </Panel>

      <Panel title={t("أدوات الصيانة", "Maintenance tools")} flush>
        <ul>
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <li
                key={tool.job}
                className="flex flex-wrap items-center gap-3 border-b border-[var(--cx-line-2)] px-5 py-3.5 last:border-0"
              >
                <Icon className="h-5 w-5 text-[var(--cx-teal)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">{tool.title}</div>
                  <div className="text-[12.5px] text-[var(--cx-muted)]">{tool.text}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => run(tool.job, tool.action)}
                >
                  {busy === tool.job && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("تشغيل", "Run")}
                </Button>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

function Metric({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--cx-line)] p-3">
      <dt className="text-[12px] text-[var(--cx-muted)]">{label}</dt>
      <dd
        className={`mt-1 text-[20px] font-extrabold tabular-nums ${bad ? "text-[var(--cx-red)]" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
