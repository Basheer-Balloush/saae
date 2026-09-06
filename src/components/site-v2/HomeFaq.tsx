import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLang } from "@/lib/i18n";
import { Reveal } from "./Reveal";

export function HomeFaq() {
  const { t } = useLang();
  const h = t.v2.home;

  return (
    <section id="faq" className="v2-home-section">
      <div className="v2-shell">
        <Reveal>
          <p className="v2-eyebrow">{h.faqEyebrow}</p>
          <h2 className="v2-section-title">{h.faqTitle}</h2>
          <p className="v2-section-intro">{h.faqCopy}</p>
        </Reveal>
      </div>

      <div className="v2-shell v2-faq">
        <Accordion type="single" collapsible className="v2-faq-list">
          {h.faqItems.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`} className="v2-faq-item">
              <AccordionTrigger className="v2-faq-trigger">{item.q}</AccordionTrigger>
              <AccordionContent className="v2-faq-answer">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export default HomeFaq;
