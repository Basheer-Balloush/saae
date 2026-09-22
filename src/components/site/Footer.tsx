import { MotionFooter } from "@/components/ui/motion-footer";
import { useLang } from "@/lib/i18n";
import "@/components/home/homepage-footer.css";

/**
 * The site footer, for pages React renders itself.
 *
 * There used to be a second, teal footer here with its own link list, which
 * drifted from the one the cinematic pages show: its Explore column pointed at
 * /#home, /#communities and /#achievements, three anchors that exist on no
 * page. Rather than fix those links twice, this renders the same footer the
 * rest of the site does, so there is one list of destinations to keep correct.
 *
 * Kept as a component with the same name and no props so every existing call
 * site picks it up unchanged. The cinematic pages reach the same footer a
 * different way — they portal it into their markup through CinematicPage —
 * because React does not own the DOM those pages render.
 */
export function Footer() {
  const { lang } = useLang();
  return <MotionFooter locale={lang === "en" ? "en" : "ar"} />;
}
