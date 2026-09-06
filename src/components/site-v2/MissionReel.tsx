import { useLang } from "@/lib/i18n";
import { Reveal } from "./Reveal";

export function MissionReel() {
  const { t } = useLang();
  const h = t.v2.home;

  return (
    <section id="mission" className="v2-home-section">
      <div className="v2-shell">
        <Reveal>
          <p className="v2-eyebrow">{h.missionEyebrow}</p>
          <h2 className="v2-section-title">{h.missionTitle}</h2>
          <p className="v2-section-intro">{h.missionCopy}</p>
        </Reveal>
      </div>

      <div className="v2-shell">
        <ol className="v2-mission-reel">
          {h.missionSteps.map((step) => (
            <li key={step.index} className="v2-mission-step">
              <p className="v2-mission-index">{step.index}</p>
              <h3 className="v2-mission-title">{step.title}</h3>
              <p className="v2-mission-copy">{step.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default MissionReel;
