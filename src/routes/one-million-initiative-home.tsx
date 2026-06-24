import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { FlipCard } from "@/components/initiative/FlipCard";
import { WaitlistDialog } from "@/components/initiative/WaitlistDialog";
import { DirectPaymentDialog } from "@/components/initiative/DirectPaymentDialog";
import { CorporateDonationDialog } from "@/components/initiative/CorporateDonationDialog";
import { getInitiativeStats, getInitiativeSettings, getTopDonors } from "@/lib/initiative.functions";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Sparkles, Target, HeartHandshake, Users, Trophy, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/one-million-initiative-home")({
  head: () => ({
    meta: [
      { title: "مبادرة مليون مستخدم ذكاء اصطناعي سوري — الصفحة التفاعلية" },
      { name: "description", content: "ادعم أو سجّل في مبادرة مليون مستخدم ذكاء اصطناعي سوري. تابع الإحصائيات الحية وقائمة الرعاة." },
      { property: "og:title", content: "مبادرة مليون مستخدم — تفاعلي" },
      { property: "og:description", content: "تبرع، ادفع وابدأ، أو انضم لقائمة الانتظار." },
    ],
  }),
  component: InitiativeHome,
});

const COLORS = ["var(--primary)", "var(--secondary)", "var(--chart-3)", "var(--muted-foreground)"];

function InitiativeHome() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const statsFn = useServerFn(getInitiativeStats);
  const settingsFn = useServerFn(getInitiativeSettings);
  const donorsFn = useServerFn(getTopDonors);

  const [stats, setStats] = useState<{ target: number; done: number; waiting: number; coveredUnassigned: number; totalFunded: number } | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      statsFn().then(setStats).catch(() => {});
      donorsFn({ data: { limit: 10 } }).then(setDonors).catch(() => {});
    };
    load();
    settingsFn().then(setSettings).catch(() => {});
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [statsFn, settingsFn, donorsFn]);

  const target = stats?.target ?? 1000000;
  const done = stats?.done ?? 0;
  const waiting = stats?.waiting ?? 0;
  const covered = stats?.coveredUnassigned ?? 0;
  const remaining = Math.max(target - done - waiting - covered, 0);

  const pieData = [
    { name: isAr ? "متدرّبون" : "Trained", value: done },
    { name: isAr ? "قائمة الانتظار" : "Waitlist", value: waiting },
    { name: isAr ? "مقاعد مغطاة" : "Covered (free)", value: covered },
    { name: isAr ? "متبقّي" : "Remaining", value: remaining },
  ];

  const t = isAr ? {
    badge: "مبادرة وطنية",
    heroTitle: "مبادرة مليون مستخدم ذكاء اصطناعي سوري",
    heroSub: "محو الأمية في الذكاء الاصطناعي وتمكين السوريين من أدوات المستقبل.",
    payStart: "ادفع وابدأ",
    joinWait: "سجّل على قائمة الانتظار",
    about: "حولنا", mission: "رسالتنا", values: "قيمنا",
    statsTitle: "الإحصائيات الحية", statsSub: "تابع تقدم المبادرة لحظة بلحظة.",
    progress: "التقدّم نحو المليون",
    donorsTitle: "أبرز الرعاة",
    donorsSub: "قائمة الشركات والأفراد الأكثر دعماً للمبادرة.",
    viewAll: "عرض الكل",
    chair: "مقعد",
    csrTitle: "مسؤولية مجتمعية",
    csrSub: "ساهم في تدريب السوريين عبر شراء مقاعد لقائمة الانتظار. كل مقعد بدولار أمريكي واحد فقط.",
    sponsor: "تبرّع الآن",
  } : {
    badge: "National Initiative",
    heroTitle: "One Million Syrian AI Users Initiative",
    heroSub: "AI literacy for Syria — empowering people with the tools of the future.",
    payStart: "Pay & Start",
    joinWait: "Join the Waitlist",
    about: "About", mission: "Mission", values: "Values",
    statsTitle: "Live Statistics", statsSub: "Track the initiative's progress in real time.",
    progress: "Progress toward 1,000,000",
    donorsTitle: "Top Sponsors",
    donorsSub: "Companies and individuals leading the initiative.",
    viewAll: "View all",
    chair: "seats",
    csrTitle: "Corporate Social Responsibility",
    csrSub: "Sponsor seats for waitlisted learners. Just $1 per seat.",
    sponsor: "Donate now",
  };

  const percent = Math.min((done / target) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20">
        {/* HERO */}
        <section className="container mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {t.badge}
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            {t.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{t.heroSub}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setPayOpen(true)}>{t.payStart}</Button>
            <Button size="lg" variant="outline" onClick={() => setWaitlistOpen(true)}>{t.joinWait}</Button>
          </div>
        </section>

        {/* FLIP CARDS */}
        <section className="container mx-auto px-4 sm:px-6 mt-20 grid gap-6 md:grid-cols-3">
          <FlipCard
            front={<>
              <Sparkles className="h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold">{t.about}</h2>
            </>}
            back={<><h3 className="text-xl font-bold text-primary mb-3">{t.about}</h3><p className="text-sm leading-relaxed text-foreground/85">{(isAr ? settings?.about_ar : settings?.about_en) || (isAr ? "تحميل..." : "Loading...")}</p></>}
          />
          <FlipCard
            front={<>
              <Target className="h-12 w-12 text-secondary" />
              <h2 className="text-2xl font-bold">{t.mission}</h2>
            </>}
            back={<><h3 className="text-xl font-bold text-secondary mb-3">{t.mission}</h3><p className="text-sm leading-relaxed text-foreground/85">{(isAr ? settings?.mission_ar : settings?.mission_en) || (isAr ? "تحميل..." : "Loading...")}</p></>}
          />
          <FlipCard
            front={<>
              <HeartHandshake className="h-12 w-12 text-secondary" />
              <h2 className="text-2xl font-bold">{t.values}</h2>
            </>}
            back={<><h3 className="text-xl font-bold text-secondary mb-3">{t.values}</h3><p className="text-sm leading-relaxed text-foreground/85">{(isAr ? settings?.values_ar : settings?.values_en) || (isAr ? "تحميل..." : "Loading...")}</p></>}
          />
        </section>

        {/* PIE CHART */}
        <section className="container mx-auto px-4 sm:px-6 mt-24">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold">{t.statsTitle}</h2>
            <p className="text-muted-foreground mt-2">{t.statsSub}</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-soft">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">{t.progress}</p>
              <p className="text-5xl sm:text-6xl font-bold text-primary mt-2">{done.toLocaleString()} <span className="text-2xl text-muted-foreground">/ {target.toLocaleString()}</span></p>
              <div className="mt-4 h-3 w-full max-w-2xl mx-auto rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${percent}%` }} />
              </div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                  <Pie
                    data={pieData.filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={130}
                    paddingAngle={2}
                    label={(e: any) => `${((e.value / target) * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {pieData.filter((d) => d.value > 0).map((entry, i) => {
                      const originalIndex = pieData.findIndex((p) => p.name === entry.name);
                      return <Cell key={entry.name} fill={COLORS[originalIndex % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* TOP DONORS */}
        <section className="container mx-auto px-4 sm:px-6 mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-3"><Trophy className="h-8 w-8 text-secondary" />{t.donorsTitle}</h2>
              <p className="text-muted-foreground mt-2">{t.donorsSub}</p>
            </div>
            <Link to="/one-million-initiative-donors">
              <Button variant="outline">{t.viewAll} <ArrowRight className="h-4 w-4 ms-2" /></Button>
            </Link>
          </div>
          <div className="rounded-3xl border border-border bg-card overflow-hidden">
            {donors.length === 0 ? (
              <p className="p-10 text-center text-muted-foreground">{isAr ? "لم يُسجَّل بعد أي راعٍ — كن أول الداعمين!" : "No sponsors yet — be the first!"}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-start">
                  <tr>
                    <th className="p-4 text-start">#</th>
                    <th className="p-4 text-start">{isAr ? "الراعي" : "Sponsor"}</th>
                    <th className="p-4 text-start">{isAr ? "المقاعد" : "Chairs"}</th>
                    <th className="p-4 text-start">{isAr ? "المساهمة" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((d, i) => (
                    <tr key={d.donor_name} className="border-t border-border">
                      <td className="p-4 font-bold text-primary">{i + 1}</td>
                      <td className="p-4 flex items-center gap-3">
                        {d.logo_url && <img src={d.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />}
                        <span className="font-medium">{d.donor_display_name || d.donor_name}</span>
                      </td>
                      <td className="p-4">{Number(d.total_chairs).toLocaleString()}</td>
                      <td className="p-4">${Number(d.total_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 sm:px-6 mt-24 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 p-8 text-center">
            <Users className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-2xl font-bold mt-4">{t.payStart}</h3>
            <p className="text-muted-foreground mt-2">{isAr ? "ادفع $1 وابدأ الكورس فوراً." : "Pay $1 and start instantly."}</p>
            <Button size="lg" className="mt-6" onClick={() => setPayOpen(true)}>{t.payStart}</Button>
          </div>
          <div className="rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-secondary/5 p-8 text-center">
            <HeartHandshake className="h-12 w-12 text-secondary mx-auto" />
            <h3 className="text-2xl font-bold mt-4">{t.joinWait}</h3>
            <p className="text-muted-foreground mt-2">{isAr ? "انتظر تغطية مقعدك من أحد الرعاة." : "Wait for a sponsor to cover your seat."}</p>
            <Button size="lg" variant="outline" className="mt-6" onClick={() => setWaitlistOpen(true)}>{t.joinWait}</Button>
          </div>
        </section>

        {/* CSR */}
        <section className="container mx-auto px-4 sm:px-6 mt-24">
          <div className="rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/15 via-background to-primary/10 p-10 text-center">
            <HeartHandshake className="h-16 w-16 text-secondary mx-auto" />
            <h2 className="text-3xl sm:text-4xl font-bold mt-4">{t.csrTitle}</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">{t.csrSub}</p>
            <Button size="lg" className="mt-6 bg-gradient-brand text-white border-0 hover:opacity-90" onClick={() => setDonateOpen(true)}>{t.sponsor}</Button>
          </div>
        </section>
      </main>
      <Footer />

      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} lang={lang} />
      <DirectPaymentDialog open={payOpen} onOpenChange={setPayOpen} lang={lang} />
      <CorporateDonationDialog open={donateOpen} onOpenChange={setDonateOpen} lang={lang} />
    </div>
  );
}
