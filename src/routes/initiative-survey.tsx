import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/initiative-survey")({
  head: () => ({
    meta: [
      { title: "استبيان مبادرة مليون مستخدم ذكاء اصطناعي سوري" },
      {
        name: "description",
        content:
          "شاركنا رأيك لنُصمّم لك مسار تدريبي على أدوات الذكاء الاصطناعي ضمن مبادرة مليون مستخدم ذكاء اصطناعي سوري.",
      },
      { property: "og:title", content: "استبيان مبادرة مليون مستخدم ذكاء اصطناعي سوري" },
      {
        property: "og:description",
        content: "ساعدنا نبني المسار التدريبي الأنسب لك — دقيقتان فقط.",
      },
    ],
  }),
  component: SurveyPage,
});

const OTHER = "أخرى";

const HEARD_OPTIONS = ["من صديق أو زميل", "وسائل التواصل الاجتماعي", "موقع الجمعية", "فعالية أو ندوة", OTHER];

const AI_RELATION = [
  "لم أجرّبها إطلاقًا",
  "جرّبتها مرات قليلة بشكل غير منتظم",
  "أستخدمها بشكل دوري لكن دون احتراف",
  "أستخدمها بشكل احترافي في عملي أو مشروعي",
];

const INTERESTS = [
  "كتابة المحتوى والمنشورات",
  "تصميم الصور والفيديوهات",
  "بناء موقع أو تطبيق بسيط",
  "أتمتة المهام المتكررة في العمل",
  "ريادة الأعمال وتحقيق دخل إضافي",
  "تحليل البيانات وإعداد التقارير",
  OTHER,
];

const OBSTACLES = [
  "ضيق الوقت",
  "عدم معرفة من أين أبدأ",
  "ضعف أو عدم استقرار الإنترنت أو الكهرباء",
  "الخوف من صعوبة المجال",
  "عدم رؤية فائدة مباشرة شخصية",
  "ارتفاع تكلفة الدورات التدريبية",
  OTHER,
];

const METHODS = [
  "فيديوهات قصيرة أتعلمها في الوقت المناسب لي",
  "جلسات حضورية مباشرة في قاعة أو مدرج",
  "مزيج بين فيديوهات ولقاءات حضورية من وقت لآخر",
  OTHER,
];

const DEVICES = ["الهاتف المحمول فقط", "الحاسوب المحمول أو المكتبي فقط", "كلاهما حسب المكان"];

const MOTIVATIONS = [
  "زيادة الدخل وفرص العمل",
  "تطوير العمل أو الدراسة الحالية",
  "الفضول وتعلّم مهارة جديدة",
  "الحصول على شهادة تُضاف إلى السيرة الذاتية",
  "الانضمام مع الأصدقاء وعدم التأخر عنهم",
  OTHER,
];

const STATUSES = [
  "طالب مدرسة",
  "طالب جامعي",
  "خريج ويبحث عن عمل",
  "موظف بدوام",
  "صاحب مشروع صغير",
  "عاطل عن العمل حاليًا",
  OTHER,
];

const SUBSCRIPTIONS = [
  { value: "waitlist", label: "قائمة الانتظار (ممولة من قبل المؤسسات والشركات)" },
  { value: "self", label: "ادفع عن نفسي — 1 دولار" },
  { value: "self_and_donate", label: "ادفع عن نفسي وأتبرّع لآخرين غيري" },
];

// AI relationship values that indicate prior usage
const USED_AI_BEFORE = new Set([
  "جرّبتها مرات قليلة بشكل غير منتظم",
  "أستخدمها بشكل دوري لكن دون احتراف",
  "أستخدمها بشكل احترافي في عملي أو مشروعي",
]);

function SurveyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [responseCount, setResponseCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_initiative_survey_count");
      if (!cancelled && !error && typeof data === "number") setResponseCount(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [form, setForm] = useState({
    full_name: "",
    age: "",
    email: "",
    phone: "",
    address: "",
    specialization: "",
    heard_from: "",
    heard_from_other: "",
    ai_relationship: "",
    ai_tools_used: "",
    learning_interests: [] as string[],
    learning_interests_other: "",
    biggest_obstacle: "",
    biggest_obstacle_other: "",
    learning_method: "",
    learning_method_other: "",
    device: "",
    commitment_level: 3,
    main_motivation: "",
    main_motivation_other: "",
    current_status: "",
    current_status_other: "",
    extra_notes: "",
    subscription_type: "",
    donation_amount: "",
  });

  const toggleInterest = (opt: string) => {
    setForm((f) => {
      const has = f.learning_interests.includes(opt);
      if (has) return { ...f, learning_interests: f.learning_interests.filter((x) => x !== opt) };
      if (f.learning_interests.length >= 3) {
        toast.info("يمكنك اختيار حتى 3 خيارات فقط");
        return f;
      }
      return { ...f, learning_interests: [...f.learning_interests, opt] };
    });
  };

  const resolve = (value: string, other: string) => (value === OTHER ? other.trim() || OTHER : value);

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error("الرجاء تعبئة الاسم ورقم الهاتف والبريد الإلكتروني");
      return;
    }
    const nameWords = form.full_name.trim().split(/\s+/).filter((w) => w.length >= 2);
    if (nameWords.length < 2) {
      toast.error("الرجاء إدخال الاسم الكامل (كلمتين على الأقل)");
      return;
    }
    const ageNum = Number(form.age);
    if (!form.age || !Number.isFinite(ageNum) || ageNum < 5 || ageNum > 120) {
      toast.error("الرجاء إدخال عمر صحيح (بين 5 و 120)");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      toast.error("الرجاء إدخال بريد إلكتروني صحيح");
      return;
    }
    if (!form.subscription_type) {
      toast.error("الرجاء اختيار نمط الاشتراك");
      return;
    }
    if (form.subscription_type === "self_and_donate" && (!form.donation_amount || Number(form.donation_amount) < 1)) {
      toast.error("الرجاء إدخال مبلغ التبرّع (دولار واحد على الأقل)");
      return;
    }

    const interests = form.learning_interests.map((x) =>
      x === OTHER ? form.learning_interests_other.trim() || OTHER : x,
    );

    setSubmitting(true);
    try {
      const { error } = await supabase.from("initiative_survey_responses").insert({
        full_name: form.full_name.trim(),
        age: Math.floor(Number(form.age)),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
        specialization: form.specialization.trim() || null,
        heard_from: resolve(form.heard_from, form.heard_from_other),
        ai_relationship: form.ai_relationship,
        ai_tools_used:
          USED_AI_BEFORE.has(form.ai_relationship) && form.ai_tools_used.trim()
            ? form.ai_tools_used.trim()
            : null,
        learning_interests: interests,
        biggest_obstacle: resolve(form.biggest_obstacle, form.biggest_obstacle_other),
        learning_method: resolve(form.learning_method, form.learning_method_other),
        device: form.device,
        commitment_level: form.commitment_level,
        main_motivation: resolve(form.main_motivation, form.main_motivation_other),
        current_status: resolve(form.current_status, form.current_status_other),
        extra_notes: form.extra_notes,
        subscription_type: form.subscription_type,
        donation_amount:
          form.subscription_type === "self_and_donate"
            ? Math.max(1, Math.floor(Number(form.donation_amount)))
            : null,
      });
      if (error) throw error;
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      toast.error(e?.message || "تعذّر إرسال الاستبيان");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center px-4 py-20"
      >
        <div className="max-w-lg text-center rounded-3xl border border-border bg-card p-10 shadow-lg">
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-6 text-3xl font-bold">شكراً لمشاركتك!</h1>
          <p className="mt-4 text-muted-foreground">
            تم استلام إجاباتك بنجاح، وسنعتمد عليها لبناء أفضل تجربة تعليمية لك ضمن مبادرة مليون مستخدم ذكاء اصطناعي
            سوري.
          </p>
          <Link to="/initiative">
            <Button className="mt-8">العودة لصفحة المبادرة</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-semibold">
            <Sparkles className="h-4 w-4" /> استبيان مبادرة مليون مستخدم ذكاء اصطناعي سوري
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold">شاركنا رأيك — دقيقتان فقط</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            إجاباتك ستساعدنا في تصميم مسار تدريبي يناسب احتياجاتك، ويأخذ بعين الاعتبار ظروفك وأدواتك.
          </p>
          {responseCount !== null && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-5 py-2 shadow-sm">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">شارك حتى الآن</span>
              <span className="text-base font-bold text-primary">{responseCount.toLocaleString("ar-EG")}</span>
              <span className="text-sm text-muted-foreground">شخص</span>
            </div>
          )}
        </div>


        <div className="space-y-6">
          {/* Contact */}
          <Section title="معلوماتك الأساسية">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="الاسم الكامل *">
                <Input
                  placeholder="الاسم الأول واسم العائلة على الأقل"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </Field>
              <Field label="العمر *">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={120}
                  placeholder="مثال: 25"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value.replace(/[^0-9]/g, "") })}
                />
              </Field>
              <Field label="رقم الهاتف / واتساب *">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="البريد الإلكتروني *">
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="عنوان السكن">
                <Input
                  placeholder="المحافظة / المدينة"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
              <Field label="الاختصاص">
                <Input
                  placeholder="مثال: هندسة، طب، تسويق..."
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                />
              </Field>
            </div>
          </Section>

          <Section title="١. من أين سمعت عن المبادرة؟">
            <RadioList
              value={form.heard_from}
              onChange={(v) => setForm({ ...form, heard_from: v })}
              options={HEARD_OPTIONS}
            />
            {form.heard_from === OTHER && (
              <OtherInput
                value={form.heard_from_other}
                onChange={(v) => setForm({ ...form, heard_from_other: v })}
                placeholder="اذكر المصدر..."
              />
            )}
          </Section>

          <Section title="٢. كيف تصف علاقتك الحالية بأدوات الذكاء الاصطناعي؟">
            <RadioList
              value={form.ai_relationship}
              onChange={(v) => setForm({ ...form, ai_relationship: v })}
              options={AI_RELATION}
            />
            {USED_AI_BEFORE.has(form.ai_relationship) && (
              <div className="mt-3">
                <Label className="mb-1.5 block text-sm">ما الأدوات التي استخدمتها من قبل؟</Label>
                <Textarea
                  rows={2}
                  placeholder="مثال: ChatGPT، Gemini، Midjourney، Copilot..."
                  value={form.ai_tools_used}
                  onChange={(e) => setForm({ ...form, ai_tools_used: e.target.value })}
                />
              </div>
            )}
          </Section>

          <Section title="٣. ما أكثر ما ترغب بتعلّمه؟ (اختر حتى 3 خيارات)">
            <div className="space-y-2">
              {INTERESTS.map((opt) => {
                const checked = form.learning_interests.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 cursor-pointer hover:bg-muted/50 transition"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleInterest(opt)} />
                    <span className="text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
            {form.learning_interests.includes(OTHER) && (
              <OtherInput
                value={form.learning_interests_other}
                onChange={(v) => setForm({ ...form, learning_interests_other: v })}
                placeholder="اذكر ما ترغب بتعلّمه..."
              />
            )}
          </Section>

          <Section title="٤. ما أكبر عائق يمنعك من التعلّم بجدية؟">
            <RadioList
              value={form.biggest_obstacle}
              onChange={(v) => setForm({ ...form, biggest_obstacle: v })}
              options={OBSTACLES}
            />
            {form.biggest_obstacle === OTHER && (
              <OtherInput
                value={form.biggest_obstacle_other}
                onChange={(v) => setForm({ ...form, biggest_obstacle_other: v })}
                placeholder="اذكر العائق..."
              />
            )}
          </Section>

          <Section title="٥. ما الطريقة الأنسب لك للتعلّم؟">
            <RadioList
              value={form.learning_method}
              onChange={(v) => setForm({ ...form, learning_method: v })}
              options={METHODS}
            />
            {form.learning_method === OTHER && (
              <OtherInput
                value={form.learning_method_other}
                onChange={(v) => setForm({ ...form, learning_method_other: v })}
                placeholder="اذكر الطريقة..."
              />
            )}
          </Section>

          <Section title="٦. ما الجهاز الذي ستستخدمه غالبًا؟">
            <RadioList value={form.device} onChange={(v) => setForm({ ...form, device: v })} options={DEVICES} />
          </Section>

          <Section title="٧. مدى التزامك بإكمال مسار كامل؟">
            <div className="flex items-center justify-between gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, commitment_level: n })}
                  className={`flex-1 h-14 rounded-xl border-2 font-bold text-lg transition ${
                    form.commitment_level === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>غير ملتزم</span>
              <span>ملتزم جدًا</span>
            </div>
          </Section>

          <Section title="٨. السبب الأساسي للتسجيل في مبادرة مليون مستخدم ذكاء اصطناعي سوري؟">
            <RadioList
              value={form.main_motivation}
              onChange={(v) => setForm({ ...form, main_motivation: v })}
              options={MOTIVATIONS}
            />
            {form.main_motivation === OTHER && (
              <OtherInput
                value={form.main_motivation_other}
                onChange={(v) => setForm({ ...form, main_motivation_other: v })}
                placeholder="اذكر السبب..."
              />
            )}
          </Section>

          <Section title="٩. ما وضعك الحالي؟">
            <RadioList
              value={form.current_status}
              onChange={(v) => setForm({ ...form, current_status: v })}
              options={STATUSES}
            />
            {form.current_status === OTHER && (
              <OtherInput
                value={form.current_status_other}
                onChange={(v) => setForm({ ...form, current_status_other: v })}
                placeholder="اذكر وضعك الحالي..."
              />
            )}
          </Section>

          <Section title="نمط الاشتراك الأنسب لك *">
            <RadioGroup
              value={form.subscription_type}
              onValueChange={(v) => setForm({ ...form, subscription_type: v })}
              className="space-y-2"
            >
              {SUBSCRIPTIONS.map((s) => (
                <label
                  key={s.value}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${
                    form.subscription_type === s.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <RadioGroupItem value={s.value} />
                  <span className="text-sm font-medium">{s.label}</span>
                </label>
              ))}
            </RadioGroup>
            {form.subscription_type === "self_and_donate" && (
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <Label className="mb-1.5 block text-sm font-medium">مبلغ التبرّع (بالدولار) *</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="مثال: 5"
                  value={form.donation_amount}
                  onChange={(e) => setForm({ ...form, donation_amount: e.target.value })}
                  dir="ltr"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">كل 1$ يمول مقعد تدريبي واحد.</p>
              </div>
            )}
          </Section>

          <Section title="١٠. هل لديك ملاحظة أو اقتراح أو سؤال؟">
            <Textarea
              rows={4}
              value={form.extra_notes}
              onChange={(e) => setForm({ ...form, extra_notes: e.target.value })}
              placeholder="اكتب هنا (اختياري)..."
            />
          </Section>

          <Button size="lg" className="w-full h-14 text-base font-bold" onClick={submit} disabled={submitting}>
            {submitting ? "جاري الإرسال..." : "إرسال الاستبيان"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            بإرسالك هذا الاستبيان، توافق على تواصلنا معك بخصوص المبادرة.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
    </div>
  );
}

function OtherInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-3">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function RadioList({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
            value === opt ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/50"
          }`}
        >
          <RadioGroupItem value={opt} />
          <span className="text-sm">{opt}</span>
        </label>
      ))}
    </RadioGroup>
  );
}
