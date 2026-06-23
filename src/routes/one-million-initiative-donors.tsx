import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { getAllDonors } from "@/lib/initiative.functions";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/one-million-initiative-donors")({
  head: () => ({ meta: [{ title: "كل الرعاة — مبادرة مليون مستخدم" }] }),
  component: AllDonorsPage,
});

function AllDonorsPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const fn = useServerFn(getAllDonors);
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fn().then((d) => { setDonors(d); setLoading(false); }).catch(() => setLoading(false)); }, [fn]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 container mx-auto px-4 sm:px-6">
        <Link to="/one-million-initiative-home">
          <Button variant="ghost" className="mb-6"><ArrowLeft className="h-4 w-4 me-2" />{isAr ? "العودة" : "Back"}</Button>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold">{isAr ? "كل الرعاة والمساهمين" : "All Sponsors & Contributors"}</h1>
        <p className="text-muted-foreground mt-2">{isAr ? "قائمة كاملة بالشركات والأفراد الذين دعموا المبادرة." : "Full list of organizations and individuals supporting the initiative."}</p>

        <div className="mt-8 rounded-3xl border border-border bg-card overflow-hidden">
          {loading ? <p className="p-10 text-center text-muted-foreground">...</p> : donors.length === 0 ? (
            <p className="p-10 text-center text-muted-foreground">{isAr ? "لا يوجد رعاة بعد." : "No sponsors yet."}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-start">#</th>
                  <th className="p-4 text-start">{isAr ? "الراعي" : "Sponsor"}</th>
                  <th className="p-4 text-start">{isAr ? "المقاعد المغطاة" : "Chairs Covered"}</th>
                  <th className="p-4 text-start">{isAr ? "المساهمة" : "Amount"}</th>
                  <th className="p-4 text-start">{isAr ? "آخر تبرع" : "Last donation"}</th>
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
                    <td className="p-4 text-muted-foreground text-xs">{d.last_donation_at ? new Date(d.last_donation_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
