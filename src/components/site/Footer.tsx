import { Mail, Phone, MapPin, Linkedin, Instagram, Facebook, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";
import logo from "@/assets/footer-logo.png";
import locationMap from "@/assets/location-map.png";

const TEAL = "#048090";
const INK = "#FFFFFF";
const ACCENT = "#A8E6E6";
const MUTED = "rgba(255,255,255,0.78)";

export function Footer() {
  const { t, dir } = useLang();
  const isRtl = dir === "rtl";

  return (
    <footer
      id="contact"
      className="relative"
      style={{
        backgroundColor: TEAL,
        color: INK,
        borderTop: `2px solid rgba(255,255,255,0.25)`,
        paddingTop: "120px",
        paddingBottom: "48px",
      }}
    >
      <div className="mx-auto w-full max-w-[1440px] px-8 lg:px-16">
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Col 1 — Identity */}
          <div className="lg:col-span-5">
            <img
              src={logo}
              alt="SAAE"
              className="h-12 w-auto brightness-0 invert"
            />
            <p
              className="mt-6 max-w-xs text-sm leading-relaxed"
              style={{ fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 400, color: INK }}
            >
              {t.footer.mission}
            </p>
            <div className="mt-8 flex items-center gap-7">
              {[Instagram, Facebook, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social"
                  className="transition-opacity hover:opacity-80"
                  style={{ color: INK }}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Navigation */}
          <div className="lg:col-span-2">
            <h4
              className="text-base font-bold tracking-tight"
              style={{ color: INK, fontFamily: '"Cairo", system-ui, sans-serif' }}
            >
              {t.footer.quickLinks}
            </h4>
            <ul className={`mt-6 space-y-5 text-sm ${isRtl ? "text-right" : "text-left"}`}>
              {(["about", "news", "communities", "achievements", "partners", "contact"] as const).map((k) => (
                <li key={k} className="leading-relaxed">
                  <a
                    href={`#${k}`}
                    className="transition-colors hover:text-white/80"
                    style={{ color: INK }}
                  >
                    {t.nav[k]}
                  </a>
                </li>
              ))}
            </ul>
          </div>


          {/* Col 4 — HQ Intelligence */}
          <div className="lg:col-span-3">
            <h4
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: INK }}
            >
              {t.footer.hq ?? "HQ"}
            </h4>
            <a
              href="https://www.google.com/maps?q=Damascus+University"
              target="_blank"
              rel="noreferrer"
              className="relative mt-6 block aspect-[16/10] overflow-hidden rounded-md"
            >
              <img
                src={locationMap}
                alt="Damascus"
                className="h-full w-full object-cover grayscale"
                loading="lazy"
              />
              <span
                className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                aria-hidden
              >
                <MapPin className="h-5 w-5" style={{ color: "#FFFFFF" }} strokeWidth={2.25} fill="#FFFFFF" />
              </span>
            </a>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 flex-none" style={{ color: ACCENT }} strokeWidth={1.75} />
                <span style={{ color: INK }}>{t.footer.address}</span>
              </div>
              <a
                href="mailto:info@aisyria.org"
                className="flex items-center gap-2.5 transition-colors hover:text-white/80"
                style={{ color: INK }}
              >
                <Mail className="h-4 w-4 flex-none" style={{ color: ACCENT }} strokeWidth={1.75} />
                info@aisyria.org
              </a>
              <a
                href="tel:+963930763547"
                className="flex items-center gap-2.5 transition-colors hover:text-white/80"
                style={{ color: INK }}
              >
                <Phone className="h-4 w-4 flex-none" style={{ color: ACCENT }} strokeWidth={1.75} />
                <span dir="ltr">+963 930 763 547</span>
              </a>
              <a
                href="https://www.google.com/maps?q=Damascus"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 pt-1 text-sm font-semibold"
                style={{ color: "#FFFFFF" }}
              >
                {t.footer.visit}
                <ArrowRight
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    isRtl
                      ? "-scale-x-100 group-hover:-translate-x-1"
                      : "group-hover:translate-x-1"
                  }`}
                />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar — centered copyright */}
        <div
          className="mt-20 flex flex-col items-center gap-2 pt-6 text-center text-xs"
          style={{ borderTop: `1px solid rgba(255,255,255,0.25)`, color: MUTED }}
        >
          <span>© {new Date().getFullYear()} SAAE — {t.footer.rights}</span>
        </div>
      </div>
    </footer>
  );
}
