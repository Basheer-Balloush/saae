import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Gift, Lightbulb, Lock, MessageCircle, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BADGES } from "@/features/badges/badges";
import { preloadMascotPoses } from "@/features/chat/lib/mascot";
import { AbuHost, type Mood, type Pose } from "./AbuHost";
import { Confetti, TimerRing } from "./Effects";
import {
  texpoAnswer,
  texpoChatOpened,
  texpoClaim,
  texpoHint,
  texpoMyReward,
  texpoOpen,
  texpoShow,
  texpoStart,
  texpoState,
} from "./lib/texpo.functions";
import {
  COUPON_CATEGORY_SLUG,
  LEVELS,
  QUESTION_COUNT,
  STATUSES,
  answersFor,
  type AnswerOutcome,
  type Bi,
  type PlayResult,
  type PlayState,
  type Reward,
  type ServedQuestion,
  type StatusId,
} from "./lib/texpo-shared";
import { chatSessionId, deviceId, savePlay, storedPlay } from "./lib/play-store";
import "./texpo.css";

type Feedback = AnswerOutcome & { picked: number | null };

type Phase =
  | { name: "boot" }
  | { name: "intro" }
  | { name: "status" }
  | { name: "answer"; status: StatusId }
  | {
      name: "question";
      playId: string;
      score: number;
      q: ServedQuestion;
      deadline: number;
      busy: boolean;
      pendingPick?: number | null;
      feedback: Feedback | null;
    }
  | { name: "result"; playId: string; result: PlayResult; claimed: boolean }
  | {
      name: "claimed";
      playId: string;
      result: PlayResult | null;
      reward: Reward;
      emailed: boolean;
      earlier: boolean;
    };

const SIGNUP = "/learning-management-system/signup?redirect=%2Ftexpo";
const LOGIN = "/learning-management-system/login?redirect=%2Ftexpo";
/** The courses a Texpo coupon works on. */
const CATALOG = `/learning-management-system/catalog?category=${COUPON_CATEGORY_SLUG}`;
const PROFILE_BADGES = "/learning-management-system/profile#profile-badges";
const LETTERS = { ar: ["أ", "ب", "ج", "د"], en: ["A", "B", "C", "D"] };
const CHEERS: Bi[] = [
  { ar: "أحسنت!", en: "Well done!" },
  { ar: "ممتاز!", en: "Excellent!" },
  { ar: "إجابة صحيحة!", en: "Correct!" },
  { ar: "رائع!", en: "Great!" },
];
const MISSES: Bi[] = [
  { ar: "ليست هذه.", en: "Not quite." },
  { ar: "قريب، لكن لا.", en: "Close, but no." },
];

function questionLine(i: number): Bi {
  if (i === 0) return { ar: "لنبدأ بسؤال سهل.", en: "Let's start with an easy one." };
  if (i === 3) return { ar: "الآن يصبح الأمر أمتع.", en: "Now it gets interesting." };
  if (i === QUESTION_COUNT - 2)
    return { ar: "آخر سؤالين هما الأصعب!", en: "The last two are the hardest!" };
  if (i === QUESTION_COUNT - 1) return { ar: "السؤال الأخير!", en: "Last question!" };
  return {
    ar: `السؤال ${i + 1} من ${QUESTION_COUNT}`,
    en: `Question ${i + 1} of ${QUESTION_COUNT}`,
  };
}

const WELCOME: Bi = {
  ar: "أهلاً! أنا أبو الجود. جاهز تختبر معلوماتك عن الذكاء الاصطناعي؟",
  en: "Hi! I'm Abu Al-Joud. Ready to test your AI sense?",
};

const DEVICE_USED: Bi = {
  ar: "استُلمت هدية تكسبو على هذا الجهاز من قبل. لكل جهاز ولكل حساب هدية واحدة.",
  en: "A Texpo gift was already claimed on this device. One gift per device and per account.",
};

function errorCode(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function TexpoGame({ link }: { link?: string }) {
  const { lang, dir, setLang } = useLang();
  const ar = lang === "ar";
  const pick = (b: Bi) => (ar ? b.ar : b.en);
  const t = (a: string, e: string) => (ar ? a : e);
  const reduce = useReducedMotion();
  const { user, loading: authLoading } = useAuth();

  const openFn = useServerFn(texpoOpen);
  const startFn = useServerFn(texpoStart);
  const stateFn = useServerFn(texpoState);
  const answerFn = useServerFn(texpoAnswer);
  const showFn = useServerFn(texpoShow);
  const hintFn = useServerFn(texpoHint);
  const claimFn = useServerFn(texpoClaim);
  const myRewardFn = useServerFn(texpoMyReward);
  const chatFn = useServerFn(texpoChatOpened);

  // The page renders on the device only (ssr: false), so a new visitor starts
  // on the intro straight away: swapping the animated card and Abu Al-Joud's
  // line in the first moment after mount races the presence animations.
  const [phase, setPhase] = useState<Phase>(() =>
    typeof window !== "undefined" && !storedPlay() ? { name: "intro" } : { name: "boot" },
  );
  const [host, setHost] = useState<{ pose: Pose; mood: Mood; beat: number; line: Bi }>({
    pose: "welcome",
    mood: "idle",
    beat: 0,
    line: WELCOME,
  });
  const [confetti, setConfetti] = useState({ n: 0, big: false });
  const [myReward, setMyReward] = useState<(Reward & { used: boolean }) | null>(null);
  const [rewardPending, setRewardPending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimNote, setClaimNote] = useState<Bi | null>(null);
  const [failed, setFailed] = useState<null | (() => void)>(null);
  /* One gift per phone: a gift was already claimed on this device. */
  const [deviceUsed, setDeviceUsed] = useState(false);
  const device = useRef<string>("");

  const say = useCallback((line: Bi, pose: Pose = "explain", mood: Mood = "idle") => {
    setHost((h) => ({ pose, mood, beat: h.beat + 1, line }));
  }, []);
  const burst = (big = false) => setConfetti((c) => ({ n: c.n + 1, big }));

  const applyState = useCallback(
    (s: PlayState) => {
      if (s.phase === "question") {
        savePlay({ id: s.playId, finished: false, claimed: false });
        setPhase({
          name: "question",
          playId: s.playId,
          score: s.score,
          q: s.question,
          deadline: performance.now() + s.question.remainingMs,
          busy: false,
          feedback: null,
        });
        say(questionLine(s.question.index), "explain");
      } else {
        savePlay({ id: s.playId, finished: true, claimed: s.claimed });
        setPhase({ name: "result", playId: s.playId, result: s.result, claimed: s.claimed });
        say(LEVELS[s.result.level].line, "vision", "cheer");
      }
    },
    [say],
  );

  /* ---------- boot: count the visit, resume a play in progress ---------- */
  useEffect(() => {
    preloadMascotPoses();
    device.current = deviceId();
    openFn({ data: { device: device.current, link: link ?? null } })
      .then((o) => setDeviceUsed(!!o?.deviceClaimed))
      .catch(() => {});
    const saved = storedPlay();
    if (!saved) {
      setPhase({ name: "intro" });
      say(WELCOME, "welcome", "cheer");
      return;
    }
    stateFn({ data: { device: device.current, playId: saved.id } })
      .then(applyState)
      .catch(() => {
        savePlay(null);
        setPhase({ name: "intro" });
        say(WELCOME, "welcome");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A signed-in player who already has their gift sees it instead of a new game. */
  useEffect(() => {
    if (authLoading || !user) {
      setMyReward(null);
      return;
    }
    setRewardPending(true);
    myRewardFn({})
      .then(setMyReward)
      .catch(() => setMyReward(null))
      .finally(() => setRewardPending(false));
  }, [user, authLoading, myRewardFn]);

  const openChat = (prefill: string, playId?: string) => {
    window.dispatchEvent(new CustomEvent("assistant:open", { detail: { prefill } }));
    if (!playId) return;
    window.setTimeout(() => {
      chatFn({ data: { device: device.current, playId, sessionId: chatSessionId() } }).catch(
        () => {},
      );
    }, 1500);
  };

  /* ---------- the two steps before the game ---------- */
  const askStatus = () => {
    setPhase({ name: "status" });
    say(
      {
        ar: "قبل أن نبدأ، عرّفني بنفسك قليلاً.",
        en: "Before we start, tell me a little about yourself.",
      },
      "explain",
    );
  };

  const chooseStatus = (status: StatusId) => {
    say(STATUSES.find((st) => st.id === status)!.reply, "celebrate", "happy");
    setPhase({ name: "answer", status });
  };

  const start = async (status: StatusId, answer: string) => {
    setFailed(null);
    try {
      const s = await startFn({
        data: { device: device.current, link: link ?? null, lang, status, answer },
      });
      applyState(s);
    } catch (e) {
      if (errorCode(e) === "device_claimed") {
        setDeviceUsed(true);
        setPhase({ name: "intro" });
        say(DEVICE_USED, "think");
      } else if (errorCode(e) === "rate_limited") {
        toast.error(
          t(
            "لعبت كثيراً خلال وقت قصير. حاول بعد دقائق.",
            "Too many games in a short time. Try again in a few minutes.",
          ),
        );
      } else {
        setFailed(() => () => start(status, answer));
      }
    }
  };

  /* ---------- answering ---------- */
  const answer = async (shown: number | null) => {
    if (phase.name !== "question" || phase.busy || phase.feedback) return;
    const { playId, q } = phase;
    setPhase({ ...phase, busy: true, pendingPick: shown });
    setFailed(null);
    try {
      const out = await answerFn({ data: { device: device.current, playId, q: q.index, shown } });
      if ("stale" in out) return applyState(out.stale);
      setPhase({ ...phase, busy: false, score: out.score, feedback: { ...out, picked: shown } });
      const n = q.index % 4;
      if (out.correct) {
        burst(false);
        say(
          {
            ar: `${CHEERS[n].ar} ${out.explanation.ar}`,
            en: `${CHEERS[n].en} ${out.explanation.en}`,
          },
          "celebrate",
          "happy",
        );
      } else if (out.timedOut) {
        say(
          { ar: `انتهى الوقت! ${out.explanation.ar}`, en: `Time's up! ${out.explanation.en}` },
          "think",
          "sad",
        );
      } else {
        const m = MISSES[q.index % 2];
        say(
          { ar: `${m.ar} ${out.explanation.ar}`, en: `${m.en} ${out.explanation.en}` },
          "think",
          "sad",
        );
      }
      if (out.result) savePlay({ id: playId, finished: true, claimed: false });
    } catch {
      setPhase({ ...phase, busy: false });
      setFailed(() => () => answer(shown));
    }
  };

  const next = async () => {
    if (phase.name !== "question" || !phase.feedback) return;
    const fb = phase.feedback;
    if (fb.result) {
      setPhase({ name: "result", playId: phase.playId, result: fb.result, claimed: false });
      burst(true);
      say(LEVELS[fb.result.level].line, "vision", "cheer");
      return;
    }
    setPhase({ ...phase, busy: true });
    setFailed(null);
    try {
      applyState(
        await showFn({
          data: { device: device.current, playId: phase.playId, q: fb.nextIndex ?? 0 },
        }),
      );
    } catch {
      setPhase({ ...phase, busy: false });
      setFailed(() => () => next());
    }
  };

  const hint = async () => {
    if (phase.name !== "question" || phase.q.hintUsed || phase.feedback || phase.busy) return;
    try {
      const h = await hintFn({
        data: { device: device.current, playId: phase.playId, q: phase.q.index },
      });
      setPhase({
        ...phase,
        q: { ...phase.q, hintUsed: true, hint: h.hint, limitMs: h.limitMs },
        deadline: performance.now() + h.remainingMs,
      });
      say(h.hint, "think", "nervous");
    } catch {
      toast.error(t("استُخدم التلميح في هذه اللعبة.", "The hint was already used in this game."));
    }
  };

  /* Keys 1–4 (or A–D) answer; Enter moves on. */
  useEffect(() => {
    if (phase.name !== "question") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (phase.feedback) {
        if (e.key === "Enter") void next();
        return;
      }
      const i = ["1", "2", "3", "4"].indexOf(e.key);
      const j = ["a", "b", "c", "d"].indexOf(e.key.toLowerCase());
      const k = i >= 0 ? i : j;
      if (k >= 0) void answer(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- claim ---------- */
  const claim = async (playId: string, result: PlayResult | null) => {
    setClaiming(true);
    setClaimNote(null);
    try {
      const out = await claimFn({ data: { playId, lang } });
      if (out.status === "claimed" || out.status === "already_claimed") {
        savePlay({ id: playId, finished: true, claimed: out.status === "claimed" });
        setPhase({
          name: "claimed",
          playId,
          result,
          reward: out.reward,
          emailed: out.emailed,
          earlier: out.status === "already_claimed",
        });
        setMyReward({ ...out.reward, used: false });
        burst(true);
        say(
          out.status === "claimed"
            ? {
                ar: `مبروك! هذه هديتك: كوبون خصم ${out.reward.percent}٪.`,
                en: `Congratulations! Here is your gift: a ${out.reward.percent}% coupon.`,
              }
            : {
                ar: "لحسابك هدية من تكسبو مسبقاً، وهذه هي.",
                en: "Your account already has its Texpo gift. Here it is.",
              },
          "celebrate",
          "cheer",
        );
      } else if (out.status === "guest") {
        setClaimNote({
          ar: "حسابات الزوار لا تستلم الكوبونات. أنشئ حساباً كاملاً أولاً.",
          en: "Guest accounts can't receive coupons. Create a full account first.",
        });
      } else if (out.status === "device_claimed") {
        setDeviceUsed(true);
        setClaimNote({
          ar: "استُلمت هدية على هذا الجهاز بحساب آخر. لكل جهاز هدية واحدة.",
          en: "A gift was already claimed on this device with another account. One gift per device.",
        });
      } else if (out.status === "play_claimed") {
        setClaimNote({
          ar: "استُلمت هدية هذه النتيجة بحساب آخر.",
          en: "This result's gift was already claimed with another account.",
        });
      } else if (out.status === "not_found" || out.status === "not_finished") {
        // No finished result behind this device's saved play: start clean.
        savePlay(null);
        setPhase({ name: "intro" });
        say(
          {
            ar: "لم أجد نتيجتك. لنبدأ من جديد!",
            en: "I couldn't find your result. Let's start again!",
          },
          "think",
        );
      } else {
        setClaimNote({
          ar: "تعذّر استلام الهدية. حاول مجدداً.",
          en: "Couldn't claim the gift. Please try again.",
        });
      }
    } catch {
      setClaimNote({
        ar: "تعذّر استلام الهدية. تحقّق من الاتصال وحاول مجدداً.",
        en: "Couldn't claim the gift. Check your connection and try again.",
      });
    } finally {
      setClaiming(false);
    }
  };

  /* One round per player: a finished game is never replayed. "Not you?" signs
     out but keeps the result, so the person who played can sign in and claim. */
  const switchAccount = async () => {
    await supabase.auth.signOut().catch(() => {});
    setClaimNote(null);
    setMyReward(null);
  };

  const showMyReward = (playId: string, result: PlayResult | null) => {
    if (!myReward) return;
    setPhase({ name: "claimed", playId, result, reward: myReward, emailed: false, earlier: true });
    say({ ar: "هذه هديتك من تكسبو.", en: "Here's your Texpo gift." }, "celebrate", "happy");
  };

  const copyCode = (code: string) =>
    navigator.clipboard.writeText(code).then(
      () => toast.success(t("نُسخ الكود", "Code copied")),
      () => toast.error(t("تعذّر النسخ، انسخه يدوياً", "Couldn't copy; copy it by hand")),
    );

  /* ---------- render ---------- */
  const q = phase.name === "question" ? phase.q : null;
  const progress =
    phase.name === "question"
      ? phase.q.index + (phase.feedback ? 1 : 0)
      : phase.name === "result" || phase.name === "claimed"
        ? QUESTION_COUNT
        : 0;

  return (
    <div className="tx" dir={dir} data-phase={phase.name}>
      <div className="tx-bg" aria-hidden="true">
        <span className="tx-orb tx-orb-a" />
        <span className="tx-orb tx-orb-b" />
        <span className="tx-grid" />
      </div>
      <Confetti fire={confetti.n} big={confetti.big} />

      <header className="tx-top">
        <a className="tx-brand" href="/" aria-label={t("الصفحة الرئيسية للجمعية", "SAAE home")}>
          <span className="tx-brand-saae">SAAE</span>
          <span className="tx-brand-dot" aria-hidden="true">
            ·
          </span>
          <span>Texpo 2026</span>
        </a>
        {(phase.name === "question" || progress > 0) && (
          <ol
            className="tx-progress"
            aria-label={t(
              `التقدّم: ${progress} من ${QUESTION_COUNT}`,
              `Progress: ${progress} of ${QUESTION_COUNT}`,
            )}
          >
            {Array.from({ length: QUESTION_COUNT }, (_, i) => (
              <li
                key={i}
                data-done={i < progress ? "" : undefined}
                data-now={q && i === q.index ? "" : undefined}
              />
            ))}
          </ol>
        )}
        <button type="button" className="tx-lang" onClick={() => setLang(ar ? "en" : "ar")}>
          {ar ? "English" : "العربية"}
        </button>
      </header>

      <main className="tx-stage">
        <AbuHost
          pose={host.pose}
          mood={host.mood}
          beat={host.beat}
          line={pick(host.line)}
          dir={dir}
        />

        <section className="tx-panel" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={phase.name === "question" ? `q${phase.q.index}` : phase.name}
              className="tx-card"
              initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {phase.name === "boot" && (
                <div className="tx-loading" aria-label={t("جارٍ التحميل", "Loading")} />
              )}

              {phase.name === "intro" && (
                <div className="tx-intro">
                  <p className="tx-kicker">
                    {t("الجمعية السورية للذكاء الاصطناعي · تكسبو 2026", "SAAE at Texpo 2026")}
                  </p>
                  <h1 className="tx-title">
                    {t("العب وتعلّم مع أبو الجود", "Play and Learn with Abu Al-Joud")}
                  </h1>
                  <p className="tx-lead">
                    {t(
                      `${QUESTION_COUNT} أسئلة عن الذكاء الاصطناعي في حياتنا اليومية. العب واربح كوبون هدية من الجمعية بخصم يصل إلى 50٪.`,
                      `${QUESTION_COUNT} questions about everyday AI. Play and win a gift coupon from SAAE: up to 50% off.`,
                    )}
                  </p>
                  <ul className="tx-facts">
                    <li>{t(`${QUESTION_COUNT} أسئلة`, `${QUESTION_COUNT} questions`)}</li>
                    <li>{t("20 ثانية لكل سؤال", "20 seconds each")}</li>
                    <li>{t("تلميح واحد", "1 hint")}</li>
                  </ul>
                  <ul className="tx-tiers" aria-label={t("الهدايا حسب المستوى", "Gifts by level")}>
                    {(["beginner", "intermediate", "professional"] as const).map((lv) => (
                      <li key={lv} data-level={lv}>
                        <b>{LEVELS[lv].percent}%</b>
                        <span>{pick(LEVELS[lv].name)}</span>
                      </li>
                    ))}
                  </ul>
                  {myReward ? (
                    <>
                      <p className="tx-note">
                        {t(
                          "لعبت التحدّي واستلمت هديتك من قبل.",
                          "You've already played and claimed your gift.",
                        )}
                      </p>
                      <button
                        type="button"
                        className="tx-btn tx-btn-primary tx-btn-big"
                        onClick={() => showMyReward("", null)}
                      >
                        <Gift aria-hidden="true" />
                        {t("اعرض هديتي", "Show my gift")}
                      </button>
                    </>
                  ) : deviceUsed ? (
                    <>
                      <p className="tx-note">{pick(DEVICE_USED)}</p>
                      {!authLoading && !user && (
                        <a className="tx-btn tx-btn-ghost" href={LOGIN}>
                          {t(
                            "سجّل الدخول بالحساب الذي استلمها",
                            "Sign in with the account that claimed it",
                          )}
                        </a>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="tx-btn tx-btn-primary tx-btn-big"
                      disabled={authLoading || rewardPending}
                      onClick={askStatus}
                    >
                      <Sparkles aria-hidden="true" />
                      {t("ابدأ التحدّي", "Start the challenge")}
                    </button>
                  )}
                </div>
              )}

              {phase.name === "status" && (
                <div className="tx-ask">
                  <p className="tx-step">{t("قبل اللعبة · 1 من 2", "Before the game · 1 of 2")}</p>
                  <h2 className="tx-q">{t("ما وضعك حالياً؟", "Which describes you right now?")}</h2>
                  <div className="tx-chips">
                    {STATUSES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        className="tx-chip"
                        onClick={() => chooseStatus(st.id)}
                      >
                        {ar ? st.ar : st.en}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase.name === "answer" && (
                <div className="tx-ask">
                  <p className="tx-step">{t("قبل اللعبة · 2 من 2", "Before the game · 2 of 2")}</p>
                  <h2 className="tx-q">
                    {pick(STATUSES.find((st) => st.id === phase.status)!.ask)}
                  </h2>
                  <div className="tx-chips tx-chips-compact">
                    {answersFor(phase.status).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="tx-chip"
                        onClick={() => start(phase.status, a.id)}
                      >
                        {ar ? a.ar : a.en}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="tx-link" onClick={askStatus}>
                    {t("رجوع", "Back")}
                  </button>
                </div>
              )}

              {phase.name === "question" && q && (
                <div className="tx-play">
                  <div className="tx-play-head">
                    <span className="tx-count">
                      {t(
                        `السؤال ${q.index + 1} من ${q.total}`,
                        `Question ${q.index + 1} of ${q.total}`,
                      )}
                    </span>
                    <span
                      className="tx-score"
                      aria-label={t(`النتيجة ${phase.score}`, `Score ${phase.score}`)}
                    >
                      <Check aria-hidden="true" /> {phase.score}
                    </span>
                    <TimerRing
                      deadline={phase.deadline}
                      limitMs={q.limitMs}
                      paused={!!phase.feedback || phase.busy}
                      onExpire={() => answer(null)}
                      label={t("الوقت المتبقي بالثواني", "Seconds left")}
                    />
                  </div>
                  <h2 className="tx-q">{pick(q.text)}</h2>
                  <div className="tx-answers" role="group" aria-label={t("الخيارات", "Answers")}>
                    {(ar ? q.options.ar : q.options.en).map((opt, i) => {
                      const fb = phase.feedback;
                      const state = !fb
                        ? phase.busy && phase.pendingPick === i
                          ? "pending"
                          : undefined
                        : i === fb.correctShown
                          ? "right"
                          : i === fb.picked
                            ? "wrong"
                            : "dim";
                      return (
                        <motion.button
                          key={i}
                          type="button"
                          className="tx-answer"
                          data-state={state}
                          disabled={!!fb || phase.busy}
                          onClick={() => answer(i)}
                          initial={reduce ? false : { opacity: 0, y: 10 }}
                          animate={
                            state === "wrong" && !reduce
                              ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }
                              : state === "right" && !reduce
                                ? { opacity: 1, y: 0, scale: [1, 1.03, 1] }
                                : { opacity: 1, y: 0 }
                          }
                          transition={{
                            delay: fb || state ? 0 : 0.05 + i * 0.06,
                            duration: fb ? 0.45 : 0.22,
                          }}
                        >
                          <span className="tx-letter" aria-hidden="true">
                            {LETTERS[lang][i]}
                          </span>
                          <span className="tx-answer-text">{opt}</span>
                          {state === "right" && (
                            <Check className="tx-mark" aria-label={t("صحيح", "Right")} />
                          )}
                          {state === "wrong" && (
                            <X className="tx-mark" aria-label={t("خطأ", "Wrong")} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  <div className="tx-play-foot">
                    {!phase.feedback ? (
                      <button
                        type="button"
                        className="tx-btn tx-btn-ghost"
                        onClick={hint}
                        disabled={q.hintUsed || phase.busy}
                      >
                        <Lightbulb aria-hidden="true" />
                        {q.hintUsed
                          ? q.hint
                            ? t("هذا تلميحك", "Your hint is above")
                            : t("استُخدم التلميح", "Hint used")
                          : t("تلميح من أبو الجود (+10 ث)", "Hint from Abu Al-Joud (+10 s)")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="tx-btn tx-btn-primary"
                        onClick={next}
                        disabled={phase.busy}
                        autoFocus
                      >
                        {phase.feedback.result
                          ? t("اعرض نتيجتي", "See my result")
                          : t("السؤال التالي", "Next question")}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {phase.name === "result" && (
                <ResultView
                  result={phase.result}
                  ar={ar}
                  pick={pick}
                  t={t}
                  reduce={!!reduce}
                  locked
                  onAskWhy={(text, correct) =>
                    openChat(
                      t(
                        `في تحدّي تكسبو سُئلت: «${text.ar}». لماذا الإجابة الصحيحة «${correct.ar}»؟`,
                        `In the Texpo challenge I was asked: "${text.en}". Why is the right answer "${correct.en}"?`,
                      ),
                      phase.playId,
                    )
                  }
                >
                  {phase.claimed ? (
                    <div className="tx-claim">
                      <p className="tx-note">
                        {t("استُلمت هدية هذه النتيجة.", "This result's gift has been claimed.")}
                      </p>
                      {myReward && (
                        <button
                          type="button"
                          className="tx-btn tx-btn-primary"
                          onClick={() => showMyReward(phase.playId, phase.result)}
                        >
                          <Gift aria-hidden="true" />
                          {t("اعرض هديتي", "Show my gift")}
                        </button>
                      )}
                    </div>
                  ) : authLoading ? null : user ? (
                    <div className="tx-claim">
                      <button
                        type="button"
                        className="tx-btn tx-btn-primary tx-btn-big"
                        onClick={() => claim(phase.playId, phase.result)}
                        disabled={claiming}
                      >
                        <Sparkles aria-hidden="true" />
                        {claiming
                          ? t("جارٍ الاستلام…", "Claiming…")
                          : t("استلم هديتي", "Claim my gift")}
                      </button>
                      <p className="tx-small">
                        {t("مسجّل الدخول باسم", "Signed in as")} <bdi>{user.email ?? ""}</bdi> ·{" "}
                        <button type="button" className="tx-link" onClick={switchAccount}>
                          {t("لست أنت؟", "Not you?")}
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div className="tx-claim">
                      <p className="tx-small">
                        {t(
                          "أنشئ حساباً مجانياً لتستلم هديتك. نتيجتك محفوظة على هذا الجهاز.",
                          "Create a free account to claim your gift. Your result is saved on this device.",
                        )}
                      </p>
                      <a className="tx-btn tx-btn-primary tx-btn-big" href={SIGNUP}>
                        {t("أنشئ حساباً واستلم هديتك", "Create an account and claim your gift")}
                      </a>
                      <a className="tx-btn tx-btn-ghost" href={LOGIN}>
                        {t("لديّ حساب، سجّل دخولي", "I have an account, sign in")}
                      </a>
                    </div>
                  )}
                  {claimNote && <p className="tx-note tx-note-warn">{pick(claimNote)}</p>}
                  <div className="tx-row">
                    <button
                      type="button"
                      className="tx-btn tx-btn-ghost"
                      onClick={() =>
                        openChat(
                          t(
                            `أنهيت لعبة «العب وتعلّم مع أبو الجود» في تكسبو بنتيجة ${phase.result.score} من ${phase.result.total} (مستوى ${LEVELS[phase.result.level].name.ar}). كيف أطوّر استخدامي للذكاء الاصطناعي؟`,
                            `I finished "Play and Learn with Abu Al-Joud" at Texpo with ${phase.result.score}/${phase.result.total} (${LEVELS[phase.result.level].name.en}). How can I get better at using AI?`,
                          ),
                          phase.playId,
                        )
                      }
                    >
                      <MessageCircle aria-hidden="true" />
                      {t("تحدّث مع أبو الجود", "Talk to Abu Al-Joud")}
                    </button>
                  </div>
                </ResultView>
              )}

              {phase.name === "claimed" && (
                <div className="tx-claimed">
                  <p className="tx-kicker">
                    {phase.earlier
                      ? t("هديتك من تكسبو", "Your Texpo gift")
                      : t("مبروك!", "Congratulations!")}
                  </p>
                  <div className="tx-ticket" data-level={phase.reward.level}>
                    <span className="tx-ticket-pct">{phase.reward.percent}%</span>
                    <span className="tx-ticket-level">{pick(LEVELS[phase.reward.level].name)}</span>
                    <button
                      type="button"
                      className="tx-code"
                      onClick={() => copyCode(phase.reward.code)}
                      dir="ltr"
                    >
                      <span>{phase.reward.code}</span>
                      <Copy aria-hidden="true" />
                      <span className="sr-only">{t("نسخ الكود", "Copy the code")}</span>
                    </button>
                  </div>
                  <p className="tx-lead">
                    {t(
                      "خصم على دورة واحدة من دورات الذكاء الاصطناعي التوليدي حتى 10 كانون الأول 2026. اختر الدورة، اضغط «سجّل الآن» وأدخل الكود في حقل الكوبون. يعمل مع حسابك فقط، وتراجعه الإدارة.",
                      "Off one Generative AI course until 10 December 2026. Pick a course, tap Enroll and enter the code in the coupon field. It works with your account only, and the team approves it.",
                    )}
                  </p>
                  {phase.emailed && (
                    <p className="tx-small">
                      {t("أرسلنا الكود إلى بريدك أيضاً.", "We also emailed you the code.")}
                    </p>
                  )}
                  <a className="tx-badge" href={PROFILE_BADGES}>
                    <img src={BADGES["texpo-2026"].image} alt="" width={56} height={56} />
                    <span>
                      <strong>
                        {t("وحصلت على شارة تكسبو 2026", "You also earned the Texpo 2026 badge")}
                      </strong>
                      <small>{t("تجدها في ملفك الشخصي", "Find it on your profile")}</small>
                    </span>
                  </a>
                  <div className="tx-row">
                    <a className="tx-btn tx-btn-primary" href={CATALOG}>
                      {t("دورات الذكاء الاصطناعي التوليدي", "Generative AI courses")}
                    </a>
                    <button
                      type="button"
                      className="tx-btn tx-btn-ghost"
                      onClick={() =>
                        openChat(
                          t(
                            `ربحت كوبون خصم ${phase.reward.percent}٪ في تكسبو على دورات الذكاء الاصطناعي التوليدي. أيّ دورة تنصحني بها؟`,
                            `I won a ${phase.reward.percent}% Texpo coupon for the Generative AI courses. Which one do you recommend?`,
                          ),
                          phase.playId,
                        )
                      }
                    >
                      <MessageCircle aria-hidden="true" />
                      {t("اسأل أبو الجود عن دورة", "Ask Abu Al-Joud for a course")}
                    </button>
                  </div>
                </div>
              )}

              {failed && (
                <div className="tx-note tx-note-warn" role="alert">
                  {t("انقطع الاتصال. ", "Connection lost. ")}
                  <button type="button" className="tx-link" onClick={() => failed()}>
                    {t("حاول مجدداً", "Try again")}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

function ResultView({
  result,
  ar,
  pick,
  t,
  reduce,
  locked,
  onAskWhy,
  children,
}: {
  result: PlayResult;
  ar: boolean;
  pick: (b: Bi) => string;
  t: (a: string, e: string) => string;
  reduce: boolean;
  locked: boolean;
  onAskWhy: (text: Bi, correct: Bi) => void;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(reduce ? result.score : 0);
  useEffect(() => {
    if (reduce) return;
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      setShown(Math.min(n, result.score));
      if (n >= result.score) window.clearInterval(id);
    }, 120);
    return () => window.clearInterval(id);
  }, [result.score, reduce]);
  const level = LEVELS[result.level];

  return (
    <div className="tx-result">
      <p className="tx-kicker">{t("نتيجتك", "Your result")}</p>
      <div className="tx-scoreline">
        <span className="tx-big">{shown}</span>
        <span className="tx-of">/ {result.total}</span>
      </div>
      <div className="tx-ticket" data-level={result.level} data-locked={locked ? "" : undefined}>
        <span className="tx-ticket-pct">{level.percent}%</span>
        <span className="tx-ticket-level">{pick(level.name)}</span>
        {locked && (
          <span className="tx-ticket-lock">
            <Lock aria-hidden="true" /> {t("سجّل لتستلمه", "Sign in to claim")}
          </span>
        )}
      </div>
      {children}
      <details className="tx-review">
        <summary>{t("راجع إجاباتك", "Review your answers")}</summary>
        <ol>
          {result.review.map((r) => (
            <li key={r.index} data-ok={r.ok ? "" : undefined}>
              <p className="tx-review-q">
                {r.ok ? (
                  <Check aria-label={t("صحيح", "Right")} />
                ) : (
                  <X aria-label={t("خطأ", "Wrong")} />
                )}{" "}
                {pick(r.text)}
              </p>
              {!r.ok && (
                <p className="tx-small">
                  {r.chosen
                    ? `${t("إجابتك", "You chose")}: ${pick(r.chosen)} · `
                    : `${t("انتهى الوقت", "Time ran out")} · `}
                  {t("الصحيح", "Right answer")}: <b>{pick(r.correct)}</b>
                </p>
              )}
              <p className="tx-small">{pick(r.explanation)}</p>
              <button type="button" className="tx-link" onClick={() => onAskWhy(r.text, r.correct)}>
                <MessageCircle aria-hidden="true" />{" "}
                {ar ? "اسأل أبو الجود لماذا" : "Ask Abu Al-Joud why"}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
