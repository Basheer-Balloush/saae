import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin, Instagram, Linkedin, Youtube, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";
import logo from "@/assets/saae-logo.png";

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
    <footer id="contact" className="relative border-t border-border bg-surface pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Col 1 */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="SAAE" className="h-12 w-auto" />
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">SAAE</span>
                <span className="text-[11px] text-muted-foreground">
                  {dir === "rtl" ? "الجمعية السورية للذكاء الاصطناعي" : "Syrian Association for AI & Entrepreneurship"}
                </span>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">{t.footer.mission}</p>
            <div className="mt-6 flex items-center gap-3">
              {[Instagram, Linkedin, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-primary hover:text-primary"
                  aria-label="social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">{t.footer.quickLinks}</h4>
            <ul className="mt-5 space-y-3 text-sm">
              {(["about", "news", "communities", "achievements", "partners", "contact"] as const).map((k) => (
                <li key={k}>
                  <a href={`#${k}`} className="text-muted-foreground transition-colors hover:text-primary">
                    {t.nav[k]}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 - contact form */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">{t.footer.contact}</h4>
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                required
                type="text"
                placeholder={t.footer.form.name}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
              <input
                required
                type="email"
                placeholder={t.footer.form.email}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <textarea
                required
                rows={3}
                placeholder={t.footer.form.message}
                className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {sent ? t.footer.form.sent : t.footer.form.send}
                {!sent && <ArrowRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />}
              </button>
            </form>
          </div>

          {/* Col 4 - HQ */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">{t.footer.hq}</h4>
            <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
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
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <span>{t.footer.address}</span>
                </div>
                <a href="mailto:info@aisyria.org" className="flex items-center gap-2.5 text-muted-foreground hover:text-primary">
                  <Mail className="h-4 w-4 flex-none text-primary" />
                  info@aisyria.org
                </a>
                <a href="tel:+963930763547" className="flex items-center gap-2.5 text-muted-foreground hover:text-primary" dir="ltr">
                  <Phone className="h-4 w-4 flex-none text-primary" />
                  +963 930 763 547
                </a>
                <a
                  href="https://www.google.com/maps?q=Damascus"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-primary"
                >
                  {t.footer.visit}
                  <ArrowRight className={dir === "rtl" ? "h-3.5 w-3.5 -scale-x-100" : "h-3.5 w-3.5"} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} SAAE — {t.footer.rights}</span>
          <span>{t.footer.madeIn}</span>
        </div>
      </div>
    </footer>
  );
}
