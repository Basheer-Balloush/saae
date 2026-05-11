import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin, Linkedin, Twitter, Github, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";
import logo from "@/assets/footer-logo.png";
import locationMap from "@/assets/location-map.png";

const INK = "#2E2E2E";
const TEAL = "#048090";
const HAIRLINE = "#EEEEEE";
const MUTED = "#8A8A8A";

export function Footer() {
  const { t, dir } = useLang();
  const isRtl = dir === "rtl";
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    (e.currentTarget as HTMLFormElement).reset();
  }

  const underlineInput =
    "w-full bg-transparent border-0 border-b py-2 text-sm outline-none transition-colors placeholder:text-[#A8A8A8] focus:border-[#048090]";

  return (
    <footer
      id="contact"
      className="relative pt-20 pb-8"
      style={{ backgroundColor: "#FFFFFF", color: INK, borderTop: `1px solid ${HAIRLINE}` }}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-start gap-14 lg:grid-cols-12">
          {/* Col 1 — Identity */}
          <div className="lg:col-span-3">
            <img
              src={logo}
              alt="SAAE"
              className="h-12 w-auto grayscale opacity-90"
            />
            <p
              className="mt-6 max-w-xs text-sm leading-relaxed"
              style={{ fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 400, color: INK }}
            >
              {t.footer.mission}
            </p>
            <div className="mt-7 flex items-center gap-5">
              {[Linkedin, Twitter, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social"
                  className="transition-colors hover:text-[#048090]"
                  style={{ color: INK }}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Navigation */}
          <div className="lg:col-span-2">
            <h4
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: INK }}
            >
              {t.footer.quickLinks}
            </h4>
            <ul className="mt-6 space-y-4 text-sm">
              {(["about", "news", "communities", "achievements", "partners", "contact"] as const).map((k) => (
                <li key={k}>
                  <a
                    href={`#${k}`}
                    className="transition-colors hover:text-[#048090]"
                    style={{ color: INK }}
                  >
                    {t.nav[k]}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Contact Hub */}
          <div className="lg:col-span-4">
            <h4
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: INK }}
            >
              {t.footer.contact}
            </h4>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <input
                required
                type="text"
                placeholder={t.footer.form.name}
                className={underlineInput}
                style={{ color: INK, borderBottomColor: HAIRLINE }}
              />
              <input
                required
                type="email"
                placeholder={t.footer.form.email}
                className={underlineInput}
                style={{ color: INK, borderBottomColor: HAIRLINE }}
              />
              <textarea
                required
                rows={2}
                placeholder={t.footer.form.message}
                className={`${underlineInput} resize-none`}
                style={{ color: INK, borderBottomColor: HAIRLINE }}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                {sent ? t.footer.form.sent : t.footer.form.send}
                {!sent && <ArrowRight className={isRtl ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />}
              </button>
            </form>
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
                <MapPin className="h-5 w-5" style={{ color: TEAL }} strokeWidth={2.25} fill={TEAL} />
              </span>
            </a>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 flex-none" style={{ color: TEAL }} strokeWidth={1.75} />
                <span style={{ color: INK }}>{t.footer.address}</span>
              </div>
              <a
                href="mailto:info@aisyria.org"
                className="flex items-center gap-2.5 transition-colors hover:text-[#048090]"
                style={{ color: INK }}
              >
                <Mail className="h-4 w-4 flex-none" style={{ color: TEAL }} strokeWidth={1.75} />
                info@aisyria.org
              </a>
              <a
                href="tel:+963930763547"
                className="flex items-center gap-2.5 transition-colors hover:text-[#048090]"
                style={{ color: INK }}
              >
                <Phone className="h-4 w-4 flex-none" style={{ color: TEAL }} strokeWidth={1.75} />
                <span dir="ltr">+963 930 763 547</span>
              </a>
              <a
                href="https://www.google.com/maps?q=Damascus"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 pt-1 text-sm font-semibold"
                style={{ color: TEAL }}
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

        {/* Divider + copyright */}
        <div
          className="mt-16 pt-5 text-center text-xs"
          style={{ borderTop: `1px solid ${HAIRLINE}`, color: MUTED }}
        >
          © {new Date().getFullYear()} SAAE — {t.footer.rights}
        </div>

        {/* Made in Damascus — tiny, bottom-right */}
        <div
          className={`mt-3 text-[11px] ${isRtl ? "text-right" : "text-left"}`}
          style={{ color: "#B5B5B5" }}
        >
          {t.footer.madeIn}
        </div>
      </div>
    </footer>
  );
}
