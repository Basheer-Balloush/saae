import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/resources/ai-tools")({
  head: () => ({
    meta: [
      { title: "دليل مواقع الذكاء الاصطناعي للطلاب والباحثين — SAAE" },
      {
        name: "description",
        content:
          "دليل شامل لأفضل مواقع وأدوات الذكاء الاصطناعي للطلاب والباحثين في سوريا والمنطقة: البحث العلمي، البرمجة، التصميم، والتعليم.",
      },
      { property: "og:title", content: "دليل مواقع الذكاء الاصطناعي للطلاب والباحثين" },
      {
        property: "og:description",
        content:
          "أهم أدوات الذكاء الاصطناعي المجانية والمتاحة في المنطقة، مصنّفة حسب الاستخدام: بحث، برمجة، تصميم، تعليم.",
      },
      { property: "og:url", content: "https://aisyria.org/resources/ai-tools" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://aisyria.org/resources/ai-tools" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "دليل مواقع الذكاء الاصطناعي للطلاب والباحثين",
          inLanguage: "ar",
          author: { "@type": "Organization", name: "SAAE — الجمعية السورية للذكاء الصنعي وريادة الأعمال" },
          publisher: {
            "@type": "Organization",
            name: "SAAE",
            url: "https://aisyria.org",
          },
          mainEntityOfPage: "https://aisyria.org/resources/ai-tools",
        }),
      },
    ],
  }),
  component: AIToolsGuide,
});

type Tool = {
  name: string;
  url: string;
  desc: string;
  note?: string;
};

type Category = {
  id: string;
  title: string;
  intro: string;
  tools: Tool[];
};

const CATEGORIES: Category[] = [
  {
    id: "research",
    title: "البحث العلمي والأكاديمي",
    intro:
      "أدوات تساعد الباحثين والطلاب في الوصول للأوراق العلمية، تلخيصها، وتحليلها بسرعة.",
    tools: [
      {
        name: "Perplexity AI",
        url: "https://www.perplexity.ai",
        desc: "محرك بحث ذكي يجيب على الأسئلة مع ذكر المصادر — ممتاز للأبحاث.",
        note: "مجاني، متاح في المنطقة.",
      },
      {
        name: "Elicit",
        url: "https://elicit.com",
        desc: "يبحث في الأوراق العلمية ويلخّصها ويستخرج النقاط الأساسية.",
      },
      {
        name: "Consensus",
        url: "https://consensus.app",
        desc: "يقدم إجابات مدعومة بأبحاث علمية محكّمة.",
      },
      {
        name: "Semantic Scholar",
        url: "https://www.semanticscholar.org",
        desc: "محرك بحث أكاديمي مفتوح يستخدم الذكاء الاصطناعي لاكتشاف الأبحاث ذات الصلة.",
        note: "مجاني بالكامل.",
      },
      {
        name: "ChatPDF",
        url: "https://www.chatpdf.com",
        desc: "ارفع ورقة بحثية أو كتاب PDF واسأل عنه مباشرة.",
      },
    ],
  },
  {
    id: "coding",
    title: "البرمجة وتطوير البرمجيات",
    intro:
      "مساعدات برمجية تسرّع كتابة الكود وتساعد الطلاب في تعلّم البرمجة.",
    tools: [
      {
        name: "GitHub Copilot",
        url: "https://github.com/features/copilot",
        desc: "مساعد ذكي داخل محرر الكود — مجاني للطلاب عبر GitHub Education.",
      },
      {
        name: "Cursor",
        url: "https://cursor.sh",
        desc: "محرر أكواد مبني على الذكاء الاصطناعي يفهم مشروعك كاملاً.",
      },
      {
        name: "Lovable",
        url: "https://lovable.dev",
        desc: "بناء تطبيقات ويب كاملة من خلال المحادثة — مناسب لرواد الأعمال.",
      },
      {
        name: "Claude",
        url: "https://claude.ai",
        desc: "ممتاز لشرح الكود، حل المشاكل البرمجية، ومراجعة المشاريع.",
      },
      {
        name: "v0 by Vercel",
        url: "https://v0.dev",
        desc: "توليد واجهات React جاهزة من وصف نصي.",
      },
    ],
  },
  {
    id: "design",
    title: "التصميم والوسائط",
    intro:
      "أدوات لتوليد الصور والفيديو والتصاميم بسرعة — مفيدة للمشاريع الطلابية والشركات الناشئة.",
    tools: [
      {
        name: "Canva AI",
        url: "https://www.canva.com",
        desc: "تصاميم احترافية مع ميزات Magic Design و Magic Write المدمجة.",
      },
      {
        name: "Leonardo AI",
        url: "https://leonardo.ai",
        desc: "توليد صور عالية الجودة مع باقة مجانية يومية سخية.",
      },
      {
        name: "Ideogram",
        url: "https://ideogram.ai",
        desc: "متميز في توليد صور تحتوي نصوص واضحة (لافتات، شعارات).",
      },
      {
        name: "Runway",
        url: "https://runwayml.com",
        desc: "توليد وتحرير الفيديو بالذكاء الاصطناعي.",
      },
      {
        name: "Remove.bg",
        url: "https://www.remove.bg",
        desc: "إزالة خلفية الصور بنقرة واحدة.",
      },
    ],
  },
  {
    id: "education",
    title: "التعليم والإنتاجية",
    intro:
      "أدوات تساعد الطلاب على التعلّم، الكتابة، تنظيم الملاحظات، وتلخيص المحاضرات.",
    tools: [
      {
        name: "ChatGPT",
        url: "https://chat.openai.com",
        desc: "المساعد العام الأشهر — مناسب للشرح، الكتابة، وحل التمارين.",
      },
      {
        name: "Google Gemini",
        url: "https://gemini.google.com",
        desc: "متكامل مع خدمات Google ومجاني للاستخدام الأساسي.",
      },
      {
        name: "NotebookLM",
        url: "https://notebooklm.google.com",
        desc: "ارفع ملاحظاتك ومحاضراتك واسأل عنها — يولّد ملخصات وبودكاست صوتي.",
        note: "مجاني تماماً.",
      },
      {
        name: "Otter.ai",
        url: "https://otter.ai",
        desc: "تفريغ المحاضرات والاجتماعات إلى نصوص قابلة للبحث.",
      },
      {
        name: "Quillbot",
        url: "https://quillbot.com",
        desc: "إعادة صياغة النصوص، تدقيق لغوي، وتلخيص.",
      },
      {
        name: "Khan Academy (Khanmigo)",
        url: "https://www.khanacademy.org",
        desc: "منصة تعليم مجانية مع معلّم ذكي تفاعلي.",
      },
    ],
  },
];

function AIToolsGuide() {
  const { dir, lang } = useLang();
  const isRtl = dir === "rtl";

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-10">
          <p className="text-sm text-muted-foreground mb-2">
            {lang === "ar" ? "دليل / موارد" : "Guide / Resources"}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {lang === "ar"
              ? "دليل مواقع الذكاء الاصطناعي للطلاب والباحثين"
              : "Guide to AI Websites for Students & Researchers"}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {lang === "ar"
              ? "اخترنا لكم أفضل مواقع الذكاء الاصطناعي المتاحة والمفيدة للطلاب والباحثين ورواد الأعمال في سوريا والمنطقة، مصنّفة حسب الاستخدام مع التركيز على الأدوات المجانية أو التي يمكن الوصول إليها بسهولة."
              : "A curated list of the most useful AI tools for students, researchers, and entrepreneurs in Syria and the region — organized by use case with a focus on free and accessible tools."}
          </p>
        </header>

        <nav className="mb-12 p-4 rounded-lg bg-muted/40 border border-border">
          <p className="font-semibold mb-3">
            {lang === "ar" ? "محتويات الدليل" : "Contents"}
          </p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="text-primary hover:underline"
                >
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {CATEGORIES.map((cat) => (
          <section key={cat.id} id={cat.id} className="mb-12 scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{cat.title}</h2>
            <p className="text-muted-foreground mb-6">{cat.intro}</p>
            <div className="space-y-4">
              {cat.tools.map((tool) => (
                <article
                  key={tool.url}
                  className="p-5 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-xl font-semibold">
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary inline-flex items-center gap-2"
                      >
                        {tool.name}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </h3>
                  </div>
                  <p className="text-foreground/90 leading-relaxed mb-2">
                    {tool.desc}
                  </p>
                  {tool.note && (
                    <p className="text-sm text-muted-foreground">
                      {isRtl ? "ملاحظة: " : "Note: "}
                      {tool.note}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-16 p-6 rounded-lg bg-primary/5 border border-primary/20">
          <h2 className="text-2xl font-bold mb-3">
            {lang === "ar" ? "نصائح للاستخدام الفعّال" : "Tips for Effective Use"}
          </h2>
          <ul className="space-y-2 list-disc list-inside text-foreground/90">
            <li>
              {lang === "ar"
                ? "ابدأ بأداة واحدة لكل مهمة وأتقنها قبل تجربة البدائل."
                : "Start with one tool per task and master it before exploring alternatives."}
            </li>
            <li>
              {lang === "ar"
                ? "تحقق دائماً من المعلومات التي تقدمها هذه الأدوات قبل الاعتماد عليها في البحث الأكاديمي."
                : "Always verify information before relying on it for academic research."}
            </li>
            <li>
              {lang === "ar"
                ? "احرص على عدم رفع بيانات حساسة أو شخصية إلى هذه الأدوات."
                : "Avoid uploading sensitive or personal data to these tools."}
            </li>
            <li>
              {lang === "ar"
                ? "بعض الأدوات تحتاج VPN أو حساب بريد جامعي للوصول الكامل."
                : "Some tools may require a VPN or university email for full access."}
            </li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
