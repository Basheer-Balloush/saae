import { useLang } from "@/lib/i18n";
import { V2Link } from "./V2Link";

const MAPS_URL = "https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6";

export function FooterV2() {
  const { lang, t } = useLang();
  const f = t.v2.footer;
  const isAr = lang === "ar";

  return (
    <footer className="v2-footer">
      <div className="v2-footer-cta">
        <div className="v2-shell v2-footer-cta-inner">
          <div>
            <p className="v2-eyebrow">{f.ctaEyebrow}</p>
            <p className="v2-footer-cta-line">{f.ctaLine}</p>
          </div>
          <V2Link to="/one-million-initiative-home" className="v2-button-link">
            {f.ctaButton}
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M5 15 15 5M7 5h8v8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </V2Link>
        </div>
      </div>

      <div className="v2-shell v2-footer-main">
        <div className="v2-footer-identity">
          {isAr ? (
            <img
              className="v2-footer-logo"
              src="/saae/saae-logo-ar.png"
              alt="الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"
              width={1899}
              height={642}
              decoding="async"
            />
          ) : (
            <img
              className="v2-footer-logo"
              src="/saae/saae-logo-en.png"
              alt="Syrian Association for AI & Entrepreneurship"
              width={1882}
              height={647}
              decoding="async"
            />
          )}
          <p className="v2-footer-claim">{f.claim}</p>
          <ul className="v2-footer-social" aria-label={f.socialLabel}>
            <li>
              <a
                href="https://www.instagram.com/saae_sy/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="4.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle cx="17.2" cy="6.8" r="1.25" fill="currentColor" />
                </svg>
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/share/18SQ11hcct/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.3-.04-1.3-.13-2.46-.13-2.44 0-4.11 1.49-4.11 4.22V9.9H7.4V13h2.73v8z"
                  />
                </svg>
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/company/syrian-association-for-ai-entrepreneurship/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M6.5 9H3.6v12h2.9zM5.05 3.6a1.68 1.68 0 1 0 0 3.36 1.68 1.68 0 0 0 0-3.36M20.4 21h-2.9v-5.83c0-1.39-.03-3.18-1.94-3.18-1.94 0-2.24 1.51-2.24 3.08V21h-2.9V9h2.78v1.64h.04a3.05 3.05 0 0 1 2.74-1.5c2.94 0 3.48 1.93 3.48 4.44z"
                  />
                </svg>
              </a>
            </li>
          </ul>
        </div>

        <nav className="v2-footer-col" aria-labelledby="v2-footer-explore">
          <h2 className="v2-footer-col-title" id="v2-footer-explore">
            {f.exploreTitle}
          </h2>
          <ul>
            <li>
              <V2Link to="/">{f.links.home}</V2Link>
            </li>
            <li>
              <V2Link to="/about">{f.links.about}</V2Link>
            </li>
            <li>
              <V2Link to="/news">{f.links.news}</V2Link>
            </li>
            <li>
              <V2Link to="/partners">{f.links.partners}</V2Link>
            </li>
            <li>
              <V2Link to="/one-million-initiative-home">{f.links.initiative}</V2Link>
            </li>
            <li>
              <V2Link to="/contact">{f.links.contact}</V2Link>
            </li>
          </ul>
        </nav>

        <nav className="v2-footer-col" aria-labelledby="v2-footer-official">
          <h2 className="v2-footer-col-title" id="v2-footer-official">
            {f.officialTitle}
          </h2>
          <ul>
            <li>
              <V2Link to="/" hash="communities">
                {f.links.communities}
              </V2Link>
            </li>
            <li>
              <V2Link to="/" hash="achievements">
                {f.links.achievements}
              </V2Link>
            </li>
            <li>
              <V2Link to="/learning-management-system">{f.links.learning}</V2Link>
            </li>
            <li>
              <V2Link to="/resources/ai-tools">{f.links.aiTools}</V2Link>
            </li>
            <li>
              <V2Link to="/one-million-initiative-home">{f.links.million}</V2Link>
            </li>
            <li>
              <V2Link to="/registration">{f.links.registration}</V2Link>
            </li>
          </ul>
        </nav>

        <div className="v2-footer-map">
          <a
            className="v2-map-shot"
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={f.mapAria}
          >
            <img
              src="/saae/saae-map.png"
              alt={f.mapAlt}
              width={696}
              height={339}
              decoding="async"
            />
          </a>
          <ul className="v2-map-lines">
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
                {f.address}
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
          <a className="v2-map-visit" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
            {f.visit}{" "}
            <span className="v2-visit-arrow" aria-hidden="true">
              →
            </span>
          </a>
          <p className="v2-map-attr">
            ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenStreetMap
            </a>{" "}
            {f.osmContributors}
          </p>
        </div>
      </div>

      <div className="v2-shell v2-footer-bottom">
        <span>
          © {new Date().getFullYear()} {f.orgName}. {f.rights}
        </span>
      </div>
    </footer>
  );
}

export default FooterV2;
