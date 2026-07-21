import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2, Instagram, Facebook, Linkedin, MessageSquare, ArrowLeft, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — الجمعية السورية للذكاء الصنعي وريادة الأعمال" },
      { name: "description", content: "تواصل مع الجمعية السورية للذكاء الصنعي وريادة الأعمال — للاستفسارات، الشراكات، التدريب، أو الانضمام للمجتمع." },
      { property: "og:title", content: "تواصل معنا — SAAE" },
      { property: "og:description", content: "نحن هنا للإجابة على استفساراتك. تواصل معنا عبر النموذج، الإيميل، الهاتف، أو زرنا في دمشق." },
      { property: "og:url", content: "https://aisyria.org/contact" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/contact" },
    ],
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
  inquiry_type: z.enum(["general", "individual", "company", "partnership", "training", "media", "other"]),
  subject: z.string().trim().min(2, "الموضوع قصير جداً").max(200),
  message: z.string().trim().min(5, "الرسالة قصيرة جداً").max(2000),
});

type FormData = z.infer<typeof schema>;

function ContactPage() {
  const { lang, dir } = useLang();
  const isAr = lang === "ar";
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

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
      toast.success(isAr ? "تم إرسال رسالتك بنجاح، سنتواصل معك قريباً" : "Message sent successfully");
      setForm({ full_name: "", email: "", phone: "", organization: "", inquiry_type: "general", subject: "", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (isAr ? "فشل الإرسال" : "Failed to send"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 start-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute bottom-0 end-1/4 h-[24rem] w-[24rem] rounded-full bg-secondary/15 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl px-6 py-20 text-center lg:px-10 lg:py-28">
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {isAr ? "تواصل معنا" : "Contact us"}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-loose text-muted-foreground sm:text-lg">
              {isAr
                ? "سواء كنت فرداً يبحث عن تعلّم، شركة تبحث عن شراكة، أو جهة إعلامية — فريقنا جاهز للإجابة على استفساراتك خلال 48 ساعة."
                : "Whether you are an individual, a company, or a media outlet — our team is ready to respond within 48 hours."}
            </p>
          </div>
        </section>

        {/* Contact cards */}
        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Icon: Mail,
                label: isAr ? "البريد الإلكتروني" : "Email",
                value: "info@aisyria.org",
                href: "mailto:info@aisyria.org",
              },
              {
                Icon: Phone,
                label: isAr ? "الهاتف" : "Phone",
                value: "+963 930 763 547",
                href: "tel:+963930763547",
              },
              {
                Icon: MapPin,
                label: isAr ? "المقر الرئيسي" : "Headquarters",
                value: isAr ? "دمشق — بجانب وزارة التعليم العالي" : "Damascus — near the Ministry of Higher Education",
                href: "https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6",
              },
              {
                Icon: MessageSquare,
                label: isAr ? "ساعات الردّ" : "Response time",
                value: isAr ? "خلال 48 ساعة" : "Within 48 hours",
              },
            ].map(({ Icon, label, value, href }) => {
              const inner = (
                <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground" dir={href?.startsWith("tel:") ? "ltr" : undefined}>
                    {value}
                  </p>
                </div>
              );
              return href ? (
                <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  {inner}
                </a>
              ) : (
                <div key={label}>{inner}</div>
              );
            })}
          </div>
        </section>

        {/* Form + Map */}
        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-5">
              {/* Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-3"
              >
                <div className="rounded-3xl border border-border bg-card p-7 shadow-soft sm:p-10">
                  {sent ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <CheckCircle2 className="h-8 w-8" />
                      </span>
                      <h3 className="mt-5 text-2xl font-bold">
                        {isAr ? "وصلتنا رسالتك!" : "Message received!"}
                      </h3>
                      <p className="mt-3 max-w-md text-sm text-muted-foreground">
                        {isAr
                          ? "شكراً لتواصلك معنا. سيقوم فريقنا بمراجعة رسالتك والرد عليك خلال 48 ساعة على بريدك الإلكتروني."
                          : "Thanks for reaching out. Our team will review your message and reply within 48 hours."}
                      </p>
                      <Button onClick={() => setSent(false)} variant="outline" className="mt-6">
                        {isAr ? "إرسال رسالة أخرى" : "Send another message"}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {isAr ? "أرسل لنا رسالة" : "Send us a message"}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {isAr
                          ? "املأ النموذج وسنتواصل معك في أقرب وقت."
                          : "Fill out the form and we'll get back to you soon."}
                      </p>

                      <form onSubmit={onSubmit} className="mt-7 space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="full_name">{isAr ? "الاسم الكامل *" : "Full name *"}</Label>
                            <Input
                              id="full_name"
                              required
                              maxLength={100}
                              value={form.full_name}
                              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">{isAr ? "البريد الإلكتروني *" : "Email *"}</Label>
                            <Input
                              id="email"
                              type="email"
                              required
                              maxLength={255}
                              dir="ltr"
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">{isAr ? "رقم الهاتف" : "Phone"}</Label>
                            <Input
                              id="phone"
                              type="tel"
                              maxLength={30}
                              dir="ltr"
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="organization">{isAr ? "الجهة / الشركة" : "Organization"}</Label>
                            <Input
                              id="organization"
                              maxLength={150}
                              value={form.organization}
                              onChange={(e) => setForm({ ...form, organization: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="inquiry_type">{isAr ? "نوع الاستفسار *" : "Inquiry type *"}</Label>
                          <Select
                            value={form.inquiry_type}
                            onValueChange={(v) => setForm({ ...form, inquiry_type: v as FormData["inquiry_type"] })}
                          >
                            <SelectTrigger id="inquiry_type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(inquiryLabels) as FormData["inquiry_type"][]).map((k) => (
                                <SelectItem key={k} value={k}>{inquiryLabels[k]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="subject">{isAr ? "الموضوع *" : "Subject *"}</Label>
                          <Input
                            id="subject"
                            required
                            maxLength={200}
                            value={form.subject}
                            onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="message">{isAr ? "رسالتك *" : "Message *"}</Label>
                          <Textarea
                            id="message"
                            required
                            rows={6}
                            maxLength={2000}
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {form.message.length}/2000
                          </p>
                        </div>

                        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-2" />
                          ) : (
                            <Send className={`h-4 w-4 mx-2 ${dir === "rtl" ? "-scale-x-100" : ""}`} />
                          )}
                          {isAr ? "إرسال الرسالة" : "Send message"}
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Map + socials */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="lg:col-span-2 flex flex-col gap-5"
              >
                <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                  <div className="aspect-square w-full">
                    <iframe
                      title="SAAE HQ — Damascus"
                      src="https://www.google.com/maps?q=33.5138,36.2765&hl=ar&z=16&output=embed"
                      className="h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <MapPin className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{isAr ? "المقر الرئيسي" : "Headquarters"}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {isAr ? "دمشق — بجانب وزارة التعليم العالي والبحث العلمي" : "Damascus — near the Ministry of Higher Education"}
                        </p>
                      </div>
                    </div>
                    <a
                      href="https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                    >
                      {isAr ? "افتح في خرائط جوجل" : "Open in Google Maps"}
                      <Arrow className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
                  <p className="text-sm font-semibold">
                    {isAr ? "تابعنا على وسائل التواصل" : "Follow us"}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    {[
                      { Icon: Instagram, href: "https://www.instagram.com/saae_sy?igsh=ZjE0eXN0Y3hlODNz", label: "Instagram" },
                      { Icon: Facebook, href: "https://www.facebook.com/share/18SQ11hcct/", label: "Facebook" },
                      { Icon: Linkedin, href: "https://www.linkedin.com/company/syrian-association-for-ai-entrepreneurship/", label: "LinkedIn" },
                    ].map(({ Icon, href, label }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={label}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground/70 transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5">
                  <p className="text-sm font-semibold text-foreground">
                    {isAr ? "بحاجة لإجابة فورية؟" : "Need an instant answer?"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isAr ? "تحدث مع «أبو الجود» — مساعدنا الذكي على مدار الساعة." : "Chat with Abu Al-Joud — our AI assistant, 24/7."}
                  </p>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("assistant:open"))}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    {isAr ? "تحدث مع أبو الجود" : "Chat with Abu Al-Joud"}
                    <Arrow className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
