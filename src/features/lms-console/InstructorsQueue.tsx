import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Mail, ShieldAlert, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEmailsForUsers } from "@/lib/lms-admin-users.functions";
import { confirmDialog } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Loading, Panel, fmtDate, fmtNum, useT } from "@/components/console/ui";
import { useLmsAdminActions } from "./actions";
import { AccreditationBoard } from "./AccreditationBoard";

type Waiting = { user_id: string; full_name: string; created_at: string };

const FORM_PATH = "/learning-management-system/trainer-apply";

/* Becoming an instructor has one path: the accreditation. Applications are
   reviewed stage by stage and "Activate" gives teaching access. People who
   ticked "instructor" at sign-up but never sent the form wait below, with the
   form link to send them. */
export function InstructorsQueue() {
  const { t, lang } = useT();
  const actions = useLmsAdminActions(lang);
  const emailsFn = useServerFn(getEmailsForUsers);
  const [waiting, setWaiting] = useState<Waiting[] | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [{ data: pending }, { data: apps }] = await Promise.all([
      supabase
        .from("lms_instructors")
        .select("user_id,full_name,created_at")
        .eq("approved", false)
        .order("created_at", { ascending: false }),
      supabase.from("trainer_applications").select("user_id"),
    ]);
    const applied = new Set(((apps as { user_id: string }[]) ?? []).map((a) => a.user_id));
    const list = ((pending as Waiting[]) ?? []).filter((p) => !applied.has(p.user_id));
    setWaiting(list);
    if (list.length) {
      emailsFn({ data: { userIds: list.map((p) => p.user_id).slice(0, 500) } })
        .then((r) => setEmails(r.emails))
        .catch(() => {});
    }
  }, [emailsFn]);
  useEffect(() => {
    load();
  }, [load]);

  const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${FORM_PATH}`;
  const copy = () =>
    navigator.clipboard.writeText(formUrl).then(
      () => toast.success(t("نُسخ رابط نموذج الاعتماد", "Accreditation form link copied")),
      () => toast.error(t("تعذّر النسخ", "Could not copy")),
    );
  const mailto = (p: Waiting, email: string) => {
    const subject = t("أكمل طلب اعتمادك كمدرّب", "Complete your instructor accreditation");
    const body = t(
      `مرحباً ${p.full_name}،\n\nلتفعيل حسابك كمدرّب، يرجى تعبئة نموذج طلب الاعتماد:\n${formUrl}\n\nشكراً لك.`,
      `Hello ${p.full_name},\n\nTo activate your instructor account, please fill in the accreditation form:\n${formUrl}\n\nThank you.`,
    );
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const remove = async (p: Waiting) => {
    const ok = await confirmDialog({
      title: t(`إزالة طلب ${p.full_name}؟`, `Remove ${p.full_name}'s request?`),
      description: t(
        "يبقى حسابه كطالب، ويمكنه التقديم للاعتماد لاحقاً.",
        "Their account stays as a student, and they can still apply for accreditation later.",
      ),
      confirmLabel: t("إزالة", "Remove"),
      destructive: true,
    });
    if (ok && (await actions.rejectInstructorRequest(p.user_id))) load();
  };
  const override = async (p: Waiting) => {
    const ok = await confirmDialog({
      title: t(
        `تفعيل ${p.full_name} دون اعتماد؟`,
        `Activate ${p.full_name} without accreditation?`,
      ),
      description: t(
        "هذا يتجاوز مراحل التقييم كلها ويمنحه صلاحية التدريس فوراً. استخدمه فقط لمدرّب تعرفونه وتثقون به.",
        "This skips every evaluation stage and gives teaching access right away. Use it only for an instructor you already know and trust.",
      ),
      confirmLabel: t("تفعيل دون اعتماد", "Activate without accreditation"),
      destructive: true,
    });
    if (ok && (await actions.setInstructorApproval(p.user_id, true))) load();
  };

  return (
    <div className="space-y-6">
      <ol className="grid gap-2 sm:grid-cols-4">
        {[
          [
            t("يسجّل كمدرّب", "Signs up as instructor"),
            t("في صفحة إنشاء الحساب", "on the sign-up page"),
          ],
          [
            t("يرسل نموذج الاعتماد", "Sends the accreditation form"),
            t("السيرة الذاتية والخبرة والعيّنات", "CV, experience and samples"),
          ],
          [
            t("تراجعونه على مراحل", "You review it in stages"),
            t(
              "نظري، عملي، تدريب، مقابلة، تقييم",
              "theory, practical, training, interview, scoring",
            ),
          ],
          [
            t("«اعتماد وتفعيل»", "“Approve & activate”"),
            t("يصبح مدرّباً ويصله بريد", "they become an instructor and get an email"),
          ],
        ].map(([a, b], i) => (
          <li
            key={a}
            className="flex items-start gap-2.5 rounded-2xl border border-[var(--cx-line-2)] bg-[var(--cx-raise)] p-3"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--cx-teal-50)] text-[13px] font-extrabold text-[var(--cx-teal)]">
              {i + 1}
            </span>
            <span>
              <span className="block text-[13.5px] font-bold">{a}</span>
              <span className="block text-[12px] text-[var(--cx-muted)]">{b}</span>
            </span>
          </li>
        ))}
      </ol>

      <AccreditationBoard />

      <Panel
        title={t(
          "سجّلوا كمدرّبين ولم يرسلوا نموذج الاعتماد",
          "Signed up as instructors, no accreditation form yet",
        )}
        description={t(
          "لا ينتظرون قراراً منكم: ينتظرون أن يعبّئوا النموذج. أرسلوا لهم الرابط.",
          "They aren't waiting for your decision; they still need to fill in the form. Send them the link.",
        )}
        actions={
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="h-4 w-4" />
            {t("نسخ رابط النموذج", "Copy form link")}
          </Button>
        }
        flush
      >
        {waiting === null ? (
          <Loading />
        ) : waiting.length === 0 ? (
          <p className="px-5 py-4 text-[13.5px] text-[var(--cx-muted)]">
            {t(
              "لا أحد. كل من سجّل كمدرّب أرسل نموذجه.",
              "Nobody. Everyone who signed up as an instructor has sent the form.",
            )}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--cx-line-2)]">
            {waiting.map((p) => {
              const email = emails[p.user_id];
              return (
                <li key={p.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cx-raise-2)] font-extrabold text-[var(--cx-ink-2)]">
                    {p.full_name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold" dir="auto">
                      {p.full_name}
                    </div>
                    <div className="truncate text-[12.5px] text-[var(--cx-muted)]">
                      {email ? <span dir="ltr">{email}</span> : null}
                      {email ? " · " : ""}
                      {t("سجّل", "Signed up")} {fmtDate(p.created_at, lang)}
                    </div>
                  </div>
                  {email && (
                    <Button asChild size="sm" variant="outline">
                      <a href={mailto(p, email)}>
                        <Mail className="h-4 w-4" />
                        {t("أرسل الرابط", "Send the link")}
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[var(--cx-muted)]"
                    onClick={() => override(p)}
                    title={t("يتجاوز الاعتماد", "Skips accreditation")}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    {t("تفعيل دون اعتماد", "Activate anyway")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                    onClick={() => remove(p)}
                    aria-label={t("إزالة الطلب", "Remove request")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {waiting && waiting.length > 0 && (
          <p className="flex items-center gap-1.5 border-t border-[var(--cx-line-2)] px-5 py-2.5 text-[12px] text-[var(--cx-muted)]">
            <UserPlus className="h-3.5 w-3.5" />
            {t(`${fmtNum(waiting.length, lang)} شخص`, `${fmtNum(waiting.length, lang)} people`)}
          </p>
        )}
      </Panel>
    </div>
  );
}
