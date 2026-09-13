import { useState } from "react";
import { useLang } from "@/lib/i18n";

const FAQ = [
  {
    q: { en: "Are SAAE certificates recognized?", ar: "هل شهادات الجمعية معترف بها؟" },
    a: {
      en: "Yes. SAAE is Syria's first official AI organisation, and every certificate carries a verification code employers can check online.",
      ar: "نعم. الجمعية أول جهة رسمية سورية للذكاء الاصطناعي، وكل شهادة تحمل رمز تحقق يمكن لأصحاب العمل التأكد منه عبر الإنترنت.",
    },
  },
  {
    q: { en: "Are the courses free?", ar: "هل الدورات مجانية؟" },
    a: {
      en: "Most courses are free. A few specialized tracks carry a symbolic fee, and sponsored seats cover learners on the waitlist.",
      ar: "معظم الدورات مجانية. بعض المسارات التخصصية تحمل رسماً رمزياً، والمقاعد الممولة تغطي المتعلمين على قائمة الانتظار.",
    },
  },
  {
    q: { en: "In person or online?", ar: "حضوري أم عن بُعد؟" },
    a: {
      en: "Current cohorts run in person in Damascus, with online tracks opening soon on this platform.",
      ar: "تُقام الدفعات الحالية حضورياً في دمشق، وستُفتتح المسارات عن بُعد قريباً على هذه المنصة.",
    },
  },
  {
    q: { en: "Do I need experience to start?", ar: "هل أحتاج خبرة للبدء؟" },
    a: {
      en: "No. Beginner tracks assume zero background; intermediate tracks list their prerequisites on the course page.",
      ar: "لا. مسارات المبتدئين لا تفترض أي خلفية، ومسارات المتوسط تذكر متطلباتها في صفحة الدورة.",
    },
  },
  {
    q: { en: "How do I become an instructor?", ar: "كيف أصبح مدرّباً؟" },
    a: {
      en: "Apply through the instructor board on the learning platform — subject experts are reviewed and onboarded every cohort.",
      ar: "قدّم عبر لوحة المدرّبين في منصة التعلّم — يُراجَع خبراء المواد ويُدمجون مع كل دفعة.",
    },
  },
];

/** Hover opens an item (and closes the rest); click toggles for keyboard and touch. */
export function FaqAccordion() {
  const { lang } = useLang();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="faq-list">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q.en} className="faq-item" onMouseEnter={() => setOpen(i)} onMouseLeave={() => setOpen(null)}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen((cur) => (cur === i ? null : i))}>
              <span>{item.q[lang]}</span>
              <span className="faq-mark" aria-hidden="true">
                +
              </span>
            </button>
            <div className="faq-panel" hidden={!isOpen}>
              <p>{item.a[lang]}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
