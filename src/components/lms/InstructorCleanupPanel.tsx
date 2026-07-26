import { useCallback, useEffect, useState } from "react";
import { Archive, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  previewInstructorCleanup,
  archiveInstructors,
  restoreCleanupBatch,
  purgeCleanupBatch,
  listCleanupBatches,
  type CleanupCandidate,
  type CleanupBatch,
} from "@/lib/instructor-cleanup.functions";

export default function InstructorCleanupPanel() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [candidates, setCandidates] = useState<CleanupCandidate[]>([]);
  const [batches, setBatches] = useState<CleanupBatch[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, b] = await Promise.all([previewInstructorCleanup(), listCleanupBatches()]);
      setCandidates(p.candidates);
      setBatches(b.batches);
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const chosen = Object.keys(selected).filter((k) => selected[k]);

  const doArchive = async () => {
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      const res = await archiveInstructors({ data: { user_ids: chosen, note: note || undefined, retention_days: 90, notify: true } });
      toast.success(
        ar
          ? `تمت الأرشفة: ${res.archived} · إشعارات مرسلة: ${res.sent}`
          : `Archived ${res.archived} · ${res.sent} notified`,
      );
      setSelected({});
      setNote("");
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async (id: string) => {
    setBusy(true);
    try {
      const res = await restoreCleanupBatch({ data: { batch_id: id } });
      toast.success(ar ? `تمت الاستعادة: ${res.restored}` : `Restored ${res.restored}`);
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doPurge = async (id: string) => {
    if (!window.confirm(ar ? "حذف نهائي لهذه الدفعة؟" : "Permanently purge this batch?")) return;
    setBusy(true);
    try {
      const res = await purgeCleanupBatch({ data: { batch_id: id } });
      toast.success(ar ? `تم الحذف النهائي: ${res.purged}` : `Purged ${res.purged}`);
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 space-y-4">
      <div>
        <h3 className="font-bold text-foreground">{ar ? "أرشفة المدرّبين غير المعتمدين" : "Archive unapproved instructors"}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
          {ar
            ? "اختر الملفات المطلوب أرشفتها. الأرشفة قابلة للاستعادة خلال 90 يوماً ولا تحذف الدورات أو التسجيلات، ويُرسل لكل متدرّب بريد لإعادة تعبئة النموذج."
            : "Pick the profiles to archive. Archiving is reversible for 90 days, never cascades to courses or enrollments, and emails each person a re-apply link."}
        </p>
      </div>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : candidates.length === 0 ? (
        <p className="text-xs text-muted-foreground">{ar ? "لا يوجد ملفات مرشّحة." : "No candidates."}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs">
                <tr>
                  <th className="p-2 w-10"></th>
                  <th className="text-start p-2">{ar ? "الاسم" : "Name"}</th>
                  <th className="text-start p-2">{ar ? "الدورات" : "Courses"}</th>
                  <th className="text-start p-2">{ar ? "التسجيلات" : "Enrollments"}</th>
                  <th className="text-start p-2">{ar ? "طلب قائم" : "Has application"}</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.user_id} className="border-t border-border">
                    <td className="p-2">
                      <Checkbox
                        checked={!!selected[c.user_id]}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.user_id]: !!v }))}
                      />
                    </td>
                    <td className="p-2 font-medium">{c.full_name || c.user_id.slice(0, 8)}</td>
                    <td className="p-2">{c.course_count}</td>
                    <td className="p-2">{c.enrollment_count}</td>
                    <td className="p-2">{c.has_application ? (ar ? "نعم" : "Yes") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Textarea
            placeholder={ar ? "سبب الأرشفة (يُحفظ في سجل التدقيق)" : "Reason (saved to audit log)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button variant="outline" onClick={doArchive} disabled={busy || chosen.length === 0}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mx-2" /> : <Archive className="h-4 w-4 mx-2" />}
            {ar ? `أرشفة المحدد (${chosen.length})` : `Archive selected (${chosen.length})`}
          </Button>
        </>
      )}

      {batches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold">{ar ? "دفعات الأرشفة" : "Cleanup batches"}</p>
          <ul className="space-y-2">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3 text-xs">
                <span>
                  {new Date(b.created_at).toLocaleString()} · {ar ? "مؤرشف" : "archived"} {b.archived_count}
                  {b.restored_count ? ` · ${ar ? "مستعاد" : "restored"} ${b.restored_count}` : ""}
                  {b.purged_at ? ` · ${ar ? "محذوف نهائياً" : "purged"} ${b.purged_count}` : ""}
                  {b.note ? ` · ${b.note}` : ""}
                </span>
                {!b.purged_at && (
                  <span className="flex gap-2">
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => doRestore(b.id)}>
                      <RotateCcw className="h-3 w-3 mx-1" />{ar ? "استعادة" : "Restore"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => doPurge(b.id)}>
                      <Trash2 className="h-3 w-3 mx-1" />{ar ? "حذف نهائي" : "Purge"}
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
