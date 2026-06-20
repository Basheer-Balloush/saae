import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, MapPin, ArrowLeft, CheckCircle2, Loader2, Clock } from "lucide-react";
import ministryLogo from "@/assets/ministry-communications.png.asset.json";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { submitEventRegistration } from "@/lib/event-registrations.functions";
import { toUserMessage } from "@/lib/safe-error";

export const Route = createFileRoute("/ai-tot-graduation-registeration")({
  head: () => ({
    meta: [
      { title: "تسجيل الندوة الوطنية للذكاء الاصطناعي — SAAE" },
      { name: "description", content: "سجّل حضورك في الندوة الوطنية السورية الأولى للذكاء الاصطناعي — المكتبة الوطنية، دمشق، 25/6/2026." },
      { property: "og:title", content: "تسجيل الندوة الوطنية للذكاء الاصطناعي" },
      { property: "og:url", content: "https://aisyria.org/ai-tot-graduation-registeration" },
    ],
    links: [{ rel: "canonical", href: "https://aisyria.org/ai-tot-graduation-registeration" }],
  }),
  component: Page,
});

const T = {
  ar: {
    badge: "تسجيل الحضور",
    sponsor: "برعاية كريمة من وزارة الاتصال وتقانة المعلومات",
    title: "الندوة الوطنية السورية الأولى للذكاء الاصطناعي",
    subtitle: "تخريج الدفعة الأولى من مدربي الذكاء الاصطناعي وإطلاق مبادرة مليون مستخدم سوري للذكاء الاصطناعي.",
    venue: "المكتبة الوطنية — دمشق",
    date: "25 / 6 / 2026",
    register: "تسجيل الحضور",
    home: "العودة إلى الرئيسية",
    agenda: "برنامج الفعالية",
    time: "التوقيت",
    item: "الفقرة",
    speaker: "المتحدث",
    formTitle: "نموذج التسجيل",
    formDesc: "املأ الحقول لإكمال طلب التسجيل. سيتم التواصل معك بعد المراجعة.",
    fullName: "الاسم الكامل",
    phone: "رقم الهاتف",
    email: "البريد الإلكتروني",
    specialization: "الاختصاص",
    submit: "إرسال الطلب",
    cancel: "إلغاء",
    successTitle: "تم استلام طلبك",
    successBody: "في انتظار موافقة الإدارة. ستصلك رسالة عبر البريد الإلكتروني وواتساب تتضمن رمز الدخول الخاص بك.",
  },
  en: {
    badge: "Event Registration",
    sponsor: "Under the patronage of the Ministry of Communications and Information Technology",
    title: "First Syrian National AI Symposium",
    subtitle: "Graduation of the first cohort of AI trainers and launch of the One Million Syrian AI Users initiative.",
    venue: "National Library — Damascus",
    date: "25 / 6 / 2026",
    register: "Register to attend",
    home: "Back to home",
    agenda: "Event agenda",
    time: "Time",
    item: "Item",
    speaker: "Speaker",
    formTitle: "Registration form",
    formDesc: "Fill in the fields to complete your registration. We will contact you after review.",
    fullName: "Full name",
    phone: "Phone number",
    email: "Email",
    specialization: "Specialization",
    submit: "Submit",
    cancel: "Cancel",
    successTitle: "Your request was received",
    successBody: "Awaiting admin approval. You will receive an email and WhatsApp message containing your access PIN.",
  },
} as const;

const AGENDA_AR: { time: string; item: string; speaker?: string }[] = [
  { time: "10:05 - 10:00", item: "كلمة الافتتاح", speaker: "المستشار وصفي الحلبي — المدير التنفيذي" },
  { time: "10:10 - 10:05", item: "تلاوة آيات من الذكر الحكيم" },
  { time: "10:20 - 10:10", item: "كلمة رئيس مجلس الإدارة", speaker: "الأستاذ أحمد غسان المنجد" },
  { time: "10:30 - 10:20", item: "كلمة راعي الندوة", speaker: "معالي وزير الاتصالات" },
  { time: "10:40 - 10:30", item: "كلمة مدير التدريب", speaker: "المهندس وليد حلاوة" },
  { time: "10:55 - 10:40", item: "كلمات خريجي دورة TOT" },
  { time: "11:05 - 10:55", item: "قصة خريج من واقع الدورة" },
  { time: "11:20 - 11:05", item: "إنجازات الجمعية (الماضي والحاضر والمستقبل)", speaker: "المدير التنفيذي للجمعية" },
  { time: "11:35 - 11:20", item: "إعلان نظام المعادلة والمعايير الخاصة بالمدربين", speaker: "مدير التدريب في الجمعية" },
  { time: "11:50 - 11:35", item: "إطلاق مبادرة مليون مستخدم سوري للذكاء الاصطناعي", speaker: "الأستاذ رامي المجاهد — مدير العلاقات العامة" },
  { time: "12:05 - 11:50", item: "استراحة" },
  { time: "13:05 - 12:05", item: "(جلسة حوارية) مستقبل التدريب في ظل علوم الذكاء الاصطناعي" },
  { time: "13:15 - 13:05", item: "عرض كلمات ممثلي الجمعية في العالم" },
  { time: "13:35 - 13:15", item: "تكريم الخريجين" },
  { time: "14:05 - 13:35", item: "الختام" },
];

const AGENDA_EN: { time: string; item: string; speaker?: string }[] = [
  { time: "10:00 - 10:05", item: "Opening remarks", speaker: "Wasfi Al-Halabi — Executive Advisor" },
  { time: "10:05 - 10:10", item: "Quran recitation" },
  { time: "10:10 - 10:20", item: "Chairman's address", speaker: "Mr. Ahmad Ghassan Al-Munajjid" },
  { time: "10:20 - 10:30", item: "Sponsor's address", speaker: "H.E. Minister of Communications" },
  { time: "10:30 - 10:40", item: "Training director's address", speaker: "Eng. Walid Halawa" },
  { time: "10:40 - 10:55", item: "TOT graduates' addresses" },
  { time: "10:55 - 11:05", item: "A graduate's story from the program" },
  { time: "11:05 - 11:20", item: "Association achievements (past, present, future)", speaker: "Executive Director" },
  { time: "11:20 - 11:35", item: "Announcement of the equivalency and trainer-standards system", speaker: "Training Director" },
  { time: "11:35 - 11:50", item: "Launch of the One Million Syrian AI Users initiative", speaker: "Mr. Rami Al-Mujahed — PR Director" },
  { time: "11:50 - 12:05", item: "Break" },
  { time: "12:05 - 13:05", item: "Panel: The future of training in the age of AI" },
  { time: "13:05 - 13:15", item: "Messages from the association's global representatives" },
  { time: "13:15 - 13:35", item: "Honoring the graduates" },
  { time: "13:35 - 14:05", item: "Closing" },
];

function Page() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const t = T[lang];
  const agenda = ar ? AGENDA_AR : AGENDA_EN;
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30" dir={ar ? "rtl" : "ltr"}>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="flex flex-col items-center gap-3 mb-5">
            <img
              src={ministryLogo}
              alt={ar ? "شعار وزارة الاتصال وتقانة المعلومات" : "Ministry of Communications and Information Technology logo"}
              className="h-16 sm:h-20 w-auto object-contain"
            />
            <p className="text-sm sm:text-base font-bold text-muted-foreground">
              {t.sponsor}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            {t.badge}
          </div>
          <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            {t.title}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">{t.subtitle}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              <Calendar className="h-4 w-4 text-primary" /> {t.date}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              <MapPin className="h-4 w-4 text-primary" /> {t.venue}
            </span>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="text-base font-bold px-8" onClick={() => { setDone(false); setOpen(true); }}>
              {t.register}
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base font-bold">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t.home}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Agenda */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-8">{t.agenda}</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-primary/10 text-foreground">
              <tr>
                <th className="px-4 py-3 text-start font-bold">{t.time}</th>
                <th className="px-4 py-3 text-start font-bold">{t.item}</th>
                <th className="px-4 py-3 text-start font-bold hidden sm:table-cell">{t.speaker}</th>
              </tr>
            </thead>
            <tbody>
              {agenda.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/40"}>
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm whitespace-nowrap text-muted-foreground">{row.time}</td>
                  <td className="px-4 py-3 font-semibold">{row.item}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{row.speaker ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex justify-center">
          <Button size="lg" className="text-base font-bold px-8" onClick={() => { setDone(false); setOpen(true); }}>
            {t.register}
          </Button>
        </div>
      </section>

      <RegistrationDialog open={open} onOpenChange={setOpen} done={done} setDone={setDone} t={t} ar={ar} />
    </main>
  );
}

type Strings = (typeof T)["ar"] | (typeof T)["en"];
function RegistrationDialog({
  open, onOpenChange, done, setDone, t, ar,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  done: boolean; setDone: (v: boolean) => void;
  t: Strings; ar: boolean;
}) {
  const submit = useServerFn(submitEventRegistration);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", specialization: "" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim() || !form.specialization.trim()) {
      toast.error(ar ? "جميع الحقول مطلوبة" : "All fields are required");
      return;
    }
    setBusy(true);
    try {
      await submit({ data: form });
      setDone(true);
      setForm({ full_name: "", phone: "", email: "", specialization: "" });
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={ar ? "rtl" : "ltr"}>
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="mt-4 text-xl font-extrabold">{t.successTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t.successBody}</p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.formTitle}</DialogTitle>
              <DialogDescription>{t.formDesc}</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t.fullName} <span className="text-destructive">*</span></Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.phone} <span className="text-destructive">*</span></Label>
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.email} <span className="text-destructive">*</span></Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.specialization} <span className="text-destructive">*</span></Label>
                <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={busy} className="flex-1">
                  {busy && <Loader2 className="h-4 w-4 animate-spin mx-1" />} {t.submit}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>{t.cancel}</Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
