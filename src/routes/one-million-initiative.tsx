import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import ministryLogo from "@/assets/ministry-communications.png.asset.json";
import {
  Target,
  GraduationCap,
  HeartHandshake,
  BarChart3,
  Building2,
  CheckCircle2,
  Users,
  Award,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/one-million-initiative")({
  head: () => ({
    meta: [
      { title: "مبادرة مليون مستخدم ذكاء اصطناعي سوري — SAAE" },
      {
        name: "description",
        content:
          "المبادرة الوطنية لمحو الأمية في الذكاء الاصطناعي: تدريب مليون مستفيد سوري خلال عامين بالشراكة مع وزارة الاتصالات وتقانة المعلومات.",
      },
      { property: "og:title", content: "مبادرة مليون مستخدم ذكاء اصطناعي سوري" },
      {
        property: "og:description",
        content:
          "مبادرة وطنية تطلقها الجمعية السورية للذكاء الاصطناعي وريادة الأعمال لتمكين مليون سوري من أدوات الذكاء الاصطناعي.",
      },
      { property: "og:url", content: "https://aisyria.org/one-million-initiative" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/one-million-initiative" },
    ],
  }),
  component: OneMillionInitiativePage,
});

function OneMillionInitiativePage() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Navbar minimal />
      <main className="pt-20">
        <Hero />
        <Stats />
        <Section
          eyebrow="القسم الأول"
          title="الرؤية والأهداف الوطنية"
          icon={Target}
        >
          <GoalsGrid />
        </Section>

        <Section
          eyebrow="القسم الثاني"
          title="المنهجية الأكاديمية ومعايير الجودة"
          icon={GraduationCap}
          variant="muted"
        >
          <MethodologyGrid />
        </Section>

        <Section
          eyebrow="القسم الثالث"
          title="النموذج الاقتصادي المبتكر واستدامة المشروع"
          icon={HeartHandshake}
        >
          <EconomicModel />
        </Section>

        <Section
          eyebrow="القسم الرابع"
          title="البنية التحتية التكنولوجية والشفافية"
          icon={BarChart3}
          variant="muted"
        >
          <Infrastructure />
        </Section>

        <Section
          eyebrow="القسم الخامس"
          title="آفاق التعاون والاعتماد المطلوب من الوزارات"
          icon={Building2}
        >
          <Collaboration />
        </Section>
      </main>
      <Footer />
    </div>
  );
}

/* ---------- HERO ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 start-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 end-1/4 h-[24rem] w-[24rem] rounded-full bg-secondary/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,hsl(var(--background))_80%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-12 text-center lg:px-10 lg:pb-24 lg:pt-20">
        <div className="mx-auto mb-10 flex max-w-3xl items-center justify-center rounded-3xl border border-border/50 bg-slate-900/60 p-6 backdrop-blur-sm sm:p-8">
          <img
            src={ministryLogo.url}
            alt="وزارة الاتصالات وتقانة المعلومات"
            className="h-32 w-auto sm:h-40 lg:h-48"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          مبادرة وطنية — تنفذها الجمعية السورية للذكاء الاصطناعي وريادة الأعمال
        </span>

        <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          مليون مستخدم ذكاء اصطناعي سوري
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-loose text-muted-foreground sm:text-lg">
          مذكرة عرض استراتيجية لمبادرة وطنية تهدف إلى محو الأمية في الذكاء
          الاصطناعي، وتمكين الكوادر البشرية السورية من أدوات المستقبل وبناء
          مسارات مهنية تواكب متطلبات سوق العمل الحديث.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/learning-management-system"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:scale-105"
          >
            ابدأ التدريب الآن
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-6 py-3 text-sm font-semibold text-foreground/80 backdrop-blur transition-colors hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- STATS ---------- */
function Stats() {
  const items = [
    { value: "1,000,000", label: "مستفيد مستهدف" },
    { value: "عامان", label: "مدة التنفيذ" },
    { value: "$1", label: "تكلفة المقعد الرمزية" },
    { value: "مجاناً", label: "للمستحقين عبر التبرعات" },
  ];
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-12 lg:grid-cols-4 lg:px-10">
        {items.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xl font-bold text-primary sm:text-3xl lg:text-4xl">
              {s.value}
            </div>
            <div className="mt-2 text-xs font-medium text-muted-foreground sm:text-sm">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- SECTION WRAPPER ---------- */
function Section({
  eyebrow,
  title,
  icon: Icon,
  children,
  variant = "default",
}: {
  eyebrow: string;
  title: string;
  icon: typeof Target;
  children: React.ReactNode;
  variant?: "default" | "muted";
}) {
  return (
    <section
      className={
        variant === "muted"
          ? "border-y border-border bg-muted/30"
          : ""
      }
    >
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-secondary">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

/* ---------- GOALS ---------- */
function GoalsGrid() {
  const goals = [
    {
      title: "بناء القدرات على نطاق واسع",
      body: "نهدف استراتيجياً إلى استقطاب وتدريب مليون مستفيد خلال عامين من إطلاق المبادرة، مع إمكانية تمديد هذه المرحلة إلى ثلاث سنوات لضمان تحقيق تغطية شاملة ومستدامة.",
    },
    {
      title: "الأولوية التنموية",
      body: "تركز المبادرة في مرحلتها الأولى بشكل محوري على استهداف المناطق التي تعاني من انخفاض في جودة التعليم والتي تأثرت بشكل أكبر خلال سنوات الثورة السورية، بهدف ردم الفجوة الرقمية وتوفير تكافؤ الفرص التكنولوجية لكافة شرائح المجتمع.",
    },
    {
      title: "التميز والموثوقية",
      body: "نلتزم بتقديم محتوى تدريبي عالي الاحترافية، ليكون نقطة التقاء موثوقة تسهم في تعزيز ثقافة الذكاء الاصطناعي.",
    },
    {
      title: "تمكين سوق العمل",
      body: "نسعى لتكون الشهادة الممنوحة ذات تأثير حقيقي وملموس على المسار المهني للمتدربين، مما يسهم في رفد مؤسسات الدولة والقطاع الخاص بكوادر مؤهلة رقمياً.",
    },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {goals.map((g, i) => (
        <article
          key={i}
          className="group rounded-3xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-lg font-bold text-foreground">{g.title}</h3>
              <p className="mt-3 text-sm leading-loose text-muted-foreground">
                {g.body}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ---------- METHODOLOGY ---------- */
function MethodologyGrid() {
  const items = [
    {
      title: "المركزية التنظيمية",
      body: "يتم تقديم الكورس حصرياً عبر الموقع الرسمي للجمعية لضمان ضبط الجودة.",
    },
    {
      title: "مرونة المحتوى وتحديثه",
      body: "تم تقسيم الكورس إلى محاور قصيرة ومترابطة، مما يتيح التحديث المستمر والفوري للمحتوى لمواكبة التطور المتسارع في أدوات الذكاء الاصطناعي.",
    },
    {
      title: "الصرامة الأكاديمية والتقييم",
      body: "لا تُمنح الشهادة الرسمية المجانية إلا بعد اجتياز المتدرب لاختبارات مرحلية (Quizzes) تتبع كل محور، بالإضافة إلى اجتياز اختبار نهائي شامل، مما يضمن كفاءة الخريج.",
    },
    {
      title: "التوجيه التخصصي",
      body: "بمجرد اجتياز البرنامج الأساسي، يتم توجيه المتدربين نحو مسارات متقدمة واستشارات تخصصية مخصصة تتناسب مع خلفياتهم المهنية والاختصاصية، لضمان التطبيق العملي للأدوات في بيئات العمل والدراسة.",
    },
  ];
  return (
    <>
      <p className="mx-auto mb-10 max-w-3xl text-center text-base leading-loose text-muted-foreground">
        لضمان استحقاق هذا التدريب للاعتمادية الرسمية، تم بناء الهيكلية الأكاديمية
        للمشروع وفق أعلى المعايير.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.title}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-soft"
          >
            <CheckCircle2 className="h-6 w-6 flex-none text-primary" />
            <div>
              <h3 className="text-base font-bold text-foreground sm:text-lg">
                {it.title}
              </h3>
              <p className="mt-2 text-sm leading-loose text-muted-foreground">
                {it.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- ECONOMIC MODEL ---------- */
function EconomicModel() {
  return (
    <>
      <p className="mx-auto mb-10 max-w-3xl text-center text-base leading-loose text-muted-foreground">
        صُممت المبادرة لتعمل وفق نظام مرن ومستدام، يضمن الوصول العادل للتدريب
        من خلال المسارات التالية.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-xl font-bold">المسار الفوري للأفراد</h3>
          <p className="mt-2 text-sm font-semibold text-primary">التكفل الذاتي</p>
          <p className="mt-4 text-sm leading-loose text-muted-foreground">
            يمكن للفرد دفع التكلفة الرمزية للمقعد (1 دولار أمريكي)، مما يتيح له
            تجاوز أي قوائم انتظار، والبدء الفوري بالتدريب للحصول على الشهادة
            مباشرة بعد اجتياز الاختبارات المقررة.
          </p>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-xl font-bold">مسار التبرعات وقوائم الانتظار</h3>
          <p className="mt-2 text-sm font-semibold text-secondary">
            المسؤولية المجتمعية للشركات (CSR)
          </p>
          <p className="mt-4 text-sm leading-loose text-muted-foreground">
            استناداً إلى تفعيل المسؤولية المجتمعية للشركات، فتحنا باب التبرع
            للمؤسسات لرعاية المقاعد التدريبية. يدخل الأفراد غير القادرين على
            الدفع في قوائم انتظار منظمة للحصول على هذه المقاعد المجانية فور
            توفرها.
          </p>
        </article>
      </div>
    </>
  );
}

/* ---------- INFRASTRUCTURE ---------- */
function Infrastructure() {
  const items = [
    {
      Icon: BarChart3,
      title: "لوحة إحصائيات حية",
      en: "Live Dashboard",
      body: "واجهة رقمية تعرض بشكل مباشر ومحدث أعداد الحاصلين على الشهادة، المقاعد المتبرع بها من قبل الشركات، وحجم قوائم الانتظار.",
    },
    {
      Icon: Users,
      title: "لوحة شرف للشركات",
      en: "Leaderboard",
      body: "جدول تفاعلي لتكريم الشركات المساهمة لتعزيز التنافسية الإيجابية وإبراز دورها الوطني في إنجاح المبادرة.",
    },
  ];
  return (
    <>
      <p className="mx-auto mb-10 max-w-3xl text-center text-base leading-loose text-muted-foreground">
        يعتمد المشروع على منصة رقمية متطورة توفر أعلى درجات الشفافية والمتابعة
        اللحظية.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((it) => (
          <article
            key={it.title}
            className="rounded-3xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary">
              <it.Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-bold">{it.title}</h3>
            <p className="mt-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {it.en}
            </p>
            <p className="mt-4 text-sm leading-loose text-muted-foreground">
              {it.body}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

/* ---------- COLLABORATION ---------- */
function Collaboration() {
  const items = [
    {
      title: "الاعتماد الرسمي",
      body: "تبني وزارة الاتصالات وتقانة المعلومات لهذه المبادرة ومنحها الشرعية والاعتمادية الرسمية كبرنامج وطني قياسي لمحو الأمية الرقمية.",
    },
    {
      title: "التعميم المؤسساتي",
      body: "اعتماد الشهادة كوثيقة معتمدة تثبت الكفاءة الأساسية في الذكاء الاصطناعي للكوادر والموظفين ضمن القطاعات المختلفة.",
    },
  ];
  return (
    <>
      <p className="mx-auto mb-10 max-w-3xl text-center text-base leading-loose text-muted-foreground">
        بما أن عجلة العمل قد دارت بالفعل وبدأت المبادرة بأخذ خطواتها التنفيذية
        الأولى، فإن نجاح هذا المشروع الوطني يتطلب تضافر الجهود المؤسساتية. بناءً
        على ما سبق من معايير جودة أكاديمية وبنية تحتية متينة، نتطلع إلى:
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((it, i) => (
          <article
            key={i}
            className="rounded-3xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-soft"
          >
            <span className="text-5xl font-bold text-primary/20">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 text-xl font-bold">{it.title}</h3>
            <p className="mt-4 text-sm leading-loose text-muted-foreground">
              {it.body}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

/* ---------- CTA ---------- */
function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-border bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-10 lg:py-28">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          كن جزءاً من المليون
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-loose text-muted-foreground">
          سواء كنت فرداً يطمح لاكتساب مهارات الذكاء الاصطناعي، أو شركة تريد
          المساهمة في رعاية مقاعد تدريبية ضمن إطار المسؤولية المجتمعية — مكانك
          في هذه المبادرة الوطنية.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/learning-management-system"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:scale-105"
          >
            انطلق إلى التدريب
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-6 py-3 text-sm font-semibold text-foreground/80 backdrop-blur transition-colors hover:border-primary hover:text-primary"
          >
            تواصل لرعاية مقاعد
          </Link>
        </div>
      </div>
    </section>
  );
}
