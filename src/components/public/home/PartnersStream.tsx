import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";

export function PartnersStream() {
  return (
    <>
      <section className="section partners" id="partners" aria-labelledby="partners-title">
        <div className="flow-reel flow-reel-partners" id="partner-reel">
          <div className="flow-screen partner-screen" id="partner-screen">
            <div className="page-shell">
              <div className="section-heading reveal">
                <p className="eyebrow">Shared work</p>
                <h2 id="partners-title" className="photo-head">Institutions carry it further</h2>
                <p>Universities, ministries, companies and community organisations already work with SAAE on training and applied projects.</p>
              </div>
            </div>

            <div className="partner-stage">
              <div className="partner-stream" id="partner-stream">
                <div className="partner-stream-field" aria-hidden="true">
                  <div className="partner-stream-rails">
                    <span className="partner-mark is-high" style={{ "--i": '0', "--mark": 'url("/site/images/partners/partner-damascus-ink.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-high" style={{ "--i": '1', "--mark": 'url("/site/images/partners/partner-yarmouk-ink.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-low" style={{ "--i": '2', "--mark": 'url("/site/images/partners/partner-social-affairs.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-low" style={{ "--i": '3', "--mark": 'url("/site/images/partners/partner-aleppo.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-high" style={{ "--i": '4', "--mark": 'url("/site/images/partners/partner-engineers-ink.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-high" style={{ "--i": '5', "--mark": 'url("/site/images/partners/partner-syrian-telecom.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-low" style={{ "--i": '6', "--mark": 'url("/site/images/partners/partner-sdo.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-low" style={{ "--i": '7', "--mark": 'url("/site/images/partners/partner-al-ihsan.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-high" style={{ "--i": '8', "--mark": 'url("/site/images/partners/partner-med-axis.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-high" style={{ "--i": '9', "--mark": 'url("/site/images/partners/partner-sharafai.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-low" style={{ "--i": '10', "--mark": 'url("/site/images/partners/partner-sarrdeh.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-low" style={{ "--i": '11', "--mark": 'url("/site/images/partners/partner-devista.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-high" style={{ "--i": '12', "--mark": 'url("/site/images/partners/partner-ilmhub.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-high" style={{ "--i": '13', "--mark": 'url("/site/images/partners/partner-stepup.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-low" style={{ "--i": '14', "--mark": 'url("/site/images/partners/partner-abqar.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-low" style={{ "--i": '15', "--mark": 'url("/site/images/partners/partner-lmip.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-high" style={{ "--i": '16', "--mark": 'url("/site/images/partners/partner-joblink.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-high" style={{ "--i": '17', "--mark": 'url("/site/images/partners/partner-azbooks.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-low" style={{ "--i": '18', "--mark": 'url("/site/images/partners/partner-circles.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-low" style={{ "--i": '19', "--mark": 'url("/site/images/partners/partner-cubes.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-high" style={{ "--i": '20', "--mark": 'url("/site/images/partners/partner-baukant.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-left is-high" style={{ "--i": '21', "--mark": 'url("/site/images/partners/partner-bacca.webp")' } as CSSProperties}></span>
                    <span className="partner-mark is-low" style={{ "--i": '22', "--mark": 'url("/site/images/partners/partner-people.webp")' } as CSSProperties}></span>
                  </div>
                </div>
              </div>

              <div className="partner-outro" id="partner-outro">
                <Link className="button-link partner-outro-cta" to="/partners">
                  See all 23 partners
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* The corridor is decoration, so the register itself lives here:
             all twenty-three names, in the order SAAE publishes them,
             readable to a screen reader and to a page with no CSS. */}
        <ul className="sr-only" aria-label="SAAE partners">
          <li>Damascus University</li>
          <li>Yarmouk Private University</li>
          <li>Ministry of Social Affairs and Labor</li>
          <li>Aleppo Governorate</li>
          <li>Engineers Syndicate</li>
          <li>Syrian Telecom</li>
          <li>Syrian Development Organization</li>
          <li>Al-Ihsan Medical</li>
          <li>Med Axis</li>
          <li>sharafAI</li>
          <li>Sarrdeh Tech</li>
          <li>Devista Consulting</li>
          <li>ILM Hub</li>
          <li>Step Up</li>
          <li>Kawkab Abqar</li>
          <li>LMIP</li>
          <li>JobLink</li>
          <li>A-Z Books</li>
          <li>Circles</li>
          <li>Cubes</li>
          <li>Baukant</li>
          <li>BACCA</li>
          <li>People</li>
        </ul>

</section>
    </>
  );
}
