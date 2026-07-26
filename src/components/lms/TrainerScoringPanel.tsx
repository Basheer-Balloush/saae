import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activateTrainer } from "@/lib/trainer-accreditation.functions";

type Criterion = {
  id: string;
  phase: number;
  label_ar: string;
  label_en: string;
  max_points: number;
  display_order: number;
};

type Evaluator = { evaluator_id: string; assigned_at: string };

type Summary = {
  phase1: number;
  phase2: number;
  phase3: number;
  phase4: number;
  final_score: number;
  complete: boolean;
  passed: boolean;
  evaluator_count: number;
  min_evaluators: number;
  pass_final_score: number;
  pass_phase_min: number;
};

const PHASE_WEIGHT: Record<number, number> = { 1: 30, 2: 30, 3: 30, 4: 10 };

export default function TrainerScoringPanel({
  applicationId,
  applicantId,
  status,
  onChanged,
}: {
  applicationId: string;
  applicantId: string;
  status: string;
  onChanged: () => void;
}) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<{ user_id: string; full_name: string }[]>([]);
  const [myScores, setMyScores] = useState<Record<string, { points: string; comment: string }>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pickEvaluator, setPickEvaluator] = useState("");
  const [activating, setActivating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setMe(uid);

    const [c, ev, sc, sum, inst] = await Promise.all([
      supabase.from("trainer_app_criteria").select("*").eq("active", true).order("phase").order("display_order"),
      supabase.from("trainer_app_evaluators").select("evaluator_id, assigned_at").eq("application_id", applicationId),
      supabase.from("trainer_app_scores").select("criterion_id, points, comment, evaluator_id").eq("application_id", applicationId),
      supabase.rpc("trainer_app_score_summary", { _application_id: applicationId }),
      supabase.from("lms_instructors").select("user_id, full_name").eq("approved", true).is("archived_at", null).limit(200),
    ]);

    setCriteria((c.data as Criterion[]) ?? []);
    setEvaluators((ev.data as Evaluator[]) ?? []);
    setCandidates(((inst.data as { user_id: string; full_name: string }[]) ?? []).filter((i) => i.user_id !== applicantId));
    setNames(Object.fromEntries(((inst.data as { user_id: string; full_name: string }[]) ?? []).map((i) => [i.user_id, i.full_name])));

    const mine: Record<string, { points: string; comment: string }> = {};
    for (const row of (sc.data as { criterion_id: string; points: number; comment: string | null; evaluator_id: string }[]) ?? []) {
      if (row.evaluator_id === uid) mine[row.criterion_id] = { points: String(row.points), comment: row.comment ?? "" };
    }
    setMyScores(mine);
    setSummary(sum.error ? null : ((sum.data as unknown) as Summary));
    setLoading(false);
  }, [applicationId, applicantId]);

  useEffect(() => { load(); }, [load]);

  const saveScore = async (crit: Criterion) => {
    const entry = myScores[crit.id];
    const points = Number(entry?.points ?? "");
    if (!Number.isFinite(points) || points < 0 || points > crit.max_points) {
      toast.error(ar ? `الدرجة يجب أن تكون بين 0 و ${crit.max_points}` : `Score must be between 0 and ${crit.max_points}`);
      return;
    }
    setSavingId(crit.id);
    const { error } = await supabase.rpc("trainer_app_submit_score", {
      _application_id: applicationId,
      _criterion_id: crit.id,
      _points: points,
      _comment: entry?.comment || undefined,
    });
    setSavingId(null);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم حفظ التقييم" : "Score saved");
    load();
  };

  const assign = async () => {
    if (!pickEvaluator) return;
    const { error } = await supabase.rpc("trainer_app_assign_evaluator", {
      _application_id: applicationId,
      _evaluator_id: pickEvaluator,
    });
    if (error) { toast.error(toUserMessage(error)); return; }
    setPickEvaluator("");
    toast.success(ar ? "تم تعيين المُقيّم" : "Evaluator assigned");
    load();
  };

  const removeEvaluator = async (id: string) => {
    const { error } = await supabase.rpc("trainer_app_remove_evaluator", {
      _application_id: applicationId,
      _evaluator_id: id,
    });
    if (error) { toast.error(toUserMessage(error)); return; }
    load();
  };

  const activate = async () => {
    setActivating(true);
    try {
      const res = await activateTrainer({ data: { application_id: applicationId } });
      toast.success(
        ar
          ? `تم الاعتماد والتفعيل${res.outbox.done ? " وأُرسل إشعار البريد" : ""}`
          : `Approved and activated${res.outbox.done ? " · notification sent" : ""}`,
      );
      onChanged();
      load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setActivating(false);
    }
  };

  const isEvaluator = !!me && evaluators.some((e) => e.evaluator_id === me);

  if (loading) {
    return (
      <section className="rounded-xl border border-border p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border p-4 space-y-4">
      <h3 className="font-bold">{ar ? "التقييم والاعتماد" : "Scoring & accreditation"}</h3>

      {/* Evaluators */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{ar ? "المُقيّمون المعيّنون" : "Assigned evaluators"}</p>
        {evaluators.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {evaluators.map((e) => (
              <li key={e.evaluator_id} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs">
                <span>{names[e.evaluator_id] ?? e.evaluator_id.slice(0, 8)}</span>
                <button type="button" onClick={() => removeEvaluator(e.evaluator_id)} className="text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Select value={pickEvaluator} onValueChange={setPickEvaluator}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder={ar ? "اختر مُقيّماً" : "Select evaluator"} />
            </SelectTrigger>
            <SelectContent>
              {candidates
                .filter((c) => !evaluators.some((e) => e.evaluator_id === c.user_id))
                .map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id}>{c.full_name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={assign} disabled={!pickEvaluator}>
            <Plus className="h-4 w-4 mx-1" />
            {ar ? "تعيين" : "Assign"}
          </Button>
        </div>
      </div>

      {/* Rubric */}
      {isEvaluator && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{ar ? "تقييمك (لكل معيار)" : "Your scores (per criterion)"}</p>
          {[1, 2, 3, 4].map((phase) => (
            <div key={phase} className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-bold">
                {ar ? `المرحلة ${phase}` : `Phase ${phase}`} · {PHASE_WEIGHT[phase]}%
              </p>
              {criteria.filter((c) => c.phase === phase).map((c) => (
                <div key={c.id} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <span className="text-sm">{ar ? c.label_ar : c.label_en} <span className="text-xs text-muted-foreground">/ {c.max_points}</span></span>
                  <Input
                    type="number"
                    min={0}
                    max={c.max_points}
                    className="w-24"
                    value={myScores[c.id]?.points ?? ""}
                    onChange={(e) => setMyScores((s) => ({ ...s, [c.id]: { points: e.target.value, comment: s[c.id]?.comment ?? "" } }))}
                  />
                  <Button size="sm" variant="outline" disabled={savingId === c.id} onClick={() => saveScore(c)}>
                    {savingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (ar ? "حفظ" : "Save")}
                  </Button>
                  <Textarea
                    className="sm:col-span-3 min-h-[2.25rem]"
                    placeholder={ar ? "ملاحظة (اختياري)" : "Comment (optional)"}
                    value={myScores[c.id]?.comment ?? ""}
                    onChange={(e) => setMyScores((s) => ({ ...s, [c.id]: { points: s[c.id]?.points ?? "", comment: e.target.value } }))}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="rounded-lg border border-border p-3 text-sm space-y-1">
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((p) => (
              <span key={p}>
                {ar ? `م${p}` : `P${p}`}: <b>{(summary as unknown as Record<string, number>)[`phase${p}`]?.toFixed?.(1) ?? 0}%</b>
              </span>
            ))}
            <span>{ar ? "النهائي" : "Final"}: <b>{Number(summary.final_score).toFixed(1)}%</b></span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge className={summary.complete ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}>
              {summary.complete ? (ar ? "التقييم مكتمل" : "Scoring complete") : (ar ? "التقييم غير مكتمل" : "Scoring incomplete")}
            </Badge>
            <Badge className={summary.passed ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}>
              {summary.passed ? (ar ? "ناجح" : "Passing") : (ar ? "غير مستوفٍ" : "Not passing")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {ar
                ? `الحد الأدنى: ${summary.min_evaluators} مُقيّم · ${summary.pass_final_score}% نهائي · ${summary.pass_phase_min}% لكل مرحلة`
                : `Requires ${summary.min_evaluators} evaluators · ${summary.pass_final_score}% final · ${summary.pass_phase_min}% per phase`}
            </span>
          </div>
        </div>
      )}

      {status === "scoring" && (
        <Button onClick={activate} disabled={activating || !summary?.passed}>
          {activating ? <Loader2 className="h-4 w-4 animate-spin mx-2" /> : <ShieldCheck className="h-4 w-4 mx-2" />}
          {ar ? "اعتماد وتفعيل المدرّب" : "Approve & activate trainer"}
        </Button>
      )}
    </section>
  );
}
