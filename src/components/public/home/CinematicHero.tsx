import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";

export function CinematicHero() {
  return (
    <>
  <div className="site-loader" id="site-loader" role="status" aria-label="Opening the SAAE website">
    <div className="site-loader-inner" id="site-loader-progress" role="progressbar" aria-label="Hero video loading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
      <span className="site-loader-halo" aria-hidden="true"></span>
      <span className="site-loader-rail site-loader-rail-start" aria-hidden="true"><span className="site-loader-progress-fill"></span></span>
      <span className="site-loader-tree" aria-hidden="true"><img className="site-loader-logo" src="/site/images/saae-tree-loader.png" alt="" width="576" height="642" decoding="sync" fetchPriority="high" /><span className="site-loader-energy"></span></span>
      <span className="site-loader-rail site-loader-rail-end" aria-hidden="true"><span className="site-loader-progress-fill"></span></span>
    </div>
  </div>

  <aside className="journey-ribbon" id="journey-ribbon" aria-label="Journey navigation">
    <div className="ribbon-panel" id="ribbon-panel" aria-hidden="true" inert={true}>
      <a className="ribbon-brand" href="#hero-sec" aria-label="SAAE home">
        <span className="ribbon-wordmark" aria-hidden="true">SAAE</span>
        <span className="ribbon-org">Syrian Association for AI &amp; Entrepreneurship</span>
      </a>
      <nav className="ribbon-nav" aria-label="Landing page sections">
        <a href="#news"><span>01</span>News</a>
        <a href="#partners"><span>02</span>Partners</a>
        <a href="#mission"><span>03</span>How we work</a>
        <a href="#faq"><span>04</span>Answers</a>
      </nav>
      <nav className="ribbon-pages" aria-label="Site pages">
        <Link to="/about">About</Link>
        <Link to="/partners">Partners</Link>
        <Link to="/one-million-initiative-home">Initiative</Link>
        <Link to="/contact">Contact</Link>
      </nav>
      <Link className="ribbon-cta" to="/one-million-initiative-home">
        Explore the initiative
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </Link>
    </div>
    <button className="ribbon-toggle" id="ribbon-toggle" type="button" aria-controls="ribbon-panel" aria-expanded="false">
      <span className="ribbon-rosette" aria-hidden="true">
        <svg viewBox="0 0 100 100"><path d="M50 5 61 31 85 15 69 39 95 50 69 61 85 85 61 69 50 95 39 69 15 85 31 61 5 50 31 39 15 15 39 31Z" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="3"/></svg>
      </span>
      <span className="ribbon-position"><span id="ribbon-current">Opening</span><small id="ribbon-count">01 / 05</small></span>
      <span className="ribbon-action" aria-hidden="true">Explore</span>
    </button>
  </aside>

  <svg className="geometry-library" aria-hidden="true" focusable="false">
    <symbol id="damascene-rosette" viewBox="0 0 100 100">
      <path d="M50 4 61 30 86 14 70 39 96 50 70 61 86 86 61 70 50 96 39 70 14 86 30 61 4 50 30 39 14 14 39 30Z"/>
      <path d="M50 20 62 38 80 50 62 62 50 80 38 62 20 50 38 38Z"/>
      <circle cx="50" cy="50" r="7"/>
    </symbol>
  </svg>
    <section className="hero-section" id="hero-sec" aria-labelledby="page-title">
      <h1 className="sr-only" id="page-title">Grow Syria's AI future with SAAE</h1>
      <div className="cinematic-scroll" id="stage">
        <div className="hero-media" id="hero" aria-hidden="true">
          <video className="hero-video" id="hero-video" muted={true} playsInline preload="none"></video>
          <div className="hero-wash"></div>
          <div className="hero-vignette"></div>
          <div className="hero-grain"></div>
          <div className="hero-poster" id="poster"></div>
        </div>

        <div className="video-status" id="ring" role="status">
          <span className="loading-ring" aria-hidden="true"></span>
          <span id="video-status-copy">Loading cinematic scene</span>
        </div>

        <div className="hero-grid">
          <div className="hero-copy-stage">
            <article className="hero-band is-active" data-band="0">
              <div className="hero-card-copy">
                <p className="eyebrow">Syrian Association for AI &amp; Entrepreneurship</p>
                <h2 data-hero-opening-title><span className="hero-opening-line">Intelligence and entrepreneurship for a nation on the rise.</span></h2>
              </div>
            </article>
            <article className="hero-band" data-band="1" aria-hidden="true">
              <div className="hero-card-copy">
                <p className="eyebrow">The learning platform</p>
                <h2>Structured pathways, not scattered tutorials.</h2>
                <p>Certified training tracks that build professional and technical skill, open to anyone in Syria.</p>
                <Link className="button-link" to="/contact" hash="write">
                  Ask about learning
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              </div>
            </article>
            <article className="hero-band" data-band="2" aria-hidden="true">
              <div className="hero-card-copy">
                <p className="eyebrow">The Million Syrian AI Users initiative</p>
                <h2>One million people. One national step forward.</h2>
                <p>A national effort to make AI knowledge practical, trusted and reachable.</p>
                <Link className="button-link" to="/one-million-initiative-home">
                  Explore the initiative
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              </div>
            </article>
            <article className="hero-band" data-band="3" aria-hidden="true">
              <div className="hero-card-copy">
                <p className="eyebrow">SAAE in numbers</p>
                <h2>5,000+ people learning with SAAE.</h2>
              </div>
              <dl className="hero-stats">
                <div style={{ "--i": '0' } as CSSProperties}><dt>trainees</dt><dd data-count="5000">5,000+</dd></div>
                <div style={{ "--i": '1' } as CSSProperties}><dt>courses</dt><dd data-count="120">120+</dd></div>
                <div style={{ "--i": '2' } as CSSProperties}><dt>strategic partners</dt><dd data-count="30">30+</dd></div>
                <div style={{ "--i": '3' } as CSSProperties}><dt>communities</dt><dd data-count="7">7+</dd></div>
              </dl>
            </article>
            <article className="hero-band" data-band="4" aria-hidden="true">
              <div className="community-flip" aria-label="Nine SAAE communities grow through the root system">
                <div className="hero-card-copy community-flip-heading">
                  <p className="eyebrow">SAAE communities</p>
                  <h2>Building Syria's Digital Future</h2>
                </div>
                <div className="community-flip-track" id="community-flip-track">
                  <article className="community-card-face community-card-front" aria-live="polite">
                    <span className="community-card-icon" id="community-card-icon" aria-hidden="true"></span>
                    <div>
                      <h2 className="community-card-name" id="community-card-name">Data</h2>
                      <p className="community-card-copy" id="community-card-copy">Turn information into insight.</p>
                    </div>
                    <div className="community-card-progress" aria-label="Community navigator"><button className="community-card-nav" id="community-card-prev" type="button" aria-label="Show previous community"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5"/></svg></button><span className="community-card-count" id="community-card-count">1</span><button className="community-card-nav" id="community-card-next" type="button" aria-label="Show next community"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button></div>
                  </article>
                  <article className="community-card-face community-card-back" aria-hidden="true">
                    <span className="community-card-icon" id="community-card-next-icon" aria-hidden="true"></span>
                    <div>
                      <h2 className="community-card-name" id="community-card-next-name">Smart Urban Development</h2>
                      <p className="community-card-copy" id="community-card-next-copy">Design smarter, more responsive cities.</p>
                    </div>
                    <div className="community-card-progress" aria-hidden="true"><span className="community-card-nav"><svg viewBox="0 0 16 16"><path d="m10 3-5 5 5 5"/></svg></span><span className="community-card-count" id="community-card-next-count">2</span><span className="community-card-nav"><svg viewBox="0 0 16 16"><path d="m6 3 5 5-5 5"/></svg></span></div>
                  </article>
                </div>
              </div>
            </article>
          </div>

        </div>
        <p className="sr-only">As the page scrolls, the story moves from accessible knowledge to practical skills, connected people, public value, and the Million Syrian AI Users initiative.</p>
        <div className="scroll-cue" aria-hidden="true">
          <span className="scroll-cue-label">Scroll to begin</span>
          <span className="scroll-cue-stem"><span className="scroll-cue-seed"></span><span className="scroll-cue-shoot"></span></span>
        </div>
      </div>
      <div className="hero-snap-points" aria-hidden="true">
        <span className="hero-snap-point" style={{ "--snap-position": '0%' } as CSSProperties}></span>
        <span className="hero-snap-point" style={{ "--snap-position": '20%' } as CSSProperties}></span>
        <span className="hero-snap-point" style={{ "--snap-position": '40%' } as CSSProperties}></span>
        <span className="hero-snap-point" style={{ "--snap-position": '60%' } as CSSProperties}></span>
        <span className="hero-snap-point" style={{ "--snap-position": '80%' } as CSSProperties}></span>
      </div>

      <div className="hero-static">
        <img className="static-frame" id="static-frame" alt="The SAAE Tree of Knowledge connected through illuminated roots" width="1280" height="720" decoding="async" fetchPriority="high" />
        <div className="page-shell static-copy">
          <p className="eyebrow">Syrian Association for AI &amp; Entrepreneurship</p>
          <h2 className="photo-head">Build Syria's AI future.</h2>
          <p>Practical AI learning, research and entrepreneurship, connected for people across Syria.</p>
          <div className="static-actions">
            <Link className="button-link" to="/one-million-initiative-home">
              Explore the initiative
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link className="button-link button-quiet" to="/contact" hash="write">
              Ask about learning
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M7 5h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
          <p className="static-note">A shared future starts with shared knowledge.</p>
        </div>
        <div className="scroll-cue" aria-hidden="true">
          <span className="scroll-cue-label">Scroll</span>
          <span className="scroll-cue-stem"><span className="scroll-cue-seed"></span><span className="scroll-cue-shoot"></span></span>
        </div>
      </div>
    </section>
    </>
  );
}
