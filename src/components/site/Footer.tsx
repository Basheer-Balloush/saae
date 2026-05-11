import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin, Instagram, Linkedin, Youtube, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";
import logo from "@/assets/footer-logo.png";

export function Footer() {
  const { t, dir } = useLang();
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    (e.currentTarget as HTMLFormElement).reset();
  }

  return (
    <footer id="contact" className="relative border-t border-footer-border bg-footer text-footer-foreground pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Col 1 */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="SAAE" className="h-14 w-auto brightness-0 invert" />
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-footer-muted">{t.footer.mission}</p>
            <div className="mt-6 flex items-center gap-3">
              {[Instagram, Linkedin, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-footer-border text-footer-foreground/80 transition-colors hover:bg-footer-foreground/10 hover:text-footer-foreground"
                  aria-label="social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-footer-foreground">{t.footer.quickLinks}</h4>
            <ul className="mt-5 space-y-3 text-sm">
              {(["about", "news", "communities", "achievements", "partners", "contact"] as const).map((k) => (
                <li key={k}>
                  <a href={`#${k}`} className="text-footer-muted transition-colors hover:text-footer-foreground">
                    {t.nav[k]}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 - contact form */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-footer-foreground">{t.footer.contact}</h4>
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                required
                type="text"
                placeholder={t.footer.form.name}
                className="w-full rounded-lg border border-footer-border bg-footer-foreground/5 px-4 py-2.5 text-sm text-footer-foreground placeholder:text-footer-muted outline-none transition-colors focus:border-footer-foreground"
              />
              <input
                required
                type="email"
                placeholder={t.footer.form.email}
                className="w-full rounded-lg border border-footer-border bg-footer-foreground/5 px-4 py-2.5 text-sm text-footer-foreground placeholder:text-footer-muted outline-none focus:border-footer-foreground"
              />
              <textarea
                required
                rows={3}
                placeholder={t.footer.form.message}
                className="w-full resize-none rounded-lg border border-footer-border bg-footer-foreground/5 px-4 py-2.5 text-sm text-footer-foreground placeholder:text-footer-muted outline-none focus:border-footer-foreground"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-footer-foreground px-4 py-2.5 text-sm font-semibold text-footer transition-opacity hover:opacity-90"
              >
                {sent ? t.footer.form.sent : t.footer.form.send}
                {!sent && <ArrowRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />}
              </button>
            </form>
          </div>

          {/* Col 4 - HQ */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-footer-foreground">{t.footer.hq}</h4>
            <div className="mt-5 overflow-hidden rounded-xl border border-footer-border bg-footer-foreground/5">
              <a
                href="https://www.google.com/maps?q=Damascus+University"
                target="_blank"
                rel="noreferrer"
                className="block aspect-[16/9] overflow-hidden"
              >
                <img
                  src="https://images.unsplash.com/photo-1577086664693-894d8405334a?auto=format&fit=crop&w=900&q=80"
                  alt="Damascus"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
              </a>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex items-start gap-2.5 text-footer-muted">
                  <MapPin className="mt-0.5 h-4 w-4 flex-none text-footer-foreground" />
                  <span>{t.footer.address}</span>
                </div>
                <a href="mailto:info@aisyria.org" className="flex items-center gap-2.5 text-footer-muted hover:text-footer-foreground">
                  <Mail className="h-4 w-4 flex-none text-footer-foreground" />
                  info@aisyria.org
                </a>
                <a href="tel:+963930763547" className="flex items-center gap-2.5 text-footer-muted hover:text-footer-foreground" dir="ltr">
                  <Phone className="h-4 w-4 flex-none text-footer-foreground" />
                  +963 930 763 547
                </a>
                <a
                  href="https://www.google.com/maps?q=Damascus"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-footer-foreground"
                >
                  {t.footer.visit}
                  <ArrowRight className={dir === "rtl" ? "h-3.5 w-3.5 -scale-x-100" : "h-3.5 w-3.5"} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-footer-border pt-6 text-xs text-footer-muted sm:flex-row">
          <span>© {new Date().getFullYear()} SAAE — {t.footer.rights}</span>
          <span>{t.footer.madeIn}</span>
        </div>
      </div>
    </footer>
  );
}
