import { MotionFooter } from "@/components/ui/motion-footer";
import { useLang } from "@/lib/i18n";
import "@/components/home/homepage-footer.css";

/** The public site's animated footer, shared with the instructor dashboard. */
export function LmsMainFooter() {
  const { lang } = useLang();
  return <MotionFooter locale={lang} />;
}
