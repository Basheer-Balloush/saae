export function FaqSection() {
  return (
    <>
      <section className="section faq" id="faq" aria-labelledby="faq-title">
        <div className="page-shell">
          <div className="faq-layout">
            <div className="faq-intro reveal">
              <h2 id="faq-title" className="photo-head">
                Frequently Asked Questions
              </h2>
              <p>The questions people actually ask before they start.</p>
            </div>

            <ul className="faq-list">
              <li className="faq-item is-open reveal">
                <h3 className="faq-heading">
                  <button
                    className="faq-trigger"
                    type="button"
                    id="faq-q1"
                    aria-expanded="true"
                    aria-controls="faq-a1"
                  >
                    <span className="faq-num" aria-hidden="true">
                      01
                    </span>
                    <span className="faq-question">Who is SAAE for?</span>
                    <span className="faq-sign" aria-hidden="true"></span>
                  </button>
                </h3>
                <div className="faq-answer" id="faq-a1" role="region" aria-labelledby="faq-q1">
                  <div className="faq-answer-inner">
                    <p>
                      Students, educators, professionals, founders and institutions that want
                      practical contact with AI &mdash; not only people who already work in
                      technology.
                    </p>
                  </div>
                </div>
              </li>
              <li className="faq-item reveal">
                <h3 className="faq-heading">
                  <button
                    className="faq-trigger"
                    type="button"
                    id="faq-q2"
                    aria-expanded="false"
                    aria-controls="faq-a2"
                  >
                    <span className="faq-num" aria-hidden="true">
                      02
                    </span>
                    <span className="faq-question">Do I need technical experience?</span>
                    <span className="faq-sign" aria-hidden="true"></span>
                  </button>
                </h3>
                <div className="faq-answer" id="faq-a2" role="region" aria-labelledby="faq-q2">
                  <div className="faq-answer-inner">
                    <p>
                      No. SAAE&#8217;s public programmes include starting points for people who are
                      new to AI. Individual courses set their own requirements, which are listed
                      with each course.
                    </p>
                  </div>
                </div>
              </li>
              <li className="faq-item reveal">
                <h3 className="faq-heading">
                  <button
                    className="faq-trigger"
                    type="button"
                    id="faq-q3"
                    aria-expanded="false"
                    aria-controls="faq-a3"
                  >
                    <span className="faq-num" aria-hidden="true">
                      03
                    </span>
                    <span className="faq-question">How do I take part?</span>
                    <span className="faq-sign" aria-hidden="true"></span>
                  </button>
                </h3>
                <div className="faq-answer" id="faq-a3" role="region" aria-labelledby="faq-q3">
                  <div className="faq-answer-inner">
                    <p>
                      Programme dates and registration will be published on this website. Until
                      then, use the contact form to ask about the current intake and what each track
                      involves.
                    </p>
                  </div>
                </div>
              </li>
              <li className="faq-item reveal">
                <h3 className="faq-heading">
                  <button
                    className="faq-trigger"
                    type="button"
                    id="faq-q4"
                    aria-expanded="false"
                    aria-controls="faq-a4"
                  >
                    <span className="faq-num" aria-hidden="true">
                      04
                    </span>
                    <span className="faq-question">Can an organisation work with SAAE?</span>
                    <span className="faq-sign" aria-hidden="true"></span>
                  </button>
                </h3>
                <div className="faq-answer" id="faq-a4" role="region" aria-labelledby="faq-q4">
                  <div className="faq-answer-inner">
                    <p>
                      Yes. Universities, ministries, companies and community organisations already
                      partner on training and applied work. Partnership questions go to{" "}
                      <a href="mailto:info@aisyria.org">info@aisyria.org</a>.
                    </p>
                  </div>
                </div>
              </li>
              <li className="faq-item reveal">
                <h3 className="faq-heading">
                  <button
                    className="faq-trigger"
                    type="button"
                    id="faq-q5"
                    aria-expanded="false"
                    aria-controls="faq-a5"
                  >
                    <span className="faq-num" aria-hidden="true">
                      05
                    </span>
                    <span className="faq-question">Where will updates be published?</span>
                    <span className="faq-sign" aria-hidden="true"></span>
                  </button>
                </h3>
                <div className="faq-answer" id="faq-a5" role="region" aria-labelledby="faq-q5">
                  <div className="faq-answer-inner">
                    <p>
                      This redesigned website is becoming SAAE&#8217;s official public home.
                      Programmes, registration and announcements will be published here as each
                      section launches.
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
