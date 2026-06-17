import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import ministryLogo from "@/assets/ministry-communications.png.asset.json";
import syriaMap from "@/assets/syria-map.png";
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
  ArrowRight,
  Archive,
  MapPin,
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

type Lang = "ar" | "en";

const content = {
  ar: {
    ministryAlt: "وزارة الاتصالات وتقانة المعلومات",
    badge: "مبادرة وطنية — تنفذها الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
    heroTitle: "مليون مستخدم ذكاء اصطناعي سوري",
    heroBody:
      "مذكرة عرض استراتيجية لمبادرة وطنية تهدف إلى محو الأمية في الذكاء الاصطناعي، وتمكين الكوادر البشرية السورية من أدوات المستقبل وبناء مسارات مهنية تواكب متطلبات سوق العمل الحديث.",
    backHome: "العودة إلى الرئيسية",
    stats: [
      { value: "1,000,000", label: "مستفيد مستهدف" },
      { value: "عامان", label: "مدة التنفيذ" },
      { value: "$1", label: "تكلفة المقعد الرمزية" },
      { value: "مجاناً", label: "للمستحقين عبر التبرعات" },
    ],
    geo: {
      eyebrow: "الجغرافيا الوطنية",
      title: "مليون مستفيد على كامل الجغرافيا السورية",
      lead1: "أرشفة المعرفة السورية قبل تحديثها",
      body1:
        "تأسست هذه المبادرة على قناعة راسخة: لا يمكن أن نحارب الأمية في الذكاء الاصطناعي بأدوات غريبة عن بيئتنا. نحن أول من أدرك أن المعرفة السورية أقدم من أن تُدرَّس من الخارج، وأنّ أسرع طريق للتمكين يمر عبر توثيق ما نملك قبل أن نستورد ما لا نحتاجه.",
      lead2: "توزيع جغرافي شامل",
      body2:
        "المليون مستفيد موزعون على كامل الجغرافيا السورية — من حلب إلى دمشق، من اللاذقية إلى القامشلي — لتعميم الفرص الرقمية ورفع مستوى محو الأمية الذكائية في كل المحافظات والمناطق السورية دون استثناء.",
    },
    s1: { eyebrow: "القسم الأول", title: "الرؤية والأهداف الوطنية" },
    s2: { eyebrow: "القسم الثاني", title: "المنهجية الأكاديمية ومعايير الجودة" },
    s3: { eyebrow: "القسم الثالث", title: "النموذج الاقتصادي المبتكر واستدامة المشروع" },
    s4: { eyebrow: "القسم الرابع", title: "البنية التحتية التكنولوجية والشفافية" },
    s5: { eyebrow: "القسم الخامس", title: "آفاق التعاون والاعتماد المطلوب من الوزارة" },
    goals: [
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
    ],
    methodologyIntro:
      "لضمان استحقاق هذا التدريب للاعتمادية الرسمية، تم بناء الهيكلية الأكاديمية للمشروع وفق أعلى المعايير.",
    methodology: [
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
    ],
    economicIntro:
      "صُممت المبادرة لتعمل وفق نظام مرن ومستدام، يضمن الوصول العادل للتدريب من خلال المسارات التالية.",
    economic: {
      a: {
        title: "المسار الفوري للأفراد",
        kicker: "التكفل الذاتي",
        body: "يمكن للفرد دفع التكلفة الرمزية للمقعد (1 دولار أمريكي)، مما يتيح له تجاوز أي قوائم انتظار، والبدء الفوري بالتدريب للحصول على الشهادة مباشرة بعد اجتياز الاختبارات المقررة.",
      },
      b: {
        title: "مسار التبرعات وقوائم الانتظار",
        kicker: "\n",
        body: "استناداً إلى تفعيل المسؤولية المجتمعية للمؤسسات والشركات والأفراد، فتحنا باب التبرع للمؤسسات لرعاية المقاعد التدريبية. يدخل الأفراد غير القادرين على الدفع في قوائم انتظار منظمة للحصول على هذه المقاعد المجانية فور توفرها.",
      },
    },
    infraIntro:
      "يعتمد المشروع على منصة رقمية متطورة توفر أعلى درجات الشفافية والمتابعة اللحظية.",
    infra: [
      {
        title: "لوحة إحصائيات حية",
        en: "Live Dashboard",
        body: "واجهة رقمية تعرض بشكل مباشر ومحدث أعداد الحاصلين على الشهادة، المقاعد المتبرع بها من قبل الشركات، وحجم قوائم الانتظار.",
      },
      {
        title: "لوحة شرف للشركات",
        en: "Leaderboard",
        body: "جدول تفاعلي لتكريم الشركات المساهمة لتعزيز التنافسية الإيجابية وإبراز دورها الوطني في إنجاح المبادرة.",
      },
    ],
    collabIntro:
      "بما أن عجلة العمل قد دارت بالفعل وبدأت المبادرة بأخذ خطواتها التنفيذية الأولى، فإن نجاح هذا المشروع الوطني يتطلب تضافر الجهود المؤسساتية. بناءً على ما سبق من معايير جودة أكاديمية وبنية تحتية متينة، نتطلع إلى:",
    collab: [
      {
        title: "الاعتماد الرسمي",
        body: "تبني وزارة الاتصالات وتقانة المعلومات لهذه المبادرة ومنحها الشرعية والاعتمادية الرسمية كبرنامج وطني قياسي لمحو الأمية الرقمية.",
      },
      {
        title: "التعميم المؤسساتي",
        body: "اعتماد الشهادة كوثيقة معتمدة تثبت الكفاءة الأساسية في الذكاء الاصطناعي للكوادر والموظفين ضمن القطاعات المختلفة.",
      },
    ],
  },
  en: {
    ministryAlt: "Ministry of Communications and Information Technology",
    badge:
      "National Initiative — Implemented by the Syrian Association for AI & Entrepreneurship",
    heroTitle: "One Million Syrian AI Users",
    heroBody:
      "A strategic proposal for a national initiative to eradicate AI illiteracy, empower Syrian human capital with the tools of the future, and build career paths aligned with the demands of the modern labor market.",
    backHome: "Back to Home",
    stats: [
      { value: "1,000,000", label: "Target Beneficiaries" },
      { value: "2 Years", label: "Implementation Period" },
      { value: "$1", label: "Symbolic Seat Cost" },
      { value: "Free", label: "For Eligible Recipients via Donations" },
    ],
    geo: {
      eyebrow: "National Geography",
      title: "One Million Beneficiaries Across All of Syria",
      lead1: "Archiving Syrian Knowledge Before Modernizing It",
      body1:
        "This initiative is built on a firm conviction: we cannot fight AI illiteracy with tools foreign to our environment. We were among the first to realize that Syrian knowledge predates what can be taught from abroad, and that the fastest path to empowerment is through documenting what we have before importing what we do not need.",
      lead2: "Comprehensive Geographic Distribution",
      body2:
        "The one million beneficiaries are distributed across the entire Syrian geography — from Aleppo to Damascus, from Latakia to Qamishli — to spread digital opportunities and raise AI literacy levels in every Syrian governorate and region without exception.",
    },
    s1: { eyebrow: "Section One", title: "Vision and National Goals" },
    s2: { eyebrow: "Section Two", title: "Academic Methodology and Quality Standards" },
    s3: { eyebrow: "Section Three", title: "Innovative Economic Model and Project Sustainability" },
    s4: { eyebrow: "Section Four", title: "Technological Infrastructure and Transparency" },
    s5: { eyebrow: "Section Five", title: "Cooperation Horizons and Required Ministerial Endorsement" },
    goals: [
      {
        title: "Building Capacity at Scale",
        body: "We strategically aim to attract and train one million beneficiaries within two years of launching the initiative, with the possibility of extending this phase to three years to ensure comprehensive and sustainable coverage.",
      },
      {
        title: "Developmental Priority",
        body: "In its first phase, the initiative focuses primarily on regions that suffer from lower educational quality and were most affected during the years of the Syrian revolution — closing the digital gap and providing equal technological opportunity to all segments of society.",
      },
      {
        title: "Excellence and Trustworthiness",
        body: "We are committed to delivering highly professional training content that serves as a trusted reference point and strengthens AI literacy across the country.",
      },
      {
        title: "Empowering the Job Market",
        body: "We seek to ensure the issued certificate has a tangible impact on trainees' careers, supplying both government institutions and the private sector with digitally qualified talent.",
      },
    ],
    methodologyIntro:
      "To ensure this training merits official accreditation, the academic structure of the project has been built to the highest standards.",
    methodology: [
      {
        title: "Centralized Delivery",
        body: "The course is offered exclusively through the association's official website to guarantee quality control.",
      },
      {
        title: "Flexible, Continuously Updated Content",
        body: "The course is divided into short, interconnected modules, enabling continuous, immediate updates to keep pace with the rapid evolution of AI tools.",
      },
      {
        title: "Academic Rigor and Assessment",
        body: "The free official certificate is granted only after the trainee passes module-level quizzes plus a comprehensive final exam — ensuring graduate competency.",
      },
      {
        title: "Specialized Guidance",
        body: "Upon completing the core program, trainees are guided toward advanced tracks and personalized specialized consultations tailored to their professional and academic backgrounds, ensuring practical application in work and study environments.",
      },
    ],
    economicIntro:
      "The initiative is designed to operate under a flexible and sustainable model that ensures equitable access to training through the following pathways.",
    economic: {
      a: {
        title: "Immediate Track for Individuals",
        kicker: "Self-Sponsored",
        body: "An individual may pay the symbolic seat cost ($1 USD), bypass any waiting lists, and begin training immediately — earning the certificate directly upon passing the required assessments.",
      },
      b: {
        title: "Donation Track and Waiting Lists",
        kicker: "Corporate Social Responsibility (CSR)",
        body: "Through corporate CSR activation, we have opened the door for institutions to sponsor training seats. Individuals unable to pay are placed in organized waiting lists to receive these free seats as they become available.",
      },
    },
    infraIntro:
      "The project relies on an advanced digital platform that delivers the highest levels of transparency and real-time tracking.",
    infra: [
      {
        title: "Live Statistics Dashboard",
        en: "Live Dashboard",
        body: "A digital interface showing real-time, up-to-date figures on certified graduates, corporate-sponsored seats, and the size of the waiting lists.",
      },
      {
        title: "Corporate Honor Board",
        en: "Leaderboard",
        body: "An interactive leaderboard recognizing contributing companies — fostering positive competition and highlighting their national role in the success of the initiative.",
      },
    ],
    collabIntro:
      "As the work is already underway and the initiative has taken its first implementation steps, the success of this national project requires combined institutional efforts. Building on the academic quality standards and solid infrastructure outlined above, we look forward to:",
    collab: [
      {
        title: "Official Accreditation",
        body: "The Ministry of Communications and Information Technology adopting this initiative and granting it official legitimacy and accreditation as a standard national program for digital literacy.",
      },
      {
        title: "Institutional Mainstreaming",
        body: "Adopting the certificate as an accredited document proving core AI competency for staff and employees across various sectors.",
      },
    ],
  },
} as const;

function OneMillionInitiativePage() {
  const { lang } = useLang();
  const c = content[lang as Lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar minimal />
      <main className="pt-20">
        <Hero c={c} lang={lang as Lang} />
        <Stats items={c.stats} />

        <Section eyebrow={c.geo.eyebrow} title={c.geo.title} icon={Archive}>
          <GeographySection geo={c.geo} />
        </Section>

        <Section eyebrow={c.s1.eyebrow} title={c.s1.title} icon={Target} variant="muted">
          <GoalsGrid goals={c.goals} />
        </Section>

        <Section eyebrow={c.s2.eyebrow} title={c.s2.title} icon={GraduationCap}>
          <MethodologyGrid intro={c.methodologyIntro} items={c.methodology} />
        </Section>

        <Section eyebrow={c.s3.eyebrow} title={c.s3.title} icon={HeartHandshake} variant="muted">
          <EconomicModel intro={c.economicIntro} a={c.economic.a} b={c.economic.b} />
        </Section>

        <Section eyebrow={c.s4.eyebrow} title={c.s4.title} icon={BarChart3}>
          <Infrastructure intro={c.infraIntro} items={c.infra} />
        </Section>

        <Section eyebrow={c.s5.eyebrow} title={c.s5.title} icon={Building2} variant="muted">
          <Collaboration intro={c.collabIntro} items={c.collab} />
        </Section>
      </main>
      <Footer />
    </div>
  );
}

/* ---------- HERO ---------- */
type PageContent = (typeof content)[Lang];

function Hero({ c, lang }: { c: PageContent; lang: Lang }) {
  const ArrowIcon = lang === "ar" ? ArrowLeft : ArrowRight;
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
            <ArrowIcon className="h-4 w-4" />
            {c.backHome}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- STATS ---------- */
function Stats({ items }: { items: ReadonlyArray<{ value: string; label: string }> }) {
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

/* ---------- GOALS ---------- */
function GoalsGrid({ goals }: { goals: ReadonlyArray<{ title: string; body: string }> }) {
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
function MethodologyGrid({
  intro,
  items,
}: {
  intro: string;
  items: ReadonlyArray<{ title: string; body: string }>;
}) {
  return (
    <>
      <p className="mx-auto mb-10 max-w-3xl text-center text-base leading-loose text-muted-foreground">
        {intro}
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
function EconomicModel({
  intro,
  a,
  b,
}: {
  intro: string;
  a: { title: string; kicker: string; body: string };
  b: { title: string; kicker: string; body: string };
}) {
  return (
    <>
      <p className="mx-auto mb-10 max-w-3xl text-center text-base leading-loose text-muted-foreground">
        {intro}
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-xl font-bold">{a.title}</h3>
          <p className="mt-2 text-sm font-semibold text-primary">{a.kicker}</p>
          <p className="mt-4 text-sm leading-loose text-muted-foreground">{a.body}</p>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-xl font-bold">{b.title}</h3>
          <p className="mt-2 text-sm font-semibold text-secondary">{b.kicker}</p>
          <p className="mt-4 text-sm leading-loose text-muted-foreground">{b.body}</p>
        </article>
      </div>
    </>
  );
}

/* ---------- INFRASTRUCTURE ---------- */
function Infrastructure({
  intro,
  items,
}: {
  intro: string;
  items: ReadonlyArray<{ title: string; en: string; body: string }>;
}) {
  const icons = [BarChart3, Users];
  return (
    <>
      <p className="mx-auto mb-10 max-w-3xl text-center text-base leading-loose text-muted-foreground">
        {intro}
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((it, i) => {
          const Icon = icons[i] ?? BarChart3;
          return (
            <article
              key={it.title}
              className="rounded-3xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{it.title}</h3>
              <p className="mt-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {it.en}
              </p>
              <p className="mt-4 text-sm leading-loose text-muted-foreground">
                {it.body}
              </p>
            </article>
          );
        })}
      </div>
    </>
  );
}

/* ---------- COLLABORATION ---------- */
function Collaboration({
  intro,
  items,
}: {
  intro: string;
  items: ReadonlyArray<{ title: string; body: string }>;
}) {
  return (
    <>
      <p className="mx-auto mb-10 max-w-3xl text-center text-base leading-loose text-muted-foreground">
        {intro}
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

/* ---------- GEOGRAPHY ---------- */
const SYRIA_CITIES: ReadonlyArray<{ name: string; delay: string }> = [
  { name: "حلب", delay: "0s" },
  { name: "اللاذقية", delay: "0.3s" },
  { name: "الرقة", delay: "0.6s" },
  { name: "الحسكة", delay: "0.9s" },
  { name: "دير الزور", delay: "1.2s" },
  { name: "حمص", delay: "1.5s" },
  { name: "طرطوس", delay: "1.8s" },
  { name: "إدلب", delay: "2.1s" },
  { name: "حماة", delay: "2.4s" },
  { name: "دمشق", delay: "2.7s" },
  { name: "درعا", delay: "3.0s" },
  { name: "السويداء", delay: "3.3s" },
];

function GeographySection({
  geo,
}: {
  geo: {
    lead1: string;
    body1: string;
    lead2: string;
    body2: string;
  };
}) {
  const count = SYRIA_CITIES.length;
  const radius = 42; // percentage of container
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid items-center gap-10 md:grid-cols-2">
        {/* Cities network visual */}
        <div className="relative animate-fade-in">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            {/* Concentric rings */}
            <div className="absolute inset-0 rounded-full border border-primary/20" />
            <div className="absolute inset-[12%] rounded-full border border-primary/15" />
            <div className="absolute inset-[28%] rounded-full border border-primary/10" />

            {/* Connecting lines from center */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {SYRIA_CITIES.map((_, i) => {
                const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                const x = 50 + radius * Math.cos(angle);
                const y = 50 + radius * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1="50"
                    y1="50"
                    x2={x}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="0.2"
                    className="text-primary/30"
                  />
                );
              })}
            </svg>

            {/* Center pulse: 1,000,000 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-center text-background shadow-2xl">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
                <div className="relative">
                  <div className="text-lg font-extrabold leading-none">1,000,000</div>
                  <div className="mt-1 text-[10px] font-semibold opacity-90">مستفيد</div>
                </div>
              </div>
            </div>

            {/* City nodes around the circle */}
            {SYRIA_CITIES.map((city, i) => {
              const angle = (i / count) * 360 - 90;
              return (
                <div
                  key={city.name}
                  className="absolute left-1/2 top-1/2 h-0 w-0"
                  style={{ transform: `rotate(${angle}deg) translate(${radius}%)` }}
                >
                  <div
                    className="-translate-x-1/2 -translate-y-1/2"
                    style={{ transform: `rotate(${-angle}deg) translate(-50%, -50%)` }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="relative flex h-3 w-3">
                        <span
                          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
                          style={{ animationDelay: city.delay }}
                        />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                      </span>
                      <span className="whitespace-nowrap rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                        {city.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* Text cards */}
        <div className="space-y-6">
          <article className="rounded-3xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-soft">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Archive className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-bold">{geo.lead1}</h3>
            <p className="mt-4 text-sm leading-loose text-muted-foreground">
              {geo.body1}
            </p>
          </article>

          <article className="rounded-3xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-soft">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-bold">{geo.lead2}</h3>
            <p className="mt-4 text-sm leading-loose text-muted-foreground">
              {geo.body2}
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}

