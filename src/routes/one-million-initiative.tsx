import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
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
  ArrowRight,
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
      eyebrow: "الهوية والانتشار",
      title: "أرشفة المعرفة السورية قبل تحديثها",
      lead: "هدفنا الجوهري ليس فقط تحديث الكوادر السورية بأدوات الذكاء الاصطناعي، بل أرشفة المعرفة والخبرة السورية المتراكمة وتوثيقها رقمياً قبل أن تُفقد. نحن نبني ذاكرة وطنية معرفية تستفيد من ثورة الذكاء الاصطناعي لتحفظ الهوية السورية وتعيد إنتاجها بأدوات العصر.",
      mapTitle: "مليون مستفيد موزعون على كامل الجغرافيا السورية",
      mapSub: "من الساحل إلى الجزيرة، ومن حلب إلى السويداء — لا منطقة خارج المبادرة.",
      legend: "مراكز التدريب الفاعلة",
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
      eyebrow: "Identity & Reach",
      title: "Archiving Syrian Knowledge Before Modernizing It",
      lead: "Our core goal is not merely modernizing Syrian talent with AI tools — it is archiving and digitally preserving the accumulated Syrian knowledge and expertise before it is lost. We are building a national knowledge memory that leverages the AI revolution to safeguard Syrian identity and reproduce it with the tools of our era.",
      mapTitle: "One Million Beneficiaries Across the Entire Syrian Geography",
      mapSub: "From the coast to the Jazira, from Aleppo to As-Suwayda — no region left outside the initiative.",
      legend: "Active training hubs",
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
          <GeographySection geo={c.geo} dir={dir} />
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

/* ---------- GEOGRAPHY / SYRIA MAP ---------- */
type GeoContent = {
  eyebrow: string;
  title: string;
  lead: string;
  mapTitle: string;
  mapSub: string;
  legend: string;
};

function GeographySection({ geo, dir }: { geo: GeoContent; dir: "rtl" | "ltr" }) {
  return (
    <>
      <p className="mx-auto mb-12 max-w-3xl text-center text-base leading-loose text-muted-foreground">
        {geo.lead}
      </p>

      <div className="mx-auto max-w-5xl rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-6 sm:p-10">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-bold sm:text-2xl">{geo.mapTitle}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{geo.mapSub}</p>
        </div>

        <SyriaMap dir={dir} />

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          <span>{geo.legend}</span>
        </div>
      </div>
    </>
  );
}

const SYRIA_CITIES: ReadonlyArray<{ ar: string; en: string; x: number; y: number; delay: number }> = [
  { ar: "حلب", en: "Aleppo", x: 141, y: 100, delay: 0 },
  { ar: "إدلب", en: "Idlib", x: 97, y: 127, delay: 0.3 },
  { ar: "اللاذقية", en: "Latakia", x: 24, y: 168, delay: 0.6 },
  { ar: "طرطوس", en: "Tartus", x: 33, y: 231, delay: 0.9 },
  { ar: "حماة", en: "Hama", x: 107, y: 207, delay: 1.2 },
  { ar: "حمص", en: "Homs", x: 105, y: 247, delay: 1.5 },
  { ar: "الرقة", en: "Raqqa", x: 301, y: 125, delay: 1.8 },
  { ar: "دير الزور", en: "Deir ez-Zor", x: 398, y: 186, delay: 2.1 },
  { ar: "الحسكة", en: "Hasakah", x: 449, y: 70, delay: 2.4 },
  { ar: "القامشلي", en: "Qamishli", x: 491, y: 30, delay: 2.7 },
  { ar: "دمشق", en: "Damascus", x: 78, y: 369, delay: 0.15 },
  { ar: "القنيطرة", en: "Quneitra", x: 37, y: 408, delay: 0.45 },
  { ar: "درعا", en: "Daraa", x: 61, y: 458, delay: 0.75 },
  { ar: "السويداء", en: "As-Suwayda", x: 102, y: 449, delay: 1.05 },
];

function SyriaMap({ dir }: { dir: "rtl" | "ltr" }) {
  const lang = dir === "rtl" ? "ar" : "en";
  // Stylized Syria silhouette in a 600x500 viewBox
  const borderPath =
    "M 25,60 L 128,20 L 591,10 L 471,270 L 283,380 L 86,490 L 34,450 L 34,360 L 77,260 L 17,130 Z";

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <svg
        viewBox="0 0 600 500"
        className="h-auto w-full"
        role="img"
        aria-label="Syria map"
      >
        <defs>
          <linearGradient id="syria-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.18)" />
            <stop offset="100%" stopColor="hsl(var(--secondary) / 0.18)" />
          </linearGradient>
          <filter id="syria-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Country shape */}
        <path
          d={borderPath}
          fill="url(#syria-fill)"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Connecting lines between cities (network feel) */}
        <g stroke="hsl(var(--primary) / 0.25)" strokeWidth="0.8" strokeDasharray="3 3">
          {SYRIA_CITIES.slice(0, -1).map((city, i) => {
            const next = SYRIA_CITIES[(i + 1) % SYRIA_CITIES.length];
            return (
              <line
                key={`l-${i}`}
                x1={city.x}
                y1={city.y}
                x2={next.x}
                y2={next.y}
              />
            );
          })}
        </g>

        {/* City dots with ripple */}
        {SYRIA_CITIES.map((city, i) => (
          <g key={i} transform={`translate(${city.x}, ${city.y})`}>
            <circle r="4" fill="hsl(var(--primary))" opacity="0.3">
              <animate
                attributeName="r"
                values="4;22;4"
                dur="3s"
                begin={`${city.delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0;0.6"
                dur="3s"
                begin={`${city.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle
              r="5"
              fill="hsl(var(--primary))"
              filter="url(#syria-glow)"
            />
            <text
              x={dir === "rtl" ? -8 : 8}
              y="-8"
              textAnchor={dir === "rtl" ? "end" : "start"}
              className="fill-foreground"
              style={{ fontSize: "11px", fontWeight: 600 }}
            >
              {city[lang]}
            </text>
          </g>
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <MapPin className="h-0 w-0" aria-hidden />
      </div>
    </div>
  );
}
