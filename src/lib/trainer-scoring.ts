// Single source of truth for the trainer accreditation scoring formula.
// Any UI (evaluator dashboard, admin summary, applicant view) MUST import from
// here — never re-implement the math.

export const PHASE_WEIGHTS = {
  phase1: 0.30, // Theory
  phase2: 0.30, // Practical
  phase3: 0.30, // Training demo
  phase4: 0.10, // Interview
} as const;

export const PASS_FINAL_SCORE = 80;
export const PASS_PHASE_MIN = 50;

export type PhaseTotals = {
  phase1: number;
  phase2: number;
  phase3: number;
  phase4: number;
};

export type TrainerLevel =
  | "lead_trainer"
  | "expert_trainer"
  | "certified_trainer"
  | "beginner_trainer"
  | "not_passed";

export function computeFinalScore(p: PhaseTotals): number {
  return (
    p.phase1 * PHASE_WEIGHTS.phase1 +
    p.phase2 * PHASE_WEIGHTS.phase2 +
    p.phase3 * PHASE_WEIGHTS.phase3 +
    p.phase4 * PHASE_WEIGHTS.phase4
  );
}

export function computePassed(p: PhaseTotals): boolean {
  const final = computeFinalScore(p);
  const allPhasesOk =
    p.phase1 >= PASS_PHASE_MIN &&
    p.phase2 >= PASS_PHASE_MIN &&
    p.phase3 >= PASS_PHASE_MIN &&
    p.phase4 >= PASS_PHASE_MIN;
  return final >= PASS_FINAL_SCORE && allPhasesOk;
}

export function computeLevel(p: PhaseTotals): TrainerLevel {
  if (!computePassed(p)) return "not_passed";
  const s = computeFinalScore(p);
  if (s >= 95) return "lead_trainer";
  if (s >= 90) return "expert_trainer";
  if (s >= 85) return "certified_trainer";
  return "beginner_trainer";
}
