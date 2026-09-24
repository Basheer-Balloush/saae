export function MissionSection() {
  return (
    <>
      <section className="section mission" id="mission" aria-labelledby="mission-title">
        <div className="page-shell">
          <h2 className="sr-only" id="mission-title">How SAAE works: train, apply, build</h2>
          <div className="mission-reel" id="mission-reel">
            <div className="mission-sticky">
              <div className="mission-words" aria-hidden="true">
                <span data-caption="Learn it. Teach it. Pass it on.">TRAIN</span>
                <span data-caption="Test it. Measure it. Make it useful.">APPLY</span>
                <span data-caption="Launch it. Grow it. Make it last.">BUILD</span>
              </div>
              <div className="mission-grid">
            <article className="mission-item reveal">
              <span className="mission-index">TRAIN</span>
              <h3>Put AI into working hands</h3>
              <p>Courses, workshops and trainer programmes turn AI from a headline into a skill that students, professionals and educators can use on Monday morning.</p>
            </article>
            <article className="mission-item reveal">
              <span className="mission-index">APPLY</span>
              <h3>Prove it on real problems</h3>
              <p>Specialists put those methods to work on Syrian questions in health, data, media, software and the shape of its cities, and publish what holds.</p>
            </article>
            <article className="mission-item reveal">
              <span className="mission-index">BUILD</span>
              <h3>Turn capability into enterprise</h3>
              <p>Entrepreneurship and institutional partnership carry proven work into companies, services and public capacity that outlast the programme that started them.</p>
            </article>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
