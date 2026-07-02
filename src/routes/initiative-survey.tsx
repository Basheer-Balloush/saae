import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/initiative-survey")({
  head: () => ({
    meta: [
      { title: "استبيان مبادرة مليون مستخدم للذكاء الاصطناعي السوري" },
      {
        name: "description",
        content:
          "شاركنا رأيك لنُصمّم لك مسار تدريبي مجاني على أدوات الذكاء الاصطناعي ضمن مبادرة مليون مستخدم للذكاء الاصطناعي السوري.",
      },
      { property: "og:title", content: "استبيان مبادرة مليون مستخدم للذكاء الاصطناعي السوري" },
      {
        property: "og:description",
        content: "ساعدنا نبني المسار التدريبي الأنسب لك — دقيقتان فقط.",
      },
    ],
  }),
  component: SurveyPage,
});

const HEARD_OPTIONS = ["من صديق أو زميل", "وسائل التواصل الاجتماعي", "موقع الجمعية", "فعالية أو ندوة", "أخرى"];

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
  "أخرى",
];

const OBSTACLES = [
  "ضيق الوقت",
  "عدم معرفة من أين أبدأ",
  "ضعف أو عدم استقرار الإنترنت أو الكهرباء",
  "الخوف من صعوبة المجال",
  "عدم رؤية فائدة مباشرة شخصية",
  "ارتفاع تكلفة الدورات التدريبية",
  "أخرى",
];

const METHODS = [
  "فيديوهات قصيرة أتعلمها في الوقت المناسب لي",
  "جلسات حضورية مباشرة في قاعة أو مدرج",
  "مزيج بين فيديوهات ولقاءات حضورية من وقت لآخر",
  "أخرى",
];

const DEVICES = ["الهاتف المحمول فقط", "الحاسوب المحمول أو المكتبي فقط", "كلاهما حسب المكان"];

const MOTIVATIONS = [
  "زيادة الدخل وفرص العمل",
  "تطوير العمل أو الدراسة الحالية",
  "الفضول وتعلّم مهارة جديدة",
  "الحصول على شهادة تُضاف إلى السيرة الذاتية",
  "الانضمام مع الأصدقاء وعدم التأخر عنهم",
];

const STATUSES = ["طالب جامعي", "خريج ويبحث عن عمل", "موظف بدوام", "صاحب مشروع صغير", "عاطل عن العمل حاليًا"];

const SUBSCRIPTIONS = [
  { value: "waitlist", label: "قائمة الانتظار (ممولة من قبل المؤسسات والشركات)" },
  { value: "self", label: "ادفع عن نفسي — 1 دولار" },
  { value: "self_and_donate", label: "ادفع عن نفسي وتبرّع لآخرين غيري" },
];

function SurveyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    heard_from: "",
    ai_relationship: "",
    learning_interests: [] as string[],
    biggest_obstacle: "",
    learning_method: "",
    device: "",
    commitment_level: 3,
    main_motivation: "",
    current_status: "",
    extra_notes: "",
    subscription_type: "",
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

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error("الرجاء تعبئة الاسم ورقم الهاتف");
      return;
    }
    if (!form.subscription_type) {
      toast.error("الرجاء اختيار نمط الاشتراك");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("initiative_survey_responses").insert({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim(),
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
            تم استلام إجاباتك بنجاح، وسنعتمد عليها لبناء أفضل تجربة تعليمية مجانية لك ضمن مبادرة مليون مستخدم للذكاء
            الاصطناعي السوري.
          </p>
          <Link to="/one-million-initiative-home">
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
            <Sparkles className="h-4 w-4" /> مبادرة مليون مستخدم للذكاء الاصطناعي السوري
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold">شاركنا رأيك — دقيقتان فقط</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            إجاباتك ستساعدنا في تصميم مسار تدريبي مجاني يناسب احتياجاتك، ويأخذ بعين الاعتبار ظروفك وأدواتك.
          </p>
        </div>

        <div className="space-y-6">
          {/* Contact */}
          <Section title="معلوماتك الأساسية">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="الاسم الكامل *">
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="رقم الهاتف / واتساب *">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="البريد الإلكتروني (اختياري)">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title="١. من أين سمعت عن المبادرة؟">
            <RadioList
              value={form.heard_from}
              onChange={(v) => setForm({ ...form, heard_from: v })}
              options={HEARD_OPTIONS}
            />
          </Section>

          <Section title="٢. كيف تصف علاقتك الحالية بأدوات الذكاء الاصطناعي؟">
            <RadioList
              value={form.ai_relationship}
              onChange={(v) => setForm({ ...form, ai_relationship: v })}
              options={AI_RELATION}
            />
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
          </Section>

          <Section title="٤. ما أكبر عائق يمنعك من التعلّم بجدية؟">
            <RadioList
              value={form.biggest_obstacle}
              onChange={(v) => setForm({ ...form, biggest_obstacle: v })}
              options={OBSTACLES}
            />
          </Section>

          <Section title="٥. ما الطريقة الأنسب لك للتعلّم؟">
            <RadioList
              value={form.learning_method}
              onChange={(v) => setForm({ ...form, learning_method: v })}
              options={METHODS}
            />
          </Section>

          <Section title="٦. ما الجهاز الذي ستستخدمه غالبًا؟">
            <RadioList value={form.device} onChange={(v) => setForm({ ...form, device: v })} options={DEVICES} />
          </Section>

          <Section title="٧. مدى التزامك بإكمال مسار مجاني كامل؟">
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

          <Section title="٨. السبب الأساسي للتسجيل؟">
            <RadioList
              value={form.main_motivation}
              onChange={(v) => setForm({ ...form, main_motivation: v })}
              options={MOTIVATIONS}
            />
          </Section>

          <Section title="٩. ما وضعك الحالي؟">
            <RadioList
              value={form.current_status}
              onChange={(v) => setForm({ ...form, current_status: v })}
              options={STATUSES}
            />
          </Section>

          <Section title="١٠. هل لديك ملاحظة أو اقتراح أو سؤال؟">
            <Textarea
              rows={4}
              value={form.extra_notes}
              onChange={(e) => setForm({ ...form, extra_notes: e.target.value })}
              placeholder="اكتب هنا (اختياري)..."
            />
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
