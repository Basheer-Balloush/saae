import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  Instagram,
  Facebook,
  Linkedin,
  MessageSquare,
  Clock,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PageV2, type RibbonSection } from "@/components/site-v2/PageV2";
import { Reveal } from "@/components/site-v2/Reveal";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — الجمعية السورية للذكاء الصنعي وريادة الأعمال" },
      {
        name: "description",
        content:
          "تواصل مع الجمعية السورية للذكاء الصنعي وريادة الأعمال — للاستفسارات، الشراكات، التدريب، أو الانضمام للمجتمع.",
      },
      { property: "og:title", content: "تواصل معنا — SAAE" },
      {
        property: "og:description",
        content:
          "نحن هنا للإجابة على استفساراتك. تواصل معنا عبر النموذج، الإيميل، الهاتف، أو زرنا في دمشق.",
      },
      { property: "og:url", content: "https://aisyria.org/contact" },
    ],
    links: [{ rel: "canonical", href: "https://aisyria.org/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Syrian Association for AI & Entrepreneurship (SAAE)",
          url: "https://aisyria.org/contact",
          telephone: "+963 930 763 547",
          email: "info@aisyria.org",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Damascus",
            addressCountry: "SY",
          },
          areaServed: "SY",
        }),
      },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "الاسم قصير جداً").max(100),
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  organization: z.string().trim().max(150).optional().or(z.literal("")),
  inquiry_type: z.enum([
    "general",
    "individual",
    "company",
    "partnership",
    "training",
    "media",
    "other",
  ]),
  subject: z.string().trim().min(2, "الموضوع قصير جداً").max(200),
  message: z.string().trim().min(5, "الرسالة قصيرة جداً").max(2000),
});

type FormData = z.infer<typeof schema>;

function ContactPage() {
  const { lang, dir, t } = useLang();
  const isAr = lang === "ar";
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const c = t.v2.contact;

  const [form, setForm] = useState<FormData>({
    full_name: "",
    email: "",
    phone: "",
    organization: "",
    inquiry_type: "general",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const inquiryLabels: Record<FormData["inquiry_type"], string> = isAr
    ? {
        general: "استفسار عام",
        individual: "فرد (تدريب/تعلّم)",
        company: "شركة",
        partnership: "شراكة",
        training: "تدريب موظفين",
        media: "إعلام",
        other: "أخرى",
      }
    : {
        general: "General inquiry",
        individual: "Individual (training/learning)",
        company: "Company",
        partnership: "Partnership",
        training: "Staff training",
        media: "Media",
        other: "Other",
      };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        organization: parsed.data.organization || null,
        inquiry_type: parsed.data.inquiry_type,
        subject: parsed.data.subject,
        message: parsed.data.message,
      });
      if (error) throw error;
      setSent(true);
      toast.success(
        isAr ? "تم إرسال رسالتك بنجاح، سنتواصل معك قريباً" : "Message sent successfully",
      );
      setForm({
        full_name: "",
        email: "",
        phone: "",
        organization: "",
        inquiry_type: "general",
        subject: "",
        message: "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isAr ? "فشل الإرسال" : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  const ribbon: RibbonSection[] = [
    { id: "lines", label: c.linesEyebrow },
    { id: "write", label: c.writeCta },
  ];

  const lines = [
    {
      key: "email",
      Icon: Mail,
      label: c.email,
      value: "info@aisyria.org",
      href: "mailto:info@aisyria.org",
      ltr: true,
    },
    {
      key: "phone",
      Icon: Phone,
      label: c.phone,
      value: "+963 930 763 547",
      href: "tel:+963930763547",
      ltr: true,
    },
    {
      key: "visit",
      Icon: MapPin,
      label: c.visit,
      value: c.hqBody,
      href: "https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6",
      ltr: false,
    },
    {
      key: "time",
      Icon: Clock,
      label: c.responseTime,
      value: c.responseValue,
      href: undefined,
      ltr: false,
    },
  ];

  const socials = [
    {
      Icon: Instagram,
      href: "https://www.instagram.com/saae_sy?igsh=ZjE0eXN0Y3hlODNz",
      label: "Instagram",
    },
    { Icon: Facebook, href: "https://www.facebook.com/share/18SQ11hcct/", label: "Facebook" },
    {
      Icon: Linkedin,
      href: "https://www.linkedin.com/company/syrian-association-for-ai-entrepreneurship/",
      label: "LinkedIn",
    },
  ];

  return (
    <PageV2 ribbonSections={ribbon}>
      {/* ---------------- HERO ---------------- */}
      <section className="v2-contact-hero">
        <div className="v2-shell v2-contact-hero-grid">
          <div className="v2-contact-hero-copy">
            <p className="v2-contact-pill">
              <span className="v2-contact-dot" aria-hidden="true" />
              {c.pill}
            </p>
            <p className="v2-eyebrow">{c.eyebrow}</p>
            <h1 className="v2-contact-title">
              {c.titleA}
              <br />
              <span className="v2-contact-title-accent">{c.titleB}</span>
            </h1>
            <p className="v2-contact-intro">{c.intro}</p>

            <div className="v2-contact-actions">
              <a className="v2-solid-button" href="#write">
                <Send className="v2-btn-icon" aria-hidden="true" />
                <span>{c.writeCta}</span>
              </a>
              <a className="v2-ghost-link" href="tel:+963930763547">
                <Phone className="v2-btn-icon" aria-hidden="true" />
                <span>{c.callCta}</span>
              </a>
            </div>

            <div className="v2-contact-meta">
              <a href="mailto:info@aisyria.org" dir="ltr">
                <Mail className="v2-btn-icon" aria-hidden="true" />
                info@aisyria.org
              </a>
              <span>
                <MapPin className="v2-btn-icon" aria-hidden="true" />
                {c.city}
              </span>
            </div>
          </div>

          <aside className="v2-signal">
            <img
              className="v2-signal-tree"
              src="/saae/initiative-tree.svg"
              alt=""
              aria-hidden="true"
              width={302}
              height={340}
              decoding="async"
            />
            <p className="v2-signal-kicker">{c.signalKicker}</p>
            <strong className="v2-signal-title">{c.signalTitle}</strong>
            <p className="v2-signal-body">{c.signalBody}</p>
            <a className="v2-signal-link" href="#write">
              <span>{c.writeCta}</span>
              <Arrow className="v2-btn-icon" aria-hidden="true" />
            </a>
          </aside>
        </div>
      </section>

      {/* ---------------- DIRECT LINES ---------------- */}
      <section className="v2-chapter is-dark" id="lines">
        <div className="v2-shell">
          <p className="v2-eyebrow">{c.linesEyebrow}</p>
          <Reveal>
            <h2 className="v2-display">{c.linesTitle}</h2>
          </Reveal>

          <div className="v2-line-cards">
            {lines.map(({ key, Icon, label, value, href, ltr }, i) => {
              const inner = (
                <>
                  <span className="v2-line-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <small>{label}</small>
                  <strong dir={ltr ? "ltr" : undefined}>{value}</strong>
                </>
              );
              return (
                <Reveal key={key} delay={i * 0.05}>
                  {href ? (
                    <a
                      className="v2-line-card"
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="v2-line-card">{inner}</div>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- FORM ---------------- */}
      <section className="v2-chapter">
        <div className="v2-shell v2-write-grid">
          <div className="v2-write-card" id="write">
            {sent ? (
              <div className="v2-sent">
                <span className="v2-sent-mark" aria-hidden="true">
                  <CheckCircle2 />
                </span>
                <h2 className="v2-display">{c.sentTitle}</h2>
                <p className="v2-section-sub">{c.sentBody}</p>
                <div className="v2-contact-actions">
                  <button type="button" className="v2-solid-button" onClick={() => setSent(false)}>
                    <span>{c.sendAnother}</span>
                  </button>
                  <Link to="/" className="v2-ghost-link">
                    {c.backHome}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h2 className="v2-display">{c.formTitle}</h2>
                <p className="v2-section-sub">{c.formIntro}</p>

                <form onSubmit={onSubmit} className="v2-form">
                  <div className="v2-fld-pair">
                    <div className="v2-fld">
                      <Label htmlFor="full_name">{c.fullName}</Label>
                      <Input
                        id="full_name"
                        required
                        autoComplete="name"
                        maxLength={100}
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      />
                    </div>
                    <div className="v2-fld">
                      <Label htmlFor="email">{c.emailField}</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        maxLength={255}
                        dir="ltr"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="v2-fld">
                      <Label htmlFor="phone">{c.phoneField}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        maxLength={30}
                        dir="ltr"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="v2-fld">
                      <Label htmlFor="organization">{c.organization}</Label>
                      <Input
                        id="organization"
                        maxLength={150}
                        value={form.organization}
                        onChange={(e) => setForm({ ...form, organization: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="v2-fld">
                    <Label htmlFor="inquiry_type">{c.inquiryType}</Label>
                    <Select
                      value={form.inquiry_type}
                      onValueChange={(v) =>
                        setForm({ ...form, inquiry_type: v as FormData["inquiry_type"] })
                      }
                    >
                      <SelectTrigger id="inquiry_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(inquiryLabels) as FormData["inquiry_type"][]).map((k) => (
                          <SelectItem key={k} value={k}>
                            {inquiryLabels[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="v2-fld">
                    <Label htmlFor="subject">{c.subject}</Label>
                    <Input
                      id="subject"
                      required
                      maxLength={200}
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>

                  <div className="v2-fld">
                    <Label htmlFor="message">{c.messageField}</Label>
                    <Textarea
                      id="message"
                      required
                      rows={6}
                      maxLength={2000}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    />
                    <p className="v2-counter" aria-hidden="true">
                      {form.message.length}/2000
                    </p>
                  </div>

                  <button type="submit" className="v2-solid-button v2-send" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="v2-btn-icon v2-spin" aria-hidden="true" />
                    ) : (
                      <Send className="v2-btn-icon" aria-hidden="true" />
                    )}
                    <span>{submitting ? c.sending : c.send}</span>
                  </button>
                </form>
              </>
            )}
          </div>

          <aside className="v2-write-aside">
            <div className="v2-aside-card v2-aside-map">
              <div className="v2-map-frame">
                <iframe
                  title="SAAE HQ — Damascus"
                  src={`https://www.google.com/maps?q=33.5138,36.2765&hl=${lang}&z=16&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="v2-map-note">
                <strong>{c.hqTitle}</strong>
                <p>{c.hqBody}</p>
                <a
                  href="https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{c.openMaps}</span>
                  <Arrow className="v2-btn-icon" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="v2-aside-card">
              <span className="v2-line-icon" aria-hidden="true">
                <MessageSquare />
              </span>
              <strong>{c.assistantTitle}</strong>
              <p>{c.assistantBody}</p>
              <button
                type="button"
                className="v2-aside-link"
                onClick={() => window.dispatchEvent(new CustomEvent("assistant:open"))}
              >
                <span>{c.assistantCta}</span>
                <Arrow className="v2-btn-icon" aria-hidden="true" />
              </button>
            </div>

            <div className="v2-aside-card">
              <strong>{c.followTitle}</strong>
              <div className="v2-aside-socials">
                {socials.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PageV2>
  );
}
