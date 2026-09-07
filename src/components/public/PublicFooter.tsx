import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";

const explore = [
  { to: "/", en: "Home", ar: "الرئيسية" },
  { to: "/about", en: "About SAAE", ar: "عن الجمعية" },
  { to: "/news", en: "News", ar: "الأخبار" },
  { to: "/partners", en: "Partners", ar: "الشركاء" },
  { to: "/one-million-initiative-home", en: "Initiative", ar: "المبادرة" },
  { to: "/contact", en: "Contact", ar: "تواصل معنا" },
] as const;

const programmes = [
  { to: "/learning-management-system", en: "Learning platform", ar: "منصة التعلم" },
  { to: "/attendance-management-system", en: "Attendance", ar: "الحضور" },
  { to: "/", hash: "communities", en: "Communities", ar: "المجتمعات" },
  { to: "/", hash: "partners", en: "Achievements", ar: "الإنجازات" },
] as const;

export function PublicFooter() {
  const { lang } = useLang();
  const isArabic = lang === "ar";
  const pick = (item: { en: string; ar: string }) => (isArabic ? item.ar : item.en);

  return (
    <footer className="site-footer">
      <div className="footer-cta">
        <div className="page-shell footer-cta-inner">
          <div>
            <p className="eyebrow">{isArabic ? "الخطوة التالية تبدأ هنا" : "The next step starts here"}</p>
            <p className="footer-cta-line">
              {isArabic
                ? "ساهم في تشكيل ما يمكن لسوريا تحقيقه بالذكاء الاصطناعي."
                : "Help shape what Syria can do with AI."}
            </p>
          </div>
          <Link className="button-link" to="/one-million-initiative-home">
            {isArabic ? "اكتشف المبادرة" : "Explore the initiative"}
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="page-shell footer-main">
        <div className="footer-identity">
          <img
            className="footer-logo footer-logo-en"
            src={isArabic ? "/site/images/saae-logo-ar.png" : "/site/images/saae-logo-en.png"}
            alt={
              isArabic
                ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"
                : "Syrian Association for AI & Entrepreneurship"
            }
            width={1882}
            height={647}
            decoding="async"
          />
          <p className="footer-claim">
            {isArabic
              ? "أول جمعية رسمية للذكاء الاصطناعي في سوريا — نمكّن الكفاءات السورية لإعادة بناء بلدنا والنهوض به."
              : "Syria's first official AI organisation — empowering Syrian talent to rebuild and uplift our country."}
          </p>
          <ul className="footer-social" aria-label="SAAE on social platforms">
            <li>
              <a href="https://www.instagram.com/saae_sy/" target="_blank" rel="noopener noreferrer" aria-label="SAAE on Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="17.2" cy="6.8" r="1.25" fill="currentColor" />
                </svg>
              </a>
            </li>
            <li>
              <a href="https://www.facebook.com/share/18SQ11hcct/" target="_blank" rel="noopener noreferrer" aria-label="SAAE on Facebook">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.3-.04-1.3-.13-2.46-.13-2.44 0-4.11 1.49-4.11 4.22V9.9H7.4V13h2.73v8z" />
                </svg>
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/company/syrian-association-for-ai-entrepreneurship/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="SAAE on LinkedIn"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M6.5 9H3.6v12h2.9zM5.05 3.6a1.68 1.68 0 1 0 0 3.36 1.68 1.68 0 0 0 0-3.36M20.4 21h-2.9v-5.83c0-1.39-.03-3.18-1.94-3.18-1.94 0-2.24 1.51-2.24 3.08V21h-2.9V9h2.78v1.64h.04a3.05 3.05 0 0 1 2.74-1.5c2.94 0 3.48 1.93 3.48 4.44z" />
                </svg>
              </a>
            </li>
          </ul>
        </div>

        <nav className="footer-col" aria-labelledby="footer-explore">
          <h2 className="footer-col-title" id="footer-explore">
            {isArabic ? "تصفح" : "Explore"}
          </h2>
          <ul>
            {explore.map((item) => (
              <li key={item.to + item.en}>
                <Link to={item.to}>{pick(item)}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer-col" aria-labelledby="footer-official">
          <h2 className="footer-col-title" id="footer-official">
            {isArabic ? "البرامج" : "Programmes"}
          </h2>
          <ul>
            {programmes.map((item) => (
              <li key={item.en}>
                <Link to={item.to} hash={"hash" in item ? item.hash : undefined}>
                  {pick(item)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-map">
          <a
            className="map-shot"
            href="https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open SAAE location in Maps"
          >
            <img
              src="/site/images/saae-map.png"
              alt="Map showing the SAAE headquarters in Damascus"
              width={696}
              height={339}
              decoding="async"
            />
          </a>
          <ul className="map-lines">
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              <a href="https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6" target="_blank" rel="noopener noreferrer">
                {isArabic
                  ? "دمشق، بجانب وزارة التعليم العالي والبحث العلمي"
                  : "Damascus, beside the Ministry of Higher Education and Scientific Research"}
              </a>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <a href="mailto:info@aisyria.org">info@aisyria.org</a>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 3h3l2 5-2 1.5a15 15 0 0 0 4.5 4.5L16 12l5 2v3c0 1.1-.9 2-2 2C10.2 19 5 13.8 5 5a2 2 0 0 1 2-2Z" />
              </svg>
              <a href="tel:+963930763547" dir="ltr">
                +963 930 763 547
              </a>
            </li>
          </ul>
          <a className="map-visit" href="https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6" target="_blank" rel="noopener noreferrer">
            {isArabic ? "زورونا" : "Visit us"} <span className="visit-arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="page-shell footer-bottom">
        <span>
          © {new Date().getFullYear()}{" "}
          {isArabic
            ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال. جميع الحقوق محفوظة."
            : "Syrian Association for AI & Entrepreneurship. All rights reserved."}
        </span>
      </div>
    </footer>
  );
}
