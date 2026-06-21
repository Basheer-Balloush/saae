import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import ministryLogo from "@/assets/ministry-communications.png.asset.json";

import {
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Users,
  Rocket,
  Award,
  Megaphone,
  Share2,
  Mail,
  Target,
  Building2,
  HeartHandshake,
  CheckCircle2,
  Handshake,
  Crown,
  Medal,
} from "lucide-react";

export const Route = createFileRoute("/ai-tot-graduation")({
  head: () => ({
    meta: [
      { title: "الندوة الوطنية السورية الأولى للذكاء الاصطناعي — SAAE" },
      {
        name: "description",
        content:
          "عرض الرعاية الاستراتيجي للندوة الوطنية السورية الأولى للذكاء الاصطناعي: تخريج الدفعة الأولى من المدربين، إطلاق مبادرة مليون مستخدم، وجلسة حوارية رفيعة المستوى.",
      },
      {
        property: "og:title",
        content: "الندوة الوطنية السورية الأولى للذكاء الاصطناعي",
      },
      {
        property: "og:description",
        content:
          "تخريج الدفعة الأولى من مدربي الذكاء الاصطناعي وإطلاق مبادرة مليون مستخدم — فرصة رعاية استراتيجية للفعالية التقنية الأضخم محلياً.",
      },
      { property: "og:url", content: "https://aisyria.org/ai-tot-graduation" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/ai-tot-graduation" },
    ],
  }),
  component: AiTotGraduationPage,
});

const c = {
  ministryAlt: "برعاية كريمة من وزارة الاتصالات وتقانة المعلومات",
  badge: "برعاية كريمة من وزارة الاتصالات وتقانة المعلومات",
  heroTitle: "الندوة الوطنية السورية الأولى للذكاء الاصطناعي",
  heroBody:
    "عرض الرعاية الاستراتيجي للفعالية التقنية الأضخم محلياً — تجمع قادة القطاع وصنّاع القرار للاحتفاء بتخريج الدفعة الأولى من مدربي الذكاء الاصطناعي وإطلاق مبادرة مليون مستخدم.",
  backHome: "العودة إلى الرئيسية",


  pillars: {
    eyebrow: "محتوى الفعالية",
    title: "المحاور الرئيسية للندوة",
    items: [
      {
        icon: Rocket,
        title: "مبادرة مليون مستخدم",
        body: "الإطلاق الرسمي للمبادرة الوطنية الرائدة «مليون مستخدم ذكاء اصطناعي» لتمكين المجتمع رقمياً.",
      },
      {
        icon: Users,
        title: "الجلسة الحوارية",
        body: "جلسة نقاشية استراتيجية رفيعة المستوى تجمع بين أهم القادة وصنّاع القرار في سوريا ضمن قطاع الذكاء الاصطناعي.",
      },
      {
        icon: GraduationCap,
        title: "تخريج المدربين",
        body: "الاحتفاء بتخريج الدفعة الأولى المعتمدة من دورة تأهيل وإعداد مدربي الذكاء الاصطناعي ليكونوا نواة التدريب والتطوير.",
      },
    ],
  },

  cohort: {
    eyebrow: "الدفعة الأولى",
    title: "بناء قدرات المستقبل",
    body1:
      "سيشهد هذا الحدث الاستثنائي تخريج الدفعة الأولى من مدربي الذكاء الاصطناعي في سوريا.",
    body2:
      "يمثل هؤلاء الخريجون حجر الأساس في خطتنا لنقل المعرفة التقنية المتقدمة وبناء جيل جديد من رواد التكنولوجيا القادرين على توجيه مسار التحول الرقمي في المؤسسات السورية.",
  },

  million: {
    eyebrow: "مبادرة مليون مستخدم",
    title: "نحو مجتمع ممكّن رقمياً",
    body: "أضخم مبادرة وطنية طموحة تهدف إلى محو الأمية الرقمية المتقدمة ونشر ثقافة وتقنيات الذكاء الاصطناعي لتشمل مليون مستخدم. تخلق هذه المبادرة فرصة غير مسبوقة للوصول إلى شريحة واسعة من المجتمع وربط علامتكم التجارية بتمكين الشباب والمستقبل.",
    cta: "تفاصيل مبادرة مليون مستخدم",
  },

  why: {
    eyebrow: "قيمة الشراكة",
    title: "لماذا ترعى هذا الحدث؟",
    body: "شراكة استراتيجية تضمن لعلامتكم ظهوراً استثنائياً وارتباطاً وثيقاً بقطاع التكنولوجيا والابتكار في مراحله التأسيسية الهامة.",
  },

  benefits: {
    eyebrow: "باقة الرعاية الحصرية",
    title: "مزايا باقة الرعاية الحصرية",
    items: [
      {
        icon: Award,
        title: "شهادات الخريجين",
        body: "وضع لوغو علامتكم جنباً إلى جنب مع الجهات الرسمية على شهادات التخرج لمدربي الذكاء الاصطناعي.",
      },
      {
        icon: Megaphone,
        title: "اللوحات الإعلانية",
        body: "إدراج شعاركم بشكل بارز ومميز على جميع اللوحات الإعلانية المطبوعة والرقمية المرافقة للفعالية.",
      },
      {
        icon: Share2,
        title: "التغطية الرقمية",
        body: "نشر منشور شكر وتقدير مخصص لعلامتكم التجارية كشريك للنجاح على صفحات الجمعية الرسمية ومنصاتها.",
      },
      {
        icon: Mail,
        title: "بطاقات الدعوة",
        body: "حضور مميز لشعار الراعي على كافة بطاقات الدعوة الموجهة للوزراء، كبار الشخصيات، وصنّاع القرار.",
      },
    ],
  },

  invest: {
    eyebrow: "العائد الاستراتيجي",
    title: "استثمر في مستقبل التكنولوجيا",
    items: [
      {
        title: "تعزيز الهوية المؤسسية",
        body: "إبراز دوركم كمؤسسة رائدة تدعم الابتكار وتواكب تطورات الذكاء الاصطناعي.",
      },
      {
        title: "الوصول المباشر",
        body: "التواصل مع أهم العقول والكوادر الشابة وقادة القطاع التكنولوجي.",
      },
      {
        title: "المسؤولية المجتمعية",
        body: "إبراز التزامكم بتمكين وتطوير المهارات الرقمية للمجتمع السوري محلياً.",
      },
    ],
  },

  closing: {
    title: "معاً لنصنع المستقبل",
    body: "رعايتكم تصنع الفارق.. نتطلع لبناء شراكة ناجحة معكم.",
    cta: "تواصل معنا للرعاية",
  },

  packages: {
    eyebrow: "باقات الرعاية",
    title: "فرص رعاية مصنفة للفعالية",
    items: [
      {
        key: "diamond",
        name: "الباقة الماسية",
        price: "$1500",
        limit: "راعيين اثنين",
        icon: Crown,
        bar: "bg-primary",
        bg: "bg-primary/5",
        border: "border-primary/30",
        iconBg: "bg-primary/15",
        iconColor: "text-primary",
        priceColor: "text-primary",
        features: [
          "كلمة حصرية لممثل الإدارة العليا لمدة 5 دقائق على المسرح.",
          "التبرع بـ 500 مقعد تدريبي ضمن مبادرة 'مليون مستخدم' كمنحة رسمية باسم الشركة.",
          "صعود ممثل الشركة إلى المسرح للمشاركة بتوزيع شهادات الشكر والتقدير الخاصة بالطلاب مع وضع لوغو الشركة عليها.",
          "شكر شفهي خاص من عريف الحفل.",
          "إدراج شعار الشركة بحجم رئيسي على الرول أب الرسمي المتواجد بشكل دائم على المسرح.",
          "ظهور الشعار بحجم رئيسي على الشاشة الرئيسية أثناء تكريم الخريجين.",
          "جناح (Booth) مخصص في المدخل الرئيسي، بالإضافة إلى رول أب خاص بالشركة على المسرح.",
          "إدراج شعار الشركة في صدارة صفحة الفعالية على الموقع الرسمي.",
          "منشور شكر خاص ومستقل للشركة على جميع منصات التواصل.",
        ],
      },
      {
        key: "gold",
        name: "الباقة الذهبية",
        price: "$1000",
        limit: "راعٍ واحد فقط",
        icon: Award,
        bar: "bg-secondary",
        bg: "bg-secondary/5",
        border: "border-secondary/30",
        iconBg: "bg-secondary/15",
        iconColor: "text-secondary",
        priceColor: "text-secondary",
        features: [
          "التبرع بـ 250 مقعد تدريبي ضمن مبادرة 'مليون مستخدم' كمنحة باسم الشركة.",
          "صعود ممثل عن الشركة إلى المسرح للمشاركة بتوزيع شهادات الشكر والتقدير للطلاب.",
          "وضع شعار الشركة على شهادات الشكر.",
          "شكر شفهي من عريف الحفل لجهود الشركة الداعمة.",
          "إضافة شعار الشركة على الرول أب الرسمي المتواجد على المسرح.",
          "ظهور الشعار على الشاشة الرئيسية.",
          "رول أب (Roll-up) خاص بالشركة في منطقة المدخل والاستقبال.",
          "إدراج الشعار في صفحة الفعالية على الموقع الرسمي.",
          "منشور شكر مخصص للشركة على منصات التواصل.",
        ],
      },
      {
        key: "silver",
        name: "الباقة الفضية",
        price: "$500",
        limit: "راعيين اثنين",
        icon: Medal,
        bar: "bg-muted-foreground/60",
        bg: "bg-muted/40",
        border: "border-border",
        iconBg: "bg-muted",
        iconColor: "text-muted-foreground",
        priceColor: "text-foreground",
        features: [
          "التبرع بـ 100 مقعد تدريبي ضمن مبادرة 'مليون مستخدم' كمنحة باسم الشركة.",
          "صعود ممثل عن الشركة للمشاركة بتسليم شهادات الشكر والتقدير.",
          "إدراج شعار الشركة على شهادات الشكر ضمن فئة الرعاة الفضيين.",
          "شكر شفهي للشركة من قبل عريف الحفل.",
          "إضافة شعار الشركة على الرول أب الرسمي المتواجد على المسرح.",
          "ظهور الشعار على الشاشة الرئيسية.",
          "رول أب (Roll-up) خاص بالشركة في منطقة الاستراحة.",
          "إدراج الشعار في صفحة الفعالية على الموقع الرسمي.",
          "إدراج الشعار ضمن منشور الشكر الجماعي لشركاء النجاح على السوشيال ميديا.",
        ],
      },
    ],
  },
} as const;

function AiTotGraduationPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Navbar minimal />
      <main className="pt-20">
        <Hero />

        <Section eyebrow={c.pillars.eyebrow} title={c.pillars.title} icon={Sparkles}>
          <PillarsGrid />
        </Section>

        <Section
          eyebrow={c.cohort.eyebrow}
          title={c.cohort.title}
          icon={GraduationCap}
          variant="muted"
        >
          <CohortBlock />
        </Section>

        <Section eyebrow={c.million.eyebrow} title={c.million.title} icon={Rocket}>
          <MillionBlock />
        </Section>

        <Section
          eyebrow={c.why.eyebrow}
          title={c.why.title}
          icon={HeartHandshake}
          variant="muted"
        >
          <p className="mx-auto max-w-3xl text-center text-base leading-loose text-muted-foreground sm:text-lg">
            {c.why.body}
          </p>
        </Section>

        <Section eyebrow={c.benefits.eyebrow} title={c.benefits.title} icon={Award}>
          <BenefitsGrid />
        </Section>

        <Section
          eyebrow={c.invest.eyebrow}
          title={c.invest.title}
          icon={Target}
          variant="muted"
        >
          <InvestGrid />
        </Section>

        <Section eyebrow={c.packages.eyebrow} title={c.packages.title} icon={Handshake}>
          <PackagesGrid />
        </Section>

        <ClosingCta />
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
            alt={c.ministryAlt}
            className="h-32 w-auto sm:h-40 lg:h-48"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {c.badge}
        </span>

        <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {c.heroTitle}
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-loose text-muted-foreground sm:text-lg">
          {c.heroBody}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-6 py-3 text-sm font-semibold text-foreground/80 backdrop-blur transition-colors hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {c.backHome}
          </Link>
        </div>
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
      className={variant === "muted" ? "border-y border-border bg-muted/30" : ""}
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

/* ---------- PILLARS ---------- */
function PillarsGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {c.pillars.items.map((it, i) => {
        const Icon = it.icon;
        return (
          <article
            key={it.title}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft"
          >
            <span className="absolute end-5 top-5 text-5xl font-bold text-primary/10">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-bold">{it.title}</h3>
            <p className="mt-4 text-sm leading-loose text-muted-foreground">
              {it.body}
            </p>
          </article>
        );
      })}
    </div>
  );
}

/* ---------- COHORT ---------- */
function CohortBlock() {
  return (
    <div className="mx-auto max-w-4xl">
      <article className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 p-8 sm:p-12">
        <div className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -start-20 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-7 w-7" />
          </div>
          <p className="mt-6 text-lg font-semibold text-foreground sm:text-xl">
            {c.cohort.body1}
          </p>
          <p className="mt-4 text-base leading-loose text-muted-foreground">
            {c.cohort.body2}
          </p>
        </div>
      </article>
    </div>
  );
}

/* ---------- MILLION ---------- */
function MillionBlock() {
  return (
    <div className="mx-auto max-w-4xl">
      <article className="rounded-3xl border border-border bg-card p-8 sm:p-12">
        <p className="text-base leading-loose text-muted-foreground sm:text-lg">
          {c.million.body}
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            to="/one-million-initiative"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-background"
          >
            <Rocket className="h-4 w-4" />
            {c.million.cta}
          </Link>
        </div>
      </article>
    </div>
  );
}

/* ---------- BENEFITS ---------- */
function BenefitsGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {c.benefits.items.map((it) => {
        const Icon = it.icon;
        return (
          <article
            key={it.title}
            className="rounded-3xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-bold">{it.title}</h3>
            <p className="mt-4 text-sm leading-loose text-muted-foreground">
              {it.body}
            </p>
          </article>
        );
      })}
    </div>
  );
}

/* ---------- INVEST ---------- */
function InvestGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {c.invest.items.map((it) => (
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
  );
}

/* ---------- SPONSORSHIP PACKAGES ---------- */
function PackagesGrid() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {c.packages.items.map((pkg) => {
        const Icon = pkg.icon;
        return (
          <article
            key={pkg.name}
            className={`relative flex flex-col overflow-hidden rounded-3xl border ${pkg.border} ${pkg.bg} p-7 transition-all hover:-translate-y-1 hover:shadow-soft`}
          >
            <div className={`absolute start-0 top-0 h-1.5 w-full ${pkg.bar}`} />
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${pkg.iconBg} ${pkg.iconColor}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground">{pkg.limit}</p>
              </div>
            </div>
            <p className={`mt-5 text-3xl font-extrabold ${pkg.priceColor}`}>
              {pkg.price}
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {pkg.features.map((feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <CheckCircle2
                    className={`h-4 w-4 flex-none ${pkg.iconColor} mt-0.5`}
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

/* ---------- CLOSING CTA ---------- */
function ClosingCta() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center lg:px-10">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-background">
          <Building2 className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          {c.closing.title}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-loose text-muted-foreground sm:text-lg">
          {c.closing.body}
        </p>
        <div className="mt-10">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-primary to-secondary px-8 py-4 text-sm font-bold text-background shadow-xl transition-transform hover:-translate-y-0.5"
          >
            <Handshake className="h-5 w-5" />
            {c.closing.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
